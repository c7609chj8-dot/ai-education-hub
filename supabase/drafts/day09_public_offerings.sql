-- 9일차 검토용 초안: 원격 DB에 자동 적용하지 않습니다.
-- 8일차 공개 강좌 초안이 먼저 적용되어야 합니다.
-- 관리자가 공개로 지정한 일정 중 공개 강좌에 속한 작성 중이 아닌 일정만 조회합니다.

ALTER TABLE academy.offerings ADD COLUMN is_public boolean NOT NULL DEFAULT false;

GRANT SELECT (id, course_id, start_date, end_date, location, capacity, status, is_public)
  ON academy.offerings TO anon, authenticated;

CREATE POLICY offerings_select_public ON academy.offerings
  FOR SELECT TO anon, authenticated
  USING (is_public AND status <> 'draft'
    AND EXISTS (SELECT 1 FROM academy.courses c
                WHERE c.id = academy.offerings.course_id AND c.publication_state = 'published'));

CREATE VIEW public.published_offerings WITH (security_invoker = true) AS
  SELECT o.id, o.course_id, c.slug AS course_slug, c.title AS course_title,
         o.start_date, o.end_date, o.location, o.capacity, o.status
  FROM academy.offerings o
  JOIN academy.courses c ON c.id = o.course_id
  WHERE o.is_public AND o.status <> 'draft' AND c.publication_state = 'published';

REVOKE ALL ON public.published_offerings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.published_offerings TO anon, authenticated;
