-- REVIEW ONLY. Not a migration. Do not apply alongside the insecure v1 candidate.
-- Requires a separately reviewed bootstrap of private_education.offering_admins.
-- Caller must use a real, validated Supabase user JWT, not a service-role JWT.
DO $preflight$
BEGIN
  IF current_user <> 'postgres'
     OR to_regrole('academy_offering_executor') IS NOT NULL
     OR to_regnamespace('private_education') IS NOT NULL
     OR to_regclass('academy.courses') IS NULL
     OR to_regclass('academy.offerings') IS NULL
     OR to_regclass('public.published_offerings') IS NULL
     OR to_regclass('academy.applications') IS NOT NULL
     OR to_regclass('academy.application_private') IS NOT NULL
     OR pg_catalog.pg_has_role('anon','authenticated','MEMBER')
     OR pg_catalog.pg_has_role('service_role','authenticated','MEMBER')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND (p.proname LIKE 'academy_admin_save_offering%'
                  OR p.proname LIKE 'academy_admin_offerings_catalog%'))
     OR pg_catalog.has_schema_privilege('service_role','academy','USAGE')
     OR pg_catalog.has_any_column_privilege('service_role','academy.offerings','INSERT,UPDATE')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl d CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
                WHERE d.defaclrole=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user)
                  AND d.defaclobjtype='f' AND d.defaclnamespace IN (0,'public'::regnamespace)
                  AND a.grantee<>0 AND a.grantee NOT IN (SELECT oid FROM pg_catalog.pg_roles
                    WHERE rolname IN (current_user,'anon','authenticated','service_role')))
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='academy.offerings'::regclass AND relrowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='academy.courses'::regclass AND relrowsecurity)
  THEN RAISE EXCEPTION 'Offering v2 preflight failed: review actual privileges and objects'; END IF;
END;
$preflight$;

CREATE ROLE academy_offering_executor NOLOGIN NOINHERIT NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
-- Migration runner needs SET permission to transfer ownership. No API role is a member.
GRANT academy_offering_executor TO postgres;
CREATE SCHEMA private_education;
REVOKE ALL ON SCHEMA private_education FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE private_education.offering_admins (user_id uuid PRIMARY KEY);
ALTER TABLE private_education.offering_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private_education.offering_admins FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON private_education.offering_admins TO academy_offering_executor;
CREATE POLICY offering_admin_self_lookup ON private_education.offering_admins
  FOR SELECT TO academy_offering_executor USING (user_id = (SELECT auth.uid()));

GRANT USAGE ON SCHEMA academy, auth TO academy_offering_executor;
GRANT SELECT (id,title,publication_state) ON academy.courses TO academy_offering_executor;
GRANT SELECT (id,course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,location,capacity,status,is_public),
      INSERT (id,course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,location,capacity,status,is_public),
      UPDATE (course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,location,capacity,status,is_public)
  ON academy.offerings TO academy_offering_executor;
CREATE POLICY offering_executor_courses ON academy.courses FOR SELECT TO academy_offering_executor USING (true);
CREATE POLICY offering_executor_select ON academy.offerings FOR SELECT TO academy_offering_executor USING (true);
CREATE POLICY offering_executor_insert ON academy.offerings FOR INSERT TO academy_offering_executor WITH CHECK (true);
CREATE POLICY offering_executor_update ON academy.offerings FOR UPDATE TO academy_offering_executor USING (true) WITH CHECK (true);

-- This private SECURITY DEFINER helper is exposed only through a public INVOKER
-- wrapper. Every helper independently checks auth.uid() and the private admin list.
CREATE FUNCTION private_education.offering_catalog_v2() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS
    (SELECT 1 FROM private_education.offering_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'courses', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.title,c.id)
      FROM (SELECT id,title,publication_state FROM academy.courses) c),'[]'::jsonb),
    'offerings', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.start_date NULLS LAST,o.id)
      FROM (SELECT id,course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,
                   location,capacity,status,is_public FROM academy.offerings) o),'[]'::jsonb));
END;
$function$;

