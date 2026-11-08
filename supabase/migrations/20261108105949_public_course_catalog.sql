-- Prepared for review only. Do not apply to a hosted database without separate approval.
-- Keep demo data in supabase/drafts/day08_dev_examples.sql, outside migrations.
DO $preflight$
DECLARE
  r record;
  target_table record;
BEGIN
  IF to_regclass('academy.courses') IS NULL OR to_regclass('academy.course_weeks') IS NULL
     OR to_regclass('academy.offerings') IS NULL THEN
    RAISE EXCEPTION 'Public course preflight: foundation tables are missing';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role'))<>3
     OR NOT pg_catalog.has_schema_privilege(current_user,'public','CREATE') THEN
    RAISE EXCEPTION 'Public course preflight: expected roles or public creation privilege are missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c WHERE c.oid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass)
      AND c.relkind<>'r'
  ) THEN
    RAISE EXCEPTION 'Public course preflight: foundation relation types differ';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='academy' AND c.relkind IN ('r','p','v','m','f','S')
      AND c.relname NOT IN ('courses','course_weeks','offerings')
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='academy'
  ) THEN
    RAISE EXCEPTION 'Public course preflight: unexpected academy objects require review';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='academy' AND (t.typtype IN ('d','e','r','m') OR
      (t.typtype='c' AND t.typrelid NOT IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass)))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_operator o JOIN pg_catalog.pg_namespace n ON n.oid=o.oprnamespace
    WHERE n.nspname='academy'
  ) THEN
    RAISE EXCEPTION 'Public course preflight: unexpected academy types or operators require review';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c WHERE c.oid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass)
      AND (c.relkind<>'r' OR NOT c.relrowsecurity OR c.relforcerowsecurity OR NOT pg_catalog.pg_has_role(current_user,c.relowner,'USAGE'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy p WHERE p.polrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass)
  ) THEN
    RAISE EXCEPTION 'Public course preflight: table ownership, RLS or policies differ';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid='academy.courses'::regclass AND attname='objectives' AND attnum>0 AND NOT attisdropped)
     OR to_regclass('public.published_courses') IS NOT NULL
     OR to_regclass('public.published_course_weeks') IS NOT NULL
     OR to_regtype('public.published_courses') IS NOT NULL
     OR to_regtype('public.published_course_weeks') IS NOT NULL THEN
    RAISE EXCEPTION 'Public course preflight: column or view name already exists';
  END IF;
  -- Held through the migration transaction to protect the empty-table check from concurrent writers.
  LOCK TABLE academy.courses, academy.course_weeks IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM academy.courses) OR EXISTS (SELECT 1 FROM academy.course_weeks) THEN
    RAISE EXCEPTION 'Public course preflight: course tables must be empty for first publication';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
    WHERE d.defaclrole=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user)
      AND d.defaclobjtype='r' AND d.defaclnamespace IN (0,'public'::regnamespace)
      AND a.grantee<>0 AND a.grantee NOT IN (
        SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN (current_user,'anon','authenticated','service_role')
      )
  ) THEN
    RAISE EXCEPTION 'Public course preflight: unexpected default view grantee requires review';
  END IF;
  FOR r IN SELECT rolname FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    IF pg_catalog.has_schema_privilege(r.rolname,'academy','USAGE') OR pg_catalog.has_schema_privilege(r.rolname,'academy','CREATE')
       OR NOT pg_catalog.has_schema_privilege(r.rolname,'public','USAGE') THEN
      RAISE EXCEPTION 'Public course preflight: unexpected academy schema privilege for %',r.rolname;
    END IF;
    FOR target_table IN SELECT c.oid FROM pg_catalog.pg_class c WHERE c.oid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass) LOOP
      IF pg_catalog.has_table_privilege(r.rolname,target_table.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
         OR pg_catalog.has_any_column_privilege(r.rolname,target_table.oid,'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Public course preflight: unexpected academy table or column privilege for %',r.rolname;
      END IF;
    END LOOP;
  END LOOP;
END;
$preflight$;

ALTER TABLE academy.courses ADD COLUMN objectives text[] NOT NULL DEFAULT '{}';

GRANT USAGE ON SCHEMA academy TO anon, authenticated;
GRANT SELECT (id, slug, title, category, summary, audience, result_artifact,
              duration_hours, objectives, publication_state)
  ON academy.courses TO anon, authenticated;
GRANT SELECT (course_id, week_number, title)
  ON academy.course_weeks TO anon, authenticated;

CREATE POLICY courses_select_published ON academy.courses
  FOR SELECT TO anon, authenticated USING (publication_state = 'published');
CREATE POLICY course_weeks_select_published ON academy.course_weeks
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM academy.courses c
                 WHERE c.id = academy.course_weeks.course_id AND c.publication_state = 'published'));

CREATE VIEW public.published_courses WITH (security_invoker = true) AS
  SELECT id, slug, title, category, summary, audience, result_artifact,
         duration_hours, objectives
  FROM academy.courses WHERE publication_state = 'published';
CREATE VIEW public.published_course_weeks WITH (security_invoker = true) AS
  SELECT w.course_id, w.week_number, w.title
  FROM academy.course_weeks w
  JOIN academy.courses c ON c.id = w.course_id
  WHERE c.publication_state = 'published';

-- Existing public default privileges may grant extra rights to service_role.
-- Revoke on these newly created views only; never change schema-wide defaults.
REVOKE ALL ON public.published_courses, public.published_course_weeks
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.published_courses, public.published_course_weeks
  TO anon, authenticated;
