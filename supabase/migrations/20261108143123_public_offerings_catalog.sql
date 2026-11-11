-- B-03-4 candidate: no example data, admin functions, or application changes.
-- Apply only after explicit approval, fresh preflight, and runner validation.
DO $preflight$
DECLARE r record;
BEGIN
  IF current_user <> 'postgres' OR to_regclass('academy.offerings') IS NULL
     OR to_regclass('academy.courses') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
                    WHERE c.oid='academy.offerings'::regclass AND c.relkind='r'
                      AND c.relrowsecurity AND NOT c.relforcerowsecurity
                      AND pg_catalog.pg_get_userbyid(c.relowner)=current_user)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
                    WHERE c.oid='academy.courses'::regclass AND c.relkind='r'
                      AND c.relrowsecurity AND NOT c.relforcerowsecurity)
     OR NOT pg_catalog.has_schema_privilege(current_user,'public','CREATE')
     OR (SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role')) <> 3
  THEN RAISE EXCEPTION 'Public offerings preflight: unexpected owner, role, table or RLS'; END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
             WHERE attrelid='academy.offerings'::regclass AND attname='is_public' AND attnum>0 AND NOT attisdropped)
     OR to_regclass('public.published_offerings') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
                WHERE n.nspname='public' AND t.typname='published_offerings')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='academy' AND tablename='offerings')
  THEN RAISE EXCEPTION 'Public offerings preflight: existing column, object or policy'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
    WHERE d.defaclrole=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user)
      AND d.defaclobjtype='r' AND d.defaclnamespace IN (0,'public'::regnamespace)
      AND a.grantee<>0 AND a.grantee NOT IN (
        SELECT oid FROM pg_catalog.pg_roles WHERE rolname IN (current_user,'anon','authenticated','service_role')
      )
  ) THEN RAISE EXCEPTION 'Public offerings preflight: unexpected default view grantee'; END IF;

  FOR r IN SELECT rolname FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
    IF pg_catalog.has_table_privilege(r.rolname,'academy.offerings','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
       OR pg_catalog.has_any_column_privilege(r.rolname,'academy.offerings','SELECT,INSERT,UPDATE,REFERENCES')
    THEN RAISE EXCEPTION 'Public offerings preflight: unexpected existing offering grants for %', r.rolname; END IF;
    IF r.rolname IN ('anon','authenticated') AND (
         NOT pg_catalog.has_schema_privilege(r.rolname,'academy','USAGE')
         OR NOT pg_catalog.has_column_privilege(r.rolname,'academy.courses','id','SELECT')
         OR NOT pg_catalog.has_column_privilege(r.rolname,'academy.courses','slug','SELECT')
         OR NOT pg_catalog.has_column_privilege(r.rolname,'academy.courses','title','SELECT')
         OR NOT pg_catalog.has_column_privilege(r.rolname,'academy.courses','publication_state','SELECT'))
    THEN RAISE EXCEPTION 'Public offerings preflight: course access prerequisites missing for %', r.rolname; END IF;
  END LOOP;
  -- Requires the migration runner to hold the lock for the entire transaction.
  LOCK TABLE academy.offerings IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM academy.offerings)
  THEN RAISE EXCEPTION 'Public offerings preflight: offerings table must be empty'; END IF;
END;
$preflight$;

ALTER TABLE academy.offerings ADD COLUMN is_public boolean NOT NULL DEFAULT false;

GRANT SELECT (id, course_id, start_date, end_date, enrollment_opens_at,
              enrollment_closes_at, location, capacity, status, is_public)
  ON academy.offerings TO anon, authenticated;

CREATE POLICY offerings_select_public ON academy.offerings
  FOR SELECT TO anon, authenticated
  USING (is_public AND status <> 'draft'
    AND EXISTS (SELECT 1 FROM academy.courses c
                WHERE c.id=academy.offerings.course_id AND c.publication_state='published'));

CREATE VIEW public.published_offerings WITH (security_invoker=true) AS
  SELECT o.id, o.course_id, c.slug AS course_slug, c.title AS course_title,
         o.start_date, o.end_date, o.enrollment_opens_at, o.enrollment_closes_at,
         o.location, o.capacity, o.status
  FROM academy.offerings o JOIN academy.courses c ON c.id=o.course_id
  WHERE o.is_public AND o.status <> 'draft' AND c.publication_state='published';

-- Scope the revoke to the new view only; do not alter public default privileges.
REVOKE ALL ON public.published_offerings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.published_offerings TO anon, authenticated;
