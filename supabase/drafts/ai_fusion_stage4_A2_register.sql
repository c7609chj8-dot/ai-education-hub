-- REVIEW CANDIDATE ONLY. No hosted execution is authorized.
BEGIN;
SET LOCAL search_path='';
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $executor$ BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Fusion requires reviewed postgres executor'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Fusion requires READ COMMITTED'; END IF;
 IF to_regclass('academy.applications') IS NOT NULL OR to_regclass('academy.application_private') IS NOT NULL THEN RAISE EXCEPTION 'Fusion B04 state changed; separate integration review required'; END IF;
END $executor$;
SELECT pg_advisory_xact_lock(761104,4);
LOCK TABLE academy.courses,academy.course_weeks,academy.offerings IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE academy.course_profiles,academy.course_week_practices,private_education.ai_fusion_runs IN SHARE ROW EXCLUSIVE MODE;
DO $fusion$
DECLARE r record; v_course jsonb; v_week jsonb; now_snapshot jsonb;
BEGIN
 SELECT * INTO STRICT r FROM private_education.ai_fusion_runs WHERE batch_key='ai-fusion-stage4-v1' FOR UPDATE;
 IF r.schema_signature IS DISTINCT FROM (SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'owner',c.relowner,'rls',c.relrowsecurity,'acl',c.relacl) ORDER BY c.oid) FROM pg_class c WHERE c.oid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'columns',(SELECT jsonb_agg(jsonb_build_object('rel',a.attrelid,'num',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'null',a.attnotnull,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('rel',conrelid,'name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname) FROM pg_constraint WHERE conrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p WHERE polrelid IN ('academy.course_profiles'::regclass,'academy.course_week_practices'::regclass,'private_education.ai_fusion_runs'::regclass)))) THEN RAISE EXCEPTION 'Fusion metadata schema/ACL/RLS drift'; END IF;
 IF r.protected_security IS DISTINCT FROM (SELECT jsonb_build_object(
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',c.relowner,'acl',c.relacl,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'options',c.reloptions,'view',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) ELSE NULL END) ORDER BY c.oid)
  FROM pg_class c WHERE c.oid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass,'private_education.offering_admins'::regclass,'public.published_courses'::regclass,'public.published_course_weeks'::regclass,'public.published_offerings'::regclass)),
 'columns',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_attribute a WHERE a.attrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass) AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass,'private_education.offering_admins'::regclass)),
 'functions',(SELECT jsonb_agg(jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl,'definition',pg_get_functiondef(p.oid)) ORDER BY p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname LIKE 'academy_%') OR (n.nspname='private_education' AND p.proname IN ('is_admin_v2','offering_catalog_v2','save_offering_v2'))),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,'login',rolcanlogin,'bypass',rolbypassrls,'create',rolcreaterole,'inherit',rolinherit,'createdb',rolcreatedb,'replication',rolreplication) ORDER BY rolname) FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','academy_offering_executor')),
 'memberships',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY roleid,member),'[]'::jsonb) FROM pg_auth_members a WHERE roleid IN (SELECT oid FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','academy_offering_executor')) OR member IN (SELECT oid FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role','academy_offering_executor'))),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',nspowner,'acl',nspacl) ORDER BY nspname) FROM pg_namespace WHERE nspname IN ('academy','private_education','auth','public')),
 'core_constraints',(SELECT jsonb_agg(jsonb_build_object('rel',conrelid,'name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conrelid,conname) FROM pg_constraint WHERE conrelid IN ('academy.courses'::regclass,'academy.course_weeks'::regclass,'academy.offerings'::regclass)),
 'defaults',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.oid),'[]'::jsonb) FROM pg_default_acl d WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres')))) THEN RAISE EXCEPTION 'Fusion existing security drift'; END IF;
 now_snapshot := (SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p)));
 IF now_snapshot IS DISTINCT FROM r.expected_snapshot THEN RAISE EXCEPTION 'Fusion data drift; no overwrite allowed'; END IF;

 IF r.manifest IS NOT NULL THEN
  IF r.manifest IS DISTINCT FROM $fusion_manifest${
  "version": "ai-fusion-stage4-v1",
  "source_commit": "e0435679d7a795b294fe32e5d1f3483e4b5e4c1a",
  "courses": [
    {
      "id": "95e0c83e-257f-562b-8ab7-9361dbf2d9a7",
      "slug": "ai-management",
      "title": "AI 경영관리학과",
      "category": "경영·데이터",
      "summary": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
      "audience": "경영 실무자 · 관리자 · 창업 준비자",
      "result_artifact": "경영 분석·업무개선 기획서",
      "duration_hours": null,
      "objectives": [
        "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
        "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
        "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
        "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
      ],
      "profile": {
        "introduction": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
        "objectives": [
          "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
          "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
          "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
          "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
        ],
        "coreTopics": [
          "경영 질문과 지표 설계",
          "스프레드시트 데이터 정리·시각화",
          "고객·시장 분석과 근거 검증",
          "업무개선 기획과 결과 보고"
        ],
        "finalProject": "가상 조직의 업무 또는 고객 문제를 선정해 근거 자료가 포함된 경영 개선안을 제안합니다.",
        "deliverables": [
          "데이터 정리표와 지표·차트",
          "출처·가정·한계 기록",
          "경영 분석·업무개선 기획서와 발표자료"
        ],
        "software": [
          "CSV를 다룰 수 있는 스프레드시트",
          "기관 승인 생성형 AI 도구",
          "문서·프레젠테이션 도구"
        ],
        "equipment": [
          "인터넷 연결 노트북 또는 PC",
          "제공된 가상 기업 데이터"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "b5420de2-18a4-5605-b540-29deb11bb5c5",
          "week_number": 1,
          "title": "AI 경영 활용과 문제 정의",
          "practice": "가상 기업을 선정하고 해결할 문제·분석 질문 3개를 작성합니다."
        },
        {
          "id": "002e15eb-4727-55ad-ba12-a7a01c0cfb7e",
          "week_number": 2,
          "title": "질문 설계와 답변 검증",
          "practice": "같은 질문의 답변을 비교하고 근거·추정·오류를 표시합니다."
        },
        {
          "id": "d476853a-3602-5aa1-a1cd-e17b536dd863",
          "week_number": 3,
          "title": "데이터 수집과 정리",
          "practice": "제공된 가상 매출 CSV의 결측·중복을 찾아 정리표를 만듭니다."
        },
        {
          "id": "8b58669f-7f45-5942-8c57-acdd7d083b3d",
          "week_number": 4,
          "title": "핵심 지표와 시각화",
          "practice": "매출·비용 지표를 계산하고 원자료와 일치하는 차트 2개를 만듭니다."
        },
        {
          "id": "ccc20ffd-6579-582c-b321-ec007eb5b569",
          "week_number": 5,
          "title": "고객 이해와 수요 가설",
          "practice": "가상 고객 사례를 분류하고 검증할 수 있는 수요 가설을 작성합니다."
        },
        {
          "id": "3a87a422-90ad-57cc-9f5f-303a497e32a5",
          "week_number": 6,
          "title": "시장 자료와 출처 평가",
          "practice": "제공 자료의 날짜·출처·한계를 기록한 비교표를 만듭니다."
        },
        {
          "id": "25d616d1-90e3-5ff9-8318-19f5ed2c6b71",
          "week_number": 7,
          "title": "업무 흐름과 개선 과제",
          "practice": "현재 업무 절차를 도식화하고 반복 작업 1개를 선정합니다."
        },
        {
          "id": "3e522d77-2fe7-5fab-911a-7d1afb77446a",
          "week_number": 8,
          "title": "문서·보고서 작성 지원",
          "practice": "분석표를 바탕으로 보고서 초안을 만들고 숫자와 표현을 검수합니다."
        },
        {
          "id": "d8b35f0c-5bce-5173-81a2-464271e8f836",
          "week_number": 9,
          "title": "개선안의 비용·효과 검토",
          "practice": "비용·효과 추정치와 산출 근거, 확인이 필요한 가정을 정리합니다."
        },
        {
          "id": "6232430b-d16b-5410-958c-3639c1087e33",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "대상 업무·목표 지표·실행 일정·평가 방법을 기획합니다."
        },
        {
          "id": "fc3d4d7d-d598-5f2c-819e-f9618b9392e0",
          "week_number": 11,
          "title": "프로젝트 제작과 동료 검토",
          "practice": "분석자료와 실행계획을 연결하고 동료 검토 의견을 반영합니다."
        },
        {
          "id": "a059ec07-12e8-57ad-a6e0-db1f35b130aa",
          "week_number": 12,
          "title": "결과 발표와 개선",
          "practice": "근거·한계·후속 측정을 포함해 발표하고 수정본을 제출합니다."
        }
      ]
    },
    {
      "id": "a6614259-a8cf-5b0b-a40c-686e3cb73169",
      "slug": "ai-music",
      "title": "AI 음악제작학과",
      "category": "음악·사운드",
      "summary": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
      "audience": "음악 창작 입문자 · 콘텐츠 제작자",
      "result_artifact": "음악·사운드 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
        "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
        "음량·전환·내보내기 품질을 점검합니다.",
        "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
      ],
      "profile": {
        "introduction": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
        "objectives": [
          "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
          "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
          "음량·전환·내보내기 품질을 점검합니다.",
          "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
        ],
        "coreTopics": [
          "음악 기획과 기본 구조",
          "AI 작곡 보조와 결과 평가",
          "오디오·MIDI 편집과 사운드 디자인",
          "음원 이용 조건 확인과 포트폴리오"
        ],
        "finalProject": "선택한 용도에 맞는 짧은 음악 또는 사운드 작품을 기획·편집하고 제작 의도를 설명합니다.",
        "deliverables": [
          "최종 음원과 편집 프로젝트 파일",
          "음원 출처·이용 조건 및 AI 활용 기록",
          "기획서·제작 과정·청음 피드백"
        ],
        "software": [
          "오디오·MIDI 편집 도구",
          "기관 승인 AI 음악 제작 도구",
          "파일 재생·변환 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "헤드폰 또는 이어폰",
          "녹음용 마이크(선택)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "e5006023-7782-5603-b374-769835864bcf",
          "week_number": 1,
          "title": "음악 제작 흐름과 감상 기준",
          "practice": "참고곡을 감상하고 분위기·구조·사용 목적을 정리합니다."
        },
        {
          "id": "9dec375a-cd24-50cc-8c3e-31e662db367b",
          "week_number": 2,
          "title": "리듬과 음악 구조",
          "practice": "리듬 패턴과 곡의 구간을 설계한 구성표를 만듭니다."
        },
        {
          "id": "13b9c72f-abf7-53f3-98f4-c3ed6cbcf7b8",
          "week_number": 3,
          "title": "멜로디와 화성의 기초",
          "practice": "짧은 멜로디 또는 코드 진행을 만들고 선택 이유를 기록합니다."
        },
        {
          "id": "423ec3b3-dfa6-517b-a92f-9bf13a939b7d",
          "week_number": 4,
          "title": "AI 음악 기획과 생성 비교",
          "practice": "동일 기획의 생성 결과를 비교하고 사용할 구간을 선정합니다."
        },
        {
          "id": "70d46f74-3c57-55fb-9da7-9bd49096ad32",
          "week_number": 5,
          "title": "오디오 편집 기초",
          "practice": "선택 구간의 자르기·이어 붙이기·전환을 실습합니다."
        },
        {
          "id": "67928c23-5171-51e4-abf0-74913f627595",
          "week_number": 6,
          "title": "MIDI와 가상 악기",
          "practice": "간단한 연주 패턴을 입력하고 악기 소리를 비교합니다."
        },
        {
          "id": "36144302-9270-5161-bbf4-30ed38838714",
          "week_number": 7,
          "title": "녹음과 사운드 수집",
          "practice": "본인 목소리나 직접 만든 소리를 녹음하고 사용 내역을 기록합니다."
        },
        {
          "id": "ae03922d-cbba-505c-912c-f9ed99dcf6a0",
          "week_number": 8,
          "title": "사운드 디자인과 편곡",
          "practice": "음악 구간에 효과음·악기를 더해 전후 차이를 비교합니다."
        },
        {
          "id": "e809047b-b2ed-5cb8-8de0-eaba8e5b751e",
          "week_number": 9,
          "title": "기초 음량 조절과 출력",
          "practice": "트랙별 음량과 과도한 피크를 점검하고 테스트 파일을 출력합니다."
        },
        {
          "id": "beecd051-2901-58e7-b572-5a8a1f4413a3",
          "week_number": 10,
          "title": "최종 프로젝트 기획",
          "practice": "짧은 영상·전시·브랜드 등 용도에 맞는 음악 기획서를 만듭니다."
        },
        {
          "id": "67ade78a-1a81-525d-884b-939971b142c1",
          "week_number": 11,
          "title": "작품 제작과 이용 조건 검토",
          "practice": "작품을 편집하고 음원 출처·이용 조건·AI 사용 기록을 정리합니다."
        },
        {
          "id": "e7dbc2d4-d17a-54fc-9d8f-c7c3e4e31d12",
          "week_number": 12,
          "title": "청음 발표와 포트폴리오",
          "practice": "동료 청음 의견을 반영해 최종 음원과 제작 설명을 제출합니다."
        }
      ]
    },
    {
      "id": "d6748b74-32a8-5d06-a3a8-02240eef5cd2",
      "slug": "ai-aerial-video",
      "title": "AI 항공영상제작학과",
      "category": "드론·항공영상",
      "summary": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
      "audience": "드론·항공 촬영에 관심 있는 성인",
      "result_artifact": "항공영상 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
        "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
        "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
        "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
      ],
      "profile": {
        "introduction": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
        "objectives": [
          "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
          "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
          "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
          "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
        ],
        "coreTopics": [
          "항공영상 기획과 화면 구성",
          "촬영 전 현장·장비·안전 확인",
          "영상 선별·색·자막·사운드 편집",
          "AI 보조 편집과 결과 검수"
        ],
        "finalProject": "제공된 항공영상 또는 승인된 실습에서 확보한 자료로 공간 소개 영상을 제작합니다. 비행 자격 취득 과정으로 확정하지 않습니다.",
        "deliverables": [
          "항공영상 편집 결과물",
          "촬영 기획·스토리보드",
          "현장 확인 및 자료 이용 기록"
        ],
        "software": [
          "영상 편집 도구",
          "기관 승인 AI 영상 보조 도구",
          "영상 재생·파일 관리 도구"
        ],
        "equipment": [
          "영상 편집이 가능한 노트북 또는 PC",
          "제공된 항공영상과 헤드폰",
          "드론·조종기·촬영 장소·운영 인력(현장 실습 별도 검토)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "75e3dd9f-5ac0-5af0-b721-cfbc7856b6a2",
          "week_number": 1,
          "title": "항공영상 이해와 활용 사례",
          "practice": "제공 영상을 보고 목적·구도·전환 방식을 분석합니다."
        },
        {
          "id": "ce0fbe52-e86f-5e9f-b7d7-7735a43ae3e1",
          "week_number": 2,
          "title": "현장 운영과 사전 확인",
          "practice": "장소·촬영 대상·운영 인력·장비 확인 목록을 작성합니다."
        },
        {
          "id": "6022c4c2-b9be-5a71-ad4f-62c7d710da42",
          "week_number": 3,
          "title": "구도와 촬영 동선 기획",
          "practice": "가상 장소의 촬영 구도와 이동 경로를 스토리보드로 만듭니다."
        },
        {
          "id": "b7cbb85c-0f6e-54d1-b605-fdcaf852908a",
          "week_number": 4,
          "title": "장비 이해와 모의 조작",
          "practice": "장비 점검 시연 또는 제공 조작 자료로 점검 기록을 작성합니다."
        },
        {
          "id": "996ef8eb-aaf4-5bd8-b31a-cece48dff9db",
          "week_number": 5,
          "title": "촬영 계획 검토",
          "practice": "가상 현장 조건의 위험 요소와 촬영 대안을 정리합니다."
        },
        {
          "id": "9b659037-a135-5175-b893-a32145774c3c",
          "week_number": 6,
          "title": "영상 수집과 장면 선별",
          "practice": "제공 영상의 화질·구도·흔들림을 비교해 사용할 장면을 고릅니다."
        },
        {
          "id": "36540ab3-0347-52d0-b34a-efc146711dc4",
          "week_number": 7,
          "title": "기본 컷 편집과 흐름",
          "practice": "장면을 배열해 도입·전개·마무리가 있는 시퀀스를 만듭니다."
        },
        {
          "id": "6b8c4260-d740-58d9-840d-8ab4dc3170a9",
          "week_number": 8,
          "title": "색과 화면 안정성 점검",
          "practice": "색·노출·수평을 조정하고 보정 전후를 비교합니다."
        },
        {
          "id": "aaf9ece2-3f43-534b-a1d1-77a693c170e5",
          "week_number": 9,
          "title": "AI 편집 보조와 검수",
          "practice": "자막·장면 분류 등 보조 결과를 확인하고 오류를 수정합니다."
        },
        {
          "id": "1c5e4098-1f05-5bab-9a60-8e0f67422743",
          "week_number": 10,
          "title": "최종 프로젝트 기획",
          "practice": "지역 소개 또는 공간 기록 영상의 기획·자료 계획을 작성합니다."
        },
        {
          "id": "5990c915-5f0a-52c6-95c5-eb937dbf125d",
          "week_number": 11,
          "title": "최종 영상 편집",
          "practice": "음악·자막·출처를 포함해 시사본을 만들고 피드백을 받습니다."
        },
        {
          "id": "d2844c47-6c3b-5e6e-8534-fe5fb010bf84",
          "week_number": 12,
          "title": "상영과 제작 기록 제출",
          "practice": "최종 영상·기획서·점검 기록·자료 이용 내역을 제출합니다."
        }
      ]
    },
    {
      "id": "2c8fbd28-95a7-55a8-a0e9-9046810430d7",
      "slug": "ai-multimedia",
      "title": "AI 멀티미디어학과",
      "category": "디자인·멀티미디어",
      "summary": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
      "audience": "디자인 입문자 · 디지털 콘텐츠 제작자",
      "result_artifact": "멀티미디어 콘텐츠 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
        "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
        "AI 결과의 오류·가독성·접근성을 점검합니다.",
        "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
      ],
      "profile": {
        "introduction": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
        "objectives": [
          "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
          "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
          "AI 결과의 오류·가독성·접근성을 점검합니다.",
          "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
        ],
        "coreTopics": [
          "메시지·매체 기획",
          "이미지·타이포그래피·레이아웃",
          "영상·사운드 결합",
          "접근성·이용 조건·출력 검수"
        ],
        "finalProject": "전시·교육·캠페인 등 선택한 주제에 맞는 멀티미디어 콘텐츠 패키지를 제작합니다.",
        "deliverables": [
          "대표 이미지와 멀티미디어 결과물",
          "화면 구성도·편집 원본",
          "접근성 점검표와 자료 출처"
        ],
        "software": [
          "이미지·레이아웃 편집 도구",
          "영상·음향 편집 도구",
          "기관 승인 생성형 AI 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "헤드폰 또는 이어폰",
          "태블릿·펜 입력 장치(선택)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "a1d059bd-7597-5a89-ad1e-6b84699d246a",
          "week_number": 1,
          "title": "멀티미디어 사례와 제작 흐름",
          "practice": "참고 콘텐츠의 메시지·구성 요소·표현 방식을 분석합니다."
        },
        {
          "id": "9fb295e1-9f08-5220-a37f-938e3c13e0f5",
          "week_number": 2,
          "title": "대상과 콘텐츠 기획",
          "practice": "가상 주제의 대상·목적·제작 형식을 기획합니다."
        },
        {
          "id": "c4e1aa21-d935-5370-ac27-fd8fc7494b09",
          "week_number": 3,
          "title": "색·글자·레이아웃 기초",
          "practice": "색과 글자의 가독성을 비교하고 화면 시안을 만듭니다."
        },
        {
          "id": "5412d592-2bde-5dcc-84db-44347a96bf56",
          "week_number": 4,
          "title": "AI 이미지 생성과 선별",
          "practice": "시안에 필요한 이미지 후보를 만들고 오류를 기록합니다."
        },
        {
          "id": "f024f14a-1267-50b6-96ed-fc125beab6fe",
          "week_number": 5,
          "title": "이미지 편집과 합성",
          "practice": "직접 준비한 자료로 이미지 크기·구도·레이아웃을 조정합니다."
        },
        {
          "id": "88eca352-1f7c-5956-8098-e61a18479fd6",
          "week_number": 6,
          "title": "영상 구성과 기본 편집",
          "practice": "이미지와 영상을 연결한 짧은 시퀀스를 만듭니다."
        },
        {
          "id": "8e056ae0-8f63-56a3-85c6-1d234f8ee026",
          "week_number": 7,
          "title": "사운드와 메시지 전달",
          "practice": "배경음·효과음·내레이션의 역할을 정하고 편집합니다."
        },
        {
          "id": "9716d856-e535-5be5-bc94-e98081863d9e",
          "week_number": 8,
          "title": "모션과 화면 전환",
          "practice": "단순한 움직임·전환을 적용하고 과도한 효과를 줄입니다."
        },
        {
          "id": "d80d89fe-9261-5c31-a5ff-727fdda573c5",
          "week_number": 9,
          "title": "접근성과 다중 화면 검수",
          "practice": "자막·대비·화면 비율을 PC와 모바일에서 점검합니다."
        },
        {
          "id": "f27fe228-c9ce-570a-9f31-dfac122f3bab",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "작품의 구성도·자료 목록·제작 일정을 작성합니다."
        },
        {
          "id": "2c5dde87-55c0-576a-85eb-6044d5f6563a",
          "week_number": 11,
          "title": "통합 제작과 동료 테스트",
          "practice": "텍스트·이미지·영상·소리를 결합하고 피드백을 반영합니다."
        },
        {
          "id": "46810e65-df37-5cd0-ab74-48306839a1dd",
          "week_number": 12,
          "title": "작품 공개 시연과 포트폴리오",
          "practice": "결과물·제작 과정·출처 목록을 묶어 발표합니다."
        }
      ]
    },
    {
      "id": "9b9a5a7a-f639-5003-b2f1-6aa23dc30d51",
      "slug": "ai-programming",
      "title": "AI 프로그래밍학과",
      "category": "개발·자동화",
      "summary": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
      "audience": "프로그래밍 입문자 · 업무 자동화 관심자",
      "result_artifact": "프로그램·자동화 프로젝트",
      "duration_hours": null,
      "objectives": [
        "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
        "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
        "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
        "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
      ],
      "profile": {
        "introduction": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
        "objectives": [
          "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
          "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
          "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
          "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
        ],
        "coreTopics": [
          "프로그래밍 기초와 실행 환경",
          "파일·표 데이터 처리",
          "AI 코딩 보조와 오류 분석",
          "테스트·비밀정보 관리·프로젝트 문서화"
        ],
        "finalProject": "가상 데이터를 처리하는 작은 자동화 프로그램을 만들고 사용 방법과 한계를 설명합니다.",
        "deliverables": [
          "프로그램 소스와 실행 예제",
          "정상·경계·오류 테스트 기록",
          "설치·사용 설명과 AI 코드 검토 기록"
        ],
        "software": [
          "Python 3 실행 환경",
          "코드 편집기와 웹 브라우저",
          "기관 승인 AI 코딩 보조 도구(선택)"
        ],
        "equipment": [
          "프로그램 설치·실행이 가능한 노트북 또는 PC",
          "제공된 가상 CSV 데이터"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "d7c8fc0d-d011-540e-bd30-d5759f622b1c",
          "week_number": 1,
          "title": "프로그래밍과 실행 환경",
          "practice": "예제 프로그램을 실행하고 입력·처리·출력을 표시합니다."
        },
        {
          "id": "377ec7fa-2679-52e3-bc99-e3dd16ebf66f",
          "week_number": 2,
          "title": "변수와 자료형",
          "practice": "가상 업무의 수치·문자 데이터를 다루는 코드를 작성합니다."
        },
        {
          "id": "2847238a-87f5-555f-84dc-40d38d008519",
          "week_number": 3,
          "title": "조건과 반복",
          "practice": "조건별 처리와 반복 계산 예제를 만들고 결과를 확인합니다."
        },
        {
          "id": "3bfc671a-fd8c-5c01-ae99-37e8158fa4e3",
          "week_number": 4,
          "title": "함수와 코드 분리",
          "practice": "반복되는 처리를 함수로 나누고 호출 결과를 설명합니다."
        },
        {
          "id": "50a0b5af-0516-5ddb-a708-b5a5c9cc25d4",
          "week_number": 5,
          "title": "파일과 CSV 데이터",
          "practice": "제공된 가상 CSV를 읽어 요약 결과를 새 파일로 저장합니다."
        },
        {
          "id": "b2b23c29-b743-5ed7-b208-d05facb928bf",
          "week_number": 6,
          "title": "데이터 검증과 오류 처리",
          "practice": "누락·잘못된 입력을 처리하고 오류 메시지를 개선합니다."
        },
        {
          "id": "a7b8d6f3-9282-5731-98bc-4dd19f3819af",
          "week_number": 7,
          "title": "AI 코딩 보조와 검토",
          "practice": "AI 제안 코드의 동작·의존성·문제점을 직접 확인합니다."
        },
        {
          "id": "14b63f16-6a54-554f-97f3-224b37d695a3",
          "week_number": 8,
          "title": "작은 업무 자동화",
          "practice": "가상 자료의 정리·분류·보고서 생성 중 한 기능을 구현합니다."
        },
        {
          "id": "1ea5bd66-97cf-5b31-abdc-6f7d4d294a5d",
          "week_number": 9,
          "title": "테스트와 비밀정보 점검",
          "practice": "정상·경계·오류 입력을 테스트하고 코드의 민감정보를 점검합니다."
        },
        {
          "id": "222d0488-adff-5ead-9e8b-cc54fb1d3db7",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "사용자·입출력·기능 범위·완료 조건을 작성합니다."
        },
        {
          "id": "6eb9bda1-a4d2-5d21-b6b2-da6bc1c7ada7",
          "week_number": 11,
          "title": "프로젝트 구현과 사용성 검토",
          "practice": "기능을 구현하고 다른 학습자의 실행 결과를 반영합니다."
        },
        {
          "id": "55671aba-9f53-5837-b33d-2a4892964dd9",
          "week_number": 12,
          "title": "시연과 문서 정리",
          "practice": "코드·테스트 결과·설치 및 사용 설명을 묶어 발표합니다."
        }
      ]
    },
    {
      "id": "3ec3790d-4579-564d-ab49-ded60d6c601d",
      "slug": "ai-advertising-video",
      "title": "AI 광고영상제작과",
      "category": "광고·영상",
      "summary": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
      "audience": "마케팅 담당자 · 광고 콘텐츠 제작자",
      "result_artifact": "광고영상 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
        "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
        "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
        "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
      ],
      "profile": {
        "introduction": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
        "objectives": [
          "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
          "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
          "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
          "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
        ],
        "coreTopics": [
          "타깃과 광고 메시지 설계",
          "대본·스토리보드·촬영 구성",
          "AI 영상·이미지·음향 보조 제작",
          "편집·표현 근거·출력 검수"
        ],
        "finalProject": "가상 상품·행사·서비스 중 하나를 정해 짧은 광고영상과 가로·세로 출력본을 제작합니다.",
        "deliverables": [
          "광고영상과 화면 비율별 출력본",
          "광고 기획서·대본·스토리보드",
          "표현 근거·자료 이용 및 AI 활용 기록"
        ],
        "software": [
          "영상 편집·자막 도구",
          "기관 승인 AI 영상·이미지 보조 도구",
          "오디오 편집 또는 녹음 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "스마트폰 또는 카메라·삼각대",
          "촬영 소품과 간단한 조명(기관 보유 장비 우선)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "7f20b8bc-8962-5b24-8d44-966b80ac8897",
          "week_number": 1,
          "title": "광고영상 이해와 사례 분석",
          "practice": "제공 광고의 대상·메시지·행동 유도를 분석합니다."
        },
        {
          "id": "4d2fe99e-0b5c-5eda-9d6f-c58e643f6503",
          "week_number": 2,
          "title": "타깃과 가상 상품 기획",
          "practice": "가상 상품의 특징·고객·근거 있는 표현을 정리합니다."
        },
        {
          "id": "824594c7-f531-52ee-a6a9-e67ef013083c",
          "week_number": 3,
          "title": "카피와 영상 대본",
          "practice": "핵심 메시지와 장면별 대사를 작성하고 과장 표현을 점검합니다."
        },
        {
          "id": "cb55a561-c3e1-5dde-814d-26581d5e6e1e",
          "week_number": 4,
          "title": "스토리보드와 촬영 계획",
          "practice": "장면·구도·소품·자료 목록을 스토리보드로 작성합니다."
        },
        {
          "id": "ef29c149-005a-5880-b793-db0d08df1b46",
          "week_number": 5,
          "title": "AI 이미지·영상 제작 보조",
          "practice": "장면 후보를 만들고 상품·인물·문자 표현 오류를 검토합니다."
        },
        {
          "id": "3a10d706-86b3-5188-a23a-0e7a1296d875",
          "week_number": 6,
          "title": "제품 촬영 기초",
          "practice": "가상 상품이나 소품을 촬영하고 조명·구도 차이를 비교합니다."
        },
        {
          "id": "f8445f01-3ce6-5ebf-8612-3bb2396ff73d",
          "week_number": 7,
          "title": "컷 편집과 메시지 흐름",
          "practice": "촬영·제공 자료를 배치해 메시지가 전달되는 초안을 만듭니다."
        },
        {
          "id": "3a316a70-153f-5aa3-a188-90f601fb3263",
          "week_number": 8,
          "title": "자막·음악·내레이션",
          "practice": "자막 가독성과 음량을 점검하고 음향 자료를 연결합니다."
        },
        {
          "id": "35f091f5-3c52-5662-a27e-ba68a8d16706",
          "week_number": 9,
          "title": "화면 비율과 출력 검수",
          "practice": "가로·세로 버전을 출력하고 잘림·화질·소리를 비교합니다."
        },
        {
          "id": "fc771038-b1a1-50bb-b944-c9466b6aec74",
          "week_number": 10,
          "title": "최종 캠페인 기획",
          "practice": "영상 목표·타깃·메시지·검토 기준을 기획서로 확정합니다."
        },
        {
          "id": "fbe698cf-1c31-533a-8410-4cd8efe57b0d",
          "week_number": 11,
          "title": "광고 시사본 검토",
          "practice": "동료에게 시사하고 이해도·표현 근거·자료 이용 기록을 점검합니다."
        },
        {
          "id": "93c2b2fe-447c-5386-867b-dba5ba8270b8",
          "week_number": 12,
          "title": "최종 발표와 개선 제안",
          "practice": "최종 영상과 제작 자료를 제출하고 후속 개선점을 설명합니다."
        }
      ]
    }
  ]
}$fusion_manifest$::jsonb THEN RAISE EXCEPTION 'Fusion manifest mismatch'; END IF;
  RETURN; -- verified exact re-run, including current publication state; never reset it
 END IF;
 IF r.phase<>'schema_only' THEN RAISE EXCEPTION 'Fusion invalid initial phase'; END IF;
 FOR v_course IN SELECT value FROM jsonb_array_elements(($fusion_manifest${
  "version": "ai-fusion-stage4-v1",
  "source_commit": "e0435679d7a795b294fe32e5d1f3483e4b5e4c1a",
  "courses": [
    {
      "id": "95e0c83e-257f-562b-8ab7-9361dbf2d9a7",
      "slug": "ai-management",
      "title": "AI 경영관리학과",
      "category": "경영·데이터",
      "summary": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
      "audience": "경영 실무자 · 관리자 · 창업 준비자",
      "result_artifact": "경영 분석·업무개선 기획서",
      "duration_hours": null,
      "objectives": [
        "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
        "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
        "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
        "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
      ],
      "profile": {
        "introduction": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
        "objectives": [
          "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
          "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
          "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
          "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
        ],
        "coreTopics": [
          "경영 질문과 지표 설계",
          "스프레드시트 데이터 정리·시각화",
          "고객·시장 분석과 근거 검증",
          "업무개선 기획과 결과 보고"
        ],
        "finalProject": "가상 조직의 업무 또는 고객 문제를 선정해 근거 자료가 포함된 경영 개선안을 제안합니다.",
        "deliverables": [
          "데이터 정리표와 지표·차트",
          "출처·가정·한계 기록",
          "경영 분석·업무개선 기획서와 발표자료"
        ],
        "software": [
          "CSV를 다룰 수 있는 스프레드시트",
          "기관 승인 생성형 AI 도구",
          "문서·프레젠테이션 도구"
        ],
        "equipment": [
          "인터넷 연결 노트북 또는 PC",
          "제공된 가상 기업 데이터"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "b5420de2-18a4-5605-b540-29deb11bb5c5",
          "week_number": 1,
          "title": "AI 경영 활용과 문제 정의",
          "practice": "가상 기업을 선정하고 해결할 문제·분석 질문 3개를 작성합니다."
        },
        {
          "id": "002e15eb-4727-55ad-ba12-a7a01c0cfb7e",
          "week_number": 2,
          "title": "질문 설계와 답변 검증",
          "practice": "같은 질문의 답변을 비교하고 근거·추정·오류를 표시합니다."
        },
        {
          "id": "d476853a-3602-5aa1-a1cd-e17b536dd863",
          "week_number": 3,
          "title": "데이터 수집과 정리",
          "practice": "제공된 가상 매출 CSV의 결측·중복을 찾아 정리표를 만듭니다."
        },
        {
          "id": "8b58669f-7f45-5942-8c57-acdd7d083b3d",
          "week_number": 4,
          "title": "핵심 지표와 시각화",
          "practice": "매출·비용 지표를 계산하고 원자료와 일치하는 차트 2개를 만듭니다."
        },
        {
          "id": "ccc20ffd-6579-582c-b321-ec007eb5b569",
          "week_number": 5,
          "title": "고객 이해와 수요 가설",
          "practice": "가상 고객 사례를 분류하고 검증할 수 있는 수요 가설을 작성합니다."
        },
        {
          "id": "3a87a422-90ad-57cc-9f5f-303a497e32a5",
          "week_number": 6,
          "title": "시장 자료와 출처 평가",
          "practice": "제공 자료의 날짜·출처·한계를 기록한 비교표를 만듭니다."
        },
        {
          "id": "25d616d1-90e3-5ff9-8318-19f5ed2c6b71",
          "week_number": 7,
          "title": "업무 흐름과 개선 과제",
          "practice": "현재 업무 절차를 도식화하고 반복 작업 1개를 선정합니다."
        },
        {
          "id": "3e522d77-2fe7-5fab-911a-7d1afb77446a",
          "week_number": 8,
          "title": "문서·보고서 작성 지원",
          "practice": "분석표를 바탕으로 보고서 초안을 만들고 숫자와 표현을 검수합니다."
        },
        {
          "id": "d8b35f0c-5bce-5173-81a2-464271e8f836",
          "week_number": 9,
          "title": "개선안의 비용·효과 검토",
          "practice": "비용·효과 추정치와 산출 근거, 확인이 필요한 가정을 정리합니다."
        },
        {
          "id": "6232430b-d16b-5410-958c-3639c1087e33",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "대상 업무·목표 지표·실행 일정·평가 방법을 기획합니다."
        },
        {
          "id": "fc3d4d7d-d598-5f2c-819e-f9618b9392e0",
          "week_number": 11,
          "title": "프로젝트 제작과 동료 검토",
          "practice": "분석자료와 실행계획을 연결하고 동료 검토 의견을 반영합니다."
        },
        {
          "id": "a059ec07-12e8-57ad-a6e0-db1f35b130aa",
          "week_number": 12,
          "title": "결과 발표와 개선",
          "practice": "근거·한계·후속 측정을 포함해 발표하고 수정본을 제출합니다."
        }
      ]
    },
    {
      "id": "a6614259-a8cf-5b0b-a40c-686e3cb73169",
      "slug": "ai-music",
      "title": "AI 음악제작학과",
      "category": "음악·사운드",
      "summary": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
      "audience": "음악 창작 입문자 · 콘텐츠 제작자",
      "result_artifact": "음악·사운드 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
        "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
        "음량·전환·내보내기 품질을 점검합니다.",
        "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
      ],
      "profile": {
        "introduction": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
        "objectives": [
          "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
          "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
          "음량·전환·내보내기 품질을 점검합니다.",
          "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
        ],
        "coreTopics": [
          "음악 기획과 기본 구조",
          "AI 작곡 보조와 결과 평가",
          "오디오·MIDI 편집과 사운드 디자인",
          "음원 이용 조건 확인과 포트폴리오"
        ],
        "finalProject": "선택한 용도에 맞는 짧은 음악 또는 사운드 작품을 기획·편집하고 제작 의도를 설명합니다.",
        "deliverables": [
          "최종 음원과 편집 프로젝트 파일",
          "음원 출처·이용 조건 및 AI 활용 기록",
          "기획서·제작 과정·청음 피드백"
        ],
        "software": [
          "오디오·MIDI 편집 도구",
          "기관 승인 AI 음악 제작 도구",
          "파일 재생·변환 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "헤드폰 또는 이어폰",
          "녹음용 마이크(선택)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "e5006023-7782-5603-b374-769835864bcf",
          "week_number": 1,
          "title": "음악 제작 흐름과 감상 기준",
          "practice": "참고곡을 감상하고 분위기·구조·사용 목적을 정리합니다."
        },
        {
          "id": "9dec375a-cd24-50cc-8c3e-31e662db367b",
          "week_number": 2,
          "title": "리듬과 음악 구조",
          "practice": "리듬 패턴과 곡의 구간을 설계한 구성표를 만듭니다."
        },
        {
          "id": "13b9c72f-abf7-53f3-98f4-c3ed6cbcf7b8",
          "week_number": 3,
          "title": "멜로디와 화성의 기초",
          "practice": "짧은 멜로디 또는 코드 진행을 만들고 선택 이유를 기록합니다."
        },
        {
          "id": "423ec3b3-dfa6-517b-a92f-9bf13a939b7d",
          "week_number": 4,
          "title": "AI 음악 기획과 생성 비교",
          "practice": "동일 기획의 생성 결과를 비교하고 사용할 구간을 선정합니다."
        },
        {
          "id": "70d46f74-3c57-55fb-9da7-9bd49096ad32",
          "week_number": 5,
          "title": "오디오 편집 기초",
          "practice": "선택 구간의 자르기·이어 붙이기·전환을 실습합니다."
        },
        {
          "id": "67928c23-5171-51e4-abf0-74913f627595",
          "week_number": 6,
          "title": "MIDI와 가상 악기",
          "practice": "간단한 연주 패턴을 입력하고 악기 소리를 비교합니다."
        },
        {
          "id": "36144302-9270-5161-bbf4-30ed38838714",
          "week_number": 7,
          "title": "녹음과 사운드 수집",
          "practice": "본인 목소리나 직접 만든 소리를 녹음하고 사용 내역을 기록합니다."
        },
        {
          "id": "ae03922d-cbba-505c-912c-f9ed99dcf6a0",
          "week_number": 8,
          "title": "사운드 디자인과 편곡",
          "practice": "음악 구간에 효과음·악기를 더해 전후 차이를 비교합니다."
        },
        {
          "id": "e809047b-b2ed-5cb8-8de0-eaba8e5b751e",
          "week_number": 9,
          "title": "기초 음량 조절과 출력",
          "practice": "트랙별 음량과 과도한 피크를 점검하고 테스트 파일을 출력합니다."
        },
        {
          "id": "beecd051-2901-58e7-b572-5a8a1f4413a3",
          "week_number": 10,
          "title": "최종 프로젝트 기획",
          "practice": "짧은 영상·전시·브랜드 등 용도에 맞는 음악 기획서를 만듭니다."
        },
        {
          "id": "67ade78a-1a81-525d-884b-939971b142c1",
          "week_number": 11,
          "title": "작품 제작과 이용 조건 검토",
          "practice": "작품을 편집하고 음원 출처·이용 조건·AI 사용 기록을 정리합니다."
        },
        {
          "id": "e7dbc2d4-d17a-54fc-9d8f-c7c3e4e31d12",
          "week_number": 12,
          "title": "청음 발표와 포트폴리오",
          "practice": "동료 청음 의견을 반영해 최종 음원과 제작 설명을 제출합니다."
        }
      ]
    },
    {
      "id": "d6748b74-32a8-5d06-a3a8-02240eef5cd2",
      "slug": "ai-aerial-video",
      "title": "AI 항공영상제작학과",
      "category": "드론·항공영상",
      "summary": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
      "audience": "드론·항공 촬영에 관심 있는 성인",
      "result_artifact": "항공영상 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
        "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
        "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
        "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
      ],
      "profile": {
        "introduction": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
        "objectives": [
          "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
          "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
          "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
          "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
        ],
        "coreTopics": [
          "항공영상 기획과 화면 구성",
          "촬영 전 현장·장비·안전 확인",
          "영상 선별·색·자막·사운드 편집",
          "AI 보조 편집과 결과 검수"
        ],
        "finalProject": "제공된 항공영상 또는 승인된 실습에서 확보한 자료로 공간 소개 영상을 제작합니다. 비행 자격 취득 과정으로 확정하지 않습니다.",
        "deliverables": [
          "항공영상 편집 결과물",
          "촬영 기획·스토리보드",
          "현장 확인 및 자료 이용 기록"
        ],
        "software": [
          "영상 편집 도구",
          "기관 승인 AI 영상 보조 도구",
          "영상 재생·파일 관리 도구"
        ],
        "equipment": [
          "영상 편집이 가능한 노트북 또는 PC",
          "제공된 항공영상과 헤드폰",
          "드론·조종기·촬영 장소·운영 인력(현장 실습 별도 검토)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "75e3dd9f-5ac0-5af0-b721-cfbc7856b6a2",
          "week_number": 1,
          "title": "항공영상 이해와 활용 사례",
          "practice": "제공 영상을 보고 목적·구도·전환 방식을 분석합니다."
        },
        {
          "id": "ce0fbe52-e86f-5e9f-b7d7-7735a43ae3e1",
          "week_number": 2,
          "title": "현장 운영과 사전 확인",
          "practice": "장소·촬영 대상·운영 인력·장비 확인 목록을 작성합니다."
        },
        {
          "id": "6022c4c2-b9be-5a71-ad4f-62c7d710da42",
          "week_number": 3,
          "title": "구도와 촬영 동선 기획",
          "practice": "가상 장소의 촬영 구도와 이동 경로를 스토리보드로 만듭니다."
        },
        {
          "id": "b7cbb85c-0f6e-54d1-b605-fdcaf852908a",
          "week_number": 4,
          "title": "장비 이해와 모의 조작",
          "practice": "장비 점검 시연 또는 제공 조작 자료로 점검 기록을 작성합니다."
        },
        {
          "id": "996ef8eb-aaf4-5bd8-b31a-cece48dff9db",
          "week_number": 5,
          "title": "촬영 계획 검토",
          "practice": "가상 현장 조건의 위험 요소와 촬영 대안을 정리합니다."
        },
        {
          "id": "9b659037-a135-5175-b893-a32145774c3c",
          "week_number": 6,
          "title": "영상 수집과 장면 선별",
          "practice": "제공 영상의 화질·구도·흔들림을 비교해 사용할 장면을 고릅니다."
        },
        {
          "id": "36540ab3-0347-52d0-b34a-efc146711dc4",
          "week_number": 7,
          "title": "기본 컷 편집과 흐름",
          "practice": "장면을 배열해 도입·전개·마무리가 있는 시퀀스를 만듭니다."
        },
        {
          "id": "6b8c4260-d740-58d9-840d-8ab4dc3170a9",
          "week_number": 8,
          "title": "색과 화면 안정성 점검",
          "practice": "색·노출·수평을 조정하고 보정 전후를 비교합니다."
        },
        {
          "id": "aaf9ece2-3f43-534b-a1d1-77a693c170e5",
          "week_number": 9,
          "title": "AI 편집 보조와 검수",
          "practice": "자막·장면 분류 등 보조 결과를 확인하고 오류를 수정합니다."
        },
        {
          "id": "1c5e4098-1f05-5bab-9a60-8e0f67422743",
          "week_number": 10,
          "title": "최종 프로젝트 기획",
          "practice": "지역 소개 또는 공간 기록 영상의 기획·자료 계획을 작성합니다."
        },
        {
          "id": "5990c915-5f0a-52c6-95c5-eb937dbf125d",
          "week_number": 11,
          "title": "최종 영상 편집",
          "practice": "음악·자막·출처를 포함해 시사본을 만들고 피드백을 받습니다."
        },
        {
          "id": "d2844c47-6c3b-5e6e-8534-fe5fb010bf84",
          "week_number": 12,
          "title": "상영과 제작 기록 제출",
          "practice": "최종 영상·기획서·점검 기록·자료 이용 내역을 제출합니다."
        }
      ]
    },
    {
      "id": "2c8fbd28-95a7-55a8-a0e9-9046810430d7",
      "slug": "ai-multimedia",
      "title": "AI 멀티미디어학과",
      "category": "디자인·멀티미디어",
      "summary": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
      "audience": "디자인 입문자 · 디지털 콘텐츠 제작자",
      "result_artifact": "멀티미디어 콘텐츠 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
        "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
        "AI 결과의 오류·가독성·접근성을 점검합니다.",
        "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
      ],
      "profile": {
        "introduction": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
        "objectives": [
          "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
          "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
          "AI 결과의 오류·가독성·접근성을 점검합니다.",
          "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
        ],
        "coreTopics": [
          "메시지·매체 기획",
          "이미지·타이포그래피·레이아웃",
          "영상·사운드 결합",
          "접근성·이용 조건·출력 검수"
        ],
        "finalProject": "전시·교육·캠페인 등 선택한 주제에 맞는 멀티미디어 콘텐츠 패키지를 제작합니다.",
        "deliverables": [
          "대표 이미지와 멀티미디어 결과물",
          "화면 구성도·편집 원본",
          "접근성 점검표와 자료 출처"
        ],
        "software": [
          "이미지·레이아웃 편집 도구",
          "영상·음향 편집 도구",
          "기관 승인 생성형 AI 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "헤드폰 또는 이어폰",
          "태블릿·펜 입력 장치(선택)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "a1d059bd-7597-5a89-ad1e-6b84699d246a",
          "week_number": 1,
          "title": "멀티미디어 사례와 제작 흐름",
          "practice": "참고 콘텐츠의 메시지·구성 요소·표현 방식을 분석합니다."
        },
        {
          "id": "9fb295e1-9f08-5220-a37f-938e3c13e0f5",
          "week_number": 2,
          "title": "대상과 콘텐츠 기획",
          "practice": "가상 주제의 대상·목적·제작 형식을 기획합니다."
        },
        {
          "id": "c4e1aa21-d935-5370-ac27-fd8fc7494b09",
          "week_number": 3,
          "title": "색·글자·레이아웃 기초",
          "practice": "색과 글자의 가독성을 비교하고 화면 시안을 만듭니다."
        },
        {
          "id": "5412d592-2bde-5dcc-84db-44347a96bf56",
          "week_number": 4,
          "title": "AI 이미지 생성과 선별",
          "practice": "시안에 필요한 이미지 후보를 만들고 오류를 기록합니다."
        },
        {
          "id": "f024f14a-1267-50b6-96ed-fc125beab6fe",
          "week_number": 5,
          "title": "이미지 편집과 합성",
          "practice": "직접 준비한 자료로 이미지 크기·구도·레이아웃을 조정합니다."
        },
        {
          "id": "88eca352-1f7c-5956-8098-e61a18479fd6",
          "week_number": 6,
          "title": "영상 구성과 기본 편집",
          "practice": "이미지와 영상을 연결한 짧은 시퀀스를 만듭니다."
        },
        {
          "id": "8e056ae0-8f63-56a3-85c6-1d234f8ee026",
          "week_number": 7,
          "title": "사운드와 메시지 전달",
          "practice": "배경음·효과음·내레이션의 역할을 정하고 편집합니다."
        },
        {
          "id": "9716d856-e535-5be5-bc94-e98081863d9e",
          "week_number": 8,
          "title": "모션과 화면 전환",
          "practice": "단순한 움직임·전환을 적용하고 과도한 효과를 줄입니다."
        },
        {
          "id": "d80d89fe-9261-5c31-a5ff-727fdda573c5",
          "week_number": 9,
          "title": "접근성과 다중 화면 검수",
          "practice": "자막·대비·화면 비율을 PC와 모바일에서 점검합니다."
        },
        {
          "id": "f27fe228-c9ce-570a-9f31-dfac122f3bab",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "작품의 구성도·자료 목록·제작 일정을 작성합니다."
        },
        {
          "id": "2c5dde87-55c0-576a-85eb-6044d5f6563a",
          "week_number": 11,
          "title": "통합 제작과 동료 테스트",
          "practice": "텍스트·이미지·영상·소리를 결합하고 피드백을 반영합니다."
        },
        {
          "id": "46810e65-df37-5cd0-ab74-48306839a1dd",
          "week_number": 12,
          "title": "작품 공개 시연과 포트폴리오",
          "practice": "결과물·제작 과정·출처 목록을 묶어 발표합니다."
        }
      ]
    },
    {
      "id": "9b9a5a7a-f639-5003-b2f1-6aa23dc30d51",
      "slug": "ai-programming",
      "title": "AI 프로그래밍학과",
      "category": "개발·자동화",
      "summary": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
      "audience": "프로그래밍 입문자 · 업무 자동화 관심자",
      "result_artifact": "프로그램·자동화 프로젝트",
      "duration_hours": null,
      "objectives": [
        "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
        "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
        "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
        "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
      ],
      "profile": {
        "introduction": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
        "objectives": [
          "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
          "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
          "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
          "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
        ],
        "coreTopics": [
          "프로그래밍 기초와 실행 환경",
          "파일·표 데이터 처리",
          "AI 코딩 보조와 오류 분석",
          "테스트·비밀정보 관리·프로젝트 문서화"
        ],
        "finalProject": "가상 데이터를 처리하는 작은 자동화 프로그램을 만들고 사용 방법과 한계를 설명합니다.",
        "deliverables": [
          "프로그램 소스와 실행 예제",
          "정상·경계·오류 테스트 기록",
          "설치·사용 설명과 AI 코드 검토 기록"
        ],
        "software": [
          "Python 3 실행 환경",
          "코드 편집기와 웹 브라우저",
          "기관 승인 AI 코딩 보조 도구(선택)"
        ],
        "equipment": [
          "프로그램 설치·실행이 가능한 노트북 또는 PC",
          "제공된 가상 CSV 데이터"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "d7c8fc0d-d011-540e-bd30-d5759f622b1c",
          "week_number": 1,
          "title": "프로그래밍과 실행 환경",
          "practice": "예제 프로그램을 실행하고 입력·처리·출력을 표시합니다."
        },
        {
          "id": "377ec7fa-2679-52e3-bc99-e3dd16ebf66f",
          "week_number": 2,
          "title": "변수와 자료형",
          "practice": "가상 업무의 수치·문자 데이터를 다루는 코드를 작성합니다."
        },
        {
          "id": "2847238a-87f5-555f-84dc-40d38d008519",
          "week_number": 3,
          "title": "조건과 반복",
          "practice": "조건별 처리와 반복 계산 예제를 만들고 결과를 확인합니다."
        },
        {
          "id": "3bfc671a-fd8c-5c01-ae99-37e8158fa4e3",
          "week_number": 4,
          "title": "함수와 코드 분리",
          "practice": "반복되는 처리를 함수로 나누고 호출 결과를 설명합니다."
        },
        {
          "id": "50a0b5af-0516-5ddb-a708-b5a5c9cc25d4",
          "week_number": 5,
          "title": "파일과 CSV 데이터",
          "practice": "제공된 가상 CSV를 읽어 요약 결과를 새 파일로 저장합니다."
        },
        {
          "id": "b2b23c29-b743-5ed7-b208-d05facb928bf",
          "week_number": 6,
          "title": "데이터 검증과 오류 처리",
          "practice": "누락·잘못된 입력을 처리하고 오류 메시지를 개선합니다."
        },
        {
          "id": "a7b8d6f3-9282-5731-98bc-4dd19f3819af",
          "week_number": 7,
          "title": "AI 코딩 보조와 검토",
          "practice": "AI 제안 코드의 동작·의존성·문제점을 직접 확인합니다."
        },
        {
          "id": "14b63f16-6a54-554f-97f3-224b37d695a3",
          "week_number": 8,
          "title": "작은 업무 자동화",
          "practice": "가상 자료의 정리·분류·보고서 생성 중 한 기능을 구현합니다."
        },
        {
          "id": "1ea5bd66-97cf-5b31-abdc-6f7d4d294a5d",
          "week_number": 9,
          "title": "테스트와 비밀정보 점검",
          "practice": "정상·경계·오류 입력을 테스트하고 코드의 민감정보를 점검합니다."
        },
        {
          "id": "222d0488-adff-5ead-9e8b-cc54fb1d3db7",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "사용자·입출력·기능 범위·완료 조건을 작성합니다."
        },
        {
          "id": "6eb9bda1-a4d2-5d21-b6b2-da6bc1c7ada7",
          "week_number": 11,
          "title": "프로젝트 구현과 사용성 검토",
          "practice": "기능을 구현하고 다른 학습자의 실행 결과를 반영합니다."
        },
        {
          "id": "55671aba-9f53-5837-b33d-2a4892964dd9",
          "week_number": 12,
          "title": "시연과 문서 정리",
          "practice": "코드·테스트 결과·설치 및 사용 설명을 묶어 발표합니다."
        }
      ]
    },
    {
      "id": "3ec3790d-4579-564d-ab49-ded60d6c601d",
      "slug": "ai-advertising-video",
      "title": "AI 광고영상제작과",
      "category": "광고·영상",
      "summary": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
      "audience": "마케팅 담당자 · 광고 콘텐츠 제작자",
      "result_artifact": "광고영상 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
        "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
        "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
        "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
      ],
      "profile": {
        "introduction": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
        "objectives": [
          "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
          "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
          "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
          "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
        ],
        "coreTopics": [
          "타깃과 광고 메시지 설계",
          "대본·스토리보드·촬영 구성",
          "AI 영상·이미지·음향 보조 제작",
          "편집·표현 근거·출력 검수"
        ],
        "finalProject": "가상 상품·행사·서비스 중 하나를 정해 짧은 광고영상과 가로·세로 출력본을 제작합니다.",
        "deliverables": [
          "광고영상과 화면 비율별 출력본",
          "광고 기획서·대본·스토리보드",
          "표현 근거·자료 이용 및 AI 활용 기록"
        ],
        "software": [
          "영상 편집·자막 도구",
          "기관 승인 AI 영상·이미지 보조 도구",
          "오디오 편집 또는 녹음 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "스마트폰 또는 카메라·삼각대",
          "촬영 소품과 간단한 조명(기관 보유 장비 우선)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "7f20b8bc-8962-5b24-8d44-966b80ac8897",
          "week_number": 1,
          "title": "광고영상 이해와 사례 분석",
          "practice": "제공 광고의 대상·메시지·행동 유도를 분석합니다."
        },
        {
          "id": "4d2fe99e-0b5c-5eda-9d6f-c58e643f6503",
          "week_number": 2,
          "title": "타깃과 가상 상품 기획",
          "practice": "가상 상품의 특징·고객·근거 있는 표현을 정리합니다."
        },
        {
          "id": "824594c7-f531-52ee-a6a9-e67ef013083c",
          "week_number": 3,
          "title": "카피와 영상 대본",
          "practice": "핵심 메시지와 장면별 대사를 작성하고 과장 표현을 점검합니다."
        },
        {
          "id": "cb55a561-c3e1-5dde-814d-26581d5e6e1e",
          "week_number": 4,
          "title": "스토리보드와 촬영 계획",
          "practice": "장면·구도·소품·자료 목록을 스토리보드로 작성합니다."
        },
        {
          "id": "ef29c149-005a-5880-b793-db0d08df1b46",
          "week_number": 5,
          "title": "AI 이미지·영상 제작 보조",
          "practice": "장면 후보를 만들고 상품·인물·문자 표현 오류를 검토합니다."
        },
        {
          "id": "3a10d706-86b3-5188-a23a-0e7a1296d875",
          "week_number": 6,
          "title": "제품 촬영 기초",
          "practice": "가상 상품이나 소품을 촬영하고 조명·구도 차이를 비교합니다."
        },
        {
          "id": "f8445f01-3ce6-5ebf-8612-3bb2396ff73d",
          "week_number": 7,
          "title": "컷 편집과 메시지 흐름",
          "practice": "촬영·제공 자료를 배치해 메시지가 전달되는 초안을 만듭니다."
        },
        {
          "id": "3a316a70-153f-5aa3-a188-90f601fb3263",
          "week_number": 8,
          "title": "자막·음악·내레이션",
          "practice": "자막 가독성과 음량을 점검하고 음향 자료를 연결합니다."
        },
        {
          "id": "35f091f5-3c52-5662-a27e-ba68a8d16706",
          "week_number": 9,
          "title": "화면 비율과 출력 검수",
          "practice": "가로·세로 버전을 출력하고 잘림·화질·소리를 비교합니다."
        },
        {
          "id": "fc771038-b1a1-50bb-b944-c9466b6aec74",
          "week_number": 10,
          "title": "최종 캠페인 기획",
          "practice": "영상 목표·타깃·메시지·검토 기준을 기획서로 확정합니다."
        },
        {
          "id": "fbe698cf-1c31-533a-8410-4cd8efe57b0d",
          "week_number": 11,
          "title": "광고 시사본 검토",
          "practice": "동료에게 시사하고 이해도·표현 근거·자료 이용 기록을 점검합니다."
        },
        {
          "id": "93c2b2fe-447c-5386-867b-dba5ba8270b8",
          "week_number": 12,
          "title": "최종 발표와 개선 제안",
          "practice": "최종 영상과 제작 자료를 제출하고 후속 개선점을 설명합니다."
        }
      ]
    }
  ]
}$fusion_manifest$::jsonb)->'courses') LOOP
  IF EXISTS(SELECT 1 FROM academy.courses WHERE id=(v_course->>'id')::uuid OR slug=v_course->>'slug') THEN RAISE EXCEPTION 'Fusion UUID/slug collision'; END IF;
  INSERT INTO academy.courses(id,slug,title,category,summary,audience,result_artifact,duration_hours,objectives,publication_state)
   VALUES((v_course->>'id')::uuid,v_course->>'slug',v_course->>'title',v_course->>'category',v_course->>'summary',v_course->>'audience',v_course->>'result_artifact',NULL,ARRAY(SELECT jsonb_array_elements_text(v_course->'objectives')),'draft');
  INSERT INTO academy.course_profiles(course_id,core_topics,final_project,deliverables,software,equipment,review_state,revision)
   VALUES((v_course->>'id')::uuid,ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'coreTopics')),v_course->'profile'->>'finalProject',
    ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'deliverables')),ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'software')),
    ARRAY(SELECT jsonb_array_elements_text(v_course->'profile'->'equipment')),'draft',1);
  FOR v_week IN SELECT value FROM jsonb_array_elements(v_course->'weeks') LOOP
   INSERT INTO academy.course_weeks(id,course_id,week_number,title) VALUES((v_week->>'id')::uuid,(v_course->>'id')::uuid,(v_week->>'week_number')::int,v_week->>'title');
   INSERT INTO academy.course_week_practices(course_id,week_number,practice) VALUES((v_course->>'id')::uuid,(v_week->>'week_number')::int,v_week->>'practice');
  END LOOP;
 END LOOP;
 UPDATE private_education.ai_fusion_runs SET manifest=$fusion_manifest${
  "version": "ai-fusion-stage4-v1",
  "source_commit": "e0435679d7a795b294fe32e5d1f3483e4b5e4c1a",
  "courses": [
    {
      "id": "95e0c83e-257f-562b-8ab7-9361dbf2d9a7",
      "slug": "ai-management",
      "title": "AI 경영관리학과",
      "category": "경영·데이터",
      "summary": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
      "audience": "경영 실무자 · 관리자 · 창업 준비자",
      "result_artifact": "경영 분석·업무개선 기획서",
      "duration_hours": null,
      "objectives": [
        "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
        "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
        "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
        "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
      ],
      "profile": {
        "introduction": "경영 자료를 질문으로 정리하고 AI와 스프레드시트를 활용해 의사결정 근거를 만드는 실습 중심 교육 초안입니다. 가상 기업 데이터를 바탕으로 분석 결과를 검증하고 실행계획으로 연결합니다.",
        "objectives": [
          "경영 문제를 분석 가능한 질문과 지표로 구체화합니다.",
          "가상 데이터를 정리하고 AI 분석 결과를 원자료와 대조합니다.",
          "고객·시장 정보를 근거와 가정을 구분해 해석합니다.",
          "비용·효과·실행 조건을 포함한 업무개선안을 설명합니다."
        ],
        "coreTopics": [
          "경영 질문과 지표 설계",
          "스프레드시트 데이터 정리·시각화",
          "고객·시장 분석과 근거 검증",
          "업무개선 기획과 결과 보고"
        ],
        "finalProject": "가상 조직의 업무 또는 고객 문제를 선정해 근거 자료가 포함된 경영 개선안을 제안합니다.",
        "deliverables": [
          "데이터 정리표와 지표·차트",
          "출처·가정·한계 기록",
          "경영 분석·업무개선 기획서와 발표자료"
        ],
        "software": [
          "CSV를 다룰 수 있는 스프레드시트",
          "기관 승인 생성형 AI 도구",
          "문서·프레젠테이션 도구"
        ],
        "equipment": [
          "인터넷 연결 노트북 또는 PC",
          "제공된 가상 기업 데이터"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "b5420de2-18a4-5605-b540-29deb11bb5c5",
          "week_number": 1,
          "title": "AI 경영 활용과 문제 정의",
          "practice": "가상 기업을 선정하고 해결할 문제·분석 질문 3개를 작성합니다."
        },
        {
          "id": "002e15eb-4727-55ad-ba12-a7a01c0cfb7e",
          "week_number": 2,
          "title": "질문 설계와 답변 검증",
          "practice": "같은 질문의 답변을 비교하고 근거·추정·오류를 표시합니다."
        },
        {
          "id": "d476853a-3602-5aa1-a1cd-e17b536dd863",
          "week_number": 3,
          "title": "데이터 수집과 정리",
          "practice": "제공된 가상 매출 CSV의 결측·중복을 찾아 정리표를 만듭니다."
        },
        {
          "id": "8b58669f-7f45-5942-8c57-acdd7d083b3d",
          "week_number": 4,
          "title": "핵심 지표와 시각화",
          "practice": "매출·비용 지표를 계산하고 원자료와 일치하는 차트 2개를 만듭니다."
        },
        {
          "id": "ccc20ffd-6579-582c-b321-ec007eb5b569",
          "week_number": 5,
          "title": "고객 이해와 수요 가설",
          "practice": "가상 고객 사례를 분류하고 검증할 수 있는 수요 가설을 작성합니다."
        },
        {
          "id": "3a87a422-90ad-57cc-9f5f-303a497e32a5",
          "week_number": 6,
          "title": "시장 자료와 출처 평가",
          "practice": "제공 자료의 날짜·출처·한계를 기록한 비교표를 만듭니다."
        },
        {
          "id": "25d616d1-90e3-5ff9-8318-19f5ed2c6b71",
          "week_number": 7,
          "title": "업무 흐름과 개선 과제",
          "practice": "현재 업무 절차를 도식화하고 반복 작업 1개를 선정합니다."
        },
        {
          "id": "3e522d77-2fe7-5fab-911a-7d1afb77446a",
          "week_number": 8,
          "title": "문서·보고서 작성 지원",
          "practice": "분석표를 바탕으로 보고서 초안을 만들고 숫자와 표현을 검수합니다."
        },
        {
          "id": "d8b35f0c-5bce-5173-81a2-464271e8f836",
          "week_number": 9,
          "title": "개선안의 비용·효과 검토",
          "practice": "비용·효과 추정치와 산출 근거, 확인이 필요한 가정을 정리합니다."
        },
        {
          "id": "6232430b-d16b-5410-958c-3639c1087e33",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "대상 업무·목표 지표·실행 일정·평가 방법을 기획합니다."
        },
        {
          "id": "fc3d4d7d-d598-5f2c-819e-f9618b9392e0",
          "week_number": 11,
          "title": "프로젝트 제작과 동료 검토",
          "practice": "분석자료와 실행계획을 연결하고 동료 검토 의견을 반영합니다."
        },
        {
          "id": "a059ec07-12e8-57ad-a6e0-db1f35b130aa",
          "week_number": 12,
          "title": "결과 발표와 개선",
          "practice": "근거·한계·후속 측정을 포함해 발표하고 수정본을 제출합니다."
        }
      ]
    },
    {
      "id": "a6614259-a8cf-5b0b-a40c-686e3cb73169",
      "slug": "ai-music",
      "title": "AI 음악제작학과",
      "category": "음악·사운드",
      "summary": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
      "audience": "음악 창작 입문자 · 콘텐츠 제작자",
      "result_artifact": "음악·사운드 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
        "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
        "음량·전환·내보내기 품질을 점검합니다.",
        "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
      ],
      "profile": {
        "introduction": "음악의 구성 요소를 이해하고 AI를 창작 보조 도구로 활용해 짧은 음악과 사운드를 제작하는 교육 초안입니다. 직접 만든 소리와 사용 가능한 자료를 구분하고 제작 과정을 기록합니다.",
        "objectives": [
          "리듬·멜로디·구조를 활용해 음악 제작 의도를 설명합니다.",
          "AI 생성 결과를 비교·선별하고 편집으로 개선합니다.",
          "음량·전환·내보내기 품질을 점검합니다.",
          "음원 출처·이용 조건·AI 활용 내역을 기록한 포트폴리오를 만듭니다."
        ],
        "coreTopics": [
          "음악 기획과 기본 구조",
          "AI 작곡 보조와 결과 평가",
          "오디오·MIDI 편집과 사운드 디자인",
          "음원 이용 조건 확인과 포트폴리오"
        ],
        "finalProject": "선택한 용도에 맞는 짧은 음악 또는 사운드 작품을 기획·편집하고 제작 의도를 설명합니다.",
        "deliverables": [
          "최종 음원과 편집 프로젝트 파일",
          "음원 출처·이용 조건 및 AI 활용 기록",
          "기획서·제작 과정·청음 피드백"
        ],
        "software": [
          "오디오·MIDI 편집 도구",
          "기관 승인 AI 음악 제작 도구",
          "파일 재생·변환 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "헤드폰 또는 이어폰",
          "녹음용 마이크(선택)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "e5006023-7782-5603-b374-769835864bcf",
          "week_number": 1,
          "title": "음악 제작 흐름과 감상 기준",
          "practice": "참고곡을 감상하고 분위기·구조·사용 목적을 정리합니다."
        },
        {
          "id": "9dec375a-cd24-50cc-8c3e-31e662db367b",
          "week_number": 2,
          "title": "리듬과 음악 구조",
          "practice": "리듬 패턴과 곡의 구간을 설계한 구성표를 만듭니다."
        },
        {
          "id": "13b9c72f-abf7-53f3-98f4-c3ed6cbcf7b8",
          "week_number": 3,
          "title": "멜로디와 화성의 기초",
          "practice": "짧은 멜로디 또는 코드 진행을 만들고 선택 이유를 기록합니다."
        },
        {
          "id": "423ec3b3-dfa6-517b-a92f-9bf13a939b7d",
          "week_number": 4,
          "title": "AI 음악 기획과 생성 비교",
          "practice": "동일 기획의 생성 결과를 비교하고 사용할 구간을 선정합니다."
        },
        {
          "id": "70d46f74-3c57-55fb-9da7-9bd49096ad32",
          "week_number": 5,
          "title": "오디오 편집 기초",
          "practice": "선택 구간의 자르기·이어 붙이기·전환을 실습합니다."
        },
        {
          "id": "67928c23-5171-51e4-abf0-74913f627595",
          "week_number": 6,
          "title": "MIDI와 가상 악기",
          "practice": "간단한 연주 패턴을 입력하고 악기 소리를 비교합니다."
        },
        {
          "id": "36144302-9270-5161-bbf4-30ed38838714",
          "week_number": 7,
          "title": "녹음과 사운드 수집",
          "practice": "본인 목소리나 직접 만든 소리를 녹음하고 사용 내역을 기록합니다."
        },
        {
          "id": "ae03922d-cbba-505c-912c-f9ed99dcf6a0",
          "week_number": 8,
          "title": "사운드 디자인과 편곡",
          "practice": "음악 구간에 효과음·악기를 더해 전후 차이를 비교합니다."
        },
        {
          "id": "e809047b-b2ed-5cb8-8de0-eaba8e5b751e",
          "week_number": 9,
          "title": "기초 음량 조절과 출력",
          "practice": "트랙별 음량과 과도한 피크를 점검하고 테스트 파일을 출력합니다."
        },
        {
          "id": "beecd051-2901-58e7-b572-5a8a1f4413a3",
          "week_number": 10,
          "title": "최종 프로젝트 기획",
          "practice": "짧은 영상·전시·브랜드 등 용도에 맞는 음악 기획서를 만듭니다."
        },
        {
          "id": "67ade78a-1a81-525d-884b-939971b142c1",
          "week_number": 11,
          "title": "작품 제작과 이용 조건 검토",
          "practice": "작품을 편집하고 음원 출처·이용 조건·AI 사용 기록을 정리합니다."
        },
        {
          "id": "e7dbc2d4-d17a-54fc-9d8f-c7c3e4e31d12",
          "week_number": 12,
          "title": "청음 발표와 포트폴리오",
          "practice": "동료 청음 의견을 반영해 최종 음원과 제작 설명을 제출합니다."
        }
      ]
    },
    {
      "id": "d6748b74-32a8-5d06-a3a8-02240eef5cd2",
      "slug": "ai-aerial-video",
      "title": "AI 항공영상제작학과",
      "category": "드론·항공영상",
      "summary": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
      "audience": "드론·항공 촬영에 관심 있는 성인",
      "result_artifact": "항공영상 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
        "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
        "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
        "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
      ],
      "profile": {
        "introduction": "항공영상의 기획·구도·편집을 연결해 짧은 영상 결과물을 만드는 교육 초안입니다. 제공된 영상으로 시작하며 실제 비행 실습은 장소·운영 인력·안전 절차가 확보된 경우에만 별도로 검토합니다.",
        "objectives": [
          "촬영 목적·구도·동선을 포함한 항공영상 기획안을 작성합니다.",
          "촬영 전 확인 항목과 현장 운영 조건을 구분합니다.",
          "제공 영상을 선별·편집하고 AI 보조 결과를 검수합니다.",
          "촬영·편집 과정과 자료 이용 조건을 설명하는 포트폴리오를 만듭니다."
        ],
        "coreTopics": [
          "항공영상 기획과 화면 구성",
          "촬영 전 현장·장비·안전 확인",
          "영상 선별·색·자막·사운드 편집",
          "AI 보조 편집과 결과 검수"
        ],
        "finalProject": "제공된 항공영상 또는 승인된 실습에서 확보한 자료로 공간 소개 영상을 제작합니다. 비행 자격 취득 과정으로 확정하지 않습니다.",
        "deliverables": [
          "항공영상 편집 결과물",
          "촬영 기획·스토리보드",
          "현장 확인 및 자료 이용 기록"
        ],
        "software": [
          "영상 편집 도구",
          "기관 승인 AI 영상 보조 도구",
          "영상 재생·파일 관리 도구"
        ],
        "equipment": [
          "영상 편집이 가능한 노트북 또는 PC",
          "제공된 항공영상과 헤드폰",
          "드론·조종기·촬영 장소·운영 인력(현장 실습 별도 검토)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "75e3dd9f-5ac0-5af0-b721-cfbc7856b6a2",
          "week_number": 1,
          "title": "항공영상 이해와 활용 사례",
          "practice": "제공 영상을 보고 목적·구도·전환 방식을 분석합니다."
        },
        {
          "id": "ce0fbe52-e86f-5e9f-b7d7-7735a43ae3e1",
          "week_number": 2,
          "title": "현장 운영과 사전 확인",
          "practice": "장소·촬영 대상·운영 인력·장비 확인 목록을 작성합니다."
        },
        {
          "id": "6022c4c2-b9be-5a71-ad4f-62c7d710da42",
          "week_number": 3,
          "title": "구도와 촬영 동선 기획",
          "practice": "가상 장소의 촬영 구도와 이동 경로를 스토리보드로 만듭니다."
        },
        {
          "id": "b7cbb85c-0f6e-54d1-b605-fdcaf852908a",
          "week_number": 4,
          "title": "장비 이해와 모의 조작",
          "practice": "장비 점검 시연 또는 제공 조작 자료로 점검 기록을 작성합니다."
        },
        {
          "id": "996ef8eb-aaf4-5bd8-b31a-cece48dff9db",
          "week_number": 5,
          "title": "촬영 계획 검토",
          "practice": "가상 현장 조건의 위험 요소와 촬영 대안을 정리합니다."
        },
        {
          "id": "9b659037-a135-5175-b893-a32145774c3c",
          "week_number": 6,
          "title": "영상 수집과 장면 선별",
          "practice": "제공 영상의 화질·구도·흔들림을 비교해 사용할 장면을 고릅니다."
        },
        {
          "id": "36540ab3-0347-52d0-b34a-efc146711dc4",
          "week_number": 7,
          "title": "기본 컷 편집과 흐름",
          "practice": "장면을 배열해 도입·전개·마무리가 있는 시퀀스를 만듭니다."
        },
        {
          "id": "6b8c4260-d740-58d9-840d-8ab4dc3170a9",
          "week_number": 8,
          "title": "색과 화면 안정성 점검",
          "practice": "색·노출·수평을 조정하고 보정 전후를 비교합니다."
        },
        {
          "id": "aaf9ece2-3f43-534b-a1d1-77a693c170e5",
          "week_number": 9,
          "title": "AI 편집 보조와 검수",
          "practice": "자막·장면 분류 등 보조 결과를 확인하고 오류를 수정합니다."
        },
        {
          "id": "1c5e4098-1f05-5bab-9a60-8e0f67422743",
          "week_number": 10,
          "title": "최종 프로젝트 기획",
          "practice": "지역 소개 또는 공간 기록 영상의 기획·자료 계획을 작성합니다."
        },
        {
          "id": "5990c915-5f0a-52c6-95c5-eb937dbf125d",
          "week_number": 11,
          "title": "최종 영상 편집",
          "practice": "음악·자막·출처를 포함해 시사본을 만들고 피드백을 받습니다."
        },
        {
          "id": "d2844c47-6c3b-5e6e-8534-fe5fb010bf84",
          "week_number": 12,
          "title": "상영과 제작 기록 제출",
          "practice": "최종 영상·기획서·점검 기록·자료 이용 내역을 제출합니다."
        }
      ]
    },
    {
      "id": "2c8fbd28-95a7-55a8-a0e9-9046810430d7",
      "slug": "ai-multimedia",
      "title": "AI 멀티미디어학과",
      "category": "디자인·멀티미디어",
      "summary": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
      "audience": "디자인 입문자 · 디지털 콘텐츠 제작자",
      "result_artifact": "멀티미디어 콘텐츠 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
        "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
        "AI 결과의 오류·가독성·접근성을 점검합니다.",
        "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
      ],
      "profile": {
        "introduction": "텍스트·이미지·영상·사운드를 결합해 하나의 메시지를 전달하는 디지털 콘텐츠를 제작하는 교육 초안입니다. 목적과 이용 환경에 맞는 형식을 정하고 AI 제작 결과를 검수합니다.",
        "objectives": [
          "대상·메시지·매체에 맞는 콘텐츠 구조를 설계합니다.",
          "시각·영상·음향 자료를 조합해 일관된 표현을 만듭니다.",
          "AI 결과의 오류·가독성·접근성을 점검합니다.",
          "출처와 제작 과정을 포함한 멀티미디어 포트폴리오를 구성합니다."
        ],
        "coreTopics": [
          "메시지·매체 기획",
          "이미지·타이포그래피·레이아웃",
          "영상·사운드 결합",
          "접근성·이용 조건·출력 검수"
        ],
        "finalProject": "전시·교육·캠페인 등 선택한 주제에 맞는 멀티미디어 콘텐츠 패키지를 제작합니다.",
        "deliverables": [
          "대표 이미지와 멀티미디어 결과물",
          "화면 구성도·편집 원본",
          "접근성 점검표와 자료 출처"
        ],
        "software": [
          "이미지·레이아웃 편집 도구",
          "영상·음향 편집 도구",
          "기관 승인 생성형 AI 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "헤드폰 또는 이어폰",
          "태블릿·펜 입력 장치(선택)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "a1d059bd-7597-5a89-ad1e-6b84699d246a",
          "week_number": 1,
          "title": "멀티미디어 사례와 제작 흐름",
          "practice": "참고 콘텐츠의 메시지·구성 요소·표현 방식을 분석합니다."
        },
        {
          "id": "9fb295e1-9f08-5220-a37f-938e3c13e0f5",
          "week_number": 2,
          "title": "대상과 콘텐츠 기획",
          "practice": "가상 주제의 대상·목적·제작 형식을 기획합니다."
        },
        {
          "id": "c4e1aa21-d935-5370-ac27-fd8fc7494b09",
          "week_number": 3,
          "title": "색·글자·레이아웃 기초",
          "practice": "색과 글자의 가독성을 비교하고 화면 시안을 만듭니다."
        },
        {
          "id": "5412d592-2bde-5dcc-84db-44347a96bf56",
          "week_number": 4,
          "title": "AI 이미지 생성과 선별",
          "practice": "시안에 필요한 이미지 후보를 만들고 오류를 기록합니다."
        },
        {
          "id": "f024f14a-1267-50b6-96ed-fc125beab6fe",
          "week_number": 5,
          "title": "이미지 편집과 합성",
          "practice": "직접 준비한 자료로 이미지 크기·구도·레이아웃을 조정합니다."
        },
        {
          "id": "88eca352-1f7c-5956-8098-e61a18479fd6",
          "week_number": 6,
          "title": "영상 구성과 기본 편집",
          "practice": "이미지와 영상을 연결한 짧은 시퀀스를 만듭니다."
        },
        {
          "id": "8e056ae0-8f63-56a3-85c6-1d234f8ee026",
          "week_number": 7,
          "title": "사운드와 메시지 전달",
          "practice": "배경음·효과음·내레이션의 역할을 정하고 편집합니다."
        },
        {
          "id": "9716d856-e535-5be5-bc94-e98081863d9e",
          "week_number": 8,
          "title": "모션과 화면 전환",
          "practice": "단순한 움직임·전환을 적용하고 과도한 효과를 줄입니다."
        },
        {
          "id": "d80d89fe-9261-5c31-a5ff-727fdda573c5",
          "week_number": 9,
          "title": "접근성과 다중 화면 검수",
          "practice": "자막·대비·화면 비율을 PC와 모바일에서 점검합니다."
        },
        {
          "id": "f27fe228-c9ce-570a-9f31-dfac122f3bab",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "작품의 구성도·자료 목록·제작 일정을 작성합니다."
        },
        {
          "id": "2c5dde87-55c0-576a-85eb-6044d5f6563a",
          "week_number": 11,
          "title": "통합 제작과 동료 테스트",
          "practice": "텍스트·이미지·영상·소리를 결합하고 피드백을 반영합니다."
        },
        {
          "id": "46810e65-df37-5cd0-ab74-48306839a1dd",
          "week_number": 12,
          "title": "작품 공개 시연과 포트폴리오",
          "practice": "결과물·제작 과정·출처 목록을 묶어 발표합니다."
        }
      ]
    },
    {
      "id": "9b9a5a7a-f639-5003-b2f1-6aa23dc30d51",
      "slug": "ai-programming",
      "title": "AI 프로그래밍학과",
      "category": "개발·자동화",
      "summary": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
      "audience": "프로그래밍 입문자 · 업무 자동화 관심자",
      "result_artifact": "프로그램·자동화 프로젝트",
      "duration_hours": null,
      "objectives": [
        "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
        "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
        "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
        "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
      ],
      "profile": {
        "introduction": "프로그래밍 입문자가 AI의 도움을 받으며 작은 프로그램을 설계·실행·검증하는 교육 초안입니다. 코드를 그대로 복사하는 데 그치지 않고 입력·처리·출력과 오류를 설명하는 데 중점을 둡니다.",
        "objectives": [
          "변수·조건·반복·함수의 동작을 작은 예제로 설명합니다.",
          "가상 데이터로 파일 처리와 자동화 프로그램을 만듭니다.",
          "AI가 제안한 코드를 읽고 오류·비밀정보 노출 여부를 확인합니다.",
          "테스트와 사용 설명을 포함한 작은 프로젝트를 완성합니다."
        ],
        "coreTopics": [
          "프로그래밍 기초와 실행 환경",
          "파일·표 데이터 처리",
          "AI 코딩 보조와 오류 분석",
          "테스트·비밀정보 관리·프로젝트 문서화"
        ],
        "finalProject": "가상 데이터를 처리하는 작은 자동화 프로그램을 만들고 사용 방법과 한계를 설명합니다.",
        "deliverables": [
          "프로그램 소스와 실행 예제",
          "정상·경계·오류 테스트 기록",
          "설치·사용 설명과 AI 코드 검토 기록"
        ],
        "software": [
          "Python 3 실행 환경",
          "코드 편집기와 웹 브라우저",
          "기관 승인 AI 코딩 보조 도구(선택)"
        ],
        "equipment": [
          "프로그램 설치·실행이 가능한 노트북 또는 PC",
          "제공된 가상 CSV 데이터"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "d7c8fc0d-d011-540e-bd30-d5759f622b1c",
          "week_number": 1,
          "title": "프로그래밍과 실행 환경",
          "practice": "예제 프로그램을 실행하고 입력·처리·출력을 표시합니다."
        },
        {
          "id": "377ec7fa-2679-52e3-bc99-e3dd16ebf66f",
          "week_number": 2,
          "title": "변수와 자료형",
          "practice": "가상 업무의 수치·문자 데이터를 다루는 코드를 작성합니다."
        },
        {
          "id": "2847238a-87f5-555f-84dc-40d38d008519",
          "week_number": 3,
          "title": "조건과 반복",
          "practice": "조건별 처리와 반복 계산 예제를 만들고 결과를 확인합니다."
        },
        {
          "id": "3bfc671a-fd8c-5c01-ae99-37e8158fa4e3",
          "week_number": 4,
          "title": "함수와 코드 분리",
          "practice": "반복되는 처리를 함수로 나누고 호출 결과를 설명합니다."
        },
        {
          "id": "50a0b5af-0516-5ddb-a708-b5a5c9cc25d4",
          "week_number": 5,
          "title": "파일과 CSV 데이터",
          "practice": "제공된 가상 CSV를 읽어 요약 결과를 새 파일로 저장합니다."
        },
        {
          "id": "b2b23c29-b743-5ed7-b208-d05facb928bf",
          "week_number": 6,
          "title": "데이터 검증과 오류 처리",
          "practice": "누락·잘못된 입력을 처리하고 오류 메시지를 개선합니다."
        },
        {
          "id": "a7b8d6f3-9282-5731-98bc-4dd19f3819af",
          "week_number": 7,
          "title": "AI 코딩 보조와 검토",
          "practice": "AI 제안 코드의 동작·의존성·문제점을 직접 확인합니다."
        },
        {
          "id": "14b63f16-6a54-554f-97f3-224b37d695a3",
          "week_number": 8,
          "title": "작은 업무 자동화",
          "practice": "가상 자료의 정리·분류·보고서 생성 중 한 기능을 구현합니다."
        },
        {
          "id": "1ea5bd66-97cf-5b31-abdc-6f7d4d294a5d",
          "week_number": 9,
          "title": "테스트와 비밀정보 점검",
          "practice": "정상·경계·오류 입력을 테스트하고 코드의 민감정보를 점검합니다."
        },
        {
          "id": "222d0488-adff-5ead-9e8b-cc54fb1d3db7",
          "week_number": 10,
          "title": "최종 프로젝트 설계",
          "practice": "사용자·입출력·기능 범위·완료 조건을 작성합니다."
        },
        {
          "id": "6eb9bda1-a4d2-5d21-b6b2-da6bc1c7ada7",
          "week_number": 11,
          "title": "프로젝트 구현과 사용성 검토",
          "practice": "기능을 구현하고 다른 학습자의 실행 결과를 반영합니다."
        },
        {
          "id": "55671aba-9f53-5837-b33d-2a4892964dd9",
          "week_number": 12,
          "title": "시연과 문서 정리",
          "practice": "코드·테스트 결과·설치 및 사용 설명을 묶어 발표합니다."
        }
      ]
    },
    {
      "id": "3ec3790d-4579-564d-ab49-ded60d6c601d",
      "slug": "ai-advertising-video",
      "title": "AI 광고영상제작과",
      "category": "광고·영상",
      "summary": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
      "audience": "마케팅 담당자 · 광고 콘텐츠 제작자",
      "result_artifact": "광고영상 포트폴리오",
      "duration_hours": null,
      "objectives": [
        "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
        "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
        "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
        "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
      ],
      "profile": {
        "introduction": "대상 고객과 전달 메시지를 정하고 기획·촬영 자료·AI 보조 편집을 연결해 짧은 광고영상을 제작하는 교육 초안입니다. 가상 상품을 사용해 표현의 근거와 자료 이용 조건을 함께 점검합니다.",
        "objectives": [
          "타깃·메시지·행동 유도를 포함한 광고 기획안을 작성합니다.",
          "대본·스토리보드·촬영 계획을 일관되게 구성합니다.",
          "영상·자막·사운드를 편집하고 AI 결과를 검수합니다.",
          "표현의 근거·출처·플랫폼별 출력 규격을 기록합니다."
        ],
        "coreTopics": [
          "타깃과 광고 메시지 설계",
          "대본·스토리보드·촬영 구성",
          "AI 영상·이미지·음향 보조 제작",
          "편집·표현 근거·출력 검수"
        ],
        "finalProject": "가상 상품·행사·서비스 중 하나를 정해 짧은 광고영상과 가로·세로 출력본을 제작합니다.",
        "deliverables": [
          "광고영상과 화면 비율별 출력본",
          "광고 기획서·대본·스토리보드",
          "표현 근거·자료 이용 및 AI 활용 기록"
        ],
        "software": [
          "영상 편집·자막 도구",
          "기관 승인 AI 영상·이미지 보조 도구",
          "오디오 편집 또는 녹음 도구"
        ],
        "equipment": [
          "노트북 또는 PC",
          "스마트폰 또는 카메라·삼각대",
          "촬영 소품과 간단한 조명(기관 보유 장비 우선)"
        ],
        "review_state": "draft",
        "revision": 1
      },
      "weeks": [
        {
          "id": "7f20b8bc-8962-5b24-8d44-966b80ac8897",
          "week_number": 1,
          "title": "광고영상 이해와 사례 분석",
          "practice": "제공 광고의 대상·메시지·행동 유도를 분석합니다."
        },
        {
          "id": "4d2fe99e-0b5c-5eda-9d6f-c58e643f6503",
          "week_number": 2,
          "title": "타깃과 가상 상품 기획",
          "practice": "가상 상품의 특징·고객·근거 있는 표현을 정리합니다."
        },
        {
          "id": "824594c7-f531-52ee-a6a9-e67ef013083c",
          "week_number": 3,
          "title": "카피와 영상 대본",
          "practice": "핵심 메시지와 장면별 대사를 작성하고 과장 표현을 점검합니다."
        },
        {
          "id": "cb55a561-c3e1-5dde-814d-26581d5e6e1e",
          "week_number": 4,
          "title": "스토리보드와 촬영 계획",
          "practice": "장면·구도·소품·자료 목록을 스토리보드로 작성합니다."
        },
        {
          "id": "ef29c149-005a-5880-b793-db0d08df1b46",
          "week_number": 5,
          "title": "AI 이미지·영상 제작 보조",
          "practice": "장면 후보를 만들고 상품·인물·문자 표현 오류를 검토합니다."
        },
        {
          "id": "3a10d706-86b3-5188-a23a-0e7a1296d875",
          "week_number": 6,
          "title": "제품 촬영 기초",
          "practice": "가상 상품이나 소품을 촬영하고 조명·구도 차이를 비교합니다."
        },
        {
          "id": "f8445f01-3ce6-5ebf-8612-3bb2396ff73d",
          "week_number": 7,
          "title": "컷 편집과 메시지 흐름",
          "practice": "촬영·제공 자료를 배치해 메시지가 전달되는 초안을 만듭니다."
        },
        {
          "id": "3a316a70-153f-5aa3-a188-90f601fb3263",
          "week_number": 8,
          "title": "자막·음악·내레이션",
          "practice": "자막 가독성과 음량을 점검하고 음향 자료를 연결합니다."
        },
        {
          "id": "35f091f5-3c52-5662-a27e-ba68a8d16706",
          "week_number": 9,
          "title": "화면 비율과 출력 검수",
          "practice": "가로·세로 버전을 출력하고 잘림·화질·소리를 비교합니다."
        },
        {
          "id": "fc771038-b1a1-50bb-b944-c9466b6aec74",
          "week_number": 10,
          "title": "최종 캠페인 기획",
          "practice": "영상 목표·타깃·메시지·검토 기준을 기획서로 확정합니다."
        },
        {
          "id": "fbe698cf-1c31-533a-8410-4cd8efe57b0d",
          "week_number": 11,
          "title": "광고 시사본 검토",
          "practice": "동료에게 시사하고 이해도·표현 근거·자료 이용 기록을 점검합니다."
        },
        {
          "id": "93c2b2fe-447c-5386-867b-dba5ba8270b8",
          "week_number": 12,
          "title": "최종 발표와 개선 제안",
          "practice": "최종 영상과 제작 자료를 제출하고 후속 개선점을 설명합니다."
        }
      ]
    }
  ]
}$fusion_manifest$::jsonb,phase='registered' WHERE batch_key='ai-fusion-stage4-v1';

 UPDATE private_education.ai_fusion_runs SET expected_snapshot=(SELECT jsonb_build_object(
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM academy.courses c),
 'weeks',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.id),'[]'::jsonb) FROM academy.course_weeks w),
 'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM academy.offerings o),
 'profiles',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id),'[]'::jsonb) FROM academy.course_profiles p),
 'practices',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.course_id,p.week_number),'[]'::jsonb) FROM academy.course_week_practices p))),
 history=history || jsonb_build_array(jsonb_build_object('action','register-drafts','at',clock_timestamp(),'executor',current_user))
 WHERE batch_key='ai-fusion-stage4-v1';
END $fusion$;
COMMIT;
