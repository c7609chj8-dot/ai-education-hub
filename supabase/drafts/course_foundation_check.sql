-- course_foundation.sql을 테스트 전용 DB에 적용한 후에만 실행합니다.
-- 검사용 데이터는 이 트랜잭션의 ROLLBACK으로 남기지 않습니다.
BEGIN;
DO $test$
DECLARE
  test_course_id uuid;
  protected_count integer;
BEGIN
  SELECT count(*) INTO protected_count
  FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'academy' AND c.relkind = 'r' AND c.relrowsecurity
    AND c.relname IN ('courses', 'course_weeks', 'offerings');
  IF protected_count <> 3 THEN RAISE EXCEPTION 'RLS must be enabled on all three tables'; END IF;
  IF has_schema_privilege('anon', 'academy', 'USAGE')
     OR has_schema_privilege('authenticated', 'academy', 'USAGE') THEN
    RAISE EXCEPTION 'Public client roles must not access academy schema';
  END IF;
  IF has_table_privilege('anon', 'academy.courses', 'SELECT')
     OR has_table_privilege('authenticated', 'academy.courses', 'SELECT') THEN
    RAISE EXCEPTION 'Public client roles must not access course rows';
  END IF;

  INSERT INTO academy.courses (slug, title, category, summary, audience, result_artifact)
  VALUES ('test-course-day04', 'Test', 'Test', 'Test', 'Test', 'Test') RETURNING id INTO test_course_id;
  BEGIN
    INSERT INTO academy.courses (slug, title, category, summary, audience, result_artifact)
    VALUES ('test-course-day04', 'Test', 'Test', 'Test', 'Test', 'Test');
    RAISE EXCEPTION 'Duplicate course slug was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  INSERT INTO academy.course_weeks (course_id, week_number, title) VALUES (test_course_id, 1, 'Test');
  BEGIN
    INSERT INTO academy.course_weeks (course_id, week_number, title) VALUES (test_course_id, 1, 'Test');
    RAISE EXCEPTION 'Duplicate course week was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO academy.offerings (course_id, capacity) VALUES (test_course_id, -1);
    RAISE EXCEPTION 'Negative capacity was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO academy.offerings (course_id, capacity, start_date, end_date)
    VALUES (test_course_id, 1, '2026-12-02', '2026-12-01');
    RAISE EXCEPTION 'Reversed dates were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO academy.offerings (course_id, capacity) VALUES ('00000000-0000-0000-0000-000000000000', 1);
    RAISE EXCEPTION 'Unknown course was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END
$test$;
ROLLBACK;
