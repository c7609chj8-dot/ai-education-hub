-- 개발·일회용 테스트 DB 전용 예시 데이터. 운영 DB에 적용하지 마세요.
-- 강좌/주차 테이블이 비어 있을 때만 5개 강좌와 60개 주차를 넣습니다.
BEGIN;
-- 다른 개발 작업의 동시 쓰기를 막은 뒤 빈 테이블을 확인합니다.
LOCK TABLE academy.courses, academy.course_weeks IN SHARE ROW EXCLUSIVE MODE;
DO $check$ BEGIN
  IF EXISTS (SELECT 1 FROM academy.courses) OR EXISTS (SELECT 1 FROM academy.course_weeks) THEN
    RAISE EXCEPTION 'Example seed requires empty course tables';
  END IF;
END $check$;

INSERT INTO academy.courses (slug, title, category, summary, audience, result_artifact, duration_hours, objectives, publication_state) VALUES
  ('life-chatgpt', '생활 속 챗GPT 활용', 'AI 입문', '일상 속 궁금증을 해결하고 생활에 필요한 문서를 만들어 봅니다.', '일반 성인 · 중장년 · 시니어', '나만의 AI 생활 활용집', 24, ARRAY['생성형 AI의 기본 개념을 이해하고 필요한 답을 얻기 위한 질문을 작성합니다.', '생활문서, 여행 계획, 취미 활동에 AI를 활용하고 정보의 출처를 확인합니다.', '안전한 이용 방법을 익히고 자신에게 필요한 활용 사례를 정리합니다.']::text[], 'published'),
  ('ai-work', '생성형 AI 업무혁신 실무', '업무 활용', '문서 작성부터 자료 분석까지 업무에 필요한 AI 활용법을 익힙니다.', '직장인 · 행정 · 사무직 · 자영업자', '업무개선 포트폴리오', 24, ARRAY['업무 목적에 맞는 프롬프트를 작성하고 문서·보고서 초안을 만듭니다.', '회의록, 데이터 분석, 시각화와 발표자료 제작에 AI를 활용합니다.', '업무개선 과제를 정해 결과를 점검하고 포트폴리오로 정리합니다.']::text[], 'published'),
  ('ai-ebook', 'AI 전자책 제작·작가 도전', '콘텐츠 제작', '책의 기획과 원고 작성부터 전자책 편집까지 경험합니다.', '일반 성인 · 예비 작가 · 은퇴자', '전자책 PDF 완성본', 24, ARRAY['독자와 주제를 정하고 자료조사를 바탕으로 책의 구성과 목차를 기획합니다.', 'AI와 함께 원고를 작성·퇴고하고 표지와 삽화를 제작합니다.', '저작권과 출판 윤리를 살피며 원고를 편집해 PDF로 완성합니다.']::text[], 'published'),
  ('ai-instructor', 'AI 전문강사·교육콘텐츠 제작', '교육 콘텐츠', '교육 대상에 맞는 강의 자료와 참여형 콘텐츠를 기획합니다.', '강사 · 예비강사 · 교사 · 교육담당자', 'PPT·강사대본·퀴즈 패키지', 24, ARRAY['교육 대상과 요구를 분석하고 목적에 맞는 교육계획을 세웁니다.', 'AI를 활용해 강의 자료, 강사대본과 퀴즈를 제작합니다.', '자료의 품질을 점검하고 강의를 시연하며 피드백을 반영합니다.']::text[], 'published'),
  ('ai-business', 'AI 소상공인 창업·마케팅', '창업·마케팅', '고객 분석부터 홍보 콘텐츠와 마케팅 계획까지 실습합니다.', '소상공인 · 창업 준비자', 'AI 마케팅 실행계획서', 24, ARRAY['고객과 시장을 분석하고 사업에 맞는 상품·서비스를 기획합니다.', '블로그·SNS 홍보물과 고객응대에 필요한 콘텐츠를 만들어 봅니다.', '홍보 일정과 데이터를 바탕으로 마케팅 실행계획을 정리합니다.']::text[], 'published');

