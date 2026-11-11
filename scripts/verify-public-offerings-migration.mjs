// Disposable PGlite only; this script never connects to an external database.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const read = (path) => readFile(path, "utf8");
const foundation = await read("supabase/migrations/20261107100302_academy_course_foundation.sql");
const courses = await read("supabase/migrations/20261108105949_public_course_catalog.sql");
const courseSeed = await read("supabase/drafts/day08_dev_examples.sql");
const candidate = await read("supabase/migrations/20261108143123_public_offerings_catalog.sql");
const scheduleSeed = await read("supabase/drafts/day09_dev_offerings.sql");

async function fresh() {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  await db.exec("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon, authenticated, service_role");
  await db.exec(foundation);
  await db.exec(courses);
  await db.exec(courseSeed);
  return db;
}
async function apply(db, text) {
  await db.exec("BEGIN");
  try { await db.exec(text); await db.exec("COMMIT"); }
  catch (error) { await db.exec("ROLLBACK"); throw error; }
}
async function pristine(db, view = false) {
  const result = await db.query(`SELECT
    (SELECT count(*)::int FROM academy.courses) courses,
    (SELECT count(*)::int FROM academy.course_weeks) weeks,
    EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='academy.offerings'::regclass AND attname='is_public' AND NOT attisdropped) AS added,
    to_regclass('public.published_offerings') IS NOT NULL AS view`);
  assert.deepEqual(result.rows[0], { courses: 5, weeks: 60, added: false, view });
}
async function rejectPreflight(setup, message, view = false) {
  const db = await fresh();
  try { await setup(db); await assert.rejects(apply(db, candidate), message); await pristine(db, view); }
  finally { await db.close(); }
}

const db = await fresh();
try {
  await apply(db, candidate);
  const view = (await db.query("SELECT reloptions FROM pg_class WHERE oid='public.published_offerings'::regclass")).rows[0];
  assert.ok(view.reloptions.includes("security_invoker=true"));
  assert.equal((await db.query("SELECT has_table_privilege('service_role','public.published_offerings','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS can")).rows[0].can, false);
  await db.exec(scheduleSeed);
  await db.exec(`
    INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state)
    VALUES ('private-test','Private','Test','Test','Test','Test','draft');
    INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'open',false FROM academy.courses WHERE slug='life-chatgpt';
    INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'draft',true FROM academy.courses WHERE slug='life-chatgpt';
    INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'open',true FROM academy.courses WHERE slug='private-test';
    INSERT INTO academy.offerings(course_id,capacity,status,is_public,enrollment_opens_at,enrollment_closes_at)
    SELECT id,10,'scheduled',true,'2026-11-10 09:00:00+09','2026-11-11 18:00:00+09' FROM academy.courses WHERE slug='life-chatgpt';`);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    const rows = (await db.query("SELECT * FROM public.published_offerings")).rows;
    assert.equal(rows.length, 6);
    assert.ok(rows.every((row) => row.course_slug !== "private-test" && row.status !== "draft"));
    const scheduled = rows.find((row) => row.enrollment_opens_at !== null);
    assert.equal(new Date(scheduled.enrollment_opens_at).toISOString(), "2026-11-10T00:00:00.000Z");
    assert.equal(new Date(scheduled.enrollment_closes_at).toISOString(), "2026-11-11T09:00:00.000Z");
    const grant = (await db.query("SELECT has_table_privilege(current_user,'academy.offerings','INSERT,UPDATE,DELETE') AS can_write, has_any_column_privilege(current_user,'academy.offerings','INSERT,UPDATE') AS can_write_col")).rows[0];
    assert.deepEqual(grant, { can_write: false, can_write_col: false });
    await assert.rejects(db.exec("INSERT INTO academy.offerings(course_id,capacity,status) VALUES ('00000000-0000-0000-0000-000000000000',1,'open')"), (e) => e.code === "42501");
    await assert.rejects(db.query("SELECT created_at FROM academy.offerings"), (e) => e.code === "42501");
    await db.exec("RESET ROLE");
  }
  await assert.rejects(db.exec("INSERT INTO academy.offerings(course_id,capacity,status) SELECT id,-1,'open' FROM academy.courses LIMIT 1"), (e) => e.code === "23514");
  await assert.rejects(db.exec("INSERT INTO academy.offerings(course_id,capacity,status,start_date,end_date) SELECT id,1,'open','2026-12-02','2026-12-01' FROM academy.courses LIMIT 1"), (e) => e.code === "23514");
  await assert.rejects(apply(db, candidate), /existing column, object or policy/);
  console.log("PASS: public offering RLS, published parent, private/draft exclusion, invoker view, minimal grants, dates, capacity and KST offsets");
} finally { await db.close(); }

await rejectPreflight((x) => x.exec("GRANT SELECT (capacity) ON academy.offerings TO anon"), /unexpected existing offering grants/);
await rejectPreflight((x) => x.exec("INSERT INTO academy.offerings(course_id,capacity,status) SELECT id,1,'draft' FROM academy.courses LIMIT 1"), /offerings table must be empty/);
await rejectPreflight((x) => x.exec("CREATE VIEW public.published_offerings AS SELECT 1 AS id"), /existing column, object or policy/, true);
console.log("PASS: candidate aborts on existing grants, rows and view without changing course data");
