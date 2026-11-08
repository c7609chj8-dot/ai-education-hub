import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Receives a disposable PostgreSQL client; never connects to a remote service.
export async function verifyOfferingV2(db) {
  await db.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated");
  for (const file of [
    "supabase/migrations/20261107100302_academy_course_foundation.sql",
    "supabase/migrations/20261108105949_public_course_catalog.sql",
    "supabase/drafts/day08_dev_examples.sql",
    "supabase/migrations/20261108143123_public_offerings_catalog.sql",
    "supabase/drafts/b03_5_offering_rpc_security_v2.sql",
  ]) await db.query(await readFile(file,"utf8"));
  const admin="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const course=(await db.query("SELECT id FROM academy.courses WHERE slug='life-chatgpt'")).rows[0].id;
  await db.query("INSERT INTO private_education.offering_admins(user_id) VALUES ($1)",[admin]);
  const roles=(await db.query("SELECT rolname,rolcanlogin,rolbypassrls,rolsuper,rolcreaterole FROM pg_roles WHERE rolname='academy_offering_executor'")).rows;
  assert.equal(roles.length,1);for(const key of ["rolcanlogin","rolbypassrls","rolsuper","rolcreaterole"])assert.equal(roles[0][key],false);
  for(const role of ["anon","authenticated","service_role"])
    assert.equal((await db.query("SELECT pg_has_role($1,'academy_offering_executor','MEMBER') AS member",[role])).rows[0].member,false);
  assert.equal((await db.query("SELECT has_any_column_privilege('service_role','academy.offerings','INSERT,UPDATE') AS allowed")).rows[0].allowed,false);
  const helpers=(await db.query("SELECT prosecdef,proconfig,pg_get_userbyid(proowner) AS owner FROM pg_proc WHERE pronamespace='private_education'::regnamespace AND proname IN ('offering_catalog_v2','save_offering_v2')")).rows;
  assert.equal(helpers.length,2);for(const helper of helpers){assert.equal(helper.prosecdef,true);assert.equal(helper.owner,"academy_offering_executor");assert.ok(helper.proconfig.includes('search_path=""'))}
  const save="SELECT public.academy_admin_save_offering_v2($1::uuid,$2::boolean,$3::uuid,$4::date,$5::date,$6::timestamptz,$7::timestamptz,$8::text,$9::integer,$10::text,$11::boolean) AS result";
  const args=["cccccccc-cccc-4ccc-8ccc-cccccccccccc",true,course,"2026-12-01","2027-02-01","2026-11-01T00:00:00Z","2026-11-30T09:00:00Z","Online",20,"open",true];
  await db.query("SET ROLE service_role");
  await assert.rejects(db.query("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public) VALUES ($1,$2,10,'open',true)",[args[0],course]),/permission denied/);
  await assert.rejects(db.query("UPDATE academy.offerings SET capacity=999"),/permission denied/);
  await assert.rejects(db.query(save,args),/permission denied/);
  await db.query("RESET ROLE; SET ROLE anon");
  await assert.rejects(db.query(save,args),/permission denied/);
  await db.query("RESET ROLE; SET ROLE authenticated");
  await assert.rejects(db.query("SELECT * FROM private_education.offering_admins"),/permission denied/);
  await assert.rejects(db.query("SELECT public.academy_admin_offerings_catalog_v2()"),/Not authorized/);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[other]);
  await assert.rejects(db.query(save,args),/Not authorized/);
  await assert.rejects(db.query("SELECT public.academy_admin_offerings_catalog_v2()"),/Not authorized/);
  await assert.rejects(db.query("SELECT private_education.offering_catalog_v2()"),/Not authorized/);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin]);
  await assert.rejects(db.query("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public) VALUES ($1,$2,10,'open',true)",[args[0],course]),/permission denied/);
  assert.equal((await db.query(save,args)).rows[0].result,"saved");
  assert.equal((await db.query(save,args)).rows[0].result,"duplicate");
  assert.equal((await db.query(save,["dddddddd-dddd-4ddd-8ddd-dddddddddddd",...args.slice(1)])).rows[0].result,"duplicate");
  for (const [index,value] of [[5,null],[6,"2026-11-01T00:00:00Z"],[8,-1],[4,"2026-01-01"],[10,null]]) {
    const bad=[...args];bad[0]="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";bad[index]=value;await assert.rejects(db.query(save,bad),/Invalid offering/);
  }
  const update=[...args];update[1]=false;update[8]=25;assert.equal((await db.query(save,update)).rows[0].result,"saved");
  const catalog=(await db.query("SELECT public.academy_admin_offerings_catalog_v2() AS data")).rows[0].data;
  assert.equal(catalog.courses.length,5);assert.equal(catalog.offerings[0].capacity,25);
  await db.query("RESET ROLE; INSERT INTO academy.courses(slug,title,category,summary,audience,result_artifact,publication_state) VALUES ('private-parent-v2','Private','Test','Test','Test','Test','draft')");
  const privateCourse=(await db.query("SELECT id FROM academy.courses WHERE slug='private-parent-v2'")).rows[0].id;
  await db.query("SET ROLE authenticated");
  const privateArgs=[...args];privateArgs[0]="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";privateArgs[2]=privateCourse;
  await assert.rejects(db.query(save,privateArgs),/Public offering requires a published course/);
  await db.query("RESET ROLE");
  await db.query("DELETE FROM private_education.offering_admins WHERE user_id=$1",[admin]);
  await db.query("SET ROLE authenticated");
  await assert.rejects(db.query("SELECT public.academy_admin_offerings_catalog_v2()"),/Not authorized/);
  await db.query("RESET ROLE");
  await db.query("INSERT INTO private_education.offering_admins(user_id) VALUES ($1)",[admin]);
  await db.query("RESET ROLE; SET ROLE anon");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.published_offerings")).rows[0].n,1);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.published_course_weeks")).rows[0].n,60);
  await db.query("RESET ROLE; CREATE TABLE academy.applications(id uuid); SET ROLE authenticated");
  await assert.rejects(db.query(save,update),/Application integration requires separate review/);
  await db.query("RESET ROLE");
  console.log("PASS: protected owner, service direct-write denial, identity authorization, create/update, invalid inputs, duplicate, public reads and application guard");
}
