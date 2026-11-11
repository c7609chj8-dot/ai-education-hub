// In-memory PostgreSQL with fictional fixtures. No URL, credentials, or remote client.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { verifyOfferingV2 } from "./verify-admin-offerings-v2-cases.mjs";

const db = new PGlite();
const adapter = {
  query: async (sql, parameters) => parameters
    ? db.query(sql, parameters)
    : (await db.exec(sql)).at(-1),
};
const candidate = await readFile("supabase/drafts/b04_day01_application_schema.sql", "utf8");
const rollback = await readFile("supabase/drafts/b04_day01_application_rollback.sql", "utf8");
const tables = ["application_notices", "applications", "application_private", "application_status_events"];
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const saveSql = "SELECT public.academy_admin_save_offering_v2($1::uuid,$2::boolean,$3::uuid,$4::date,$5::date,$6::timestamptz,$7::timestamptz,$8::text,$9::integer,$10::text,$11::boolean) AS result";

async function transaction(sql) {
  await db.exec("BEGIN");
  try {
    await db.exec(sql);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

async function snapshot() {
  const functions = await db.query(`
    SELECT p.oid::regprocedure::text AS signature, pg_get_functiondef(p.oid) AS definition,
           p.proacl::text AS acl, pg_get_userbyid(p.proowner) AS owner
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private_education')
    ORDER BY signature
  `);
  const core = await db.query(`
    SELECT c.relname, c.relrowsecurity, c.relacl::text AS acl,
           pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE (n.nspname = 'academy' AND c.relname IN ('courses','course_weeks','offerings'))
       OR (n.nspname = 'private_education' AND c.relname = 'offering_admins')
    ORDER BY n.nspname, c.relname
  `);
  const policies = await db.query(`
    SELECT * FROM pg_policies WHERE schemaname IN ('academy','private_education')
    ORDER BY schemaname, tablename, policyname
  `);
  const columns = await db.query(`
    SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'academy' AND table_name IN ('courses','course_weeks','offerings')
    ORDER BY table_name, ordinal_position
  `);
  const views = await db.query(`
    SELECT viewname, definition FROM pg_views
    WHERE schemaname = 'public' AND viewname IN ('published_courses','published_course_weeks','published_offerings')
    ORDER BY viewname
  `);
  return { functions: functions.rows, core: core.rows, policies: policies.rows, columns: columns.rows, views: views.rows };
}

async function asRole(role, action) {
  await db.exec(`SET ROLE ${role}`);
  try { await action(); } finally { await db.exec("RESET ROLE"); }
}

try {
  // The existing suite sets up the current course/offerings migrations and tests
  // v2 auth, revocation, create/update, RLS, and its application-integration guard.
  await verifyOfferingV2(adapter, { checkRollback: true });
  // This sentinel was created solely by that isolated suite to exercise the guard.
  await db.exec("DROP TABLE academy.applications");
  await db.exec(await readFile("scripts/fixtures/rls_auto_enable.postgres17.sql.txt", "utf8"));
  await db.exec(await readFile("supabase/migrations/20261108064422_restrict_rls_auto_enable_execute.sql", "utf8"));
  const before = await snapshot();

  // Deliberately permissive defaults verify explicit revocation on each new table.
  await db.exec("ALTER DEFAULT PRIVILEGES IN SCHEMA academy GRANT ALL ON TABLES TO PUBLIC, anon, authenticated, service_role, academy_offering_executor");
  await transaction(candidate);
  assert.deepEqual(await snapshot(), before);
  await assert.rejects(transaction(candidate), /already exists/);
  assert.deepEqual(await snapshot(), before);

  for (const table of tables) {
    const row = (await db.query("SELECT relrowsecurity FROM pg_class WHERE oid = $1::regclass", [`academy.${table}`])).rows[0];
    assert.equal(row.relrowsecurity, true);
    for (const role of ["anon", "authenticated", "service_role", "academy_offering_executor"]) {
      const allowed = (await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS allowed", [role, `academy.${table}`])).rows[0].allowed;
      assert.equal(allowed, false, `${role} has access to ${table}`);
      await asRole(role, async () => {
        await assert.rejects(db.query(`SELECT * FROM academy.${table}`), /permission denied/);
        await assert.rejects(db.query(`DELETE FROM academy.${table}`), /permission denied/);
      });
    }
  }
  console.log("PASS: candidate is atomic, rejects reapplication, and denies API/executor roles despite permissive defaults");

  const course = (await db.query("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  const first = randomUUID(), second = randomUUID();
  await db.query("INSERT INTO academy.offerings(id,course_id,capacity) VALUES ($1,$3,1),($2,$3,10)", [first, second, course]);
  const notice = "fictional-b04-v1";
  await db.query("INSERT INTO academy.application_notices(version,body,retention_statement) VALUES ($1,'Fictional notice','Policy pending; isolated fixtures only')", [notice]);
  const insertApplication = async (offering, request = randomUUID()) => {
    return (await db.query("INSERT INTO academy.applications(offering_id,request_id,notice_version) VALUES ($1,$2,$3) RETURNING id", [offering, request, notice])).rows[0].id;
  };
  const request = randomUUID();
  const application = await insertApplication(first, request);
  await db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Applicant','01000000001')", [application, first]);
  await assert.rejects(insertApplication(first, request), /duplicate key/);
  const other = await insertApplication(second, request);
  await assert.rejects(db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Other','01000000002')", [other, first]), /foreign key/);
  await db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Applicant','01000000001')", [other, second]);
  const duplicate = await insertApplication(first);
  await assert.rejects(db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Applicant','01000000001')", [duplicate, first]), /duplicate key/);
  await assert.rejects(db.query("INSERT INTO academy.application_private VALUES ($1,$2,' Trimmed ','01000000003')", [duplicate, first]), /check constraint/);
  await assert.rejects(db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Invalid','010-0000-0003')", [duplicate, first]), /check constraint/);
  await assert.rejects(db.query("INSERT INTO academy.applications(offering_id,request_id,notice_version) VALUES ($1,$2,'missing-notice')", [first, randomUUID()]), /foreign key/);
  await assert.rejects(db.query("DELETE FROM academy.offerings WHERE id=$1", [first]), /foreign key/);
  await assert.rejects(db.query("DELETE FROM academy.application_notices WHERE version=$1", [notice]), /foreign key/);
  console.log("PASS: notice/PII/offering references, scoped request IDs, duplicate keys, and candidate canonical-field constraints");

  const failedRequest = randomUUID();
  await db.exec("BEGIN");
  const partial = await insertApplication(second, failedRequest);
  await assert.rejects(db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Failure','invalid')", [partial, second]), /check constraint/);
  await db.exec("ROLLBACK");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM academy.applications WHERE request_id=$1", [failedRequest])).rows[0].n, 0);

  await assert.rejects(db.query("UPDATE academy.applications SET status='cancelled' WHERE id=$1", [application]), /check constraint/);
  await assert.rejects(db.query("UPDATE academy.applications SET seat_released_at=now() WHERE id=$1", [application]), /check constraint/);
  await db.query("UPDATE academy.applications SET status='cancelled',cancelled_at=now() WHERE id=$1", [application]);
  assert.equal((await db.query("SELECT seat_released_at IS NULL AS still_held FROM academy.applications WHERE id=$1", [application])).rows[0].still_held, true);
  await db.query("INSERT INTO academy.application_status_events(application_id,event_type,from_status,to_status,actor_kind,actor_id) VALUES ($1,'cancelled','received','cancelled','admin',$2)", [application, admin]);
  await assert.rejects(db.query("INSERT INTO academy.application_status_events(application_id,event_type,from_status,to_status,actor_kind) VALUES ($1,'reviewed','received','reviewed','admin')", [application]), /check constraint/);
  await assert.rejects(db.query("INSERT INTO academy.application_status_events(application_id,event_type,to_status,actor_kind,actor_id) VALUES ($1,'reviewed','reviewed','admin',$2)", [application, admin]), /check constraint/);
  await db.query("UPDATE academy.applications SET seat_released_at=now() WHERE id=$1", [application]);
  await assert.rejects(db.query("INSERT INTO academy.application_private VALUES ($1,$2,'Fictional Applicant','01000000001')", [duplicate, first]), /duplicate key/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM academy.applications WHERE retention_due_at IS NOT NULL")).rows[0].n, 0);
  console.log("PASS: failed PII insertion rolls back; cancellation does not implicitly release a seat or enable reapplication; retention remains undecided");

  // No new submission endpoint exists. The old v2 guard must continue failing closed.
  const saveArgs = [first, false, course, null, null, null, null, "Fictional location", 2, "draft", false];
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [admin]);
  await asRole("authenticated", async () => {
    assert.equal((await db.query("SELECT public.academy_is_admin_v2() AS allowed")).rows[0].allowed, true);
    assert.ok((await db.query("SELECT public.academy_admin_offerings_catalog_v2() AS data")).rows[0].data.courses.length);
    await assert.rejects(db.query(saveSql, saveArgs), /Application integration requires separate review/);
    await assert.rejects(db.query("SELECT * FROM academy.application_private"), /permission denied/);
  });
  const rpc = await db.query("SELECT to_regprocedure('public.academy_submit_application(uuid,uuid,text,text,text)') AS submit");
  assert.equal(rpc.rows[0].submit, null);
  await assert.rejects(transaction(rollback), /requires all candidate tables to be empty/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM academy.applications")).rows[0].n, 3);
  assert.deepEqual(await snapshot(), before);

  // Dispose of only this in-memory fixture's rows before testing empty rollback.
  await db.exec("DELETE FROM academy.application_status_events; DELETE FROM academy.application_private; DELETE FROM academy.applications; DELETE FROM academy.application_notices");
  await transaction(rollback);
  for (const table of tables) {
    assert.equal((await db.query("SELECT to_regclass($1) AS relation", [`academy.${table}`])).rows[0].relation, null);
  }
  assert.deepEqual(await snapshot(), before);
  await asRole("authenticated", async () => {
    assert.equal((await db.query(saveSql, saveArgs)).rows[0].result, "saved");
  });
  console.log("PASS: v2 guard preserved, nonempty rollback refused, empty rollback restores prior admin save and core definitions/ACL/RLS");
  console.log("LIMIT: day-1 DDL does not implement seat admission, transitions, or hosted JWT checks; true parallel last-seat tests belong to the transaction stage");
} finally {
  await db.close();
}
