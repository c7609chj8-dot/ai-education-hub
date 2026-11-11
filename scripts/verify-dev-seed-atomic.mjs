// Builds a single atomic statement from the approved seed, and tests it only
// against disposable in-memory PostgreSQL. It never connects to a remote DB.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const expectedHash = "3b847d7ffa324f84ffa57d9df68f3c076192a2791f416e21f210f1a7aa23bb76";
const normalize = (text) => text.replace(/\r\n/g, "\n").trim();
const sql = normalize(await readFile("supabase/drafts/day08_dev_examples.sql", "utf8"));
assert.equal(createHash("sha256").update(sql).digest("hex"), expectedHash, "seed hash mismatch");
const pattern = /^(?:--[^\n]*\n)*BEGIN;\s*(?:--[^\n]*\n)*\s*(LOCK TABLE academy\.courses, academy\.course_weeks IN SHARE ROW EXCLUSIVE MODE;)\s*(DO \$check\$[\s\S]*?END \$check\$;)\s*(INSERT INTO academy\.courses[\s\S]*?;)\s*(WITH sample\(slug, week_number, title\) AS \(VALUES[\s\S]*?;)\s*COMMIT;$/;
const match = sql.match(pattern);
assert.ok(match, "approved seed structure changed");

const parts = match.slice(1);
const expectedSlugs = ["life-chatgpt", "ai-work", "ai-ebook", "ai-instructor", "ai-business"];
const guard = `
  IF (SELECT count(*) FROM academy.courses) <> 5
     OR (SELECT count(*) FROM academy.course_weeks) <> 60
     OR EXISTS (
       SELECT 1 FROM academy.courses c LEFT JOIN academy.course_weeks w ON w.course_id=c.id
       GROUP BY c.id, c.slug
       HAVING c.slug <> ALL (ARRAY['life-chatgpt','ai-work','ai-ebook','ai-instructor','ai-business'])
          OR count(w.week_number) <> 12
          OR count(DISTINCT w.week_number) <> 12
          OR min(w.week_number) <> 1 OR max(w.week_number) <> 12
     )
  THEN RAISE EXCEPTION 'Example seed postcondition failed';
  END IF;`;

function buildStatement(failAfterCourses = false) {
  const statements = parts.map((part, i) => {
    const tag = `$seed_part_${i}$`;
    assert.ok(!part.includes(tag), "SQL quoting collision");
    return `EXECUTE ${tag}${part}${tag};` +
      (failAfterCourses && i === 2 ? " RAISE EXCEPTION 'forced rollback test';" : "");
  });
  return `DO $seed_outer$ BEGIN\n${statements.join("\n")}\n${guard}\nEND $seed_outer$;`;
}

if (process.argv.includes("--emit")) {
  process.stdout.write(buildStatement());
} else {
  async function fresh() {
    const db = new PGlite();
    await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
    await db.exec(await readFile("supabase/migrations/20261107100302_academy_course_foundation.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/20261108105949_public_course_catalog.sql", "utf8"));
    return db;
  }
  const counts = async (db) => (await db.query("SELECT (SELECT count(*)::int FROM academy.courses) courses,(SELECT count(*)::int FROM academy.course_weeks) weeks")).rows[0];
  const db = await fresh();
  try {
    await assert.rejects(db.exec(buildStatement(true)), /forced rollback test/);
    assert.deepEqual(await counts(db), { courses: 0, weeks: 0 });
    await db.exec(buildStatement());
    assert.deepEqual(await counts(db), { courses: 5, weeks: 60 });
    const rows = (await db.query("SELECT c.slug,count(w.*)::int AS weeks FROM academy.courses c JOIN academy.course_weeks w ON w.course_id=c.id GROUP BY c.slug ORDER BY c.slug")).rows;
    assert.deepEqual(rows.map((x) => x.slug).sort(), expectedSlugs.toSorted());
    assert.ok(rows.every((x) => x.weeks === 12));
    await assert.rejects(db.exec(buildStatement()), /Example seed requires empty course tables/);
    assert.deepEqual(await counts(db), { courses: 5, weeks: 60 });
    console.log("PASS: exact seed statements in one DO, forced failure rolled back, 5 courses/60 weeks, duplicate rejected");
  } finally { await db.close(); }
}
