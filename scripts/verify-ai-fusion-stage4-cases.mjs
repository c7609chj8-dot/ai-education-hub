import assert from "node:assert/strict";
import fs from "node:fs/promises";

export async function verifyFusionStage4({client,first,second,observer,native=false}) {
 const read=file=>fs.readFile("supabase/drafts/ai_fusion_stage4_"+file+".sql","utf8");
 const sql=Object.fromEntries(await Promise.all(["A1_schema","A2_register","B_publish","C_keep","C_archive","D_recover"].map(async key=>[key,await read(key)])));
 const manifest=JSON.parse(await fs.readFile("supabase/drafts/ai_fusion_stage4_manifest.json","utf8"));
 const ids=manifest.courses.map(c=>c.id);
 // Reset only the documented fictional rows left by the existing v2 test helper.
 await client.query("DROP TABLE academy.applications; DELETE FROM academy.offerings; DELETE FROM academy.courses WHERE slug='private-parent-v2'");
 await client.query("INSERT INTO academy.offerings(id,course_id,capacity,status,is_public) SELECT '11111111-1111-4111-8111-111111111111',id,20,'draft',false FROM academy.courses WHERE slug='life-chatgpt'");
 const baseline=(await client.query("SELECT jsonb_build_object('courses',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM academy.courses c),'weeks',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM academy.course_weeks w),'offerings',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM academy.offerings o)) b")).rows[0].b;
 const oldIds=baseline.courses.map(c=>c.id);
 const count=async()=> (await client.query("SELECT (SELECT count(*)::int FROM academy.courses) courses,(SELECT count(*)::int FROM academy.course_weeks) weeks,(SELECT count(*)::int FROM academy.offerings) offerings")).rows[0];
 const preserved=async()=> {
  const state=(await client.query("SELECT jsonb_build_object('courses',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM academy.courses c WHERE id=ANY($1::uuid[])),'weeks',(SELECT jsonb_agg(to_jsonb(w) ORDER BY w.id) FROM academy.course_weeks w WHERE course_id=ANY($1::uuid[])),'offerings',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM academy.offerings o)) b",[oldIds])).rows[0].b;
  assert.deepEqual(state,baseline);
 };
 const expectFailure=async(text,pattern)=> {
  let error;
  try{await client.query(text);}catch(e){error=e;}
  await client.query("ROLLBACK");
  assert.ok(error,"candidate must refuse unsafe input");
  assert.match(error.message,pattern);
 };
 const visible=async(role="anon")=> {
  await client.query("SET ROLE "+role);
  try{return (await client.query("SELECT (SELECT count(*)::int FROM public.published_courses) courses,(SELECT count(*)::int FROM public.published_course_weeks) weeks,(SELECT count(*)::int FROM public.published_offerings) offerings")).rows[0];}
  finally{await client.query("RESET ROLE");}
 };
 assert.deepEqual(await count(),{courses:5,weeks:60,offerings:1});
 await client.query("BEGIN; CREATE ROLE fusion_unexpected NOLOGIN; ALTER DEFAULT PRIVILEGES IN SCHEMA academy GRANT SELECT ON TABLES TO fusion_unexpected");
 await expectFailure(sql.A1_schema,/unexpected metadata grantee/);
 await expectFailure(sql.A1_schema.replace("CREATE TABLE academy.course_week_practices(","SELECT 1/0; CREATE TABLE academy.course_week_practices("),/division by zero/);
 assert.equal((await client.query("SELECT to_regclass('academy.course_profiles') p")).rows[0].p,null);
 await client.query(sql.A1_schema);
 await expectFailure(sql.A1_schema,/already exists/);
 await preserved();

 // Collision and partial insertion failures must leave the original dataset and no new course.
 const oldId=oldIds[0];
 await expectFailure(sql.A2_register.replaceAll(manifest.courses[0].id,oldId),/UUID\/slug collision/);
 await expectFailure(sql.A2_register.replaceAll('"slug": "ai-management"','"slug": "life-chatgpt"'),/UUID\/slug collision/);
 const last=manifest.courses.at(-1).weeks.at(-1).practice;
 await expectFailure(sql.A2_register.replaceAll(JSON.stringify(last),'""'),/check constraint/);
 assert.deepEqual(await count(),{courses:5,weeks:60,offerings:1});
 await preserved();
 console.log("PASS: one-time schema refusal, schema transaction rollback, existing UUID/slug collision and last-task failure roll back completely");

 if(native){
  await first.query(sql.A2_register.replace(/COMMIT;\s*$/,""));
  const pending=second.query(sql.A2_register).then(()=>({ok:true}),error=>({error}));
  let locked=false;
  for(let i=0;i<100;i++){
   const state=await observer.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[second.processID]);
   if(state.rows[0]?.wait_event_type==="Lock"){locked=true;break;}
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.ok(locked,"second registration must serialize");
  await first.query("COMMIT");
  const result=await pending;if(result.error)throw result.error;
  console.log("PASS NATIVE: two registrations serialize into one six/72 batch");
 }else await client.query(sql.A2_register);
 await client.query(sql.A2_register);
 assert.deepEqual(await count(),{courses:11,weeks:132,offerings:1});
 await preserved();
 assert.deepEqual(await visible(),{courses:5,weeks:60,offerings:0});
 const stored=(await client.query("SELECT manifest FROM private_education.ai_fusion_runs")).rows[0].manifest;
 assert.deepEqual(stored,manifest);
 for(const course of manifest.courses){
  const row=(await client.query("SELECT c.duration_hours,c.objectives,c.publication_state,p.* FROM academy.courses c JOIN academy.course_profiles p ON p.course_id=c.id WHERE c.id=$1",[course.id])).rows[0];
  assert.equal(row.duration_hours,null);assert.equal(row.publication_state,"draft");assert.equal(row.review_state,"draft");assert.equal(row.revision,1);
  assert.deepEqual(row.objectives,course.objectives);
  for(const [column,key]of [["core_topics","coreTopics"],["final_project","finalProject"],["deliverables","deliverables"],["software","software"],["equipment","equipment"]])assert.deepEqual(row[column],course.profile[key]);
  const weeks=(await client.query("SELECT w.id,w.week_number,w.title,p.practice FROM academy.course_weeks w JOIN academy.course_week_practices p USING(course_id,week_number) WHERE w.course_id=$1 ORDER BY week_number",[course.id])).rows;
  assert.deepEqual(weeks,course.weeks);
 }
 console.log("PASS: exact re-run has no duplicates; all six profiles and 72 practices round-trip; draft rows hidden and original 5/60/1 preserved");

 // Role guards and deny-all metadata remain in place even for an authenticated admin.
 for(const role of ["anon","authenticated","service_role","academy_offering_executor"]){
  await client.query("SET ROLE "+role);
  for(const table of ["academy.course_profiles","academy.course_week_practices","private_education.ai_fusion_runs"]){
   await assert.rejects(client.query("SELECT * FROM "+table),/permission denied/);
   await assert.rejects(client.query("DELETE FROM "+table),/permission denied/);
  }
  await expectFailure(sql.A2_register,/requires reviewed postgres executor/);
  await client.query("RESET ROLE");
 }
 await client.query("GRANT SELECT ON academy.course_profiles TO authenticated");
 await expectFailure(sql.B_publish,/schema\/ACL\/RLS drift/);
 await client.query("REVOKE SELECT ON academy.course_profiles FROM authenticated");
 await client.query("ALTER TABLE academy.course_profiles DISABLE ROW LEVEL SECURITY");
 await expectFailure(sql.B_publish,/schema\/ACL\/RLS drift/);
 await client.query("ALTER TABLE academy.course_profiles ENABLE ROW LEVEL SECURITY");
 await client.query("GRANT EXECUTE ON FUNCTION public.academy_is_admin_v2() TO anon");
 await expectFailure(sql.B_publish,/existing security drift/);
 await client.query("REVOKE EXECUTE ON FUNCTION public.academy_is_admin_v2() FROM anon");
 await client.query("BEGIN; CREATE ROLE fusion_role_fixture NOLOGIN; GRANT fusion_role_fixture TO authenticated");
 await expectFailure(sql.B_publish,/existing security drift/);
 const viewDefinition=(await client.query("SELECT pg_get_viewdef('public.published_courses'::regclass,true) definition")).rows[0].definition.replace(/;\s*$/,"");
 await client.query("BEGIN; CREATE OR REPLACE VIEW public.published_courses AS "+viewDefinition+" AND false");
 await expectFailure(sql.B_publish,/existing security drift/);
 await client.query("BEGIN");
 await assert.rejects(client.query("UPDATE academy.course_profiles SET core_topics=ARRAY[NULL]::text[] WHERE course_id=$1",[ids[0]]),/check constraint/);
 await client.query("ROLLBACK");
 await expectFailure("BEGIN ISOLATION LEVEL REPEATABLE READ;"+sql.A2_register,/READ COMMITTED/);
 await client.query("CREATE TABLE academy.applications(id uuid)");
 await expectFailure(sql.B_publish,/B04 state changed/);
 await client.query("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false)");
 const life=baseline.courses.find(c=>c.slug==="life-chatgpt").id;
 const save="SELECT public.academy_admin_save_offering_v2($1::uuid,$2::boolean,$3::uuid,'2028-03-01','2028-05-01','2028-01-01T00:00:00Z','2028-02-01T00:00:00Z','Fixture',20,'draft',false) result";
 await assert.rejects(client.query(save,["99999999-9999-4999-8999-999999999999",true,life]),/Application integration requires separate review/);
 await client.query("RESET ROLE; DROP TABLE academy.applications");
 console.log("PASS: API/service/executor metadata access and migration execution denied; ACL/RLS drift, stale isolation and B04 state rejected; existing application guard preserved");

 // Existing admin create/update paths still work without schema/ACL/RPC changes.
 await client.query("BEGIN; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false)");
 assert.equal((await client.query(save,["99999999-9999-4999-8999-999999999999",true,life])).rows[0].result,"saved");
 assert.equal((await client.query(save,["99999999-9999-4999-8999-999999999999",false,life])).rows[0].result,"saved");
 assert.equal((await client.query("SELECT jsonb_array_length(public.academy_admin_offerings_catalog_v2()->'courses') n")).rows[0].n,11);
 await client.query("ROLLBACK; RESET ROLE");
 await preserved();
 await client.query(sql.C_keep);
 await client.query(sql.B_publish);
 await client.query(sql.B_publish);
 assert.deepEqual(await visible(),{courses:11,weeks:132,offerings:0});
 assert.deepEqual(await visible("authenticated"),{courses:11,weeks:132,offerings:0});
 await client.query(sql.A2_register); // never resets published courses to drafts
 await expectFailure(sql.C_archive,/URL compatibility evidence required/);
 // This is a simulated evidence reference; no website archive policy is implemented by SQL.
 await client.query("SELECT set_config('academy.ai_fusion_legacy_url_policy','fixture-only-reviewed-policy',false)");
 await client.query(sql.C_archive);
 assert.deepEqual(await visible(),{courses:6,weeks:72,offerings:0});
 await client.query(sql.C_archive);
 await client.query(sql.D_recover);
 await client.query(sql.D_recover);
 assert.deepEqual(await visible(),{courses:5,weeks:60,offerings:0});
 assert.deepEqual(await count(),{courses:11,weeks:132,offerings:1});
 await preserved();
 await client.query(sql.A2_register);
 console.log("PASS: unchanged admin v2 create/edit/catalog; keep and gated archive publication; non-destructive idempotent recovery restores original visibility and offering");

 // Unreviewed edits/new references must never be silently overwritten by recovery.
 await client.query("UPDATE academy.courses SET title=title||' edited' WHERE id=$1",[ids[0]]);
 await expectFailure(sql.D_recover,/data drift/);
 await client.query("UPDATE academy.courses SET title=$2 WHERE id=$1",[ids[0],manifest.courses[0].title]);
 await client.query(sql.B_publish);
 await client.query("INSERT INTO academy.offerings(course_id,capacity,status,is_public) VALUES ($1,1,'draft',false)",[ids[0]]);
 await expectFailure(sql.D_recover,/data drift|new offering reference/);
 await client.query("DELETE FROM academy.offerings WHERE course_id=$1",[ids[0]]);
 await client.query(sql.D_recover);
 await preserved();
 if(native){
  await first.query("BEGIN; UPDATE academy.offerings SET capacity=21 WHERE id='11111111-1111-4111-8111-111111111111'");
  const pending=second.query(sql.A2_register).then(()=>({ok:true}),error=>({error}));
  let blocked=false;
  for(let i=0;i<100;i++){
   const result=await observer.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",[second.processID]);
   if(result.rows[0]?.wait_event_type==="Lock"){blocked=true;break;}
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.ok(blocked);
  await first.query("COMMIT");
  const result=await pending;assert.match(result.error?.message||"",/data drift/);
  await second.query("ROLLBACK");
  await client.query("UPDATE academy.offerings SET capacity=20 WHERE id='11111111-1111-4111-8111-111111111111'");
  await client.query(sql.A2_register);await preserved();
  console.log("PASS NATIVE: concurrent offering change blocks registration and then fails closed instead of overwriting the admin update");
 }
 console.log("PASS: recovery refuses unreviewed content/new offering drift; existing rows restored in disposable fixtures only");
}
