// Disposable PGlite databases only. Never connects to Supabase or a database URL.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.ACADEMY_RLS_TEST_MODULE_ROOT;
if (!root) throw Error('Set ACADEMY_RLS_TEST_MODULE_ROOT to an isolated folder containing @electric-sql/pglite@0.4.5');
const {PGlite} = createRequire(path.join(path.resolve(root), 'package.json'))('@electric-sql/pglite');
const source = fs.readFileSync(path.join(scriptDir, 'fixtures', 'rls_auto_enable.postgres17.sql.txt'), 'utf8').replace(/\r\n/g, '\n');
const hash = crypto.createHash('md5').update(source).digest('hex');
assert.equal(hash, '846ec2fbff751d24b890656d63c3a9bf', 'Fixture definition changed');
const roles = ['anon', 'authenticated', 'service_role', 'authenticator', 'ddl_actor'];

async function scenario(nonSuperOwner) {
 const db = new PGlite();
 try {
  assert.match((await db.query('SELECT version() AS v')).rows[0].v, /PostgreSQL 17\./);
  await db.exec('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN; CREATE ROLE authenticator NOLOGIN; CREATE ROLE ddl_actor NOLOGIN; CREATE ROLE trigger_owner NOLOGIN; GRANT ddl_actor TO trigger_owner; GRANT USAGE, CREATE ON SCHEMA public TO ddl_actor');
  await db.exec(source);
  if (nonSuperOwner) await db.exec('ALTER FUNCTION public.rls_auto_enable() OWNER TO trigger_owner');
  await db.exec("CREATE EVENT TRIGGER ensure_rls ON ddl_command_end WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') EXECUTE FUNCTION public.rls_auto_enable()");
  assert.equal((await db.query("SELECT md5(pg_get_functiondef('public.rls_auto_enable()'::regprocedure)) AS hash")).rows[0].hash, hash);
  const creator = nonSuperOwner ? 'ddl_actor' : 'postgres';
  async function checkTables(prefix) {
   await db.exec(`SET ROLE ${creator}; CREATE TABLE public.${prefix}_plain (id int); CREATE TABLE public.${prefix}_ctas AS SELECT 1 AS id; SELECT 1 AS id INTO public.${prefix}_into; RESET ROLE;`);
   const rows=(await db.query(`SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE '${prefix}_%' AND c.relkind='r'`)).rows;
   assert.equal(rows.length,3); assert.ok(rows.every(row=>row.relrowsecurity));
  }
  for (const role of roles) {
   assert.equal((await db.query("SELECT has_function_privilege($1,'public.rls_auto_enable()','EXECUTE') AS ok",[role])).rows[0].ok,true);
   await db.exec(`SET ROLE ${role}`);
   await assert.rejects(db.exec('SELECT public.rls_auto_enable()'),/trigger functions can only be called as triggers/i);
   await db.exec('RESET ROLE');
  }
  await checkTables('before');
  const migration=fs.readFileSync(path.join(scriptDir,'..','supabase','migrations','20261108064422_restrict_rls_auto_enable_execute.sql'),'utf8');
  assert.equal(migration.trim(),'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;');
  await db.exec(migration);
  for (const role of roles) assert.equal((await db.query("SELECT has_function_privilege($1,'public.rls_auto_enable()','EXECUTE') AS ok",[role])).rows[0].ok,false);
  await checkTables('after');
  await db.exec(migration);
  const row=(await db.query("SELECT md5(pg_get_functiondef('public.rls_auto_enable()'::regprocedure)) AS hash,(SELECT count(*)::int FROM pg_event_trigger WHERE evtname='ensure_rls' AND evtenabled='O' AND evtfoid='public.rls_auto_enable()'::regprocedure) AS triggers")).rows[0];
  assert.equal(row.hash,hash);assert.equal(row.triggers,1);
  console.log(`PASS: ${nonSuperOwner?'non-superuser function owner and DDL actor':'function owner as DDL actor'}; three DDL forms before/after and repeat revoke`);
 } finally {await db.close();}
}
(async()=>{await scenario(false);await scenario(true);console.log('PASS: inherited EXECUTE removed for anon, authenticated, service_role, authenticator and ddl_actor; direct function calls failed even before revoke')})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1});
