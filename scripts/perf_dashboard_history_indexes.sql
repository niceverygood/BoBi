-- 대시보드·이력 페이지 로딩 속도 개선
--
-- 내용:
--   (1) 자주 쓰이는 필터·정렬 조합에 인덱스 추가
--   (2) 대시보드용 RPC 함수 — JSON 컬럼을 네트워크로 전송하지 않음
--   (3) 이력용 RPC 함수 — 페이지네이션 + 슬림 컬럼

BEGIN;

-- ── (1) 인덱스 ────────────────────────────────────────────────

-- analyses: user_id + created_at (내림차순 페이지네이션)
CREATE INDEX IF NOT EXISTS analyses_user_created_idx
    ON public.analyses (user_id, created_at DESC);

-- analyses: customer별 조회
CREATE INDEX IF NOT EXISTS analyses_customer_idx
    ON public.analyses (customer_id)
    WHERE customer_id IS NOT NULL;

-- future_me_reports: user별 최신순
CREATE INDEX IF NOT EXISTS future_me_reports_user_created_idx
    ON public.future_me_reports (user_id, created_at DESC);

-- customers: user별 최근
CREATE INDEX IF NOT EXISTS customers_user_created_idx
    ON public.customers (user_id, created_at DESC);

-- ── (2) 대시보드 최근 분석 RPC ─────────────────────────────────
-- JSON 컬럼 전체를 전송하지 않고 overallSummary 텍스트와
-- boolean presence flag만 반환한다. 5건 × ~100KB 감소 → 수백 KB 절감.

CREATE OR REPLACE FUNCTION public.get_dashboard_recent_analyses(
    p_user_id uuid,
    p_limit int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    status text,
    created_at timestamptz,
    customer_id uuid,
    overall_summary text,
    has_medical_history boolean,
    has_product_eligibility boolean,
    has_claim_assessment boolean,
    has_risk_report boolean
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT
        a.id,
        a.status,
        a.created_at,
        a.customer_id,
        a.medical_history->>'overallSummary',
        a.medical_history IS NOT NULL,
        a.product_eligibility IS NOT NULL,
        a.claim_assessment IS NOT NULL,
        a.risk_report IS NOT NULL
    FROM public.analyses a
    WHERE a.user_id = p_user_id
    ORDER BY a.created_at DESC
    LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_recent_analyses(uuid, int) TO authenticated;

-- ── (3) 이력 페이지 목록용 RPC (페이지네이션 + 슬림 + source 추출) ─
CREATE OR REPLACE FUNCTION public.get_analyses_list(
    p_user_id uuid,
    p_limit int DEFAULT 20,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    status text,
    created_at timestamptz,
    updated_at timestamptz,
    customer_id uuid,
    overall_summary text,
    source text,
    has_medical_history boolean,
    has_product_eligibility boolean,
    has_claim_assessment boolean,
    has_risk_report boolean,
    total_count bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    WITH total AS (
        SELECT count(*) AS cnt FROM public.analyses WHERE user_id = p_user_id
    )
    SELECT
        a.id,
        a.status,
        a.created_at,
        a.updated_at,
        a.customer_id,
        COALESCE(
            a.disclosure_summary->>'overallSummary',
            a.medical_history->>'overallSummary'
        ),
        COALESCE(
            a.medical_history->>'source',
            a.disclosure_summary->>'source'
        ),
        a.medical_history IS NOT NULL,
        a.product_eligibility IS NOT NULL,
        a.claim_assessment IS NOT NULL,
        a.risk_report IS NOT NULL,
        (SELECT cnt FROM total)
    FROM public.analyses a
    WHERE a.user_id = p_user_id
    ORDER BY a.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_analyses_list(uuid, int, int) TO authenticated;

COMMIT;

-- 인덱스 확인
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('analyses', 'future_me_reports', 'customers')
ORDER BY tablename, indexname;
