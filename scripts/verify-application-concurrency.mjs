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
const fixtureDir = await fs.mkdtemp(path.join(tempRoot, "academy-day12-"));
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
const submit = "SELECT public.academy_submit_application($1::uuid,$2::uuid,$3::text,$4::text,$5::text) AS result";
const save = "SELECT public.academy_admin_save_offering($1::uuid,$2::uuid,$3::date,$4::date,$5::text,$6::int,$7::text,$8::boolean)";
const submitArgs = (offering, request, name, phone) => [offering,request,name,phone,"test-v1"];
async function waitForRowLock(inspector, pid) {
  for (let n=0;n<100;n++) {
    const result = await inspector.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[pid]);
    if (result.rows[0]?.wait_event_type === "Lock") return;
    await pause(25);
  }
  throw Error("Expected a PostgreSQL lock wait, but did not observe one");
}
try {
  await instance.initialise(); startAttempted = true; await instance.start();
  const owner = await open(), first = await open(), second = await open();
  await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  for (const file of ["supabase/migrations/20261107100302_academy_course_foundation.sql","supabase/drafts/day08_public_courses.sql","supabase/drafts/day09_public_offerings.sql","supabase/drafts/day10_admin_management.sql","supabase/drafts/day11_application_data.sql","supabase/drafts/day12_atomic_applications.sql"]) await owner.query(await sql(file));
  const acl = await owner.query("SELECT has_function_privilege('anon','public.academy_submit_application(uuid,uuid,text,text,text)','EXECUTE') AS anon,has_function_privilege('authenticated','public.academy_submit_application(uuid,uuid,text,text,text)','EXECUTE') AS authenticated,has_function_privilege('service_role','public.academy_submit_application(uuid,uuid,text,text,text)','EXECUTE') AS service,prosecdef FROM pg_proc WHERE oid='public.academy_submit_application(uuid,uuid,text,text,text)'::regprocedure");
  assert.deepEqual(acl.rows[0], { anon:false, authenticated:false, service:true, prosecdef:false });
  for (const role of ["anon","authenticated"]) {
    await first.query(`SET ROLE ${role}`);
    await assert.rejects(first.query(submit,submitArgs(crypto.randomUUID(),crypto.randomUUID(),"Fictional","010-0000-0001")),/permission denied/);
    await first.query("RESET ROLE");
  }
  const course=(await owner.query("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('fictional','Fictional','Test','Test','Test','Test','published') RETURNING id")).rows[0].id;
  const makeOffering = async (capacity) => (await owner.query("INSERT INTO academy.offerings(course_id,capacity,status,is_public,enrollment_opens_at,enrollment_closes_at) VALUES ($1,$2,'open',true,now()-interval '1 hour',now()+interval '1 hour') RETURNING id",[course,capacity])).rows[0].id;
  const count = async (id) => Number((await owner.query("SELECT count(*) AS n FROM academy.applications WHERE offering_id=$1",[id])).rows[0].n);
  await first.query("SET ROLE service_role"); await second.query("SET ROLE service_role");
  const seat=await makeOffering(1), request=crypto.randomUUID();
  await first.query("BEGIN"); await second.query("BEGIN");
  assert.equal((await first.query(submit,submitArgs(seat,request,"  Fictional A  ","010-0000-0001"))).rows[0].result,"accepted");
  const waiting=second.query(submit,submitArgs(seat,crypto.randomUUID(),"Fictional B","010 0000 0002"));
  await waitForRowLock(owner,second.processID); await first.query("COMMIT");
  assert.equal((await waiting).rows[0].result,"unavailable"); await second.query("COMMIT");
  assert.equal(await count(seat),1);
  assert.equal((await first.query(submit,submitArgs(seat,request,"Fictional A","010 0000 0001"))).rows[0].result,"accepted");
  assert.equal((await first.query(submit,submitArgs(seat,request,"Different","010 0000 0001"))).rows[0].result,"unavailable");
  console.log("PASS: observed row-lock wait; two concurrent requests for the last seat create one application; identical retry is idempotent");
  const dup=await makeOffering(10);
  await first.query("BEGIN"); await second.query("BEGIN");
  assert.equal((await first.query(submit,submitArgs(dup,crypto.randomUUID(),"  Fictional C  ","010-0000-0003"))).rows[0].result,"accepted");
  const duplicate=second.query(submit,submitArgs(dup,crypto.randomUUID(),"Fictional C","010 0000 0003"));
  await waitForRowLock(owner,second.processID); await first.query("COMMIT");
  assert.equal((await duplicate).rows[0].result,"unavailable"); await second.query("COMMIT"); assert.equal(await count(dup),1);
  console.log("PASS: concurrent duplicate names/phone formats create only one application");
  const retryOffer=await makeOffering(5), retryKey=crypto.randomUUID();
  await first.query("BEGIN"); await second.query("BEGIN");
  assert.equal((await first.query(submit,submitArgs(retryOffer,retryKey,"Fictional Retry","01000000012"))).rows[0].result,"accepted");
  const repeated=second.query(submit,submitArgs(retryOffer,retryKey,"Fictional Retry","01000000012"));
  await waitForRowLock(owner,second.processID); await first.query("COMMIT");
  assert.equal((await repeated).rows[0].result,"accepted"); await second.query("COMMIT"); assert.equal(await count(retryOffer),1);
  console.log("PASS: concurrent identical request-key retries return success for one committed application");
  const guard=await makeOffering(1);
  await first.query("BEGIN"); await second.query("BEGIN");
  assert.equal((await first.query(submit,submitArgs(guard,crypto.randomUUID(),"Fictional D","01000000004"))).rows[0].result,"accepted");
  const reduction=second.query(save,[guard,course,null,null,null,0,"open",true]).then(()=>null,(error)=>error);
  await waitForRowLock(owner,second.processID); await first.query("COMMIT");
  const rejection=await reduction; assert.ok(rejection); assert.match(rejection.message,/conflicts with existing applications/); await second.query("ROLLBACK");
  assert.equal((await owner.query("SELECT capacity FROM academy.offerings WHERE id=$1",[guard])).rows[0].capacity,1);
  assert.equal(await count(guard),1);
  const guard2=await makeOffering(1);
  await first.query("BEGIN"); await second.query("BEGIN");
  await first.query(save,[guard2,course,null,null,null,0,"open",true]);
  const duringReduction=second.query(submit,submitArgs(guard2,crypto.randomUUID(),"Fictional E","01000000005"));
  await waitForRowLock(owner,second.processID); await first.query("COMMIT");
  assert.equal((await duringReduction).rows[0].result,"unavailable"); await second.query("COMMIT"); assert.equal(await count(guard2),0);
  console.log("PASS: concurrent administrator capacity reduction cannot overbook in either lock order");
  const rollback=await makeOffering(1);
  await owner.query("REVOKE INSERT (application_id, offering_id, applicant_name, contact) ON academy.application_private FROM service_role");
  await assert.rejects(first.query(submit,submitArgs(rollback,crypto.randomUUID(),"Fictional F","01000000006")),/permission denied/);
  assert.equal(await count(rollback),0);
  await owner.query("GRANT INSERT (application_id, offering_id, applicant_name, contact) ON academy.application_private TO service_role");
  assert.equal((await first.query(submit,submitArgs(rollback,crypto.randomUUID(),"Fictional F","01000000006"))).rows[0].result,"accepted");
  assert.equal(await count(rollback),1);
  console.log("PASS: failed private-data insertion rolls back the application and reservation");
  // A confirmed retry remains recoverable after closure; new submissions are rejected.
  await owner.query("UPDATE academy.offerings SET status='closed' WHERE id=$1",[seat]);
  assert.equal((await first.query(submit,submitArgs(seat,request,"Fictional A","01000000001"))).rows[0].result,"accepted");
  assert.equal((await first.query(submit,submitArgs(seat,crypto.randomUUID(),"Fictional Z","01000000009"))).rows[0].result,"unavailable");
  for (const change of ["is_public=false", "status='draft'", "enrollment_opens_at=NULL", "enrollment_closes_at=now()-interval '1 second'", "enrollment_opens_at=now()+interval '1 second'"]) {
    const unavailable=await makeOffering(10); await owner.query(`UPDATE academy.offerings SET ${change} WHERE id=$1`,[unavailable]);
    assert.equal((await first.query(submit,submitArgs(unavailable,crypto.randomUUID(),"Fictional G","01000000007"))).rows[0].result,"unavailable");
    assert.equal(await count(unavailable),0);
  }
  const different=await makeOffering(10);
  assert.equal((await first.query(submit,submitArgs(different,crypto.randomUUID(),"Fictional C","01000000003"))).rows[0].result,"accepted");
  assert.equal(await count(different),1);
  const closing=await makeOffering(1);
  await first.query("BEGIN"); await second.query("BEGIN");
  await first.query(save,[closing,course,null,null,null,1,"closed",true]);
  const duringClose=second.query(submit,submitArgs(closing,crypto.randomUUID(),"Fictional Close","01000000013"));
  await waitForRowLock(owner,second.processID); await first.query("COMMIT");
  assert.equal((await duringClose).rows[0].result,"unavailable"); await second.query("COMMIT"); assert.equal(await count(closing),0);
  console.log("PASS: a concurrent administrator closure prevents a waiting application");
  const unpaired=(await owner.query("INSERT INTO academy.applications(offering_id,request_id,notice_version) VALUES ($1,$2,'test-v1') RETURNING id",[dup,crypto.randomUUID()])).rows[0].id;
  await assert.rejects(owner.query("INSERT INTO academy.application_private(application_id,offering_id,applicant_name,contact) VALUES ($1,$2,'Another','01000000008')",[unpaired,different]),/foreign key/);
  await assert.rejects(owner.query("INSERT INTO academy.application_private(application_id,offering_id,applicant_name,contact) VALUES ($1,$2,'Fictional C','01000000003')",[unpaired,dup]),/duplicate key/);
  await owner.query("DELETE FROM academy.applications WHERE id=$1",[unpaired]);
  console.log("PASS: closed, private, invalid-window offerings are blocked; safe retry survives closure and duplicate scope is per offering");
} finally {
  for (const client of clients) await client.end().catch(()=>{});
  if (startAttempted) await instance.stop();
  const target=path.resolve(fixtureDir);
  if (path.dirname(target) === tempRoot && path.basename(target).startsWith("academy-day12-")) await fs.rm(target,{recursive:true,force:true,maxRetries:30,retryDelay:300});
}
