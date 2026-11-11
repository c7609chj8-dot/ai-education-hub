// In-memory fictional security experiment, not a deployable migration.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const run = async (sql, args) => args ? db.query(sql, args) : (await db.exec(sql)).at(-1);
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const regular = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const target = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const other = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
try {
  await run("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated");
  for (const file of [
    "supabase/migrations/20261107100302_academy_course_foundation.sql",
    "supabase/migrations/20261108105949_public_course_catalog.sql",
    "supabase/drafts/day08_dev_examples.sql",
    "supabase/migrations/20261108143123_public_offerings_catalog.sql",
    "supabase/migrations/20261108183527_b03_5_admin_membership_and_offerings_v2.sql",
  ]) await run(await readFile(file,"utf8"));
  const course=(await run("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  await run("INSERT INTO private_education.offering_admins(user_id) VALUES ($1)",[admin]);
  await run("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public) VALUES ($1,$3,10,'draft',false),($2,$3,10,'draft',false)",[target,other,course]);

  // A dedicated NOLOGIN, NOBYPASSRLS role, not a member of API roles. The
  // hardcoded UUID is fictional and the policies exist only in this PGlite DB.
  await run(`
    CREATE ROLE b037_fixture_executor NOLOGIN NOINHERIT NOBYPASSRLS NOCREATEROLE NOCREATEDB;
    GRANT USAGE ON SCHEMA academy, private_education TO b037_fixture_executor;
    GRANT SELECT(id,status,is_public), DELETE ON academy.offerings TO b037_fixture_executor;
    GRANT EXECUTE ON FUNCTION private_education.is_admin_v2() TO b037_fixture_executor;
    CREATE POLICY b037_fixture_read ON academy.offerings FOR SELECT TO b037_fixture_executor
      USING (id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid AND status='draft' AND NOT is_public);
    CREATE POLICY b037_fixture_delete ON academy.offerings FOR DELETE TO b037_fixture_executor
      USING (id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid AND status='draft' AND NOT is_public);
    CREATE FUNCTION private_education.b037_fixture_cleanup(p_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
    DECLARE changed integer;
    BEGIN
      IF private_education.is_admin_v2() IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
      IF p_id IS DISTINCT FROM 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid THEN RAISE EXCEPTION 'Wrong target' USING ERRCODE='22023'; END IF;
      IF to_regclass('academy.applications') IS NOT NULL
         OR to_regclass('academy.payments') IS NOT NULL
         OR to_regclass('academy.attendance') IS NOT NULL
         OR to_regclass('academy.enrollments') IS NOT NULL
         OR EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid='academy.offerings'::regclass)
      THEN RAISE EXCEPTION 'References require review' USING ERRCODE='55000'; END IF;
      DELETE FROM academy.offerings WHERE id=p_id AND status='draft' AND NOT is_public;
      GET DIAGNOSTICS changed=ROW_COUNT;
      RETURN changed;
    END $body$;
    GRANT CREATE ON SCHEMA private_education TO b037_fixture_executor;
    ALTER FUNCTION private_education.b037_fixture_cleanup(uuid) OWNER TO b037_fixture_executor;
    REVOKE CREATE ON SCHEMA private_education FROM b037_fixture_executor;
    REVOKE ALL ON FUNCTION private_education.b037_fixture_cleanup(uuid) FROM PUBLIC,anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION private_education.b037_fixture_cleanup(uuid) TO authenticated;
    CREATE FUNCTION public.b037_fixture_cleanup(p_id uuid) RETURNS integer
      LANGUAGE sql SECURITY INVOKER SET search_path='' AS $body$
      SELECT private_education.b037_fixture_cleanup(p_id) $body$;
    REVOKE ALL ON FUNCTION public.b037_fixture_cleanup(uuid) FROM PUBLIC,anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION public.b037_fixture_cleanup(uuid) TO authenticated;
  `);
  const role=(await run("SELECT rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname='b037_fixture_executor'")).rows[0];
  assert.equal(role.rolcanlogin,false);assert.equal(role.rolbypassrls,false);
  assert.equal((await run("SELECT pg_has_role('authenticated','b037_fixture_executor','MEMBER') v")).rows[0].v,false);
  await run("SET ROLE anon");
  await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[target]),/permission denied/);
  await run("RESET ROLE; SET ROLE service_role");
  await assert.rejects(run("DELETE FROM academy.offerings WHERE id=$1",[target]),/permission denied/);
  await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[target]),/permission denied/);
  await run("RESET ROLE; SET ROLE authenticated");
  await run("SELECT set_config('request.jwt.claim.sub',$1,false)",[regular]);
  await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[target]),/Not authorized/);
  await assert.rejects(run("SELECT private_education.b037_fixture_cleanup($1)",[target]),/Not authorized/);
  await assert.rejects(run("DELETE FROM academy.offerings WHERE id=$1",[target]),/permission denied/);
  await run("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
  await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[other]),/Wrong target/);
  await run("RESET ROLE");
  await run("DELETE FROM private_education.offering_admins WHERE user_id=$1",[admin]);
  await run("SET ROLE authenticated");
  await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[target]),/Not authorized/);
  await run("RESET ROLE");
  await run("INSERT INTO private_education.offering_admins(user_id) VALUES ($1)",[admin]);
  for(const name of ["applications","payments","attendance","enrollments"]){
    await run(`CREATE TABLE academy.${name}(id integer); SET ROLE authenticated`);
    await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[target]),/References require review/);
    await run(`RESET ROLE; DROP TABLE academy.${name}`);
  }
  await run("RESET ROLE; CREATE TABLE academy.b037_fixture_reference(offering_id uuid REFERENCES academy.offerings(id)); SET ROLE authenticated");
  await assert.rejects(run("SELECT public.b037_fixture_cleanup($1)",[target]),/References require review/);
  await run("RESET ROLE; DROP TABLE academy.b037_fixture_reference; UPDATE academy.offerings SET status='scheduled' WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; SET ROLE authenticated");
  assert.equal((await run("SELECT public.b037_fixture_cleanup($1) AS n",[target])).rows[0].n,0);
  await run("RESET ROLE; UPDATE academy.offerings SET status='scheduled',is_public=true WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; SET ROLE authenticated");
  assert.equal((await run("SELECT public.b037_fixture_cleanup($1) AS n",[target])).rows[0].n,0);
  await run("RESET ROLE; UPDATE academy.offerings SET status='draft',is_public=false WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; SET ROLE authenticated");
  assert.equal((await run("SELECT public.b037_fixture_cleanup($1) AS n",[target])).rows[0].n,1);
  await run("RESET ROLE");
  assert.equal((await run("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[target])).rows[0].n,0);
  assert.equal((await run("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[other])).rows[0].n,1);
  assert.equal((await run("SELECT count(*)::int n FROM academy.courses")).rows[0].n,5);
  assert.equal((await run("SELECT count(*)::int n FROM academy.course_weeks")).rows[0].n,60);
  console.log("PASS: fictional cleanup design enforces identity, exact ID, private draft, FK fail-closed and role boundaries in PGlite");
} finally { await db.close(); }
