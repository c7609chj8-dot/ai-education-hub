-- 개발 프로젝트 전용 예시 초안. 실제 DB에 자동 적용하지 않습니다.
-- 공개 값은 시연 검증용이며 운영 데이터가 아닙니다. 적용 전 프로젝트와 기존 데이터 확인 필수.
BEGIN;
LOCK TABLE academy.contents IN ACCESS EXCLUSIVE MODE;
DO $block$ BEGIN IF EXISTS (SELECT 1 FROM academy.contents) THEN RAISE EXCEPTION 'Content seed requires an empty table'; END IF; END; $block$;
INSERT INTO academy.contents(kind,category,title,body,link_path,link_label,display_date,sort_order,is_public) VALUES
  ('news', '교육 안내', 'AI 교육과정 안내를 준비하고 있습니다', '생활과 업무에 활용할 수 있는 AI 교육과정을 준비하고 있습니다. 개강 일정과 세부 모집 안내는 확정 후 게시합니다.', NULL, NULL, '2026-11-09', '0', true),
  ('news', '수강 안내', '수강신청 안내', '현재 신청 화면은 이용 흐름을 살펴보는 시연 화면입니다. 실제 접수 방법은 운영 준비가 끝난 뒤 안내합니다.', NULL, NULL, '2026-11-10', '1', true),
  ('news', '교육협력', '기관 교육협력 안내', '대학·기업·공공기관을 위한 교육협력 방향을 안내합니다. 실제 협력 내용과 문의 방법은 확정 후 게시합니다.', NULL, NULL, '2026-11-11', '2', true),
  ('faq', '교육과정', '어떤 교육과정이 있나요?', '생활 속 AI 활용, 업무혁신, 전자책 제작, 교육콘텐츠 제작, 소상공인 마케팅 과정을 준비하고 있습니다.', '/programs', '교육과정 보기', NULL, '0', true),
  ('faq', '교육과정', '교육은 얼마나 진행되나요?', '초기 과정은 12주 동안 주 2시간, 총 24시간으로 계획하고 있습니다. 세부 운영 방식은 확정 후 안내합니다.', NULL, NULL, NULL, '1', true),
  ('faq', '일정·신청', '교육일정은 어디에서 확인하나요?', '교육일정 화면에서 달력과 목록을 볼 수 있습니다. 현재 날짜와 모집 상태는 시연용 예시입니다.', '/schedule', '교육일정 보기', NULL, '2', true),
  ('faq', '일정·신청', '지금 수강신청을 할 수 있나요?', '현재 신청 화면은 시연용입니다. 입력 내용은 전송·저장되지 않으며 실제 접수는 운영 준비 후 안내합니다.', NULL, NULL, NULL, '3', true),
  ('faq', '교육협력', '기관 맞춤형 교육을 문의할 수 있나요?', '기관의 교육 목표와 대상에 맞춘 교육협력 방향을 안내합니다. 실제 문의 방법과 연락처는 확정 후 안내합니다.', '/partnership', '교육협력 안내 보기', NULL, '4', true),
  ('partnership', '협력 대상', '대학·교육기관', '학습자의 수준과 교육 목표에 맞춘 AI 활용 교육을 함께 기획합니다.', NULL, NULL, NULL, '0', true),
  ('partnership', '협력 대상', '기업·단체', '업무 현장의 과제와 구성원에게 필요한 AI 활용 교육을 살펴봅니다.', NULL, NULL, NULL, '1', true),
  ('partnership', '협력 대상', '공공기관·지역사회', '지역과 참여자의 특성을 고려한 디지털 역량 교육을 함께 고민합니다.', NULL, NULL, NULL, '2', true),
  ('partnership', '협의 과정', '교육 대상과 목표 살펴보기', '교육 대상과 목표를 함께 살펴봅니다.', NULL, NULL, NULL, '3', true),
  ('partnership', '협의 과정', '교육 내용과 운영 방식 협의', '교육 내용과 운영 방식을 협의합니다.', NULL, NULL, NULL, '4', true),
  ('partnership', '협의 과정', '일정과 세부 내용 조율', '일정과 세부 내용을 조율합니다.', NULL, NULL, NULL, '5', true);
COMMIT;
