// All data is fictional and lives in an in-memory PostgreSQL-compatible DB.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

const compile = async (path, imports = {}) => {
  const source = ts.transpileModule(await readFile(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(source, {
    module: compiledModule, exports: compiledModule.exports, FormData, Date, Number, Intl,
    require(name) { if (name in imports) return imports[name]; throw Error("Unexpected import"); },
  });
  return compiledModule.exports;
};
const time = await compile("src/lib/admin/seoul-time.ts");
const { parseOfferingForm } = await compile("src/lib/admin/management-validation.ts", {
  "./seoul-time": time,
});
const form = values => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.append(key, value);
  return result;
};

const db = new PGlite();
const query = async (sql, params) => params ? db.query(sql, params) : (await db.exec(sql)).at(-1);
const fictionalAdmin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fictionalUser = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const testOffering = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
try {
  await query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated");
  for (const file of [
    "supabase/migrations/20261107100302_academy_course_foundation.sql",
    "supabase/migrations/20261108105949_public_course_catalog.sql",
    "supabase/drafts/day08_dev_examples.sql",
    "supabase/migrations/20261108143123_public_offerings_catalog.sql",
    "supabase/migrations/20261108183527_b03_5_admin_membership_and_offerings_v2.sql",
  ]) await query(await readFile(file, "utf8"));
  const course = (await query("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  const before = (await query("SELECT (SELECT count(*)::int FROM academy.courses) courses, (SELECT count(*)::int FROM academy.course_weeks) weeks, (SELECT count(*)::int FROM academy.offerings) offerings")).rows[0];
  assert.equal(before.courses, 5); assert.equal(before.weeks, 60); assert.equal(before.offerings, 0);
  await query("INSERT INTO private_education.offering_admins(user_id) VALUES ($1)", [fictionalAdmin]);

  const values = {
    id: testOffering, mode: "create", course_id: course,
    start_date: "2027-03-02", end_date: "2027-05-18",
    enrollment_opens_at: "2027-02-01T09:00", enrollment_closes_at: "2027-02-28T18:00",
    location: "가상 검증", capacity: "10", status: "draft",
  };
  const parsed = parseOfferingForm(form(values));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.enrollmentOpensAt, "2027-02-01T00:00:00.000Z");
  assert.equal(parsed.value.enrollmentClosesAt, "2027-02-28T09:00:00.000Z");
  assert.equal(time.isoToSeoulInput(parsed.value.enrollmentOpensAt), "2027-02-01T09:00:00");
  assert.equal(time.isoToSeoulInput(parsed.value.enrollmentClosesAt), "2027-02-28T18:00:00");
  assert.equal(parsed.value.isPublic, false); assert.equal(parsed.value.capacity, 10);
  for (const changed of [
    { end_date: "2027-01-01" },
    { enrollment_closes_at: "2027-02-01T09:00" },
    { enrollment_opens_at: "", enrollment_closes_at: "2027-02-28T18:00" },
    { capacity: "-1" },
    { is_public: "on" },
  ]) assert.equal(parseOfferingForm(form({ ...values, ...changed })).ok, false);

  const sql = "SELECT public.academy_admin_save_offering_v2($1::uuid,$2::boolean,$3::uuid,$4::date,$5::date,$6::timestamptz,$7::timestamptz,$8::text,$9::integer,$10::text,$11::boolean) AS result";
  const asArgs = value => [value.id,value.isNew,value.courseId,value.startDate,value.endDate,value.enrollmentOpensAt,value.enrollmentClosesAt,value.location,value.capacity,value.status,value.isPublic];
  await query("SET ROLE anon");
  await assert.rejects(query(sql, asArgs(parsed.value)), /permission denied/);
  await query("RESET ROLE; SET ROLE authenticated");
  await query("SELECT set_config('request.jwt.claim.sub',$1,false)", [fictionalUser]);
  await assert.rejects(query(sql, asArgs(parsed.value)), /Not authorized/);
  await query("SELECT set_config('request.jwt.claim.sub',$1,false)", [fictionalAdmin]);
  for (const [index, value] of [[4,"2027-01-01"],[5,null],[6,parsed.value.enrollmentOpensAt],[8,-1],[10,true]]) {
    const invalid = asArgs(parsed.value); invalid[index] = value;
    await assert.rejects(query(sql, invalid), /Invalid offering/);
  }
  assert.equal((await query(sql, asArgs(parsed.value))).rows[0].result, "saved");
  assert.equal((await query(sql, asArgs(parsed.value))).rows[0].result, "duplicate");
  const duplicate = asArgs(parsed.value); duplicate[0] = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  assert.equal((await query(sql, duplicate)).rows[0].result, "duplicate");

  // A changed location currently falls outside the SQL's full-field duplicate test.
  // Roll this exploratory write back, leaving only the original fictional row.
  await query("BEGIN");
  const sameDatesDifferentLocation = [...duplicate];
  sameDatesDifferentLocation[7] = "동일 일정의 다른 장소";
  assert.equal((await query(sql, sameDatesDifferentLocation)).rows[0].result, "saved");
  await query("ROLLBACK");

  const catalog = (await query("SELECT public.academy_admin_offerings_catalog_v2() AS data")).rows[0].data;
  assert.equal(catalog.offerings.length, 1);
  await query("RESET ROLE");
  const saved = (await query("SELECT capacity,status,is_public,to_char(enrollment_opens_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD HH24:MI') AS opens_kst,to_char(enrollment_closes_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD HH24:MI') AS closes_kst FROM academy.offerings WHERE id=$1", [testOffering])).rows[0];
  assert.equal(saved.capacity, 10); assert.equal(saved.status, "draft"); assert.equal(saved.is_public, false);
  assert.equal(saved.opens_kst, "2027-02-01 09:00"); assert.equal(saved.closes_kst, "2027-02-28 18:00");
  await query("SET ROLE authenticated");
  const edited = parseOfferingForm(form({ ...values, mode: "update", location: "가상 검증 - 수정" }));
  assert.equal(edited.ok, true); assert.equal((await query(sql, asArgs(edited.value))).rows[0].result, "saved");
  await query("RESET ROLE");
  assert.equal((await query("SELECT location FROM academy.offerings WHERE id=$1", [testOffering])).rows[0].location, "가상 검증 - 수정");

  await query("SET ROLE authenticated");
  await query("SELECT set_config('request.jwt.claim.sub',$1,false)", [fictionalUser]);
  await assert.rejects(query(sql, asArgs(edited.value)), /Not authorized/);
  await query("RESET ROLE; SET ROLE anon");
  await assert.rejects(query(sql, asArgs(edited.value)), /permission denied/);
  assert.equal((await query("SELECT count(*)::int n FROM public.published_offerings")).rows[0].n, 0);
  await query("RESET ROLE");
  assert.equal((await query("DELETE FROM academy.offerings WHERE id=$1 RETURNING id", [testOffering])).rows.length, 1);
  const after = (await query("SELECT (SELECT count(*)::int FROM academy.courses) courses, (SELECT count(*)::int FROM academy.course_weeks) weeks, (SELECT count(*)::int FROM academy.offerings) offerings, (SELECT count(*)::int FROM private_education.offering_admins) admins")).rows[0];
  assert.equal(after.courses, 5); assert.equal(after.weeks, 60); assert.equal(after.offerings, 0); assert.equal(after.admins, 1);
  console.log("PASS: private draft create/edit, KST round trip, capacity, duplicate, authorization and cleanup in isolated PGlite");
} finally {
  await db.close();
}
