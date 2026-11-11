// Generate review-only SQL artifacts from the approved stage-3 mock draft. Never connects to a database.
import fs from "node:fs";
import crypto from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
const sourceCommit = "e0435679d7a795b294fe32e5d1f3483e4b5e4c1a";
const key = "ai-fusion-stage4-v1";
const compiled = ts.transpileModule(fs.readFileSync("src/data/mock/courses.ts","utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const fixture = {exports:{}};
vm.runInNewContext(compiled,{module:fixture,exports:fixture.exports});
const uuid = name => {
 const namespace = Buffer.from("3037255e75f048d1993b44fd9d2a3a95","hex");
 const bytes = crypto.createHash("sha1").update(namespace).update(name).digest().subarray(0,16);
 bytes[6]=(bytes[6]&15)|80; bytes[8]=(bytes[8]&63)|128;
 const h=bytes.toString("hex"); return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join("-");
};
const manifest={version:key,source_commit:sourceCommit,courses:fixture.exports.courses.map(c=>({
 id:uuid("course:"+c.slug),slug:c.slug,title:c.title,category:c.category,summary:c.summary,audience:c.audience,
 result_artifact:c.resultArtifact,duration_hours:null,objectives:c.objectives,
 profile:{...c.curriculumDraft,review_state:"draft",revision:1},
 weeks:c.curriculumDraft.weeks.map((w,i)=>({id:uuid("week:"+c.slug+":"+(i+1)),week_number:i+1,...w})),
}))};
for(const c of manifest.courses)delete c.profile.weeks;
if(manifest.courses.length!==6||manifest.courses.some(c=>c.weeks.length!==12))throw Error("Expected six/72");
const json=JSON.stringify(manifest,null,2);
if(json.includes("$fusion_manifest$"))throw Error("Unsafe manifest delimiter");
const snapshot=`(SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p)))`;
const security=`(SELECT jsonb_build_object(
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',c.relowner,'acl',c.relacl,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'options',c.reloptions,'view',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) ELSE NULL END) ORDER BY c.oid)
  FROM pg_class c WHERE c.oid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass,'private_education.offering_admins'::regclass,'public.published_courses'::regclass,'public.published_course_weeks'::regclass,'public.published_offerings'::regclass)),
 'columns',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a WHERE a.attrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass,'private_education.offering_admins'::regclass)),
 'functions',(SELECT jsonb_agg(jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl,'definition',pg_get_functiondef(p.oid)) ORDER BY p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname LIKE 'academy_%') OR (n.nspname='private_education' AND p.proname IN ('is_admin_v2','offering_catalog_v2','save_offering_v2'))),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,'login',rolcanlogin,'bypass',rolbypassrls,'create',rolcreaterole,'inherit',rolinherit,'createdb',rolcreatedb,'replication',rolreplication) ORDER BY rolname) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','academy_offering_executor')),
 'memberships',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY roleid,member),'[]'::jsonb) FROM pg_auth_members a WHERE roleid IN (SELECT oid FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','academy_offering_executor')) OR member IN (SELECT oid FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','academy_offering_executor'))),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',nspowner,'acl',nspacl) ORDER BY nspname) FROM pg_namespace WHERE nspname IN ('academy','private_education','auth','public')),
 'core_constraints',(SELECT jsonb_agg(jsonb_build_object('rel',conrelid,'name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname) FROM pg_constraint WHERE conrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass)),
 'defaults',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.oid),'[]'::jsonb) FROM pg_default_acl d WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres'))))`;
const shape=`(SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'owner',c.relowner,'rls',c.relrowsecurity,'acl',c.relacl) ORDER BY c.oid) FROM pg_class c WHERE c.oid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'columns',(SELECT jsonb_agg(jsonb_build_object('rel',a.attrelid,'num',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'null',a.attnotnull,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('rel',conrelid,'name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname) FROM pg_constraint WHERE conrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p WHERE polrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass))))`;
const start=`-- REVIEW CANDIDATE ONLY. No hosted execution is authorized.
BEGIN;
SET LOCAL search_path='';
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $executor$ BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Fusion requires reviewed postgres executor'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Fusion requires READ COMMITTED'; END IF;
 IF to_regclass('academy.applications') IS NOT NULL OR to_regclass('academy.application_private') IS NOT NULL THEN RAISE EXCEPTION 'Fusion B04 state changed; separate integration review required'; END IF;
END $executor$;
SELECT pg_advisory_xact_lock(761104,4);
LOCK TABLE academy.courses,academy.course_weeks,academy.offerings IN SHARE ROW EXCLUSIVE MODE;
`;
const locked=`LOCK TABLE academy.course_profiles,academy.course_week_practices,private_education.ai_fusion_runs IN SHARE ROW EXCLUSIVE MODE;
DO $fusion$
DECLARE r record; v_course jsonb; v_week jsonb; now_snapshot jsonb;
BEGIN
 SELECT * INTO STRICT r FROM private_education.ai_fusion_runs WHERE batch_key='${key}' FOR UPDATE;
 IF r.schema_signature IS DISTINCT FROM ${shape} THEN RAISE EXCEPTION 'Fusion metadata schema/ACL/RLS drift'; END IF;
 IF r.protected_security IS DISTINCT FROM ${security} THEN RAISE EXCEPTION 'Fusion existing security drift'; END IF;
 now_snapshot := ${snapshot};
 IF now_snapshot IS DISTINCT FROM r.expected_snapshot THEN RAISE EXCEPTION 'Fusion data drift; no overwrite allowed'; END IF;
`;
const finish=action=>`
 UPDATE private_education.ai_fusion_runs SET expected_snapshot=${snapshot},
 history=history || jsonb_build_array(jsonb_build_object('action','${action}','at',clock_timestamp(),'executor',current_user))
 WHERE batch_key='${key}';
END $fusion$;
COMMIT;
`;
const schema=start+`
DO $schema$
DECLARE target oid; role_name text;
BEGIN
 IF to_regclass('academy.course_profiles') IS NOT NULL OR to_regclass('academy.course_week_practices') IS NOT NULL OR to_regclass('private_education.ai_fusion_runs') IS NOT NULL THEN RAISE EXCEPTION 'Fusion schema already exists; do not adopt existing objects'; END IF;
 IF (SELECT count(*) FROM academy.courses)<>5 OR (SELECT count(*) FROM academy.course_weeks)<>60 OR (SELECT count(*) FROM academy.offerings)<>1 THEN RAISE EXCEPTION 'Fusion baseline must be 5/60/1'; END IF;
 FOR target IN SELECT unnest(ARRAY['academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass]) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=target AND relowner=(SELECT oid FROM pg_roles WHERE rolname='postgres') AND relrowsecurity) THEN RAISE EXCEPTION 'Fusion core owner/RLS mismatch'; END IF;
  FOR role_name IN SELECT unnest(ARRAY['anon','authenticated','service_role']) LOOP
   IF has_any_column_privilege(role_name,target,'INSERT,UPDATE') OR has_table_privilege(role_name,target,'DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN RAISE EXCEPTION 'Fusion unexpected existing API write privilege'; END IF;
  END LOOP;
 END LOOP;
 IF EXISTS(SELECT 1 FROM academy.courses c LEFT JOIN academy.course_weeks w ON w.course_id=c.id GROUP BY c.id HAVING count(w.id)<>12 OR min(w.week_number)<>1 OR max(w.week_number)<>12) THEN RAISE EXCEPTION 'Fusion legacy week structure mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM academy.courses WHERE publication_state<>'published' OR slug NOT IN ('life-chatgpt','ai-work','ai-ebook','ai-instructor','ai-business')) THEN RAISE EXCEPTION 'Fusion legacy baseline mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM academy.offerings o JOIN academy.courses c ON c.id=o.course_id WHERE c.slug='life-chatgpt' AND o.status='draft' AND NOT o.is_public) THEN RAISE EXCEPTION 'Fusion protected offering mismatch'; END IF;
END $schema$;
CREATE TABLE academy.course_profiles(
 course_id uuid PRIMARY KEY REFERENCES academy.courses(id) ON DELETE RESTRICT,
 core_topics text[] NOT NULL CHECK(cardinality(core_topics)>0 AND array_position(core_topics,NULL) IS NULL AND array_position(core_topics,'') IS NULL),
 final_project text NOT NULL CHECK(length(btrim(final_project))>0),
 deliverables text[] NOT NULL CHECK(cardinality(deliverables)>0 AND array_position(deliverables,NULL) IS NULL AND array_position(deliverables,'') IS NULL),
 software text[] NOT NULL CHECK(cardinality(software)>0 AND array_position(software,NULL) IS NULL AND array_position(software,'') IS NULL),
 equipment text[] NOT NULL CHECK(cardinality(equipment)>0 AND array_position(equipment,NULL) IS NULL AND array_position(equipment,'') IS NULL),
 review_state text NOT NULL DEFAULT 'draft' CHECK(review_state IN ('draft','reviewed')),
 revision integer NOT NULL CHECK(revision>0)
);
CREATE TABLE academy.course_week_practices(
 course_id uuid NOT NULL,week_number integer NOT NULL CHECK(week_number BETWEEN 1 AND 12),
 practice text NOT NULL CHECK(length(btrim(practice))>0),
 PRIMARY KEY(course_id,week_number),
 FOREIGN KEY(course_id,week_number) REFERENCES academy.course_weeks(course_id,week_number) ON DELETE RESTRICT
);
CREATE TABLE private_education.ai_fusion_runs(
 batch_key text PRIMARY KEY CHECK(batch_key='${key}'),
 schema_signature jsonb NOT NULL, protected_security jsonb NOT NULL,
 baseline_snapshot jsonb NOT NULL, expected_snapshot jsonb NOT NULL,
 manifest jsonb,
 phase text NOT NULL CHECK(phase IN ('schema_only','registered','published','legacy_hidden','recovered')),
 legacy_url_policy_ref text, history jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE academy.course_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy.course_week_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_education.ai_fusion_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.course_profiles,academy.course_week_practices,private_education.ai_fusion_runs
 FROM PUBLIC,anon,authenticated,service_role,academy_offering_executor;
-- No policies, public views, roles, RPCs, or positive GRANTs are added.
DO $acl$
DECLARE obj oid;
BEGIN
 FOR obj IN SELECT unnest(ARRAY['academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass]) LOOP
  IF EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=obj AND (a.grantee<>c.relowner OR NOT c.relrowsecurity OR c.relowner<>(SELECT oid FROM pg_roles WHERE rolname='postgres'))) THEN RAISE EXCEPTION 'Fusion unexpected metadata grantee/owner/RLS'; END IF;
 END LOOP;
END $acl$;
INSERT INTO private_education.ai_fusion_runs(batch_key,schema_signature,protected_security,baseline_snapshot,expected_snapshot,phase)
 VALUES('${key}',${shape},${security},${snapshot},${snapshot},'schema_only');
COMMIT;
`;
const data=start+locked+`
 IF r.manifest IS NOT NULL THEN
  IF r.manifest IS DISTINCT FROM $fusion_manifest$${json}$fusion_manifest$::jsonb THEN RAISE EXCEPTION 'Fusion manifest mismatch'; END IF;
  RETURN; -- verified exact re-run, including current publication state; never reset it
 END IF;
 IF r.phase<>'schema_only' THEN RAISE EXCEPTION 'Fusion invalid initial phase'; END IF;
 FOR v_course IN SELECT value FROM jsonb_array_elements(($fusion_manifest$${json}$fusion_manifest$::jsonb)->'courses') LOOP
  IF EXISTS(SELECT 1 FROM academy.courses WHERE id=(v_course->>'id')::uuid OR slug=v_course->>'slug') THEN RAISE EXCEPTION 'Fusion UUID/slug collision'; END IF;
  INSERT INTO academy.courses(id,slug,title,category,summary,audience,result_artifact,duration_hours,objectives,publication_state)
   VALUES((v_course->>'id')::uuid,v_course->>'slug',v_course->>'title',v_course->>'category',v_course->>'summary',v_course->>'audience',v_course->>'result_artifact',NULL,ARRAY(SELECT jsonb_array_elements_text(v_course->'objectives')),'draft');
  INSERT INTO academy.course_profiles(course_id,core_topics,final_project,deliverables,software,equipment,review_state,revision)
   VALUES((v_course->>'id')::uuid,ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'coreTopics')),v_course->'profile'->>'finalProject',
    ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'deliverables')),ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'software')),
    ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'equipment')),'draft',1);
  FOR v_week IN SELECT value FROM jsonb_array_elements(v_course->'weeks') LOOP
   INSERT INTO academy.course_weeks(id,course_id,week_number,title) VALUES((v_week->>'id')::uuid,(v_course->>'id')::uuid,(v_week->>'week_number')::int,v_week->>'title');
   INSERT INTO academy.course_week_practices(course_id,week_number,practice) VALUES((v_course->>'id')::uuid,(v_week->>'week_number')::int,v_week->>'practice');
  END LOOP;
 END LOOP;
 UPDATE private_education.ai_fusion_runs SET manifest=$fusion_manifest$${json}$fusion_manifest$::jsonb,phase='registered' WHERE batch_key='${key}';
`+finish("register-drafts");
const publish=start+locked+`
 IF r.manifest IS NULL THEN RAISE EXCEPTION 'Fusion registration required'; END IF;
 IF r.phase IN ('published','legacy_hidden') THEN RETURN; END IF;
 IF r.phase NOT IN ('registered','recovered') THEN RAISE EXCEPTION 'Fusion invalid publication phase'; END IF;
 -- Separate approval to expose draft educational material; NOT a curriculum review approval.
 UPDATE academy.courses SET publication_state='published' WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(r.manifest->'courses') x);
 UPDATE private_education.ai_fusion_runs SET phase='published' WHERE batch_key='${key}';
`+finish("publish-new-draft-curricula");
const keep=start+locked+`
 IF r.manifest IS NULL THEN RAISE EXCEPTION 'Fusion registration required'; END IF;
 IF EXISTS(SELECT 1 FROM academy.courses WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(r.baseline_snapshot->'courses') x) AND publication_state<>'published') THEN RAISE EXCEPTION 'Fusion use recovery to restore legacy visibility'; END IF;
 -- Default C option: preserve legacy URLs by leaving the existing five published.
END $fusion$;
COMMIT;
`;
const hide=start+locked+`
 IF r.manifest IS NULL THEN RAISE EXCEPTION 'Fusion registration required'; END IF;
 IF coalesce(length(btrim(current_setting('academy.ai_fusion_legacy_url_policy',true))),0)<8 THEN RAISE EXCEPTION 'Fusion legacy URL compatibility evidence required'; END IF;
 -- Operator evidence reference only, NOT authentication or proof that a website policy exists.
 IF r.phase='legacy_hidden' THEN RETURN; END IF;
 IF r.phase<>'published' THEN RAISE EXCEPTION 'Fusion publish new courses first'; END IF;
 UPDATE academy.courses SET publication_state='archived' WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(r.baseline_snapshot->'courses') x);
 UPDATE private_education.ai_fusion_runs SET phase='legacy_hidden',legacy_url_policy_ref=current_setting('academy.ai_fusion_legacy_url_policy') WHERE batch_key='${key}';
`+finish("archive-legacy-after-url-review");
const recover=start+locked+`
 IF r.manifest IS NULL THEN RAISE EXCEPTION 'Fusion registration required'; END IF;
 IF r.phase='recovered' THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM academy.offerings WHERE course_id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(r.manifest->'courses') x)) THEN RAISE EXCEPTION 'Fusion new offering reference requires recovery review'; END IF;
 UPDATE academy.courses c SET publication_state=x->>'publication_state' FROM jsonb_array_elements(r.baseline_snapshot->'courses') x WHERE c.id=(x->>'id')::uuid;
 UPDATE academy.courses SET publication_state='draft' WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(r.manifest->'courses') x);
 UPDATE private_education.ai_fusion_runs SET phase='recovered' WHERE batch_key='${key}';
 -- Non-destructive visibility recovery: registered draft rows and metadata are retained.
`+finish("recover-visibility");
const artifacts={
 "supabase/drafts/ai_fusion_stage4_manifest.json":json+"\n",
 "supabase/drafts/ai_fusion_stage4_A1_schema.sql":schema,
 "supabase/drafts/ai_fusion_stage4_A2_register.sql":data,
 "supabase/drafts/ai_fusion_stage4_B_publish.sql":publish,
 "supabase/drafts/ai_fusion_stage4_C_keep.sql":keep,
 "supabase/drafts/ai_fusion_stage4_C_archive.sql":hide,
 "supabase/drafts/ai_fusion_stage4_D_recover.sql":recover,
};
for(const [file,content] of Object.entries(artifacts)){
 if(process.argv.includes("--check")){
  if(fs.readFileSync(file,"utf8")!==content)throw Error("Generated artifact drift: "+file);
 }else fs.writeFileSync(file,content);
}
console.log("PASS: review SQL artifacts "+(process.argv.includes("--check")?"match":"generated")+"; no DB connection");