CREATE FUNCTION private_education.save_offering_v2(
  p_id uuid, p_create boolean, p_course_id uuid, p_start_date date, p_end_date date,
  p_enrollment_opens_at timestamptz, p_enrollment_closes_at timestamptz, p_location text,
  p_capacity integer, p_status text, p_is_public boolean
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_location text; v_parent_state text; v_id uuid; v_lock_key text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS
    (SELECT 1 FROM private_education.offering_admins a WHERE a.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  -- Enrollment capacity cannot be safely modified once application tables exist.
  IF to_regclass('academy.applications') IS NOT NULL OR to_regclass('academy.application_private') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname LIKE 'academy_admin_save_offering%'
                  AND p.proname <> 'academy_admin_save_offering_v2') THEN
    RAISE EXCEPTION 'Application integration requires separate review' USING ERRCODE='55000';
  END IF;
  IF p_id IS NULL OR p_create IS NULL OR p_course_id IS NULL OR p_capacity IS NULL OR p_capacity<0
     OR p_status IS NULL OR p_status NOT IN ('draft','scheduled','open','closed','finished','cancelled')
     OR p_is_public IS NULL OR length(coalesce(p_location,''))>500
     OR (p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date<p_start_date)
     OR ((p_enrollment_opens_at IS NULL) <> (p_enrollment_closes_at IS NULL))
     OR (p_enrollment_opens_at IS NOT NULL AND p_enrollment_opens_at>=p_enrollment_closes_at)
     OR (p_status='open' AND p_capacity=0)
     OR ((p_is_public OR p_status<>'draft') AND
         (p_start_date IS NULL OR p_end_date IS NULL OR p_enrollment_opens_at IS NULL OR p_enrollment_closes_at IS NULL))
     OR (p_is_public AND p_status='draft')
     OR (p_enrollment_opens_at IS NOT NULL AND date_trunc('second',p_enrollment_opens_at)<>p_enrollment_opens_at)
     OR (p_enrollment_closes_at IS NOT NULL AND date_trunc('second',p_enrollment_closes_at)<>p_enrollment_closes_at)
  THEN RAISE EXCEPTION 'Invalid offering' USING ERRCODE='22023'; END IF;
  v_location := nullif(btrim(p_location),'');
  SELECT publication_state INTO v_parent_state FROM academy.courses WHERE id=p_course_id;
  IF NOT FOUND OR (p_is_public AND v_parent_state<>'published') THEN
    RAISE EXCEPTION 'Public offering requires a published course' USING ERRCODE='22023';
  END IF;
  v_lock_key := jsonb_build_array(p_course_id,p_start_date,p_end_date,
    extract(epoch from p_enrollment_opens_at),extract(epoch from p_enrollment_closes_at),
    v_location,p_capacity,p_status,p_is_public)::text;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key,0));
  IF EXISTS (SELECT 1 FROM academy.offerings o WHERE (p_create OR o.id<>p_id)
      AND o.course_id=p_course_id AND o.start_date IS NOT DISTINCT FROM p_start_date
      AND o.end_date IS NOT DISTINCT FROM p_end_date
      AND o.enrollment_opens_at IS NOT DISTINCT FROM p_enrollment_opens_at
      AND o.enrollment_closes_at IS NOT DISTINCT FROM p_enrollment_closes_at
      AND o.location IS NOT DISTINCT FROM v_location AND o.capacity=p_capacity
      AND o.status=p_status AND o.is_public=p_is_public) THEN RETURN 'duplicate'; END IF;
  IF p_create THEN
    INSERT INTO academy.offerings(id,course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,location,capacity,status,is_public)
      VALUES(p_id,p_course_id,p_start_date,p_end_date,p_enrollment_opens_at,p_enrollment_closes_at,v_location,p_capacity,p_status,p_is_public)
      ON CONFLICT (id) DO NOTHING RETURNING id INTO v_id;
    IF v_id IS NULL THEN RETURN 'duplicate'; END IF;
  ELSE
    UPDATE academy.offerings SET course_id=p_course_id,start_date=p_start_date,end_date=p_end_date,
      enrollment_opens_at=p_enrollment_opens_at,enrollment_closes_at=p_enrollment_closes_at,
      location=v_location,capacity=p_capacity,status=p_status,is_public=p_is_public
      WHERE id=p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Offering not found' USING ERRCODE='P0002'; END IF;
  END IF;
  RETURN 'saved';
END;
$function$;

-- The owner needs CREATE only for ownership transfer, not at runtime.
GRANT USAGE, CREATE ON SCHEMA private_education TO academy_offering_executor;
ALTER FUNCTION private_education.offering_catalog_v2() OWNER TO academy_offering_executor;
ALTER FUNCTION private_education.save_offering_v2(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) OWNER TO academy_offering_executor;
REVOKE CREATE ON SCHEMA private_education FROM academy_offering_executor;
REVOKE ALL ON FUNCTION private_education.offering_catalog_v2() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private_education.save_offering_v2(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA private_education TO authenticated;
GRANT EXECUTE ON FUNCTION private_education.offering_catalog_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION private_education.save_offering_v2(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) TO authenticated;

CREATE FUNCTION public.academy_admin_offerings_catalog_v2() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $function$
  SELECT private_education.offering_catalog_v2();
$function$;
CREATE FUNCTION public.academy_admin_save_offering_v2(
  p_id uuid, p_create boolean, p_course_id uuid, p_start_date date, p_end_date date,
  p_enrollment_opens_at timestamptz, p_enrollment_closes_at timestamptz, p_location text,
  p_capacity integer, p_status text, p_is_public boolean
) RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path='' AS $function$
  SELECT private_education.save_offering_v2(p_id,p_create,p_course_id,p_start_date,p_end_date,
    p_enrollment_opens_at,p_enrollment_closes_at,p_location,p_capacity,p_status,p_is_public);
$function$;
REVOKE ALL ON FUNCTION public.academy_admin_offerings_catalog_v2() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.academy_admin_save_offering_v2(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_offerings_catalog_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_offering_v2(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) TO authenticated;
