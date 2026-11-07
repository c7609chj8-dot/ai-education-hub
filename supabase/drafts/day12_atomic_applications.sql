-- 12일차 검토용 초안: 원격 DB에 적용하지 않습니다.
-- 8~11일차 초안이 선행되며 신청 테이블이 비어 있어야 합니다.
-- 입력 정책·개인정보 안내·서비스 키 보호 및 전체 쓰기 경로 검토 후에만 사용합니다.

ALTER TABLE academy.applications ADD COLUMN request_id uuid NOT NULL;
ALTER TABLE academy.applications ADD CONSTRAINT applications_id_offering_key UNIQUE (id, offering_id);
ALTER TABLE academy.applications ADD CONSTRAINT applications_offering_request_key UNIQUE (offering_id, request_id);
ALTER TABLE academy.application_private ADD COLUMN offering_id uuid NOT NULL;
ALTER TABLE academy.application_private ADD CONSTRAINT application_private_same_offering_fk
  FOREIGN KEY (application_id, offering_id) REFERENCES academy.applications(id, offering_id) ON DELETE RESTRICT;
ALTER TABLE academy.application_private ADD CONSTRAINT application_private_name_trimmed
  CHECK (applicant_name = btrim(applicant_name));
ALTER TABLE academy.application_private ADD CONSTRAINT application_private_contact_digits
  CHECK (contact ~ '^[0-9]{9,15}$');
ALTER TABLE academy.application_private ADD CONSTRAINT application_private_unique_applicant
  UNIQUE (offering_id, applicant_name, contact);

GRANT SELECT (enrollment_opens_at, enrollment_closes_at) ON academy.offerings TO service_role;
GRANT SELECT (id, offering_id, request_id, status, notice_version),
      INSERT (offering_id, request_id, notice_version) ON academy.applications TO service_role;
GRANT SELECT (application_id, offering_id, applicant_name, contact),
      INSERT (application_id, offering_id, applicant_name, contact) ON academy.application_private TO service_role;

