// Disposable in-memory PostgreSQL and fictional route fixtures only. No network or credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import * as jsxRuntime from "react/jsx-runtime";

function compile(file, modules = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const fixtureModule = { exports: {} };
  vm.runInNewContext(js, { module: fixtureModule, exports: fixtureModule.exports, require: (name) => {
    if (Object.hasOwn(modules, name)) return modules[name];
    throw Error("Unexpected fixture import: " + name);
  } });
  return fixtureModule.exports;
}
const data = compile("src/data/mock/courses.ts");
const photos = compile("src/data/course-photos.ts").coursePhotos;
const plain = value => JSON.parse(JSON.stringify(value));
const slugs = ["ai-management", "ai-music", "ai-aerial-video", "ai-multimedia", "ai-programming", "ai-advertising-video"];
assert.deepEqual(plain(data.courses.map(c => c.slug)), slugs);
assert.equal(data.courses.length, 6);
for (const course of data.courses) {
  const draft = course.curriculumDraft;
  assert.ok(draft);
  assert.ok(draft.objectives.length >= 3 && draft.objectives.length <= 5);
  assert.equal(course.durationHours, null);
  assert.equal(course.weeksCount, 12);
  assert.equal(draft.weeks.length, 12);
  assert.equal(new Set(draft.weeks.map(w => w.title)).size, 12);
  assert.deepEqual(plain(course.weeks), plain(draft.weeks.map(w => w.title)));
  for (const field of ["introduction", "finalProject"]) assert.ok(draft[field].trim());
  for (const field of ["coreTopics", "deliverables", "software", "equipment"]) assert.ok(draft[field].length);
  assert.ok(draft.weeks.every(w => w.title.trim() && w.practice.trim()));
  const image = photos.find(p => p.slug === course.slug);
  assert.equal(image?.title, course.title);
  assert.ok(fs.statSync("public/images/hero/" + course.slug + ".jpg").size > 0);
}
assert.equal(data.courses.reduce((n, c) => n + c.weeks.length, 0), 72);
const all = [...data.sampleOfferings, ...data.legacySampleOfferings];
assert.equal(data.sampleOfferings.length, 6);
assert.equal(new Set(all.map(o => o.id)).size, 11);
assert.deepEqual(plain(data.sampleOfferings.map(o => o.course.slug)), slugs);
assert.ok(data.sampleOfferings.every(o => o.id.startsWith("demo-ai-") && !/^[0-9a-f-]{36}$/i.test(o.id)));
const legacyMap = { "sample-life": "life-chatgpt", "sample-work": "ai-work", "sample-ebook": "ai-ebook", "sample-instructor": "ai-instructor", "sample-business": "ai-business" };
for (const [id, slug] of Object.entries(legacyMap)) {
  assert.equal(all.find(o => o.id === id)?.course.slug, slug);
  assert.ok(!data.sampleOfferings.some(o => o.id === id));
}
const offerings = compile("src/lib/offerings.ts");
const navigation = {
  notFound: () => { throw Error("FIXTURE_404"); },
  redirect: path => { throw Error("FIXTURE_REDIRECT:" + path); },
};
const route = compile("src/app/apply/[offeringId]/page.tsx", {
  "react/jsx-runtime": jsxRuntime, "next/link": { default: () => null },
  "next/navigation": navigation, "@/data/mock/courses": data,
  "@/lib/offerings": offerings, "./application-form": { ApplicationForm: () => null },
});
assert.equal(route.dynamicParams, false);
const paths = route.generateStaticParams().map(p => p.offeringId);
assert.equal(new Set(paths).size, paths.length);
for (const offering of all) {
  assert.ok(paths.includes(offering.id));
  const params = Promise.resolve({ offeringId: offering.id });
  assert.equal((await route.generateMetadata({ params })).title, offering.course.title + " 신청 시연");
}
await assert.rejects(route.generateMetadata({ params: Promise.resolve({ offeringId: "sample-advertising" }) }), /FIXTURE_REDIRECT:\/apply\/demo-ai-advertising-video-01/);
for (const id of ["unknown", "constructor", "11111111-1111-4111-8111-111111111111"]) {
  await assert.rejects(route.generateMetadata({ params: Promise.resolve({ offeringId: id }) }), /FIXTURE_404/);
}
console.log("PASS: six draft departments / 72 weeks and tasks / images / unique demo IDs / legacy route meanings / compatibility redirect / UUID rejection");

