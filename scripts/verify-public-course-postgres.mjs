// New localhost PostgreSQL cluster and fictional data only; never accepts a remote DB URL.
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

if (process.platform !== "win32" || process.arch !== "x64") throw Error("This local PostgreSQL drill supports Windows x64 only");
const moduleRoot = process.env.DAY12_PG_MODULE_ROOT;
if (!moduleRoot) throw Error("Set DAY12_PG_MODULE_ROOT to isolated embedded-postgres@17.11.0-beta.19 and pg@8.23.1 packages");
const load = createRequire(path.join(path.resolve(moduleRoot), "package.json"));
const embeddedRequire = createRequire(load.resolve("embedded-postgres"));
const { default: EmbeddedPostgres } = await import(pathToFileURL(load.resolve("embedded-postgres")).href);
const { pg_ctl: pgCtl, postgres: postgresBin } = await import(pathToFileURL(embeddedRequire.resolve("@embedded-postgres/windows-x64")).href);
const { gracefulExit } = await import(pathToFileURL(embeddedRequire.resolve("exit-hook")).href);
const { Client } = load("pg"); const execute = promisify(execFile);
const reserve = () => new Promise((resolve,reject)=>{const s=net.createServer();s.on("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const tempRoot = await fs.realpath(os.tmpdir());
const root = await fs.realpath(await fs.mkdtemp(path.join(tempRoot,"academy-course-drill-")));
if(path.dirname(root)!==tempRoot||!path.basename(root).startsWith("academy-course-drill-"))throw Error("Unsafe temporary fixture");
const directory=path.join(root,"db"),port=await reserve(),password=crypto.randomBytes(24).toString("base64url");
const instance=new EmbeddedPostgres({databaseDir:directory,user:"postgres",password,port,persistent:true,autoRehydrateSymlinks:true,onLog:()=>{},onError:()=>{}});
const ctl=(args)=>new Promise((resolve,reject)=>{const child=spawn(pgCtl,args,{windowsHide:true,stdio:"ignore"});let settled=false;const done=e=>{if(settled)return;settled=true;clearTimeout(timer);if(e)reject(e);else resolve();};const timer=setTimeout(()=>{child.kill();done(Error("Local pg_ctl timed out"));},45000);child.once("error",()=>done(Error("Local pg_ctl could not start")));child.once("exit",code=>done(code===0?null:Error(`Local pg_ctl exited ${code}`)));});
const running=async()=>{try{await execute(pgCtl,["status","-D",directory],{timeout:15000,windowsHide:true});return true;}catch(error){if(error.code===3)return false;throw Error("Unable to verify local PostgreSQL status");}};
const clients=[];let started=false,cleanupSafe=true,failure=null;
const open=async()=>{const c=new Client({host:"127.0.0.1",port,user:"postgres",password,database:"postgres",connectionTimeoutMillis:5000});await c.connect();clients.push(c);return c;};
const sql=(file)=>fs.readFile(path.join(process.cwd(),file),"utf8");
const pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForLock(client,pid){for(let i=0;i<100;i++){const q=await client.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[pid]);if(q.rows[0]?.wait_event_type==="Lock")return;await pause(25);}throw Error("Expected seed lock wait not observed");}
try {
  await instance.initialise();
  try { await ctl(["start","-D",directory,"-p",postgresBin,"-l",path.join(root,"postgres.log"),"-o",`-p ${port} -h 127.0.0.1`,"-w","-t","30"]);started=true;if(!await running())throw Error("Local PostgreSQL failed to start"); }
  catch(error){cleanupSafe=false;throw error;}
  const owner=await open(),first=await open(),second=await open();
  assert.match((await owner.query("SELECT version() AS v")).rows[0].v,/PostgreSQL 17\.11/);
  await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  await owner.query("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon, authenticated, service_role");
  await owner.query(await sql("supabase/migrations/20261107100302_academy_course_foundation.sql"));
  await owner.query("BEGIN");
  await owner.query(await sql("supabase/migrations/20261108105949_public_course_catalog.sql"));
  await first.query("BEGIN");
  const concurrentWrite=first.query("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact) VALUES ('fictional-lock','Fictional','Test','Test','Test','Test')");
  await waitForLock(owner,first.processID);
  await owner.query("COMMIT");await concurrentWrite;await first.query("ROLLBACK");
  const seed=await sql("supabase/drafts/day08_dev_examples.sql");
  await owner.query("BEGIN; LOCK TABLE academy.courses, academy.course_weeks IN SHARE ROW EXCLUSIVE MODE");
  const tasks=[first.query(seed).then(()=>({ok:true}),error=>({ok:false,error})),second.query(seed).then(()=>({ok:true}),error=>({ok:false,error}))];
  await waitForLock(owner,first.processID);await waitForLock(owner,second.processID);await owner.query("COMMIT");
  const result=await Promise.all(tasks);assert.equal(result.filter(item=>item.ok).length,1);
  assert.match(result.find(item=>!item.ok).error.message,/Example seed requires empty course tables/);
  await first.query("ROLLBACK");await second.query("ROLLBACK");
  assert.deepEqual((await owner.query("SELECT (SELECT count(*)::int FROM academy.courses) courses,(SELECT count(*)::int FROM academy.course_weeks) weeks")).rows[0],{courses:5,weeks:60});
  for(const role of ["anon","authenticated"]){await first.query(`SET ROLE ${role}`);assert.equal((await first.query("SELECT count(*)::int n FROM public.published_courses")).rows[0].n,5);assert.equal((await first.query("SELECT count(*)::int n FROM public.published_course_weeks")).rows[0].n,60);await assert.rejects(first.query("DELETE FROM academy.courses"),error=>error.code==="42501");await first.query("RESET ROLE");}
  console.log("PASS: PostgreSQL 17.11 migration lock blocks concurrent writer until commit; concurrent seed lock admits exactly one run, 5/60 rows and public roles cannot delete");
} catch(error){failure=error;}
finally {
 for(const c of clients)await c.end().catch(()=>{});
 try {if(started&&await running())await ctl(["stop","-D",directory,"-m","fast","-w","-t","30"]);if(started&&await running())throw Error("Local PostgreSQL still running");if(started)await assert.rejects(fs.stat(path.join(directory,"postmaster.pid")),{code:"ENOENT"});}catch{cleanupSafe=false;}
 if(cleanupSafe){const resolved=await fs.realpath(root);if(resolved===root&&path.dirname(resolved)===tempRoot&&path.basename(resolved).startsWith("academy-course-drill-"))await fs.rm(resolved,{recursive:true,force:true,maxRetries:30,retryDelay:300});else cleanupSafe=false;}
 if(!cleanupSafe){console.error("Fixture cleanup incomplete; check isolated local test processes and directory.");process.exitCode=1;}
 if(failure){console.error("FAIL:",failure.message);process.exitCode=1;}
 if(cleanupSafe)console.log("PASS: isolated PostgreSQL stopped and temporary fixture removed");
 gracefulExit(process.exitCode||0);
}
