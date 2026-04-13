-- ============================================================
-- 익명화 데이터 테이블 (통계/연구/보험사 API 판매용)
-- ============================================================
-- 설계 원칙:
-- 1. 개인 식별 정보(이름, 주민번호, 연락처) 완전 제거
-- 2. user_id는 SHA-256 해시로 일방향 변환 (재식별 불가)
-- 3. 연령은 10세 단위, 지역은 시·도 단위로 일반화
-- 4. 원본 analyses 테이블과 별도 저장 (데이터 완전 분리)
-- 5. 이용자 동의 여부 기록 (opt-out 가능)
-- ============================================================

-- 1. 익명화된 의료/보험 분석 데이터
CREATE TABLE IF NOT EXISTS anonymized_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 개인 식별 불가능한 해시 ID (같은 유저의 데이터 연결용, 재식별 불가)
    subject_hash TEXT NOT NULL,                -- SHA-256(user_id + salt)

    -- 일반화된 인구통계
    age_group TEXT,                             -- '20대', '30대', '40대', '50대', '60대', '70대+'
    gender TEXT,                                -- 'M', 'F'
    region TEXT,                                -- '서울', '경기', '부산' 등 시·도 단위
    occupation_category TEXT,                   -- '사무직', '자영업', '전문직' 등 대분류 (선택)

    -- 의료 데이터 (심평원 기반)
    disease_codes JSONB DEFAULT '[]',           -- [{ code: 'E11', name: '당뇨', firstYear: '2020', visits: 15 }]
    medications JSONB DEFAULT '[]',             -- ['메트포르민', '로수바스타틴', ...]
    treatment_pattern TEXT,                     -- '정기 외래 통원', '간헐적 방문', '입원 이력'
    total_visit_count INT,
    total_hospital_count INT,

    -- 건강검진 데이터 (건보공단 기반, 최신 검진 기준)
    bmi NUMERIC(4, 1),
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    fasting_glucose INT,
    total_cholesterol INT,
    hdl_cholesterol INT,
    ldl_cholesterol INT,
    triglyceride INT,
    ast INT,
    alt INT,
    gtp INT,
    hemoglobin NUMERIC(4, 1),
    gfr INT,

    -- AI 분석 결과 요약
    risk_items JSONB DEFAULT '[]',              -- [{ riskDisease, relativeRisk, riskLevel, category }]
    compound_risks_count INT DEFAULT 0,
    health_age INT,                              -- AI 예측 건강나이
    chronological_age INT,                       -- 실제 나이
    stroke_risk_grade TEXT,                     -- '낮음/보통/높음/매우높음'
    cardio_risk_grade TEXT,

    -- 추이 정보 (다년도 검진 시)
    has_trend_data BOOLEAN DEFAULT false,
    worsening_metrics JSONB DEFAULT '[]',       -- ['공복혈당', 'BMI', ...]
    golden_time_alerts INT DEFAULT 0,           -- 골든타임 경고 개수

    -- 메타데이터
    anonymized_at TIMESTAMPTZ DEFAULT now(),
    source_hash TEXT,                            -- 원본 analysis.id 해시 (역추적 방지하면서 중복 방지용)

    CONSTRAINT anonymized_analyses_source_unique UNIQUE (source_hash)
);

-- 인덱스 (집계/통계용)
CREATE INDEX IF NOT EXISTS idx_anon_age_gender ON anonymized_analyses (age_group, gender);
CREATE INDEX IF NOT EXISTS idx_anon_region ON anonymized_analyses (region);
CREATE INDEX IF NOT EXISTS idx_anon_disease_codes ON anonymized_analyses USING GIN (disease_codes);
CREATE INDEX IF NOT EXISTS idx_anon_medications ON anonymized_analyses USING GIN (medications);
CREATE INDEX IF NOT EXISTS idx_anon_risk_items ON anonymized_analyses USING GIN (risk_items);
CREATE INDEX IF NOT EXISTS idx_anon_created ON anonymized_analyses (anonymized_at DESC);

