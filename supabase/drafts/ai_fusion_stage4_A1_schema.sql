-- REVIEW CANDIDATE ONLY. No hosted execution is authorized.
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
 batch_key text PRIMARY KEY CHECK(batch_key='ai-fusion-stage4-v1'),
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
 VALUES('ai-fusion-stage4-v1',(SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'owner',c.relowner,'rls',c.relrowsecurity,'acl',c.relacl) ORDER BY c.oid) FROM pg_class c WHERE c.oid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'columns',(SELECT jsonb_agg(jsonb_build_object('rel',a.attrelid,'num',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'null',a.attnotnull,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('rel',conrelid,'name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname) FROM pg_constraint WHERE conrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p WHERE polrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)))),(SELECT jsonb_build_object(
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
 'defaults',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.oid),'[]'::jsonb) FROM pg_default_acl d WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres')))),(SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p))),(SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p))),'schema_only');
COMMIT;
