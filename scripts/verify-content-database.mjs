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
const fixtureDir = await fs.mkdtemp(path.join(tempRoot, "academy-day16-"));
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
try{
 await instance.initialise();startAttempted=true;await instance.start();const owner=await open(),first=await open(),second=await open();
 await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
 await owner.query(await sql("supabase/migrations/20261107100302_academy_course_foundation.sql"));await owner.query(await sql("supabase/drafts/day16_content_management.sql"));
 const seed=await sql("supabase/drafts/day16_dev_content_examples.sql");
 await owner.query("BEGIN; LOCK TABLE academy.contents IN ACCESS EXCLUSIVE MODE");
 const seedA=first.query(seed).then(()=>true,()=>false),seedB=second.query(seed).then(()=>true,()=>false);
 await waitForRowLock(owner,first.processID);await waitForRowLock(owner,second.processID);await owner.query("COMMIT");
 const seeded=await Promise.all([seedA,seedB]);assert.equal(seeded.filter(Boolean).length,1);await first.query("ROLLBACK");await second.query("ROLLBACK");
 assert.equal((await owner.query("SELECT count(*)::int n FROM academy.contents")).rows[0].n,14);await assert.rejects(owner.query(seed),/empty table/);await owner.query("ROLLBACK");
 const save="SELECT public.academy_admin_save_content($1::uuid,$2::int,$3::text,$4::text,$5::text,$6::text,$7::date,$8::int,$9::boolean,$10::uuid,$11::text,$12::text) AS data";
 const actor=crypto.randomUUID(),args=[null,null,"news","Test","Private title","Fictional body",null,0,false,actor,null,null];
 for(const role of ["anon","authenticated"]){await first.query(`SET ROLE ${role}`);assert.equal((await first.query("SELECT count(*)::int n FROM public.published_contents")).rows[0].n,14);await assert.rejects(first.query(save,args),/permission denied/);await assert.rejects(first.query("SELECT * FROM academy.contents"),/permission denied/);await first.query("RESET ROLE");}
 assert.equal((await owner.query("SELECT count(*)::int n FROM academy.contents WHERE kind='faq' AND link_path IS NOT NULL")).rows[0].n,3);
 await assert.rejects(owner.query("INSERT INTO academy.contents(kind,category,title,body,link_path,link_label) VALUES ('faq','Test','Test','Test','https://evil.test','Bad')"),/check constraint/);
 await assert.rejects(owner.query("INSERT INTO academy.contents(kind,category,title,body,link_path,link_label) VALUES ('news','Test','Test','Test','/programs','Bad')"),/check constraint/);
 await first.query("SET ROLE service_role");await second.query("SET ROLE service_role");const created=(await first.query(save,args)).rows[0].data;assert.equal(created.result,"saved");assert.equal(created.revision,1);
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT count(*)::int n FROM public.published_contents WHERE id=$1",[created.id])).rows[0].n,0);await owner.query("RESET ROLE");
 await first.query("BEGIN");await second.query("BEGIN");const updated=[created.id,1,"news","Test","Published title","Fictional body",null,0,true,actor,null,null];assert.equal((await first.query(save,updated)).rows[0].data.revision,2);
 const concurrent=second.query(save,[...updated.slice(0,4),"Stale title",...updated.slice(5)]);await waitForRowLock(owner,second.processID);await first.query("COMMIT");assert.equal((await concurrent).rows[0].data.result,"conflict");await second.query("COMMIT");
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT title FROM public.published_contents WHERE id=$1",[created.id])).rows[0].title,"Published title");await owner.query("RESET ROLE");
 await owner.query("REVOKE INSERT (content_id,actor_id,revision) ON academy.content_events FROM service_role");await assert.rejects(first.query(save,[created.id,2,"news","Test","Should rollback","Fictional body",null,0,false,actor,null,null]),/permission denied/);assert.equal((await owner.query("SELECT revision FROM academy.contents WHERE id=$1",[created.id])).rows[0].revision,2);await owner.query("GRANT INSERT (content_id,actor_id,revision) ON academy.content_events TO service_role");
 assert.equal((await first.query(save,[created.id,2,"news","Test","Private again","Fictional body",null,0,false,actor,null,null])).rows[0].data.revision,3);
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT count(*)::int n FROM public.published_contents WHERE id=$1",[created.id])).rows[0].n,0);await owner.query("RESET ROLE");
 assert.equal((await first.query(save,[null,null,"faq","Test","Linked FAQ","Answer",null,1,true,actor,"https://evil.test","Bad"])).rows[0].data.result,"invalid");
 const linked=(await first.query(save,[null,null,"faq","Test","Linked FAQ","Answer",null,1,true,actor,"/programs","교육과정 보기"])).rows[0].data;assert.equal(linked.result,"saved");
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT link_path FROM public.published_contents WHERE id=$1",[linked.id])).rows[0].link_path,"/programs");await owner.query("RESET ROLE");
 const events=(await owner.query("SELECT revision,actor_id FROM academy.content_events WHERE content_id=$1 ORDER BY revision",[created.id])).rows;assert.equal(events.length,3);assert.ok(events.every((e)=>e.actor_id===actor));
 console.log("PASS: dev seed guarded; anon/auth see only public; admin-only save, audited rollback and two-session edit conflict verified");
}finally{for(const client of clients)await client.end().catch(()=>{});if(startAttempted)await instance.stop();const target=path.resolve(fixtureDir);if(path.dirname(target)===tempRoot&&path.basename(target).startsWith("academy-day16-"))await fs.rm(target,{recursive:true,force:true,maxRetries:30,retryDelay:300});}