const db = new PGlite();
const read = file => fs.readFileSync(file, "utf8");
try {
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;");
  for (const file of [
    "supabase/migrations/20261107100302_academy_course_foundation.sql",
    "supabase/drafts/day08_public_courses.sql",
    "supabase/drafts/day08_dev_examples.sql",
    "supabase/drafts/day09_public_offerings.sql",
  ]) await db.exec(read(file));
  await db.exec("INSERT INTO academy.offerings(course_id,capacity,status,is_public) SELECT id,20,'draft',false FROM academy.courses WHERE slug='life-chatgpt'");
  const snapshot = async () => plain((await db.query(`
    SELECT jsonb_build_object(
      'courses',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM academy.courses c WHERE slug NOT IN ('ai-management','ai-music','ai-aerial-video','ai-multimedia','ai-programming','ai-advertising-video')),
      'weeks',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM academy.course_weeks w JOIN academy.courses c ON c.id=w.course_id WHERE c.slug NOT IN ('ai-management','ai-music','ai-aerial-video','ai-multimedia','ai-programming','ai-advertising-video')),
      'offerings',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM academy.offerings o)) AS snapshot
  `)).rows[0].snapshot);
  const baseline = await snapshot();
  const counts = async () => plain((await db.query("SELECT (SELECT count(*)::int FROM academy.courses) courses,(SELECT count(*)::int FROM academy.course_weeks) weeks,(SELECT count(*)::int FROM academy.offerings) offerings")).rows[0]);
  assert.deepEqual(await counts(), { courses: 5, weeks: 60, offerings: 1 });
  // Verify a failed candidate batch cannot leave a partial sixth course.
  await db.exec("BEGIN");
  await db.exec("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('ai-management','Fixture','Fixture','Fixture','Fixture','Fixture','draft')");
  await assert.rejects(db.exec("INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact) VALUES ('life-chatgpt','Fixture','Fixture','Fixture','Fixture','Fixture')"), /duplicate key/);
  await db.exec("ROLLBACK");
  assert.deepEqual(await counts(), { courses: 5, weeks: 60, offerings: 1 });
  assert.deepEqual(await snapshot(), baseline);
  // Fictional data-model exercise, not an executable hosted migration.
  await db.exec("BEGIN");
  for (const course of data.courses) {
    const inserted = await db.query(`INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,duration_hours,objectives,publication_state)
      VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,'draft') RETURNING id`,
      [course.slug, course.title, course.category, course.summary, course.audience, course.resultArtifact, course.objectives]);
    const courseId = inserted.rows[0].id;
    for (const [index, week] of course.weeks.entries()) {
      await db.query("INSERT INTO academy.course_weeks(course_id,week_number,title) VALUES ($1,$2,$3)", [courseId, index + 1, week]);
    }
  }
  await db.exec("COMMIT");
  assert.deepEqual(await counts(), { courses: 11, weeks: 132, offerings: 1 });
  assert.deepEqual(await snapshot(), baseline);
  const visible = async () => {
    await db.exec("SET ROLE anon");
    try {
      return plain((await db.query("SELECT (SELECT count(*)::int FROM public.published_courses) courses,(SELECT count(*)::int FROM public.published_course_weeks) weeks,(SELECT count(*)::int FROM public.published_offerings) offerings")).rows[0]);
    } finally { await db.exec("RESET ROLE"); }
  };
  assert.deepEqual(await visible(), { courses: 5, weeks: 60, offerings: 0 });
  await db.exec("BEGIN");
  await db.query("UPDATE academy.courses SET publication_state='published' WHERE slug=ANY($1::text[])", [slugs]);
  await db.query("UPDATE academy.courses SET publication_state='archived' WHERE NOT (slug=ANY($1::text[]))", [slugs]);
  assert.deepEqual(await visible(), { courses: 6, weeks: 72, offerings: 0 });
  await db.exec("ROLLBACK");
  assert.deepEqual(await visible(), { courses: 5, weeks: 60, offerings: 0 });
  assert.deepEqual(await snapshot(), baseline);
  assert.equal((await db.query("SELECT count(*)::int n FROM academy.offerings o JOIN academy.courses c ON c.id=o.course_id WHERE c.slug='life-chatgpt' AND o.status='draft' AND NOT o.is_public")).rows[0].n, 1);
  console.log("PASS: isolated model 5/60/1 -> 11/132/1; existing rows/FK preserved; drafts private; proposed publication 6/72 and rollback; partial batch rollback");
  console.log("LIMIT: PGlite model fixtures do not prove hosted migration idempotency, permissions for future detail tables, or real concurrent B-04 admission.");
} finally { await db.close(); }
