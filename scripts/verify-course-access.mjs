// Isolated in-memory PostgreSQL only: never connects to a Supabase project.
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const source = read("src/data/mock/courses.ts");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleData = { exports: {} };
vm.runInNewContext(compiled, { exports: moduleData.exports, module: moduleData });
const examples = JSON.parse(JSON.stringify(Object.values(moduleData.exports.legacyCourseCatalog)));

async function main() {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN");
    for (const file of ["supabase/migrations/20261107100302_academy_course_foundation.sql", "supabase/drafts/day08_public_courses.sql", "supabase/drafts/day08_dev_examples.sql"]) {
      await db.exec(read(file));
    }
    const stored = await db.query("SELECT slug, title, objectives FROM academy.courses ORDER BY slug");
    assert.equal(stored.rows.length, 5);
    for (const example of examples) {
      const course = stored.rows.find((item) => item.slug === example.slug);
      assert.ok(course);
      assert.equal(course.title, example.title);
      assert.deepEqual(course.objectives, example.objectives);
      const weeks = await db.query("SELECT w.week_number, w.title FROM academy.course_weeks w JOIN academy.courses c ON c.id=w.course_id WHERE c.slug=$1 ORDER BY w.week_number", [example.slug]);
      assert.equal(weeks.rows.length, 12);
      assert.deepEqual(weeks.rows.map((week) => week.week_number), Array.from({ length: 12 }, (_, i) => i + 1));
      assert.deepEqual(weeks.rows.map((week) => week.title), example.weeks);
    }
    await db.exec("INSERT INTO academy.courses (slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('private-draft','Private','Test','Test','Test','Test','draft'); INSERT INTO academy.course_weeks(course_id,week_number,title) SELECT id,1,'Private week' FROM academy.courses WHERE slug='private-draft'");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      const courses = await db.query("SELECT slug FROM public.published_courses ORDER BY slug");
      const weeks = await db.query("SELECT count(*)::int AS n FROM public.published_course_weeks");
      assert.equal(courses.rows.length, 5);
      assert.ok(!courses.rows.some((course) => course.slug === "private-draft"));
      assert.equal(weeks.rows[0].n, 60);
      const privileges = await db.query("SELECT has_table_privilege(current_user,'academy.offerings','SELECT') AS offering_read, has_table_privilege(current_user,'academy.courses','INSERT') AS course_write, has_table_privilege(current_user,'academy.course_weeks','UPDATE') AS week_write");
      assert.deepEqual(privileges.rows[0], { offering_read: false, course_write: false, week_write: false });
      await db.exec("RESET ROLE");
    }
    await assert.rejects(db.exec(read("supabase/drafts/day08_dev_examples.sql")), /Example seed requires empty course tables/);
    await db.exec("ROLLBACK");
    console.log("PASS: five courses and all 60 weeks match examples; private data and writes denied for anon/authenticated; non-empty seed rejected (isolated PostgreSQL only)");
  } finally {
    await db.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

