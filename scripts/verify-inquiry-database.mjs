import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

// Runs only a newly initialized localhost PostgreSQL cluster. No connection URL is accepted.
// Install pinned test-only packages outside the repo and set DAY12_PG_MODULE_ROOT to that folder.
const moduleRoot = process.env.DAY12_PG_MODULE_ROOT;
if (!moduleRoot) throw Error("Set DAY12_PG_MODULE_ROOT to an isolated folder with embedded-postgres and pg installed");
const load = createRequire(path.join(path.resolve(moduleRoot), "package.json"));
const { default: EmbeddedPostgres } = await import(pathToFileURL(load.resolve("embedded-postgres")).href);
const { Client } = load("pg");
const reservePort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.on("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((err) => err ? reject(err) : resolve(port)); }); });
const tempRoot = path.resolve(os.tmpdir());
const fixtureDir = await fs.mkdtemp(path.join(tempRoot, "academy-day15-"));
const port = await reservePort();
const password = crypto.randomBytes(24).toString("base64url");
const instance = new EmbeddedPostgres({ databaseDir: path.join(fixtureDir, "db"), user: "postgres", password, port, persistent: true, autoRehydrateSymlinks: true, postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
const connection = { host: "127.0.0.1", port, database: "postgres", user: "postgres", password, connectionTimeoutMillis: 5000 };
const clients = [];
let startAttempted = false;
const open = async () => { const client = new Client(connection); await client.connect(); clients.push(client); return client; };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const sql = async (name) => fs.readFile(path.join(root,name), "utf8");
async function waitForRowLock(inspector, pid) {
  for (let n=0;n<100;n++) {
    const result = await inspector.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[pid]);
    if (result.rows[0]?.wait_event_type === "Lock") return;
    await pause(25);
  }
  throw Error("Expected a PostgreSQL lock wait, but did not observe one");
}
try {
  await instance.initialise(); startAttempted=true; await instance.start();
  const owner=await open(),first=await open(),second=await open();
  await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  await owner.query(await sql("supabase/migrations/20261107100302_academy_course_foundation.sql"));
  await owner.query(await sql("supabase/drafts/day15_inquiries.sql"));
  const functions=(await owner.query("SELECT p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') a,has_function_privilege('authenticated',p.oid,'EXECUTE') u,has_function_privilege('service_role',p.oid,'EXECUTE') s FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('academy_submit_inquiry','academy_admin_search_inquiries','academy_admin_read_inquiry','academy_admin_advance_inquiry')")).rows;
  assert.equal(functions.length,4);assert.ok(functions.every((f)=>!f.prosecdef&&!f.a&&!f.u&&f.s));
  const rls=(await owner.query("SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='academy' AND c.relname IN ('inquiries','inquiry_private','inquiry_events')")).rows;
  assert.equal(rls.length,3);assert.ok(rls.every((r)=>r.relrowsecurity));
  const submit="SELECT public.academy_submit_inquiry($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::text) AS result";
  const search="SELECT public.academy_admin_search_inquiries($1::text,$2::timestamptz,$3::uuid,$4::int) AS data";
  const detail="SELECT public.academy_admin_read_inquiry($1::uuid,$2::uuid) AS data";
  const advance="SELECT public.academy_admin_advance_inquiry($1::uuid,$2::uuid,$3::text) AS data";
  const key=crypto.randomUUID(),actor=crypto.randomUUID(),args=[key,"course","Fictional User","person@example.test","Fictional question","fixture-v1"];
  for(const role of ["anon","authenticated"]){await first.query(`SET ROLE ${role}`);await assert.rejects(first.query(submit,args),/permission denied/);await assert.rejects(first.query(search,["",null,null,21]),/permission denied/);await assert.rejects(first.query("SELECT * FROM academy.inquiry_private"),/permission denied/);await first.query("RESET ROLE");}
  await first.query("SET ROLE service_role");await second.query("SET ROLE service_role");
  await first.query("BEGIN");await second.query("BEGIN");
  assert.equal((await first.query(submit,args)).rows[0].result,"accepted");
  const waiting=second.query(submit,args);await waitForRowLock(owner,second.processID);await first.query("COMMIT");
  assert.equal((await waiting).rows[0].result,"accepted");await second.query("COMMIT");
  assert.equal((await owner.query("SELECT count(*)::int n FROM academy.inquiries")).rows[0].n,1);
  assert.equal((await first.query(submit,[key,"course","Different","person@example.test","Fictional question","fixture-v1"])).rows[0].result,"unavailable");
  console.log("PASS: two real sessions retry the same inquiry without duplicate storage; anon/auth are denied");
  await owner.query("REVOKE INSERT (inquiry_id,sender_name,sender_email,message) ON academy.inquiry_private FROM service_role");
  await assert.rejects(first.query(submit,[crypto.randomUUID(),...args.slice(1)]),/permission denied/);
  assert.equal((await owner.query("SELECT count(*)::int n FROM academy.inquiries")).rows[0].n,1);
  await owner.query("GRANT INSERT (inquiry_id,sender_name,sender_email,message) ON academy.inquiry_private TO service_role");
  const inquiry=(await owner.query("SELECT id FROM academy.inquiries WHERE request_id=$1",[key])).rows[0].id;
  const listing=(await first.query(search,["Fictional",null,null,21])).rows[0].data.items;
  assert.equal(listing.length,1);assert.equal(listing[0].masked_name,"F**");
  assert.ok(!JSON.stringify(listing).includes("person@example.test")&&!JSON.stringify(listing).includes("Fictional question"));
  await owner.query("REVOKE INSERT (inquiry_id,actor_id,kind,from_status,to_status) ON academy.inquiry_events FROM service_role");
  await assert.rejects(first.query(detail,[inquiry,actor]),/permission denied/);
  await assert.rejects(first.query(advance,[inquiry,actor,"received"]),/permission denied/);
  assert.equal((await owner.query("SELECT status FROM academy.inquiries WHERE id=$1",[inquiry])).rows[0].status,"received");
  await owner.query("GRANT INSERT (inquiry_id,actor_id,kind,from_status,to_status) ON academy.inquiry_events TO service_role");
  const result=(await first.query(detail,[inquiry,actor])).rows[0].data;
  assert.equal(result.email,"person@example.test");assert.equal(result.message,"Fictional question");
  assert.equal((await first.query(advance,[inquiry,actor,"received"])).rows[0].data.result,"in_progress");
  assert.equal((await first.query(advance,[inquiry,actor,"received"])).rows[0].data.result,"conflict");
  assert.equal((await first.query(advance,[inquiry,actor,"in_progress"])).rows[0].data.result,"completed");
  const events=(await owner.query("SELECT kind,from_status,to_status,actor_id FROM academy.inquiry_events WHERE inquiry_id=$1 ORDER BY created_at,id",[inquiry])).rows;
  assert.equal(events.length,3);assert.ok(events.every((e)=>e.actor_id===actor));assert.equal(events.filter((e)=>e.kind==='viewed').length,1);assert.equal(events.filter((e)=>e.kind==='status_changed').length,2);
  console.log("PASS: masked list, audited detail and status transitions; audit failures and partial writes roll back");
  const raceKey=crypto.randomUUID();assert.equal((await first.query(submit,[raceKey,"course","Race User","race@example.test","Question","fixture-v1"])).rows[0].result,"accepted");
  const raceId=(await owner.query("SELECT id FROM academy.inquiries WHERE request_id=$1",[raceKey])).rows[0].id;
  await first.query("BEGIN");await second.query("BEGIN");assert.equal((await first.query(advance,[raceId,actor,"received"])).rows[0].data.result,"in_progress");
  const pending=second.query(advance,[raceId,crypto.randomUUID(),"received"]);await waitForRowLock(owner,second.processID);await first.query("COMMIT");assert.equal((await pending).rows[0].data.result,"conflict");await second.query("COMMIT");
  assert.equal((await owner.query("SELECT count(*)::int n FROM academy.inquiry_events WHERE inquiry_id=$1 AND kind='status_changed'",[raceId])).rows[0].n,1);
  for(let index=0;index<25;index++)assert.equal((await first.query(submit,[crypto.randomUUID(),"other",`Paging User ${index}`,`q${index}@example.test`,"Question","fixture-v1"])).rows[0].result,"accepted");
  await owner.query("UPDATE academy.inquiries SET created_at='2026-01-01T00:00:00Z' WHERE id IN (SELECT inquiry_id FROM academy.inquiry_private WHERE sender_name LIKE 'Paging User%')");
  const page1=(await first.query(search,["Paging User",null,null,20])).rows[0].data.items,last=page1.at(-1);
  const page2=(await first.query(search,["Paging User",last.created_at,last.id,20])).rows[0].data.items;
  assert.equal(page1.length,20);assert.equal(page2.length,5);assert.equal(new Set([...page1,...page2].map((row)=>row.id)).size,25);
  console.log("PASS: concurrent state changes create one event; keyset pagination handles equal timestamps");
} finally {
  for(const client of clients)await client.end().catch(()=>{});
  if(startAttempted)await instance.stop();
  const target=path.resolve(fixtureDir);
  if(path.dirname(target)===tempRoot && path.basename(target).startsWith("academy-day15-"))await fs.rm(target,{recursive:true,force:true,maxRetries:30,retryDelay:300});
}
