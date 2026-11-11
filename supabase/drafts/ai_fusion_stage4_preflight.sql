-- READ ONLY. Target must be verified separately: ai-education-hub-dev / uenvjqgylrevujdjpfed.
-- Expected hashes are the 2026-11-11 reviewed baseline, not an authentication mechanism.
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'executor',current_user,'read_only',current_setting('transaction_read_only'),'version',current_setting('server_version'),
 'counts',jsonb_build_object('courses',(SELECT count(*) FROM academy.courses),'weeks',(SELECT count(*) FROM academy.course_weeks),'offerings',(SELECT count(*) FROM academy.offerings),'public_offerings',(SELECT count(*) FROM public.published_offerings)),
 'baseline_hashes_match',jsonb_build_object(
 'courses',(SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY c.id)::text)='063817c6a8d81945b8479a2e22f261bb' FROM academy.courses c),
 'weeks',(SELECT md5(jsonb_agg(to_jsonb(w) ORDER BY w.id)::text)='b9866407785dc527d007f94a09888b76' FROM academy.course_weeks w),
 'offerings',(SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY o.id)::text)='a6daeccd85e36a9c019f64e73420d548' FROM academy.offerings o)),
 'new_objects_absent',to_regclass('academy.course_profiles') IS NULL AND to_regclass('academy.course_week_practices') IS NULL AND to_regclass('private_education.ai_fusion_runs') IS NULL,
 'b04_tables_absent',to_regclass('academy.applications') IS NULL AND to_regclass('academy.application_private') IS NULL,
 'legacy_states',(SELECT jsonb_agg(jsonb_build_object('slug',slug,'state',publication_state) ORDER BY slug) FROM academy.courses),
 'rpc_v2_present',to_regprocedure('public.academy_admin_save_offering_v2(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean)') IS NOT NULL,
 'postgres_role',(SELECT jsonb_build_object('super',rolsuper,'bypass',rolbypassrls,'create_role',rolcreaterole) FROM pg_roles WHERE rolname=current_user)
) AS preflight;
COMMIT;
