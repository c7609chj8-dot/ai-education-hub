// Disposable PGlite only; never connects to an external DB.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const read = (path) => readFile(path, "utf8");
const files = [
  "supabase/migrations/20261107100302_academy_course_foundation.sql",
  "supabase/migrations/20261108105949_public_course_catalog.sql",
  "supabase/drafts/day08_dev_examples.sql",
  "supabase/migrations/20261108143123_public_offerings_catalog.sql",
];
const candidate = await read("supabase/drafts/b03_5_insecure_v1_do_not_apply.sql");
async function fresh() {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS");
  for (const file of files) await db.exec(await read(file));
  return db;
}
const db = await fresh();
try {
  await db.exec(candidate);
  const acl = (await db.query("SELECT p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,has_function_privilege('service_role',p.oid,'EXECUTE') service FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('academy_admin_offerings_catalog_v1','academy_admin_save_offering_v1') ORDER BY p.proname")).rows;
  assert.equal(acl.length, 2);
  for (const row of acl) assert.deepEqual({definer:row.prosecdef,anon:row.anon,user:row.authenticated,service:row.service}, {definer:false,anon:false,user:false,service:true});
  for (const role of ["anon","authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query("SELECT public.academy_admin_offerings_catalog_v1()"), /permission denied/);
    await assert.rejects(db.query("SELECT public.academy_admin_save_offering_v1(NULL::uuid,false,NULL::uuid,NULL::date,NULL::date,NULL::timestamptz,NULL::timestamptz,NULL::text,0::integer,'draft'::text,false)"), /permission denied/);
    await db.exec("RESET ROLE");
  }
  const course = (await db.query("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  await db.exec("SET ROLE service_role");
  const save = "SELECT public.academy_admin_save_offering_v1($1::uuid,$2::boolean,$3::uuid,$4::date,$5::date,$6::timestamptz,$7::timestamptz,$8::text,$9::integer,$10::text,$11::boolean) AS result";
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const args = [id,true,course,"2026-12-01","2027-02-28","2026-11-10T09:00:00+09:00","2026-11-20T18:00:00+09:00","Online",20,"open",true];
  assert.equal((await db.query(save,args)).rows[0].result,"saved");
  assert.equal((await db.query(save,args)).rows[0].result,"duplicate");
  assert.equal((await db.query(save,["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",...args.slice(1)])).rows[0].result,"duplicate");
  for (const changes of [
    [5,null], [6,"2026-11-10T09:00:00+09:00"], [8,-1], [4,"2026-01-01"],
  ]) { const bad=[...args]; bad[0]="cccccccc-cccc-4ccc-8ccc-cccccccccccc"; bad[changes[0]]=changes[1]; await assert.rejects(db.query(save,bad)); }
  const updated=[...args]; updated[1]=false; updated[8]=25; assert.equal((await db.query(save,updated)).rows[0].result,"saved");
  const catalog=(await db.query("SELECT public.academy_admin_offerings_catalog_v1() AS data")).rows[0].data;
  assert.equal(catalog.courses.length,5);assert.equal(catalog.offerings.length,1);assert.equal(catalog.offerings[0].capacity,25);
  assert.equal(new Date(catalog.offerings[0].enrollment_opens_at).toISOString(),"2026-11-10T00:00:00.000Z");
  await db.exec("RESET ROLE; INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('private-parent','Private','Test','Test','Test','Test','draft'); SET ROLE service_role");
  const privateCourse=(await db.query("SELECT id FROM academy.courses WHERE title='Private'")).rows[0].id;
  const invalidParent=[...args];invalidParent[0]="dddddddd-dddd-4ddd-8ddd-dddddddddddd";invalidParent[2]=privateCourse;
  await assert.rejects(db.query(save,invalidParent), /Public offering requires a published course/);
  const draft=["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",true,privateCourse,null,null,null,null,null,0,"draft",false];
  assert.equal((await db.query(save,draft)).rows[0].result,"saved");
  await db.exec("RESET ROLE; SET ROLE anon");
  assert.equal((await db.query("SELECT count(*)::int n FROM public.published_offerings")).rows[0].n,1);
  await db.exec("RESET ROLE; CREATE FUNCTION public.academy_admin_save_offering_v1() RETURNS int LANGUAGE sql AS 'SELECT 1'; SET ROLE service_role");
  await assert.rejects(db.query(save,updated), /Application integration requires separate review/);
  await db.exec("RESET ROLE; DROP FUNCTION public.academy_admin_save_offering_v1(); CREATE TABLE academy.applications(id uuid); SET ROLE service_role");
  await assert.rejects(db.query(save,updated), /Application integration requires separate review/);
  await db.exec("RESET ROLE");
  assert.equal((await db.query("SELECT count(*)::int n FROM academy.offerings")).rows[0].n,2);
  console.log("PASS: isolated create/update/list, KST instant, duplicate requests, invalid windows, public view, role denial and future application guard");
} finally { await db.close(); }

const conflict = await fresh();
try {
  await conflict.exec("CREATE FUNCTION public.academy_admin_save_offering() RETURNS int LANGUAGE sql AS 'SELECT 1'");
  await assert.rejects(conflict.exec(candidate), /conflicting legacy or new function/);
  assert.equal((await conflict.query("SELECT count(*)::int n FROM academy.offerings")).rows[0].n,0);
  console.log("PASS: existing legacy function aborts candidate");
} finally { await conflict.close(); }
