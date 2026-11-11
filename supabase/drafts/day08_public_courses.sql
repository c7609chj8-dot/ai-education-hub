-- 8일차 검토용 초안. 원격 DB에 자동 적용하지 않습니다.
-- 전제: academy 기초 스키마가 존재하고 public에 같은 이름의 뷰가 없어야 합니다.
-- 공개된 강좌와 그 강좌의 주차만 읽도록 제한합니다.

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

REVOKE ALL ON public.published_courses, public.published_course_weeks
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.published_courses, public.published_course_weeks
  TO anon, authenticated;
