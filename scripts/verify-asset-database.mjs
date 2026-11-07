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
const fixtureDir = await fs.mkdtemp(path.join(tempRoot, "academy-day17-"));
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
 await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");await owner.query(await sql("supabase/migrations/20261107100302_academy_course_foundation.sql"));await owner.query(await sql("supabase/drafts/day17_assets.sql"));
 const add="SELECT public.academy_admin_add_asset($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::int,$7::uuid) AS data";
 const update="SELECT public.academy_admin_update_asset($1::uuid,$2::int,$3::text,$4::text,$5::boolean,$6::uuid) AS data";
 const lookup="SELECT public.academy_public_asset_lookup($1::uuid) AS data";
 const id=crypto.randomUUID(),actor=crypto.randomUUID(),args=[id,"resource","Test document","Fictional", "application/pdf",200,actor];
 for(const role of ["anon","authenticated"]){await first.query(`SET ROLE ${role}`);await assert.rejects(first.query(add,args),/permission denied/);await assert.rejects(first.query(lookup,[id]),/permission denied/);await assert.rejects(first.query("SELECT object_key FROM academy.assets"),/permission denied/);await first.query("RESET ROLE");}
 await first.query("SET ROLE service_role");await second.query("SET ROLE service_role");assert.equal((await first.query(add,args)).rows[0].data.result,"saved");
 assert.equal((await first.query(lookup,[id])).rows[0].data,null);await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT count(*)::int n FROM public.published_assets WHERE id=$1",[id])).rows[0].n,0);await owner.query("RESET ROLE");
 await first.query("BEGIN");await second.query("BEGIN");assert.equal((await first.query(update,[id,1,"Published","Fictional",true,actor])).rows[0].data.revision,2);
 const waiting=second.query(update,[id,1,"Stale","Fictional",true,actor]);await waitForRowLock(owner,second.processID);await first.query("COMMIT");assert.equal((await waiting).rows[0].data.result,"conflict");await second.query("COMMIT");
 const published=(await first.query(lookup,[id])).rows[0].data;assert.equal(published.object_key,`assets/${id}.pdf`);assert.equal(published.byte_size,200);
 await owner.query("SET ROLE anon");assert.equal((await owner.query("SELECT count(*)::int n FROM public.published_assets WHERE id=$1",[id])).rows[0].n,1);await owner.query("RESET ROLE");
 await owner.query("REVOKE INSERT (asset_id,actor_id,revision) ON academy.asset_events FROM service_role");await assert.rejects(first.query(update,[id,2,"Should rollback","Fictional",false,actor]),/permission denied/);assert.equal((await owner.query("SELECT revision FROM academy.assets WHERE id=$1",[id])).rows[0].revision,2);await owner.query("GRANT INSERT (asset_id,actor_id,revision) ON academy.asset_events TO service_role");
 assert.equal((await first.query(update,[id,2,"Private","Fictional",false,actor])).rows[0].data.revision,3);assert.equal((await first.query(lookup,[id])).rows[0].data,null);
 assert.equal((await owner.query("SELECT count(*)::int n FROM academy.asset_events WHERE asset_id=$1",[id])).rows[0].n,3);
 assert.equal((await first.query(add,[crypto.randomUUID(),"outcome","Bad","Bad","application/pdf",10,actor])).rows[0].data.result,"invalid");
}finally{for(const client of clients)await client.end().catch(()=>{});if(startAttempted)await instance.stop();const target=path.resolve(fixtureDir);if(path.dirname(target)===tempRoot&&path.basename(target).startsWith("academy-day17-"))await fs.rm(target,{recursive:true,force:true,maxRetries:30,retryDelay:300});}

console.log("PASS: private-by-default metadata, role denial, publish/unpublish, concurrent edit conflict and audit rollback (no Storage service)");
gracefulExit(0); // Run the embedded-postgres shutdown hook after explicit cluster cleanup.
