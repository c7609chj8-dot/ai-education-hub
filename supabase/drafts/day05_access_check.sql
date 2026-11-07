-- 5일차 검증 전용. 운영/원격 DB에서 실행하지 마세요.
-- 일회용 테스트 DB에서 4일차 초안을 적용하고 anon, authenticated,
-- BYPASSRLS 속성을 가진 service_role을 준비한 뒤 실행합니다.
-- 가상 행과 임시 GRANT를 만들며 마지막에 ROLLBACK합니다.
BEGIN;
INSERT INTO academy.courses (slug, title, category, summary, audience, result_artifact)
VALUES ('day05-isolated-check', 'Test', 'Test', 'Test', 'Test', 'Test');
INSERT INTO academy.course_weeks (course_id, week_number, title)
SELECT id, 1, 'Test' FROM academy.courses WHERE slug = 'day05-isolated-check';
INSERT INTO academy.offerings (course_id, capacity)
SELECT id, 1 FROM academy.courses WHERE slug = 'day05-isolated-check';

-- 실제 초안 상태: 스키마 및 테이블 권한이 없어 직접 SELECT가 거부됩니다.
SET LOCAL ROLE anon;
DO $check$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses', 'course_weeks', 'offerings'] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM academy.%I', t);
      RAISE EXCEPTION 'anon unexpectedly read %', t;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
END $check$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $check$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses', 'course_weeks', 'offerings'] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM academy.%I', t);
      RAISE EXCEPTION 'authenticated unexpectedly read %', t;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
END $check$;
RESET ROLE;

-- 테스트에서만 조회 권한을 임시 부여해 RLS 기본 거부를 독립적으로 검증합니다.
GRANT USAGE ON SCHEMA academy TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA academy TO anon, authenticated;
SET LOCAL ROLE anon;
DO $check$
DECLARE t text; visible_count integer;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses', 'course_weeks', 'offerings'] LOOP
    EXECUTE format('SELECT count(*) FROM academy.%I', t) INTO visible_count;
    IF visible_count <> 0 THEN RAISE EXCEPTION 'anon saw rows in %', t; END IF;
  END LOOP;
END $check$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $check$
DECLARE t text; visible_count integer;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses', 'course_weeks', 'offerings'] LOOP
    EXECUTE format('SELECT count(*) FROM academy.%I', t) INTO visible_count;
    IF visible_count <> 0 THEN RAISE EXCEPTION 'authenticated saw rows in %', t; END IF;
  END LOOP;
END $check$;
RESET ROLE;

-- BYPASSRLS도 스키마와 테이블 권한이 필요하며, 권한을 주면 RLS를 우회합니다.
DO $check$
DECLARE t text;
BEGIN
  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'service_role must have BYPASSRLS for this isolated test';
  END IF;
  IF has_schema_privilege('service_role', 'academy', 'USAGE') THEN
    RAISE EXCEPTION 'Unexpected pre-existing service_role schema privilege';
  END IF;
  FOREACH t IN ARRAY ARRAY['academy.courses', 'academy.course_weeks', 'academy.offerings'] LOOP
    IF has_table_privilege('service_role', t, 'SELECT') THEN
      RAISE EXCEPTION 'Unexpected pre-existing service_role SELECT on %', t;
    END IF;
  END LOOP;
END $check$;
GRANT USAGE ON SCHEMA academy TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA academy TO service_role;
SET LOCAL ROLE service_role;
DO $check$
DECLARE t text; visible_count integer;
BEGIN
  FOREACH t IN ARRAY ARRAY['courses', 'course_weeks', 'offerings'] LOOP
    EXECUTE format('SELECT count(*) FROM academy.%I', t) INTO visible_count;
    IF visible_count <> 1 THEN RAISE EXCEPTION 'Expected one service_role row in %, got %', t, visible_count; END IF;
  END LOOP;
END $check$;
RESET ROLE;
ROLLBACK;
