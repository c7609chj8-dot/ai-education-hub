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
LOCK TABLE academy.course_profiles,academy.course_week_practices,private_education.ai_fusion_runs IN SHARE ROW EXCLUSIVE MODE;
DO $fusion$
DECLARE r record; v_course jsonb; v_week jsonb; now_snapshot jsonb;
BEGIN
 SELECT * INTO STRICT r FROM private_education.ai_fusion_runs WHERE batch_key='ai-fusion-stage4-v1' FOR UPDATE;
 IF r.schema_signature IS DISTINCT FROM (SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'owner',c.relowner,'rls',c.relrowsecurity,'acl',c.relacl) ORDER BY c.oid) FROM pg_class c WHERE c.oid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'columns',(SELECT jsonb_agg(jsonb_build_object('rel',a.attrelid,'num',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'null',a.attnotnull,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('rel',conrelid,'name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname) FROM pg_constraint WHERE conrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p WHERE polrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)))) THEN RAISE EXCEPTION 'Fusion metadata schema/ACL/RLS drift'; END IF;
 IF r.protected_security IS DISTINCT FROM (SELECT jsonb_build_object(
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
 'defaults',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.oid),'[]'::jsonb) FROM pg_default_acl d WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres')))) THEN RAISE EXCEPTION 'Fusion existing security drift'; END IF;
 now_snapshot := (SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p)));
 IF now_snapshot IS DISTINCT FROM r.expected_snapshot THEN RAISE EXCEPTION 'Fusion data drift; no overwrite allowed'; END IF;

 IF r.manifest IS NULL THEN RAISE EXCEPTION 'Fusion registration required'; END IF;
 IF r.phase IN ('published','legacy_hidden') THEN RETURN; END IF;
 IF r.phase NOT IN ('registered','recovered') THEN RAISE EXCEPTION 'Fusion invalid publication phase'; END IF;
 -- Separate approval to expose draft educational material; NOT a curriculum review approval.
 UPDATE academy.courses SET publication_state='published' WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(r.manifest->'courses') x);
 UPDATE private_education.ai_fusion_runs SET phase='published' WHERE batch_key='ai-fusion-stage4-v1';

 UPDATE private_education.ai_fusion_runs SET expected_snapshot=(SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p))),
 history=history || jsonb_build_array(jsonb_build_object('action','publish-new-draft-curricula','at',clock_timestamp(),'executor',current_user))
 WHERE batch_key='ai-fusion-stage4-v1';
END $fusion$;
COMMIT;