-- 2. 이용자 opt-out 기록 (통계 활용 거부)
CREATE TABLE IF NOT EXISTS statistics_opt_out (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    opted_out_at TIMESTAMPTZ DEFAULT now(),
    reason TEXT
);

-- 3. 익명화 데이터 접근 로그 (누가 언제 어떤 쿼리를 했는지 기록)
CREATE TABLE IF NOT EXISTS anonymized_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessor_id UUID,                           -- 접근자 (관리자 UUID)
    accessor_role TEXT,                          -- 'admin' | 'api_client' | 'researcher'
    query_type TEXT,                             -- 'aggregate' | 'export' | 'api'
    query_filter JSONB,                          -- 쿼리 조건 (재식별 시도 방지 감사용)
    result_count INT,
    purpose TEXT,                                -- 접근 목적
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS 정책 (서비스 롤만 접근 가능)
ALTER TABLE anonymized_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics_opt_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymized_access_log ENABLE ROW LEVEL SECURITY;

-- 익명화 테이블: 서비스 롤만 접근
CREATE POLICY "Service role only" ON anonymized_analyses
    FOR ALL USING (auth.role() = 'service_role');

-- opt-out: 본인 것만 조회/수정 가능
CREATE POLICY "Users can view own opt-out" ON statistics_opt_out
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opt-out" ON statistics_opt_out
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own opt-out" ON statistics_opt_out
    FOR DELETE USING (auth.uid() = user_id);

-- 접근 로그: 서비스 롤만
CREATE POLICY "Service role only" ON anonymized_access_log
    FOR ALL USING (auth.role() = 'service_role');

-- 5. 통계 뷰 (자주 쓰는 집계 쿼리를 미리 정의)
CREATE OR REPLACE VIEW stats_disease_by_age_gender AS
SELECT
    a.age_group,
    a.gender,
    d.value->>'code' AS disease_code,
    d.value->>'name' AS disease_name,
    COUNT(*) AS patient_count
FROM anonymized_analyses a
CROSS JOIN LATERAL jsonb_array_elements(a.disease_codes) AS d
GROUP BY a.age_group, a.gender, disease_code, disease_name
ORDER BY patient_count DESC;

CREATE OR REPLACE VIEW stats_risk_distribution AS
SELECT
    a.age_group,
    a.gender,
    r.value->>'riskCategory' AS risk_category,
    r.value->>'riskLevel' AS risk_level,
    COUNT(*) AS count,
    AVG((r.value->>'relativeRisk')::numeric) AS avg_relative_risk
FROM anonymized_analyses a
CROSS JOIN LATERAL jsonb_array_elements(a.risk_items) AS r
GROUP BY a.age_group, a.gender, risk_category, risk_level;

CREATE OR REPLACE VIEW stats_checkup_averages AS
SELECT
    age_group,
    gender,
    region,
    COUNT(*) AS sample_size,
    ROUND(AVG(bmi)::numeric, 1) AS avg_bmi,
    ROUND(AVG(fasting_glucose)::numeric, 1) AS avg_fasting_glucose,
    ROUND(AVG(total_cholesterol)::numeric, 1) AS avg_cholesterol,
    ROUND(AVG(blood_pressure_systolic)::numeric, 1) AS avg_bp_systolic
FROM anonymized_analyses
WHERE bmi IS NOT NULL
GROUP BY age_group, gender, region
HAVING COUNT(*) >= 5;  -- k-익명성 최소 보호 (5건 미만 집계 제외)

COMMENT ON TABLE anonymized_analyses IS '익명화된 의료/보험 분석 데이터 - 개인 식별 불가 상태로 통계·연구·API 판매 목적으로 사용';
COMMENT ON TABLE statistics_opt_out IS '이용자의 통계 활용 거부(opt-out) 기록';
COMMENT ON TABLE anonymized_access_log IS '익명화 데이터 접근 감사 로그 - 재식별 시도 방지';
