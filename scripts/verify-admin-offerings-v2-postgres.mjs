// Disposable localhost PostgreSQL only. Never accepts a remote connection string.
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
import { verifyOfferingV2 } from "./verify-admin-offerings-v2-cases.mjs";
import { verifyCleanupPostgres } from "./verify-b03-8-cleanup-postgres-cases.mjs";

if(process.platform!=="win32"||process.arch!=="x64")throw Error("Fixture requires Windows x64");
const modules=process.env.DAY12_PG_MODULE_ROOT;
if(!modules)throw Error("Set DAY12_PG_MODULE_ROOT to the isolated test dependencies");
const load=createRequire(path.join(path.resolve(modules),"package.json"));
const embeddedRequire=createRequire(load.resolve("embedded-postgres"));
const {default:EmbeddedPostgres}=await import(pathToFileURL(load.resolve("embedded-postgres")).href);
const {pg_ctl:pgCtl,postgres:postgresBin}=await import(pathToFileURL(embeddedRequire.resolve("@embedded-postgres/windows-x64")).href);
const {gracefulExit}=await import(pathToFileURL(embeddedRequire.resolve("exit-hook")).href);
const {Client}=load("pg"), execute=promisify(execFile);
const reserve=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const tempRoot=await fs.realpath(os.tmpdir());
const root=await fs.realpath(await fs.mkdtemp(path.join(tempRoot,"academy-offering-v2-")));
if(path.dirname(root)!==tempRoot||!path.basename(root).startsWith("academy-offering-v2-"))throw Error("Unsafe temporary fixture");
const directory=path.join(root,"db"),port=await reserve(),password=crypto.randomBytes(24).toString("base64url");
const instance=new EmbeddedPostgres({databaseDir:directory,user:"cluster_admin",password,port,persistent:true,autoRehydrateSymlinks:true,onLog:()=>{},onError:()=>{}});
const ctl=(args)=>new Promise((resolve,reject)=>{const p=spawn(pgCtl,args,{windowsHide:true,stdio:"ignore"});const timer=setTimeout(()=>{p.kill();reject(Error("pg_ctl timed out"));},45000);p.once("error",e=>{clearTimeout(timer);reject(e)});p.once("exit",code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error(`pg_ctl exited ${code}`))})});
const running=async()=>{try{await execute(pgCtl,["status","-D",directory],{timeout:15000,windowsHide:true});return true}catch(e){if(e.code===3)return false;throw Error("Cannot verify PostgreSQL status")}};
let started=false,cleanupSafe=true,failure=null,client,first,second,observer;
try {
  await instance.initialise();
  try{await ctl(["start","-D",directory,"-p",postgresBin,"-l",path.join(root,"postgres.log"),"-o",`-p ${port} -h 127.0.0.1`,"-w","-t","30"]);started=true;if(!await running())throw Error("PostgreSQL did not start");}catch(e){cleanupSafe=false;throw e}
  client=new Client({host:"127.0.0.1",port,user:"cluster_admin",password,database:"postgres",connectionTimeoutMillis:5000});
  await client.connect();
  assert.match((await client.query("SELECT version() AS v")).rows[0].v,/PostgreSQL 17\.11/);
  // Model the important hosted constraints: migration postgres is NOT a
  // superuser, auth is owned by a separate role, and auth USAGE is not grantable.
  await client.query(`
    CREATE ROLE postgres LOGIN CREATEROLE BYPASSRLS;
    CREATE ROLE supabase_admin NOLOGIN;
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT anon,authenticated,service_role TO postgres WITH ADMIN OPTION;
    GRANT CREATE ON DATABASE postgres TO postgres;
    GRANT CREATE ON SCHEMA public TO postgres;
    CREATE SCHEMA auth AUTHORIZATION supabase_admin;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    ALTER FUNCTION auth.uid() OWNER TO supabase_admin;
    GRANT USAGE ON SCHEMA auth TO postgres,anon,authenticated,service_role;
    CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $trigger$
    DECLARE cmd record; tbl name;
    BEGIN
      FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
        WHERE command_tag IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
          AND object_type IN ('table','partitioned table') LOOP
        IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public')
           AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
           AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
          BEGIN
            SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid=cmd.objid;
            EXECUTE format('alter table if exists %I.%I enable row level security',cmd.schema_name,tbl);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      END LOOP;
    END;
    $trigger$;
    ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;
    CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') EXECUTE FUNCTION public.rls_auto_enable();
  `);
  await client.query("SET SESSION AUTHORIZATION postgres");
  const privileges=(await client.query("SELECT r.rolsuper,r.rolcreaterole,r.rolbypassrls,has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') AS auth_grant FROM pg_roles r WHERE r.rolname=current_user")).rows[0];
  assert.equal(privileges.rolsuper,false);assert.equal(privileges.rolcreaterole,true);assert.equal(privileges.rolbypassrls,true);assert.equal(privileges.auth_grant,false);
  await verifyOfferingV2(client,{preconfigured:true,checkRollback:true});
  assert.equal((await client.query("SELECT evtenabled FROM pg_event_trigger WHERE evtname='ensure_rls'")).rows[0].evtenabled,"O");
  await client.query("DROP TABLE academy.applications");
  first=new Client({host:"127.0.0.1",port,user:"cluster_admin",password,database:"postgres"});
  second=new Client({host:"127.0.0.1",port,user:"cluster_admin",password,database:"postgres"});
  observer=new Client({host:"127.0.0.1",port,user:"cluster_admin",password,database:"postgres"});
  await Promise.all([first.connect(),second.connect(),observer.connect()]);
  for(const c of [first,second])await c.query("SET SESSION AUTHORIZATION postgres");
  const course=(await client.query("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  const save="SELECT public.academy_admin_save_offering_v2($1::uuid,true,$2::uuid,'2027-03-01','2027-05-01','2027-01-01T00:00:00Z','2027-02-01T00:00:00Z','Online',20,'open',true) AS result";
  for(const c of [first,second])await c.query("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false); BEGIN");
  assert.equal((await first.query(save,["11111111-1111-4111-8111-111111111111",course])).rows[0].result,"saved");
  const raced=second.query(save,["22222222-2222-4222-8222-222222222222",course]).then(result=>({result}),error=>({error}));
  let locked=false;for(let i=0;i<100;i++){const q=await observer.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[second.processID]);if(q.rows[0]?.wait_event_type==="Lock"){locked=true;break}await new Promise(r=>setTimeout(r,25))}
  assert.equal(locked,true,"concurrent duplicate must wait for the first transaction");
  await first.query("COMMIT");const outcome=await raced;if(outcome.error)throw outcome.error;assert.equal(outcome.result.rows[0].result,"duplicate");await second.query("COMMIT");
  console.log("PASS: concurrent duplicates serialize and produce one offering");
  const draftSave="SELECT public.academy_admin_save_offering_v2($1::uuid,true,$2::uuid,'2027-03-02','2027-05-18','2027-02-01T00:00:00Z','2027-02-28T09:00:00Z','가상 검증',10,'draft',false) AS result";
  const draftOne="33333333-3333-4333-8333-333333333333", draftTwo="44444444-4444-4444-8444-444444444444";
  const publicBefore=(await client.query("SELECT count(*)::int n FROM public.published_offerings")).rows[0].n;
  await first.query("BEGIN");await second.query("BEGIN");
  assert.equal((await first.query(draftSave,[draftOne,course])).rows[0].result,"saved");
  const draftRace=second.query(draftSave,[draftTwo,course]).then(result=>({result}),error=>({error}));
  let draftLocked=false;for(let i=0;i<100;i++){const q=await observer.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[second.processID]);if(q.rows[0]?.wait_event_type==="Lock"){draftLocked=true;break}await new Promise(r=>setTimeout(r,25))}
  assert.equal(draftLocked,true,"private draft duplicate must wait for the first transaction");
  await first.query("COMMIT");const draftOutcome=await draftRace;if(draftOutcome.error)throw draftOutcome.error;assert.equal(draftOutcome.result.rows[0].result,"duplicate");await second.query("COMMIT");
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id IN ($1::uuid,$2::uuid)",[draftOne,draftTwo])).rows[0].n,1);
  assert.equal((await client.query("SELECT count(*)::int n FROM public.published_offerings")).rows[0].n,publicBefore);
  assert.equal((await client.query("DELETE FROM academy.offerings WHERE id=$1 RETURNING id",[draftOne])).rows.length,1);
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id IN ($1::uuid,$2::uuid)",[draftOne,draftTwo])).rows[0].n,0);
  console.log("PASS: concurrent private drafts produce one row, remain unpublished and are removed from the isolated DB");
  await verifyCleanupPostgres({client,first,second,observer,course});
  console.log("PASS: PostgreSQL 17.11 non-superuser, non-grantable auth schema and enabled ensure_rls trigger");
}catch(e){failure=e;}
finally {
  for(const c of [first,second,observer,client])if(c)await c.end().catch(()=>{});
  try{if(started&&await running())await ctl(["stop","-D",directory,"-m","fast","-w","-t","30"]);if(started&&await running())throw Error("PostgreSQL still running");if(started)await assert.rejects(fs.stat(path.join(directory,"postmaster.pid")),{code:"ENOENT"});}catch{cleanupSafe=false}
  if(cleanupSafe){const resolved=await fs.realpath(root);if(resolved===root&&path.dirname(resolved)===tempRoot&&path.basename(resolved).startsWith("academy-offering-v2-"))await fs.rm(resolved,{recursive:true,force:true,maxRetries:30,retryDelay:300});else cleanupSafe=false}
  if(!cleanupSafe){console.error("Fixture cleanup incomplete; inspect the isolated local test process.");process.exitCode=1}
  if(failure){console.error(`FAIL: ${failure.message}`);process.exitCode=1}
  if(cleanupSafe)console.log("PASS: isolated PostgreSQL stopped and fixture removed");
  gracefulExit(process.exitCode||0);
}
