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
const { gracefulExit } = await import(pathToFileURL(load.resolve("exit-hook")).href);
const reservePort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.on("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((err) => err ? reject(err) : resolve(port)); }); });
const tempRoot = path.resolve(os.tmpdir());
const fixtureDir = await fs.mkdtemp(path.join(tempRoot, "academy-day18-"));
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
 await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");await owner.query(await sql("supabase/migrations/20261107100302_academy_course_foundation.sql"));await owner.query(await sql("supabase/drafts/day18_brand.sql"));
 const save="SELECT public.academy_admin_save_brand($1::int,$2::text,$3::text,$4::text,$5::text,$6::text,$7::boolean,$8::uuid) data",actor=crypto.randomUUID();
 const args=[0,"Fake Academy","Fake slogan","office@example.test","010-0000-0000","Fictional address",false,actor];
 for(const role of ["anon","authenticated"]){await first.query(`SET ROLE ${role}`);await assert.rejects(first.query(save,args),/permission denied/);await assert.rejects(first.query("SELECT public.academy_admin_get_brand()"),/permission denied/);await first.query("RESET ROLE");}
 await first.query("SET ROLE service_role");await second.query("SET ROLE service_role");assert.equal((await first.query(save,args)).rows[0].data.revision,1);
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT count(*)::int n FROM public.published_brand_settings")).rows[0].n,0);await owner.query("RESET ROLE");
 assert.equal((await first.query(save,args)).rows[0].data.result,"conflict");
 await first.query("BEGIN");await second.query("BEGIN");const publish=[1,"Fake Academy","Fake slogan","office@example.test","010-0000-0000","Fictional address",true,actor];assert.equal((await first.query(save,publish)).rows[0].data.revision,2);
 const waiting=second.query(save,publish);await waitForRowLock(owner,second.processID);await first.query("COMMIT");assert.equal((await waiting).rows[0].data.result,"conflict");await second.query("COMMIT");
 for(const role of ["anon","authenticated"]){await owner.query(`SET ROLE ${role}`);const row=(await owner.query("SELECT name,email FROM public.published_brand_settings")).rows[0];assert.equal(row.email,"office@example.test");await owner.query("RESET ROLE");}
 await owner.query("REVOKE INSERT ON academy.brand_events FROM service_role");await assert.rejects(first.query(save,[2,"Other","Other",null,null,null,false,actor]),/permission denied/);assert.equal((await owner.query("SELECT revision FROM academy.brand_settings")).rows[0].revision,2);await owner.query("GRANT INSERT ON academy.brand_events TO service_role");
 assert.equal((await first.query(save,[2,"Fake Academy","Fake slogan",null,null,null,false,actor])).rows[0].data.revision,3);
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT count(*)::int n FROM public.published_brand_settings")).rows[0].n,0);await owner.query("RESET ROLE");
 assert.equal((await first.query(save,[3,"Fake","Slogan","bad email",null,null,true,actor])).rows[0].data.result,"invalid");assert.equal((await owner.query("SELECT count(*)::int n FROM academy.brand_events")).rows[0].n,3);
}finally{for(const client of clients)await client.end().catch(()=>{});if(startAttempted)await instance.stop();const target=path.resolve(fixtureDir);if(path.dirname(target)===tempRoot&&path.basename(target).startsWith("academy-day18-"))await fs.rm(target,{recursive:true,force:true,maxRetries:30,retryDelay:300});}
console.log("PASS: brand private/public visibility, role denial, conflict, audit rollback and input constraints (isolated PostgreSQL)");
gracefulExit(0);