-- 서버에서만 호출. 동의 버전의 유효성·요청 제한은 호출 서버가 별도 확인해야 합니다.
-- 같은 요청 키와 같은 내용의 재시도는 기존 접수로 응답하며 개인 식별자는 반환하지 않습니다.
CREATE FUNCTION public.academy_submit_application(
  p_offering_id uuid, p_request_id uuid, p_name text, p_contact text, p_notice_version text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  v_course_id uuid; v_current_course uuid; v_public boolean; v_status text; v_capacity integer;
  v_opens timestamptz; v_closes timestamptz; v_course_state text;
  v_name text; v_contact text; v_prior_id uuid; v_prior_name text; v_prior_contact text;
  v_prior_notice text; v_count bigint; v_application_id uuid; v_now timestamptz;
BEGIN
  IF p_offering_id IS NULL OR p_request_id IS NULL OR p_name IS NULL OR p_contact IS NULL OR
     p_notice_version IS NULL OR p_notice_version !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' THEN RETURN 'unavailable'; END IF;
  v_name := btrim(p_name);
  IF length(v_name) NOT BETWEEN 1 AND 100 OR v_name ~ '[[:cntrl:]]' OR length(p_contact) > 32 OR
     p_contact !~ '^\+?[0-9 ()-]+$' THEN RETURN 'unavailable'; END IF;
  v_contact := regexp_replace(p_contact, '[^0-9]', '', 'g');
  IF length(v_contact) NOT BETWEEN 9 AND 15 THEN RETURN 'unavailable'; END IF;

  -- 일관된 잠금 순서: 강좌 공유 잠금 → 기수 행 잠금. 기수의 강좌가 바뀌면 실패합니다.
  SELECT course_id INTO v_course_id FROM academy.offerings WHERE id=p_offering_id;
  IF NOT FOUND THEN RETURN 'unavailable'; END IF;
  SELECT publication_state INTO v_course_state FROM academy.courses WHERE id=v_course_id FOR SHARE;
  IF NOT FOUND THEN RETURN 'unavailable'; END IF;
  SELECT course_id, is_public, status, capacity, enrollment_opens_at, enrollment_closes_at
    INTO v_current_course, v_public, v_status, v_capacity, v_opens, v_closes
    FROM academy.offerings WHERE id=p_offering_id FOR UPDATE;
  IF NOT FOUND OR v_current_course <> v_course_id THEN RETURN 'unavailable'; END IF;

  SELECT a.id, a.notice_version, ap.applicant_name, ap.contact
    INTO v_prior_id, v_prior_notice, v_prior_name, v_prior_contact
    FROM academy.applications a JOIN academy.application_private ap ON ap.application_id=a.id
    WHERE a.offering_id=p_offering_id AND a.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_name=v_name AND v_prior_contact=v_contact AND v_prior_notice=p_notice_version THEN RETURN 'accepted'; END IF;
    RETURN 'unavailable';
  END IF;
  v_now := clock_timestamp();
  IF NOT v_public OR v_status <> 'open' OR v_course_state <> 'published' OR
     v_opens IS NULL OR v_closes IS NULL OR v_opens >= v_closes OR v_now < v_opens OR v_now >= v_closes THEN
    RETURN 'unavailable';
  END IF;
  SELECT count(*) INTO v_count FROM academy.applications WHERE offering_id=p_offering_id AND status='received';
  IF v_count >= v_capacity OR EXISTS (
    SELECT 1 FROM academy.application_private WHERE offering_id=p_offering_id AND applicant_name=v_name AND contact=v_contact
  ) THEN RETURN 'unavailable'; END IF;
  INSERT INTO academy.applications (offering_id, request_id, notice_version)
    VALUES (p_offering_id, p_request_id, p_notice_version) RETURNING id INTO v_application_id;
  INSERT INTO academy.application_private (application_id, offering_id, applicant_name, contact)
    VALUES (v_application_id, p_offering_id, v_name, v_contact);
  RETURN 'accepted';
END;
$function$;
REVOKE ALL ON FUNCTION public.academy_submit_application(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_submit_application(uuid,uuid,text,text,text) TO service_role;

-- 관리자도 동일한 기수 잠금 후 접수 인원보다 정원을 줄이거나 접수된 기수의 강좌를 바꿀 수 없습니다.
CREATE OR REPLACE FUNCTION public.academy_admin_save_offering(
  p_id uuid, p_course_id uuid, p_start_date date, p_end_date date, p_location text,
  p_capacity integer, p_status text, p_is_public boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE result_id uuid; current_course uuid; accepted_count bigint;
BEGIN
  IF p_is_public IS NULL OR p_status IS NULL OR p_status NOT IN ('draft','scheduled','open','closed','finished','cancelled') THEN
    RAISE EXCEPTION 'Invalid offering state' USING ERRCODE = '22023';
  END IF;
  IF p_is_public THEN
    PERFORM 1 FROM academy.courses WHERE id=p_course_id AND publication_state='published' FOR SHARE;
    IF p_status='draft' OR NOT FOUND THEN
      RAISE EXCEPTION 'Public offering requires a published course and non-draft status' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO academy.offerings (course_id, start_date, end_date, location, capacity, status, is_public)
    VALUES (p_course_id, p_start_date, p_end_date, p_location, p_capacity, p_status, p_is_public)
    RETURNING id INTO result_id;
  ELSE
    SELECT course_id INTO current_course FROM academy.offerings WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Offering not found' USING ERRCODE = 'P0002'; END IF;
    SELECT count(*) INTO accepted_count FROM academy.applications WHERE offering_id=p_id AND status='received';
    IF p_capacity < accepted_count OR (accepted_count > 0 AND current_course <> p_course_id) THEN
      RAISE EXCEPTION 'Offering conflicts with existing applications' USING ERRCODE = '22023';
    END IF;
    UPDATE academy.offerings SET course_id=p_course_id, start_date=p_start_date, end_date=p_end_date,
      location=p_location, capacity=p_capacity, status=p_status, is_public=p_is_public
    WHERE id=p_id RETURNING id INTO result_id;
  END IF;
  RETURN result_id;
END;
$function$;
-- CREATE OR REPLACE keeps the original ACL; explicitly retain the intended function grants.
REVOKE ALL ON FUNCTION public.academy_admin_save_offering(uuid,uuid,date,date,text,integer,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_offering(uuid,uuid,date,date,text,integer,text,boolean) TO service_role;
