-- KG이니시스 직접 연동 — 빌링키 발급 세션 임시 저장 테이블
-- returnUrl 콜백(/api/inicis/billing-key-return)에서 oid로 세션 복원

CREATE TABLE IF NOT EXISTS public.inicis_pending_billing_keys (
    oid text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_slug text NOT NULL,
    billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    coupon_code text,
    upgrade_plan_slug text,
    buyer_name text NOT NULL,
    buyer_email text NOT NULL,
    buyer_tel text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 30분 이상 된 pending은 삭제 (정기 정리 대상)
CREATE INDEX IF NOT EXISTS inicis_pending_billing_keys_created_at_idx
    ON public.inicis_pending_billing_keys (created_at);

CREATE INDEX IF NOT EXISTS inicis_pending_billing_keys_user_id_idx
    ON public.inicis_pending_billing_keys (user_id);

-- RLS: 본인 것만 조회 가능 (service role은 전체 접근)
ALTER TABLE public.inicis_pending_billing_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own pending billing keys" ON public.inicis_pending_billing_keys;
CREATE POLICY "own pending billing keys"
    ON public.inicis_pending_billing_keys
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert own pending billing keys" ON public.inicis_pending_billing_keys;
CREATE POLICY "insert own pending billing keys"
    ON public.inicis_pending_billing_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 30분 이상 묵은 레코드 자동 정리 (선택, 크론/함수로)
-- DELETE FROM public.inicis_pending_billing_keys WHERE created_at < now() - interval '30 minutes';
