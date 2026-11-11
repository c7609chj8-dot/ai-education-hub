// Fictional cleanup design in a disposable localhost PostgreSQL cluster only.
// Not a deployable migration; no real UUID, user or project information.
import assert from "node:assert/strict";

export async function verifyCleanupPostgres({client,first,second,observer,course}) {
  const target="55555555-5555-4555-8555-555555555555";
  const other="66666666-6666-4666-8666-666666666666";
  const admin="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const regular="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await client.query("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public,location) VALUES ($1,$3,10,'draft',false,'b038-fixture'),($2,$3,10,'draft',false,'b038-other')",[target,other,course]);
  const saved=(await client.query("SELECT to_jsonb(o) AS row FROM academy.offerings o WHERE id=$1",[target])).rows[0].row;
  await client.query(`
    CREATE ROLE b038_fixture_executor NOLOGIN NOINHERIT NOBYPASSRLS NOCREATEROLE NOCREATEDB;
    GRANT b038_fixture_executor TO postgres;
    GRANT USAGE ON SCHEMA academy,private_education TO b038_fixture_executor;
    GRANT SELECT(id,status,is_public,location),DELETE ON academy.offerings TO b038_fixture_executor;
    GRANT EXECUTE ON FUNCTION private_education.is_admin_v2() TO b038_fixture_executor;
    CREATE POLICY b038_fixture_read ON academy.offerings FOR SELECT TO b038_fixture_executor
      USING(id='55555555-5555-4555-8555-555555555555'::uuid AND status='draft' AND NOT is_public AND location='b038-fixture');
    CREATE POLICY b038_fixture_delete ON academy.offerings FOR DELETE TO b038_fixture_executor
      USING(id='55555555-5555-4555-8555-555555555555'::uuid AND status='draft' AND NOT is_public AND location='b038-fixture');
    CREATE FUNCTION private_education.b038_fixture_cleanup(p_id uuid) RETURNS integer
      LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
    DECLARE changed integer;
    BEGIN
      IF private_education.is_admin_v2() IS NOT TRUE THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
      IF p_id IS DISTINCT FROM '55555555-5555-4555-8555-555555555555'::uuid THEN RAISE EXCEPTION 'Wrong target' USING ERRCODE='22023'; END IF;
      IF to_regclass('academy.applications') IS NOT NULL OR to_regclass('academy.payments') IS NOT NULL
         OR to_regclass('academy.attendance') IS NOT NULL OR to_regclass('academy.enrollments') IS NOT NULL
         OR EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid='academy.offerings'::regclass)
      THEN RAISE EXCEPTION 'References require review' USING ERRCODE='55000'; END IF;
      DELETE FROM academy.offerings WHERE id=p_id AND status='draft' AND NOT is_public AND location='b038-fixture';
      GET DIAGNOSTICS changed=ROW_COUNT;
      RETURN changed;
    END $fn$;
    GRANT CREATE ON SCHEMA private_education TO b038_fixture_executor;
    ALTER FUNCTION private_education.b038_fixture_cleanup(uuid) OWNER TO b038_fixture_executor;
    REVOKE CREATE ON SCHEMA private_education FROM b038_fixture_executor;
    REVOKE ALL ON FUNCTION private_education.b038_fixture_cleanup(uuid) FROM PUBLIC,anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION private_education.b038_fixture_cleanup(uuid) TO authenticated;
    CREATE FUNCTION public.b038_fixture_cleanup(p_id uuid) RETURNS integer
      LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT private_education.b038_fixture_cleanup(p_id) $fn$;
    REVOKE ALL ON FUNCTION public.b038_fixture_cleanup(uuid) FROM PUBLIC,anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION public.b038_fixture_cleanup(uuid) TO authenticated;
  `);
  const role=(await client.query("SELECT rolcanlogin,rolbypassrls,rolsuper,rolcreaterole FROM pg_roles WHERE rolname='b038_fixture_executor'")).rows[0];
  for(const key of ["rolcanlogin","rolbypassrls","rolsuper","rolcreaterole"])assert.equal(role[key],false);
  for(const name of ["anon","authenticated","service_role"])
    assert.equal((await client.query("SELECT pg_has_role($1,'b038_fixture_executor','MEMBER') v",[name])).rows[0].v,false);
  await client.query("SET ROLE anon");
  await assert.rejects(client.query("SELECT public.b038_fixture_cleanup($1)",[target]),/permission denied/);
  await client.query("RESET ROLE; SET ROLE service_role");
  await assert.rejects(client.query("DELETE FROM academy.offerings WHERE id=$1",[target]),/permission denied/);
  await client.query("RESET ROLE; SET ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[regular]);
  await assert.rejects(client.query("SELECT public.b038_fixture_cleanup($1)",[target]),/Not authorized/);
  await client.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
  await assert.rejects(client.query("SELECT public.b038_fixture_cleanup($1)",[other]),/Wrong target/);
  await client.query("RESET ROLE; CREATE TABLE academy.b038_fixture_reference(offering_id uuid REFERENCES academy.offerings(id)); SET ROLE authenticated");
  await assert.rejects(client.query("SELECT public.b038_fixture_cleanup($1)",[target]),/References require review/);
  await client.query("RESET ROLE; DROP TABLE academy.b038_fixture_reference; SET ROLE authenticated");
  await client.query("RESET ROLE; UPDATE academy.offerings SET location='changed-fixture' WHERE id='55555555-5555-4555-8555-555555555555'; SET ROLE authenticated");
  assert.equal((await client.query("SELECT public.b038_fixture_cleanup($1) n",[target])).rows[0].n,0);
  await client.query("RESET ROLE; UPDATE academy.offerings SET location='b038-fixture' WHERE id='55555555-5555-4555-8555-555555555555'; SET ROLE authenticated");
  await client.query("BEGIN");
  assert.equal((await client.query("SELECT public.b038_fixture_cleanup($1) n",[target])).rows[0].n,1);
  await client.query("ROLLBACK; RESET ROLE");
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[target])).rows[0].n,1);

  // The DELETE must recheck the draft predicate after a concurrent row update.
  await first.query("RESET ROLE; BEGIN");
  await first.query("UPDATE academy.offerings SET status='scheduled' WHERE id=$1",[target]);
  await second.query("RESET ROLE; SET ROLE authenticated");
  await second.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
  await second.query("BEGIN");
  let earlyOutcome=null;
  const waiting=second.query("SELECT public.b038_fixture_cleanup($1) n",[target]).then(result=>(earlyOutcome={result}),error=>(earlyOutcome={error}));
  let blocked=false;
  for(let i=0;i<100;i++){
    const row=(await observer.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[second.processID])).rows[0];
    if(row?.wait_event_type==="Lock"){blocked=true;break}
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(blocked,true,`Expected row lock; early result: ${earlyOutcome?.error?.message ?? JSON.stringify(earlyOutcome?.result?.rows ?? null)}`);
  await first.query("COMMIT");
  const outcome=await waiting;if(outcome.error)throw outcome.error;
  assert.equal(outcome.result.rows[0].n,0);
  await second.query("COMMIT");
  assert.equal((await client.query("SELECT status FROM academy.offerings WHERE id=$1",[target])).rows[0].status,"scheduled");
  await client.query("UPDATE academy.offerings SET status='draft' WHERE id=$1",[target]);
  await client.query("SET ROLE authenticated");
  assert.equal((await client.query("SELECT public.b038_fixture_cleanup($1) n",[target])).rows[0].n,1);
  await client.query("RESET ROLE");
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[target])).rows[0].n,0);
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[other])).rows[0].n,1);
  // Restore the fictional row in a rollback-only transaction as fixture owner.
  // This is not an authorized or tested restore procedure for the hosted DB.
  await client.query("BEGIN");
  await client.query("INSERT INTO academy.offerings SELECT (jsonb_populate_record(NULL::academy.offerings,$1::jsonb)).*",[JSON.stringify(saved)]);
  assert.equal((await client.query("SELECT to_jsonb(o)=$2::jsonb AS identical FROM academy.offerings o WHERE id=$1",[target,JSON.stringify(saved)])).rows[0].identical,true);
  await client.query("ROLLBACK");
  assert.equal((await client.query("SELECT count(*)::int n FROM academy.offerings WHERE id=$1",[target])).rows[0].n,0);
  console.log("PASS: isolated PostgreSQL cleanup design denies unauthorized/wrong targets, fails on FK, rolls back and rechecks concurrent row updates");
  console.log("PASS: fictional full-row restore matched inside rollback-only fixture transaction; hosted recovery remains unverified");
}
