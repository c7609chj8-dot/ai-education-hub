-- 10일차 검토용 초안: 원격 DB에 자동 적용하지 않습니다.
-- 8·9일차 강좌/일정 스키마 초안이 선행되어야 합니다.
-- SECURITY INVOKER 함수는 service_role에만 노출하며 서버에서 매 요청 관리자 인가가 필수입니다.

GRANT USAGE ON SCHEMA academy TO service_role;
GRANT SELECT (id, slug, title, category, summary, audience, result_artifact, duration_hours, objectives, publication_state),
      INSERT (slug, title, category, summary, audience, result_artifact, duration_hours, objectives, publication_state),
      UPDATE (slug, title, category, summary, audience, result_artifact, duration_hours, objectives, publication_state)
  ON academy.courses TO service_role;
GRANT SELECT (id, course_id, start_date, end_date, location, capacity, status, is_public),
      INSERT (course_id, start_date, end_date, location, capacity, status, is_public),
      UPDATE (course_id, start_date, end_date, location, capacity, status, is_public)
  ON academy.offerings TO service_role;

CREATE FUNCTION public.academy_admin_catalog() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$
  SELECT jsonb_build_object(
    'courses', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.title, c.id) FROM (
      SELECT id, slug, title, category, summary, audience, result_artifact, duration_hours, objectives, publication_state
      FROM academy.courses) c), '[]'::jsonb),
    'offerings', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.start_date NULLS LAST, o.id) FROM (
      SELECT id, course_id, start_date, end_date, location, capacity, status, is_public
      FROM academy.offerings) o), '[]'::jsonb)
  );
$function$;

CREATE FUNCTION public.academy_admin_save_course(
  p_id uuid, p_slug text, p_title text, p_category text, p_summary text,
  p_audience text, p_result_artifact text, p_duration_hours integer,
  p_objectives text[], p_publication_state text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE result_id uuid;
BEGIN
  IF p_publication_state IS NULL OR p_publication_state NOT IN ('draft', 'published', 'archived') OR p_objectives IS NULL THEN
    RAISE EXCEPTION 'Invalid course state or objectives' USING ERRCODE = '22023';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO academy.courses (slug, title, category, summary, audience, result_artifact, duration_hours, objectives, publication_state)
    VALUES (p_slug, p_title, p_category, p_summary, p_audience, p_result_artifact, p_duration_hours, p_objectives, p_publication_state)
    RETURNING id INTO result_id;
  ELSE
    UPDATE academy.courses SET slug=p_slug, title=p_title, category=p_category, summary=p_summary,
      audience=p_audience, result_artifact=p_result_artifact, duration_hours=p_duration_hours,
      objectives=p_objectives, publication_state=p_publication_state
    WHERE id=p_id RETURNING id INTO result_id;
  END IF;
  IF result_id IS NULL THEN RAISE EXCEPTION 'Course not found' USING ERRCODE = 'P0002'; END IF;
  RETURN result_id;
END;
$function$;

CREATE FUNCTION public.academy_admin_save_offering(
  p_id uuid, p_course_id uuid, p_start_date date, p_end_date date, p_location text,
  p_capacity integer, p_status text, p_is_public boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE result_id uuid;
BEGIN
  IF p_is_public IS NULL OR p_status IS NULL OR p_status NOT IN ('draft','scheduled','open','closed','finished','cancelled') THEN
    RAISE EXCEPTION 'Invalid offering state' USING ERRCODE = '22023';
  END IF;
  IF p_is_public THEN
    -- 같은 트랜잭션 안에서 강좌 공개 상태를 확인하고 잠가 동시 수정과 경합하지 않습니다.
    PERFORM 1 FROM academy.courses WHERE id=p_course_id AND publication_state='published' FOR SHARE;
    IF p_status = 'draft' OR NOT FOUND THEN
      RAISE EXCEPTION 'Public offering requires a published course and non-draft status' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO academy.offerings (course_id, start_date, end_date, location, capacity, status, is_public)
    VALUES (p_course_id, p_start_date, p_end_date, p_location, p_capacity, p_status, p_is_public)
    RETURNING id INTO result_id;
  ELSE
    UPDATE academy.offerings SET course_id=p_course_id, start_date=p_start_date, end_date=p_end_date,
      location=p_location, capacity=p_capacity, status=p_status, is_public=p_is_public
    WHERE id=p_id RETURNING id INTO result_id;
  END IF;
  IF result_id IS NULL THEN RAISE EXCEPTION 'Offering not found' USING ERRCODE = 'P0002'; END IF;
  RETURN result_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.academy_admin_catalog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_save_course(uuid,text,text,text,text,text,text,integer,text[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_save_offering(uuid,uuid,date,date,text,integer,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_catalog() TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_course(uuid,text,text,text,text,text,text,integer,text[],text) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_offering(uuid,uuid,date,date,text,integer,text,boolean) TO service_role;
