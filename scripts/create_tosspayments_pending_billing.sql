-- 토스페이먼츠 자동결제(빌링키) 발급 세션 임시 저장
-- successUrl 콜백(/api/tosspayments/billing-success)에서 customerKey로 세션 복원
--
-- 토스페이먼츠 SDK 방식:
--   1. prepare-billing: customerKey 생성 + 세션 저장 + successUrl/failUrl 반환
--   2. 클라이언트: tossPayments.requestBillingAuth('카드', { customerKey, successUrl, failUrl })
--   3. 토스 결제창에서 카드인증 + 휴대폰 본인인증 (공동인증서 불필요)
--   4. successUrl 콜백: authKey + customerKey로 billingKey 발급 → 첫 결제 → 구독 생성

CREATE TABLE IF NOT EXISTS public.tosspayments_pending_billing (
    customer_key text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_slug text NOT NULL,
    billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    coupon_code text,
    upgrade_plan_slug text,
    buyer_name text NOT NULL,
    buyer_email text NOT NULL,
    buyer_tel text,
    amount integer NOT NULL,  -- 첫 결제 금액 (할인 적용 후, 원 단위)
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tosspayments_pending_billing_created_idx
    ON public.tosspayments_pending_billing (created_at);
CREATE INDEX IF NOT EXISTS tosspayments_pending_billing_user_id_idx
    ON public.tosspayments_pending_billing (user_id);

-- customerKey 저장 테이블 (cron에서 billing 호출 시 필요)
-- 토스페이먼츠 자동결제 승인 API는 billingKey + customerKey 쌍이 필요함
CREATE TABLE IF NOT EXISTS public.tosspayments_customer_keys (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_key text NOT NULL,
    billing_key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tosspayments_customer_keys_billing_idx
    ON public.tosspayments_customer_keys (billing_key);

-- RLS: 본인 것만 조회/작성 가능 (service role은 전체)
ALTER TABLE public.tosspayments_pending_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tosspayments_customer_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own customer key" ON public.tosspayments_customer_keys;
CREATE POLICY "own customer key"
    ON public.tosspayments_customer_keys FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own pending billing" ON public.tosspayments_pending_billing;
CREATE POLICY "own pending billing"
    ON public.tosspayments_pending_billing FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert own pending billing" ON public.tosspayments_pending_billing;
CREATE POLICY "insert own pending billing"
    ON public.tosspayments_pending_billing FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