WITH sample(slug, week_number, title) AS (VALUES
  ('life-chatgpt', 1, 'AI 시대와 챗GPT 이해'),
  ('life-chatgpt', 2, 'AI에게 질문 잘하는 방법'),
  ('life-chatgpt', 3, 'AI 정보검색과 사실 확인'),
  ('life-chatgpt', 4, 'AI 생활문서 작성'),
  ('life-chatgpt', 5, '건강·금융 정보의 안전한 활용'),
  ('life-chatgpt', 6, 'AI 여행계획 설계'),
  ('life-chatgpt', 7, 'AI 이미지 활용'),
  ('life-chatgpt', 8, 'AI 취미생활 활용'),
  ('life-chatgpt', 9, 'AI 가족 소통 도우미'),
  ('life-chatgpt', 10, 'AI 허위정보와 사기 예방'),
  ('life-chatgpt', 11, '개인 AI 활용집 편집'),
  ('life-chatgpt', 12, '작품 발표 및 평가'),
  ('ai-work', 1, '업무에 활용하는 생성형 AI'),
  ('ai-work', 2, '실무형 프롬프트 작성법'),
  ('ai-work', 3, '공문·메일·문서 작성'),
  ('ai-work', 4, 'AI 보고서 작성'),
  ('ai-work', 5, 'AI 회의록·업무지시 관리'),
  ('ai-work', 6, 'AI 엑셀·데이터 활용'),
  ('ai-work', 7, 'AI 데이터분석과 시각화'),
  ('ai-work', 8, 'AI PPT 제작 실습'),
  ('ai-work', 9, '자료조사와 출처 확인'),
  ('ai-work', 10, 'AI 업무자동화 기초'),
  ('ai-work', 11, '나만의 업무개선 프로젝트'),
  ('ai-work', 12, '프로젝트 발표 및 평가'),
  ('ai-ebook', 1, 'AI 시대, 나도 작가 되기'),
  ('ai-ebook', 2, '독자분석과 책 기획'),
  ('ai-ebook', 3, 'AI 목차 구성'),
  ('ai-ebook', 4, 'AI 자료조사와 출처'),
  ('ai-ebook', 5, 'AI와 함께 원고 쓰기'),
  ('ai-ebook', 6, '경험을 이야기로 확장'),
  ('ai-ebook', 7, '문장 교정과 퇴고'),
  ('ai-ebook', 8, 'AI 표지·삽화 제작'),
  ('ai-ebook', 9, '전자책 편집과 PDF 제작'),
  ('ai-ebook', 10, 'AI 저작권과 출판 윤리'),
  ('ai-ebook', 11, '출판·유통 준비'),
  ('ai-ebook', 12, '전자책 발표회'),
  ('ai-instructor', 1, 'AI 시대의 전문강사 역량'),
  ('ai-instructor', 2, '교육대상 분석과 요구조사'),
  ('ai-instructor', 3, 'AI 교육계획서 자동설계'),
  ('ai-instructor', 4, '최신 자료조사 및 출처 검증'),
  ('ai-instructor', 5, '강의 스토리라인 설계'),
  ('ai-instructor', 6, 'AI PPT 제작 실습'),
  ('ai-instructor', 7, '참여형·실습형 강의 설계'),
  ('ai-instructor', 8, 'AI 강사대본·발표자 노트'),
  ('ai-instructor', 9, 'AI 교육 퀴즈·평가자료'),
  ('ai-instructor', 10, '교육자료 품질 및 안전 검수'),
  ('ai-instructor', 11, '강의 리허설과 피드백'),
  ('ai-instructor', 12, '최종 강의 시연 및 평가'),
  ('ai-business', 1, 'AI 시대의 소상공인 경쟁력'),
  ('ai-business', 2, '고객분석과 타깃 설정'),
  ('ai-business', 3, '경쟁사·시장 조사'),
  ('ai-business', 4, '상품·서비스 기획'),
  ('ai-business', 5, 'AI 블로그 마케팅'),
  ('ai-business', 6, 'SNS 홍보 콘텐츠 제작'),
  ('ai-business', 7, 'AI 홍보 이미지와 영상 기획'),
  ('ai-business', 8, 'AI 고객응대와 리뷰 관리'),
  ('ai-business', 9, '프로모션과 홍보 일정'),
  ('ai-business', 10, '매출·홍보 데이터 분석'),
  ('ai-business', 11, '마케팅 실행계획 작성'),
  ('ai-business', 12, '사업별 결과물 발표')
)
INSERT INTO academy.course_weeks (course_id, week_number, title)
SELECT c.id, sample.week_number, sample.title FROM sample JOIN academy.courses c ON c.slug = sample.slug;
COMMIT;
