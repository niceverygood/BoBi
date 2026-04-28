-- ==========================================
-- 통합 결제 테이블 (payments)
-- ==========================================
-- 카카오페이/토스/이니시스/포트원/Apple IAP/Google Play 결제를 한 테이블에 모아
-- 관리자 대시보드에서 일관되게 조회·환불 처리할 수 있게 한다.
--
-- 코드는 이미 다음 위치에서 이 테이블에 INSERT를 시도한다:
--   - app/api/kakaopay/approve/route.ts (line 254-268)
--   - app/api/iap/verify/route.ts (line 232-246)
--   - app/api/admin/refund/route.ts (line 145-153, status='refunded' UPDATE)
-- 모두 try/catch로 감싸져 있어 테이블 부재 시 silent fail — 이 마이그레이션으로 해소.

CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- PG TID 또는 IAP transactionId — 환불·조회의 키
    payment_id TEXT NOT NULL,

    -- 포트원을 거친 경우의 portone payment_id (별도 보관)
    portone_payment_id TEXT,

    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid', -- paid | refunded | failed | cancelled

    billing_cycle TEXT, -- monthly | yearly
    plan_slug TEXT,

    -- 'kakaopay' | 'tosspayments' | 'inicis' | 'portone_inicis' | 'portone_kakaopay'
    --   | 'apple_iap' | 'google_play' | 'card'
    payment_method TEXT,

    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT, -- 'admin' | 'user' | 'auto'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- payment_id로 환불/조회가 잦으므로 unique index — 같은 PG TID가 두 번 INSERT 되지 않도록 멱등 보장
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_id_unique
    ON payments(payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_user
    ON payments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_subscription
    ON payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON payments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_method
    ON payments(payment_method, created_at DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_payments_updated_at();

-- RLS — 사용자는 본인 것만 SELECT, 서비스 롤만 INSERT/UPDATE
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage payments" ON payments;
CREATE POLICY "Service can manage payments"
    ON payments FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE payments IS '모든 PG/IAP 결제 통합 기록. payment_history는 카카오페이/포트원 정기결제용 레거시 테이블 — 신규 코드는 payments 사용.';
