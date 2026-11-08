// Disposable in-memory databases only: no remote database URL or credentials.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const schemaFiles = [
  "supabase/migrations/20261107100302_academy_course_foundation.sql",
  "supabase/drafts/day08_public_courses.sql",
  "supabase/drafts/day09_public_offerings.sql",
  "supabase/drafts/day16_content_management.sql",
];
const seeds = [
  "supabase/drafts/day08_dev_examples.sql",
  "supabase/drafts/day09_dev_offerings.sql",
  "supabase/drafts/day16_dev_content_examples.sql",
];
const sql = async (name) => fs.readFile(name, "utf8");
const fresh = async () => {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  for (const file of schemaFiles) await db.exec(await sql(file));
  return db;
};
const counts = async (db) => (await db.query(`SELECT
  (SELECT count(*)::int FROM academy.courses) AS courses,
  (SELECT count(*)::int FROM academy.course_weeks) AS weeks,
  (SELECT count(*)::int FROM academy.offerings) AS offerings,
  (SELECT count(*)::int FROM academy.contents) AS contents`)).rows[0];

const blank = await fresh();
let demo;
try {
  demo = await fresh();
  assert.deepEqual(await counts(blank), { courses: 0, weeks: 0, offerings: 0, contents: 0 });
  assert.deepEqual(await counts(demo), await counts(blank));
  for (const file of seeds) await demo.exec(await sql(file));
  const expected = { courses: 5, weeks: 60, offerings: 5, contents: 14 };
  assert.deepEqual(await counts(demo), expected);
  // Each seed owns a transaction. A rejected repeat must be rolled back before reuse.
  for (const file of seeds) {
    await assert.rejects(demo.exec(await sql(file)), /empty/i);
    await demo.exec("ROLLBACK");
    assert.deepEqual(await counts(demo), expected);
  }
  assert.deepEqual(await counts(blank), { courses: 0, weeks: 0, offerings: 0, contents: 0 });
  console.log("PASS: separate blank and demo databases; 5 courses, 60 weeks, 5 offerings, 14 contents; repeat seeds rejected without changing counts");
  console.log("NOTE: local PGlite SQL rehearsal only; no Supabase migration history, Auth, Storage, or remote data tested");
} finally {
  if (demo) await demo.close();
  await blank.close();
}
