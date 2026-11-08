-- B-03-5 review candidate. Apply only with separate approval.
-- This version is intentionally unavailable if application tables exist.
DO $preflight$
DECLARE r record;
BEGIN
  IF current_user <> 'postgres' OR to_regclass('academy.courses') IS NULL
     OR to_regclass('academy.offerings') IS NULL
     OR to_regclass('public.published_offerings') IS NULL
     OR to_regclass('academy.applications') IS NOT NULL
     OR to_regclass('academy.application_private') IS NOT NULL
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='service_role' AND rolbypassrls)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='academy.offerings'::regclass AND relrowsecurity AND NOT relforcerowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='academy.courses'::regclass AND relrowsecurity AND NOT relforcerowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid='academy.offerings'::regclass AND attname='is_public' AND NOT attisdropped)
     OR pg_catalog.has_schema_privilege('service_role','academy','USAGE')
     OR pg_catalog.has_table_privilege('service_role','academy.courses','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
     OR pg_catalog.has_any_column_privilege('service_role','academy.courses','SELECT,INSERT,UPDATE,REFERENCES')
  THEN RAISE EXCEPTION 'Admin offering preflight: prerequisites differ'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND (p.proname LIKE 'academy_admin_save_offering%'
               OR p.proname='academy_admin_offerings_catalog_v1'))
  THEN RAISE EXCEPTION 'Admin offering preflight: conflicting legacy or new function'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl d CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
    WHERE d.defaclrole=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user)
      AND d.defaclobjtype='f' AND d.defaclnamespace IN (0,'public'::regnamespace)
      AND a.grantee<>0 AND a.grantee NOT IN (
        SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN (current_user,'anon','authenticated','service_role'))
  ) THEN RAISE EXCEPTION 'Admin offering preflight: unexpected default function grant'; END IF;
  FOR r IN SELECT rolname FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
    IF pg_catalog.has_table_privilege(r.rolname,'academy.offerings','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
       OR pg_catalog.has_any_column_privilege(r.rolname,'academy.offerings','INSERT,UPDATE,REFERENCES')
    THEN RAISE EXCEPTION 'Admin offering preflight: unexpected offering write grant for %',r.rolname; END IF;
  END LOOP;
END;
$preflight$;

GRANT USAGE ON SCHEMA academy TO service_role;
GRANT SELECT (id, title, publication_state) ON academy.courses TO service_role;
GRANT SELECT (id, course_id, start_date, end_date, enrollment_opens_at, enrollment_closes_at, location, capacity, status, is_public),
      INSERT (id, course_id, start_date, end_date, enrollment_opens_at, enrollment_closes_at, location, capacity, status, is_public),
      UPDATE (course_id, start_date, end_date, enrollment_opens_at, enrollment_closes_at, location, capacity, status, is_public)
  ON academy.offerings TO service_role;

CREATE FUNCTION public.academy_admin_offerings_catalog_v1() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $function$
  SELECT jsonb_build_object(
    'courses', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.title,c.id)
      FROM (SELECT id,title,publication_state FROM academy.courses) c),'[]'::jsonb),
    'offerings', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.start_date NULLS LAST,o.id)
      FROM (SELECT id,course_id,start_date,end_date,enrollment_opens_at,enrollment_closes_at,
                   location,capacity,status,is_public FROM academy.offerings) o),'[]'::jsonb)
  );
$function$;

CREATE FUNCTION public.academy_admin_save_offering_v1(
  p_id uuid, p_create boolean, p_course_id uuid, p_start_date date, p_end_date date,
  p_enrollment_opens_at timestamptz, p_enrollment_closes_at timestamptz, p_location text,
  p_capacity integer, p_status text, p_is_public boolean
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_location text; v_parent_state text; v_id uuid; v_lock_key text;
BEGIN
  IF to_regclass('academy.applications') IS NOT NULL OR to_regclass('academy.application_private') IS NOT NULL
     OR (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname LIKE 'academy_admin_save_offering%') <> 1 THEN
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
  -- All callers of this version serialize identical content before duplicate lookup.
  v_lock_key := jsonb_build_array(p_course_id,p_start_date,p_end_date,
    extract(epoch from p_enrollment_opens_at),extract(epoch from p_enrollment_closes_at),
    v_location,p_capacity,p_status,p_is_public)::text;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key,0));
  IF EXISTS (
    SELECT 1 FROM academy.offerings o WHERE (p_create OR o.id<>p_id)
      AND o.course_id=p_course_id AND o.start_date IS NOT DISTINCT FROM p_start_date
      AND o.end_date IS NOT DISTINCT FROM p_end_date
      AND o.enrollment_opens_at IS NOT DISTINCT FROM p_enrollment_opens_at
      AND o.enrollment_closes_at IS NOT DISTINCT FROM p_enrollment_closes_at
      AND o.location IS NOT DISTINCT FROM v_location AND o.capacity=p_capacity
      AND o.status=p_status AND o.is_public=p_is_public
  ) THEN RETURN 'duplicate'; END IF;
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

REVOKE ALL ON FUNCTION public.academy_admin_offerings_catalog_v1() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.academy_admin_save_offering_v1(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_offerings_catalog_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_offering_v1(uuid,boolean,uuid,date,date,timestamptz,timestamptz,text,integer,text,boolean) TO service_role;
