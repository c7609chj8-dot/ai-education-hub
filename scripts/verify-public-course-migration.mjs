// Isolated PGlite only: no database URL, network connection or real data.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

process.on("uncaughtException", (error) => { console.error("FAIL:", error.message, error.code || ""); process.exitCode = 1; });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const foundation = read("supabase/migrations/20261107100302_academy_course_foundation.sql");
const migration = read("supabase/migrations/20261108105949_public_course_catalog.sql");
const seed = read("supabase/drafts/day08_dev_examples.sql");
const source = ts.transpileModule(read("src/data/mock/courses.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sampleModule = { exports: {} };
vm.runInNewContext(source, { exports: sampleModule.exports, module: sampleModule });
const examples = JSON.parse(JSON.stringify(sampleModule.exports.courses));
const noPrivilege = (error) => error?.code === "42501";

async function fresh() {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  // Mimic the observed per-object default ACL in the development project, only in this disposable database.
  await db.exec("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon, authenticated, service_role");
  await db.exec(foundation);
  return db;
}
async function atomic(db, sql) {
  await db.exec("BEGIN");
  try { await db.exec(sql); await db.exec("COMMIT"); }
  catch (error) { await db.exec("ROLLBACK"); throw error; }
}
async function assertPristine(db, viewExists = false, policyCount = 0) {
  const row = (await db.query("SELECT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='academy.courses'::regclass AND attname='objectives' AND attnum>0 AND NOT attisdropped) AS col, to_regclass('public.published_courses') IS NOT NULL AS view, (SELECT count(*)::int FROM pg_policies WHERE schemaname='academy' AND tablename IN ('courses','course_weeks')) AS policies")).rows[0];
  assert.deepEqual(row, { col: false, view: viewExists, policies: policyCount });
}

async function rejectUnsafe(setup, expected, viewExists = false, policyCount = 0) {
  const db = await fresh();
  try {
    await setup(db);
    await assert.rejects(atomic(db, migration), expected);
    await assertPristine(db, viewExists, policyCount);
  } finally { await db.close(); }
}

const db = await fresh();
try {
  await db.exec("CREATE VIEW public.fixture_acl_probe AS SELECT 1 AS n");
  assert.equal((await db.query("SELECT has_table_privilege('service_role','public.fixture_acl_probe','TRUNCATE') AS inherited")).rows[0].inherited,true);
  await db.exec("DROP VIEW public.fixture_acl_probe");
  await atomic(db, migration);
  for (const view of ["published_courses", "published_course_weeks"]) {
    const q = await db.query("SELECT c.reloptions,has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS service_priv, EXISTS(SELECT 1 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0) AS public_grant FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1", [view]);
    assert.ok(q.rows[0].reloptions.includes("security_invoker=true"));
    assert.equal(q.rows[0].service_priv, false);
    assert.equal(q.rows[0].public_grant, false);
    for (const role of ["anon", "authenticated"]) {
      const rights = await db.query("SELECT has_table_privilege($1,$2::regclass,'SELECT') AS can_read,has_table_privilege($1,$2::regclass,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS other_rights",[role,`public.${view}`]);
      assert.deepEqual(rights.rows[0],{can_read:true,other_rights:false});
    }
  }
  assert.deepEqual((await db.query("SELECT (SELECT count(*)::int FROM academy.courses) courses,(SELECT count(*)::int FROM academy.course_weeks) weeks")).rows[0], { courses: 0, weeks: 0 });
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.published_courses")).rows[0].n,0);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.published_course_weeks")).rows[0].n,0);
    await db.exec("RESET ROLE");
  }
  await db.exec(seed);
  const stored = await db.query("SELECT slug,title,objectives FROM academy.courses ORDER BY slug");
  assert.equal(stored.rows.length, 5); assert.equal(examples.length, 5);
  for (const example of examples) {
    const course = stored.rows.find((item) => item.slug === example.slug);
    assert.ok(course); assert.equal(course.title, example.title); assert.deepEqual(course.objectives, example.objectives);
    const weeks = await db.query("SELECT w.week_number,w.title FROM academy.course_weeks w JOIN academy.courses c ON c.id=w.course_id WHERE c.slug=$1 ORDER BY w.week_number", [example.slug]);
    assert.equal(weeks.rows.length,12); assert.deepEqual(weeks.rows.map((x)=>x.week_number),Array.from({length:12},(_,i)=>i+1));
    assert.deepEqual(weeks.rows.map((x)=>x.title),example.weeks);
  }
  await db.exec("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('private-draft','Private','Test','Test','Test','Test','draft'),('private-archived','Archived','Test','Test','Test','Test','archived'); INSERT INTO academy.course_weeks(course_id,week_number,title) SELECT id,1,'Private week' FROM academy.courses WHERE publication_state<>'published'");
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    for (const [table, expected] of [["courses",["audience","category","duration_hours","id","objectives","publication_state","result_artifact","slug","summary","title"]],["course_weeks",["course_id","title","week_number"]]]) {
      const granted = await db.query("SELECT a.attname FROM pg_attribute a WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped AND has_column_privilege(current_user,a.attrelid,a.attnum,'SELECT') ORDER BY a.attname",[`academy.${table}`]);
      assert.deepEqual(granted.rows.map((row)=>row.attname),expected);
    }
    const courses = await db.query("SELECT slug FROM public.published_courses ORDER BY slug");
    const weeks = await db.query("SELECT count(*)::int AS n FROM public.published_course_weeks");
    assert.equal(courses.rows.length,5); assert.ok(courses.rows.every((c)=>!c.slug.startsWith("private-"))); assert.equal(weeks.rows[0].n,60);
    assert.equal((await db.query("SELECT count(*)::int n FROM academy.courses WHERE publication_state <> 'published'")).rows[0].n,0);
    assert.equal((await db.query("SELECT count(*)::int n FROM academy.course_weeks WHERE title='Private week'")).rows[0].n,0);
    await assert.rejects(db.query("SELECT created_at FROM academy.courses"),noPrivilege);
    await assert.rejects(db.query("SELECT id FROM academy.course_weeks"),noPrivilege);
    for (const statement of ["INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact) VALUES ('bad','bad','bad','bad','bad','bad')", "UPDATE academy.courses SET title='bad'", "DELETE FROM academy.courses", "INSERT INTO academy.course_weeks(course_id,week_number,title) VALUES ('00000000-0000-4000-8000-000000000001',1,'bad')", "UPDATE academy.course_weeks SET title='bad'", "DELETE FROM academy.course_weeks"]) await assert.rejects(db.exec(statement),noPrivilege);
    await db.exec("RESET ROLE");
  }
  // The view must use the caller's column permissions, not its owner's privileges.
  await db.exec("BEGIN; REVOKE SELECT (title) ON academy.courses FROM anon; SET ROLE anon");
  await assert.rejects(db.query("SELECT title FROM public.published_courses"),noPrivilege);
  await db.exec("ROLLBACK");
  await assert.rejects(db.exec(seed), /Example seed requires empty course tables/); await db.exec("ROLLBACK");
  assert.equal((await db.query("SELECT count(*)::int n FROM academy.courses")).rows[0].n,7);
  await assert.rejects(atomic(db,migration),/Public course preflight/);
  console.log("PASS: invoker views, public/private rows and columns, write denial, five courses/60 weeks, seed and migration repeat guards");
} finally { await db.close(); }

