// Isolated in-memory PostgreSQL only: never connects to a Supabase project.
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const foundation = "supabase/migrations/20261107100302_academy_course_foundation.sql";
const coursePolicy = "supabase/drafts/day08_public_courses.sql";
const courseSeed = "supabase/drafts/day08_dev_examples.sql";
const schedulePolicy = "supabase/drafts/day09_public_offerings.sql";
const scheduleSeed = "supabase/drafts/day09_dev_offerings.sql";

async function setup(withCourses) {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN");
  for (const file of [foundation, coursePolicy, ...(withCourses ? [courseSeed] : []), schedulePolicy]) await db.exec(read(file));
  return db;
}

async function main() {
  const db = await setup(true);
  try {
    await db.exec(read(scheduleSeed));
    const js = ts.transpileModule(read("src/data/mock/courses.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const moduleData = { exports: {} };
    vm.runInNewContext(js, { exports: moduleData.exports, module: moduleData });
    const examples = JSON.parse(JSON.stringify(moduleData.exports.sampleOfferings));
    const seeded = await db.query("SELECT c.slug, o.start_date, o.end_date, o.location, o.capacity, o.status, o.is_public FROM academy.offerings o JOIN academy.courses c ON c.id=o.course_id");
    assert.equal(seeded.rows.length, 5);
    const statuses = { "모집중": "open", "마감임박": "open", "마감": "closed", "예정": "scheduled" };
    const day = (value) => new Date(value).toISOString().slice(0, 10);
    for (const example of examples) {
      const row = seeded.rows.find((item) => item.slug === example.course.slug);
      assert.ok(row);
      assert.equal(day(row.start_date), example.startDate);
      assert.equal(day(row.end_date), example.endDate);
      assert.equal(row.location, example.location);
      assert.equal(row.capacity, example.capacity);
      assert.equal(row.status, statuses[example.status]);
      assert.equal(row.is_public, true);
    }
    await db.exec("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('private-draft','Private','Test','Test','Test','Test','draft')");
    await db.exec("INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'open',false FROM academy.courses WHERE slug='life-chatgpt'; INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'draft',true FROM academy.courses WHERE slug='life-chatgpt'; INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'open',true FROM academy.courses WHERE slug='private-draft'; INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,10,'scheduled',true FROM academy.courses WHERE slug='life-chatgpt'");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      const rows = await db.query("SELECT * FROM public.published_offerings ORDER BY course_slug, start_date NULLS LAST");
      assert.equal(rows.rows.length, 6);
      assert.ok(rows.rows.every((row) => row.course_slug !== "private-draft" && row.status !== "draft"));
      assert.equal(rows.rows.filter((row) => row.start_date === null).length, 1);
      assert.ok(rows.rows.every((row) => !("enrolled_count" in row)));
      const rights = await db.query("SELECT has_table_privilege(current_user,'academy.offerings','INSERT') AS can_insert, has_table_privilege(current_user,'academy.offerings','UPDATE') AS can_update, has_table_privilege(current_user,'academy.offerings','DELETE') AS can_delete");
      assert.deepEqual(rights.rows[0], { can_insert: false, can_update: false, can_delete: false });
      await db.exec("RESET ROLE");
    }
    await assert.rejects(db.exec(read(scheduleSeed)), /Example schedule seed requires an empty offerings table/);
    await db.exec("ROLLBACK");
    console.log("PASS: five example dates and capacities match; explicit opt-in and published parent enforced for anon/authenticated; drafts, private courses and writes blocked; date-null and duplicate seed checked (isolated PostgreSQL only)");
  } finally { await db.close(); }
  const empty = await setup(false);
  try {
    await assert.rejects(empty.exec(read(scheduleSeed)), /Example schedule requires the five published example courses/);
    await empty.exec("ROLLBACK");
    console.log("PASS: seed rejects missing published example courses");
  } finally { await empty.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
