-- 개발·일회용 테스트 DB 전용 예시 일정. 운영 DB에 적용하지 마세요.
-- 예시 신청 인원과 실제 신청은 저장하지 않습니다.
BEGIN;
LOCK TABLE academy.courses IN SHARE MODE;
LOCK TABLE academy.offerings IN SHARE ROW EXCLUSIVE MODE;
DO $check$ BEGIN
  IF EXISTS (SELECT 1 FROM academy.offerings) THEN RAISE EXCEPTION 'Example schedule seed requires an empty offerings table'; END IF;
  IF (SELECT count(*) FROM academy.courses WHERE slug IN ('life-chatgpt', 'ai-work', 'ai-ebook', 'ai-instructor', 'ai-business') AND publication_state = 'published') <> 5 THEN
    RAISE EXCEPTION 'Example schedule requires the five published example courses';
  END IF;
END $check$;

WITH sample(slug, start_date, end_date, location, capacity, status) AS (VALUES
  ('life-chatgpt', '2026-11-16', '2027-02-01', '온라인', 20, 'open'),
  ('ai-work', '2026-11-16', '2027-02-01', '강의실', 20, 'open'),
  ('ai-ebook', '2026-11-24', '2027-02-09', '온라인', 20, 'closed'),
  ('ai-instructor', '2026-12-02', '2027-02-17', '강의실', 20, 'scheduled'),
  ('ai-business', '2026-12-07', '2027-02-22', '온라인', 20, 'open')
)
INSERT INTO academy.offerings (course_id, start_date, end_date, location, capacity, status, is_public)
SELECT c.id, sample.start_date::date, sample.end_date::date, sample.location, sample.capacity, sample.status, true
FROM sample JOIN academy.courses c ON c.slug = sample.slug;
COMMIT;