await rejectUnsafe((x)=>x.exec("GRANT SELECT (capacity) ON academy.offerings TO anon"),/unexpected academy table or column privilege/);
await rejectUnsafe((x)=>x.exec("CREATE TABLE academy.unexpected(id integer)"),/unexpected academy objects/);
await rejectUnsafe((x)=>x.exec("CREATE VIEW public.published_courses AS SELECT 1 AS id"),/column or view name already exists/,true);
await rejectUnsafe((x)=>x.exec("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact) VALUES ('existing','Existing','Test','Test','Test','Test')"),/course tables must be empty/);
await rejectUnsafe((x)=>x.exec("CREATE ROLE unexpected_reader NOLOGIN; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO unexpected_reader"),/unexpected default view grantee/);
await rejectUnsafe((x)=>x.exec("GRANT USAGE ON SCHEMA academy TO anon"),/unexpected academy schema privilege/);
await rejectUnsafe((x)=>x.exec("ALTER TABLE academy.courses DISABLE ROW LEVEL SECURITY"),/table ownership, RLS or policies differ/);
await rejectUnsafe((x)=>x.exec("ALTER TABLE academy.courses FORCE ROW LEVEL SECURITY"),/table ownership, RLS or policies differ/);
await rejectUnsafe((x)=>x.exec("CREATE TYPE academy.unexpected_kind AS ENUM ('x')"),/unexpected academy types or operators/);
await rejectUnsafe((x)=>x.exec("CREATE POLICY unexpected_policy ON academy.courses FOR SELECT TO anon USING (true)"),/table ownership, RLS or policies differ/,false,1);
console.log("PASS: unexpected privileges/default grantees, new academy objects, view collisions and nonempty tables stop before changes");
