// Offline physical-backup drill. Creates only a new localhost PostgreSQL cluster with fictional data.
// It does not accept a database URL, remote host, existing data directory, or real credentials.
import assert from "node:assert/strict";
import {execFile,spawn} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import {promisify} from "node:util";

if(process.platform!=="win32"||process.arch!=="x64")throw Error("This drill currently supports Windows x64 only");
const moduleRoot=process.env.DAY12_PG_MODULE_ROOT;
if(!moduleRoot)throw Error("Set DAY12_PG_MODULE_ROOT to the isolated pinned PostgreSQL test packages");
const load=createRequire(path.join(path.resolve(moduleRoot),"package.json"));
const embeddedRequire=createRequire(load.resolve("embedded-postgres"));
const {default:EmbeddedPostgres}=await import(pathToFileURL(load.resolve("embedded-postgres")).href);
const {pg_ctl:pgCtl,postgres:postgresBin}=await import(pathToFileURL(embeddedRequire.resolve("@embedded-postgres/windows-x64")).href);
const {gracefulExit}=await import(pathToFileURL(embeddedRequire.resolve("exit-hook")).href);
const {Client}=load("pg");const execute=promisify(execFile);
const reserve=()=>new Promise((resolve,reject)=>{const socket=net.createServer();socket.on("error",reject);socket.listen(0,"127.0.0.1",()=>{const port=socket.address().port;socket.close(err=>err?reject(err):resolve(port));});});
const tempRoot=await fs.realpath(os.tmpdir());
const root=await fs.realpath(await fs.mkdtemp(path.join(tempRoot,"academy-day22-")));
if(path.dirname(root)!==tempRoot||!path.basename(root).startsWith("academy-day22-"))throw Error("Unsafe fixture directory");
const target=(name)=>{const result=path.resolve(root,name);if(path.dirname(result)!==root)throw Error("Unsafe target");return result;};
const source=target("source"),backup=target("backup"),restore=target("restore"),quarantine=target("quarantine");
const running=new Set(),clients=new Set();let sourcePort=await reserve(),restorePort=await reserve();while(restorePort===sourcePort)restorePort=await reserve();
const password=crypto.randomBytes(24).toString("base64url"),common={user:"postgres",password,database:"postgres",host:"127.0.0.1",connectionTimeoutMillis:5000};
const instance=new EmbeddedPostgres({databaseDir:source,user:"postgres",password,port:sourcePort,persistent:true,autoRehydrateSymlinks:true,onLog:()=>{},onError:()=>{}});
const ctl=(args)=>new Promise((resolve,reject)=>{const child=spawn(pgCtl,args,{windowsHide:true,stdio:"ignore"});let settled=false;const done=(error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve();};const timer=setTimeout(()=>{child.kill();done(Error("Local pg_ctl timed out"));},45000);child.once("error",()=>done(Error("Local pg_ctl could not start")));child.once("exit",code=>done(code===0?null:Error(`Local pg_ctl exited with code ${code}`)));});
const isRunning=async(dir)=>{try{await execute(pgCtl,["status","-D",dir],{timeout:15000,windowsHide:true});return true;}catch(error){if(error.code===3)return false;throw Error("Unable to verify fixture server state");}};
const start=async(dir,port,logName)=>{running.add(dir);try{await ctl(["start","-D",dir,"-p",postgresBin,"-l",target(logName),"-o",`-p ${port} -h 127.0.0.1`,"-w","-t","30"]);if(!await isRunning(dir))throw Error("Fixture server did not start");}catch(error){cleanupSafe=false;throw error;}};
const stop=async(dir)=>{if(!running.has(dir))return;if(await isRunning(dir))await ctl(["stop","-D",dir,"-m","fast","-w","-t","30"]);if(await isRunning(dir))throw Error("Fixture server still running");await assert.rejects(fs.stat(path.join(dir,"postmaster.pid")),{code:"ENOENT"});running.delete(dir);};
const connect=async(port)=>{const client=new Client({...common,port});await client.connect();clients.add(client);return client;};
const close=async(client)=>{await client.end();clients.delete(client);};
async function manifest(dir){const entries=[];async function visit(current){for(const entry of await fs.readdir(current,{withFileTypes:true})){const file=path.join(current,entry.name),stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error("Symbolic links are not supported by this drill");if(stat.isDirectory())await visit(file);else if(stat.isFile()){const hash=crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");entries.push([path.relative(dir,file).replaceAll("\\","/"),stat.size,hash]);}else throw Error("Unexpected filesystem entry");}}await visit(dir);return entries.sort((a,b)=>a[0].localeCompare(b[0]));}
const readSql=(p)=>fs.readFile(path.join(process.cwd(),p),"utf8");
const sqlFiles=["supabase/migrations/20261107100302_academy_course_foundation.sql","supabase/drafts/day08_public_courses.sql","supabase/drafts/day09_public_offerings.sql","supabase/drafts/day10_admin_management.sql","supabase/drafts/day11_application_data.sql","supabase/drafts/day12_atomic_applications.sql","supabase/drafts/day14_admin_applications.sql","supabase/drafts/day15_inquiries.sql","supabase/drafts/day16_content_management.sql","supabase/drafts/day17_assets.sql","supabase/drafts/day18_brand.sql","supabase/drafts/day19_activity.sql"];
const tables=["courses","course_weeks","offerings","applications","application_private","application_status_events","inquiries","inquiry_private","inquiry_events","contents","content_events","assets","asset_events","brand_settings","brand_events","audit_log_reads"];
async function inspect(client){const values={};for(const table of tables){const q=await client.query(`SELECT count(*)::int n,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) digest FROM academy.${table} t`);values[table]=q.rows[0];}
 const sources=(await client.query("SELECT name,sha256 FROM fixture_meta.schema_sources ORDER BY name")).rows;
 const relations=(await client.query("SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='academy' AND c.relkind='r' ORDER BY c.relname")).rows;
 const policies=(await client.query("SELECT tablename,policyname,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname='academy' ORDER BY tablename,policyname")).rows;
 const constraints=(await client.query("SELECT r.relname,c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='academy' ORDER BY r.relname,c.conname")).rows;
 const acl=(await client.query("SELECT has_function_privilege('anon','public.academy_submit_application(uuid,uuid,text,text,text)','EXECUTE') AS anon_submit,has_function_privilege('authenticated','public.academy_admin_review_application(uuid,uuid)','EXECUTE') AS auth_review,has_function_privilege('service_role','public.academy_admin_review_application(uuid,uuid)','EXECUTE') AS service_review,has_table_privilege('anon','academy.application_private','SELECT') AS anon_private")).rows[0];
 const roles=(await client.query("SELECT rolname,rolcanlogin,rolbypassrls,rolinherit FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') ORDER BY rolname")).rows;
 const functions=(await client.query("SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') auth_execute,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND left(p.proname,8)='academy_' ORDER BY p.proname,args")).rows;
 const views=(await client.query("SELECT c.relname,c.reloptions,has_table_privilege('anon',c.oid,'SELECT') anon_select,has_table_privilege('authenticated',c.oid,'SELECT') auth_select FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND left(c.relname,10)='published_' ORDER BY c.relname")).rows;
 return {values,sources,relations,policies,constraints,acl,roles,functions,views};}
let failure=null,cleanupSafe=true;
try{
 console.log("STAGE: initialize isolated source cluster");await instance.initialise();await start(source,sourcePort,"source.log");const owner=await connect(sourcePort);
 await owner.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");await owner.query("CREATE SCHEMA fixture_meta; CREATE TABLE fixture_meta.schema_sources(name text PRIMARY KEY,sha256 text NOT NULL)");
 for(const file of sqlFiles){const sql=await readSql(file);await owner.query(sql);await owner.query("INSERT INTO fixture_meta.schema_sources(name,sha256) VALUES($1,$2)",[file,crypto.createHash("sha256").update(sql).digest("hex")]);}
 const course=crypto.randomUUID(),offering=crypto.randomUUID(),actor=crypto.randomUUID(),request=crypto.randomUUID(),asset=crypto.randomUUID();
 await owner.query("INSERT INTO academy.courses(id,slug,title,category,summary,audience,result_artifact,publication_state) VALUES($1,'fixture','Fictional course','AI','Fixture','Fixture','Fixture','published')",[course]);
 await owner.query("INSERT INTO academy.course_weeks(course_id,week_number,title) SELECT $1,n,'Fictional week '||n FROM generate_series(1,12) n",[course]);
 await owner.query("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public,enrollment_opens_at,enrollment_closes_at) VALUES($1,$2,2,'open',true,now()-interval '1 hour',now()+interval '1 hour')",[offering,course]);
 await owner.query("SET ROLE service_role");const submit="SELECT public.academy_submit_application($1,$2,$3,$4,$5) AS result";assert.equal((await owner.query(submit,[offering,request,"Fictional Person","01000001234","fixture-v1"])).rows[0].result,"accepted");await owner.query("RESET ROLE");
 const application=(await owner.query("SELECT id FROM academy.applications WHERE request_id=$1",[request])).rows[0].id;await owner.query("SET ROLE service_role");assert.equal((await owner.query("SELECT public.academy_admin_review_application($1,$2) data",[application,actor])).rows[0].data.result,"reviewed");
 const inquiryRequest=crypto.randomUUID();assert.equal((await owner.query("SELECT public.academy_submit_inquiry($1,'course','Fictional Sender','person@example.test','Fictional message','fixture-v1') result",[inquiryRequest])).rows[0].result,"accepted");await owner.query("RESET ROLE");const inquiry=(await owner.query("SELECT id FROM academy.inquiries WHERE request_id=$1",[inquiryRequest])).rows[0].id;
 await owner.query("SET ROLE service_role");await owner.query("SELECT public.academy_admin_read_inquiry($1,$2)",[inquiry,actor]);await owner.query("SELECT public.academy_admin_add_asset($1,'resource','Fictional file','Metadata only','application/pdf',100,$2)",[asset,actor]);await owner.query("SELECT public.academy_admin_save_brand(0,'Fictional academy','Fictional slogan',NULL,NULL,NULL,false,$1)",[actor]);await owner.query("SELECT public.academy_admin_read_activity('application',NULL,NULL,20,$1)",[actor]);await owner.query("RESET ROLE");
 await owner.query("INSERT INTO academy.contents(kind,category,title,body) VALUES('news','Test','Fictional notice','Fictional text')");const original=await inspect(owner);const expected={courses:1,course_weeks:12,offerings:1,applications:1,application_private:1,application_status_events:1,inquiries:1,inquiry_private:1,inquiry_events:1,contents:1,content_events:0,assets:1,asset_events:1,brand_settings:1,brand_events:1,audit_log_reads:1};for(const [table,count] of Object.entries(expected))assert.equal(original.values[table].n,count,table);assert.equal(original.roles.length,3);assert.ok(original.functions.length>=12);assert.equal(original.views.length,6);assert.ok(original.relations.every(row=>row.relrowsecurity));assert.deepEqual(original.acl,{anon_submit:false,auth_review:false,service_review:true,anon_private:false});
 await close(owner);await stop(source);console.log("STAGE: source stopped; create and hash complete snapshot");const sourceManifest=await manifest(source);await fs.cp(source,backup,{recursive:true,errorOnExist:true,force:false});const backupManifest=await manifest(backup);assert.deepEqual(backupManifest,sourceManifest);
 await fs.cp(backup,quarantine,{recursive:true,errorOnExist:true,force:false});await fs.writeFile(path.join(quarantine,"PG_VERSION"),"invalid-fixture\n");assert.notDeepEqual(await manifest(quarantine),backupManifest);console.log("PASS: stopped-cluster snapshot hash comparison; corrupted copy rejected before restore");
 console.log("STAGE: restart isolated source and add later fictional submission");await start(source,sourcePort,"source-restarted.log");const live=await connect(sourcePort);await live.query("SET ROLE service_role");assert.equal((await live.query(submit,[offering,crypto.randomUUID(),"Fictional Later","01000005678","fixture-v1"])).rows[0].result,"accepted");await live.query("RESET ROLE");assert.equal((await live.query("SELECT count(*)::int n FROM academy.applications")).rows[0].n,2);
 console.log("STAGE: copy snapshot to separate restore target");const began=performance.now();await fs.cp(backup,restore,{recursive:true,errorOnExist:true,force:false});assert.deepEqual(await manifest(restore),backupManifest);await start(restore,restorePort,"restore.log");const recovered=await connect(restorePort);const restored=await inspect(recovered);assert.deepEqual(restored,original);assert.equal((await recovered.query("SELECT count(*)::int n FROM academy.applications")).rows[0].n,1);
 await recovered.query("SET ROLE anon");assert.equal((await recovered.query("SELECT count(*)::int n FROM public.published_courses")).rows[0].n,1);await assert.rejects(recovered.query("SELECT * FROM academy.application_private"),/permission denied/);await recovered.query("RESET ROLE");
 await recovered.query("SET ROLE service_role");const read=(await recovered.query("SELECT public.academy_admin_search_applications('',NULL,NULL,21) data")).rows[0].data.items;assert.equal(read.length,1);assert.equal(read[0].status,"reviewed");await recovered.query("RESET ROLE");
 assert.equal((await live.query("SELECT count(*)::int n FROM academy.applications")).rows[0].n,2);const elapsed=((performance.now()-began)/1000).toFixed(1);console.log(`PASS: restored separate cluster, 16 tables, schema sources, policies, constraints, roles and reviewed application (local ${elapsed}s)`);console.log("PASS: snapshot excludes one later fictional submission; source remains separate and unchanged by restore");
 await close(recovered);await close(live);await stop(restore);await stop(source);
}catch(error){failure=error;}
finally{
 for(const client of [...clients]){try{await close(client);}catch{cleanupSafe=false;}}
 for(const dir of [...running]){try{await stop(dir);}catch{cleanupSafe=false;}}
 if(cleanupSafe){const resolved=await fs.realpath(root);if(path.dirname(resolved)===tempRoot&&path.basename(resolved).startsWith("academy-day22-"))await fs.rm(resolved,{recursive:true,force:true,maxRetries:30,retryDelay:300});else cleanupSafe=false;}
 if(!cleanupSafe){console.error("Fixture cleanup incomplete; check the isolated local test directory and processes.");process.exitCode=1;}
 if(failure){console.error("FAIL:",failure.message);process.exitCode=1;}
 if(cleanupSafe)console.log("PASS: isolated servers stopped and temporary fixture removed");
 gracefulExit(process.exitCode||0);
}
