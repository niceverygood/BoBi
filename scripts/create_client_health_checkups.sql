-- 고객 단위 건강검진 저장 테이블
--
-- 목적:
--   - 건강검진 데이터를 고객(customer)에 영구 연결해, 한 번 조회하면
--     위험도 리포트·미래의 나·보장 분석 등 여러 곳에서 자동 재사용
--   - CODEF 과금(건당 50원) 중복 방지
--   - 검진은 연 1회라 같은 연도 중복 저장 방지
--
-- 전제:
--   - analyses.risk_report.healthCheckupData 경로의 기존 데이터는 폴백으로 계속 지원
--   - 이 테이블에 저장되면 우선적으로 사용됨

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_health_checkups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- CODEF 조회 원본 (NHIS 건강보험공단 실제 데이터)
    -- 구조: { resResultList: [...], resPreviewList: [...], resReferenceList: [...] }
    checkup_data jsonb NOT NULL,

    -- AI 추정값 (Claude가 검진 수치를 보고 예측)
    -- NHIS 공식 예측이 아님 (관련 CODEF API 승인 전까지 AI 대체)
    health_age jsonb,           -- { resAge, resChronologicalAge, resNote }
    stroke_prediction jsonb,    -- { resRiskGrade, resRatio, resNote }
    cardio_prediction jsonb,    -- { resRiskGrade, resRatio, resNote }

    -- 메타
    checkup_year text,          -- 'YYYY' — 빠른 조회용
    checked_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,     -- 유효 기한 (권장: 1년)

    -- 같은 고객의 같은 검진 연도 중복 방지
    UNIQUE (customer_id, checkup_year)
);

-- 인덱스 — 고객별 최신 1건 조회
CREATE INDEX IF NOT EXISTS client_health_checkups_customer_idx
    ON public.client_health_checkups (customer_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS client_health_checkups_user_idx
    ON public.client_health_checkups (user_id);

-- RLS
ALTER TABLE public.client_health_checkups ENABLE ROW LEVEL SECURITY;

-- 본인이 담당하는 고객의 건강검진만 조회
DROP POLICY IF EXISTS "own_health_checkups_select" ON public.client_health_checkups;
CREATE POLICY "own_health_checkups_select"
    ON public.client_health_checkups FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_health_checkups_insert" ON public.client_health_checkups;
CREATE POLICY "own_health_checkups_insert"
    ON public.client_health_checkups FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_health_checkups_update" ON public.client_health_checkups;
CREATE POLICY "own_health_checkups_update"
    ON public.client_health_checkups FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_health_checkups_delete" ON public.client_health_checkups;
CREATE POLICY "own_health_checkups_delete"
    ON public.client_health_checkups FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

COMMIT;

-- 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'client_health_checkups'
ORDER BY ordinal_position;
