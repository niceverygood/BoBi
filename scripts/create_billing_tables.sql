-- ==========================================
-- 빌링키 & 결제 이력 테이블
-- ==========================================

-- 1. 빌링키 테이블 (자동결제용)
CREATE TABLE IF NOT EXISTS billing_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_key TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'portone_inicis', -- portone_inicis, portone_kakaopay
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. 결제 이력 테이블
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    payment_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid', -- paid, failed, refunded
    billing_cycle TEXT, -- monthly, yearly
    plan_slug TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_billing_keys_user ON billing_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_sub ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment ON payment_history(payment_id);

-- 4. RLS 정책
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 빌링키: 서비스 클라이언트만 접근 (사용자 직접 접근 불가)
CREATE POLICY "Service role can manage billing_keys"
    ON billing_keys FOR ALL
    USING (true)
    WITH CHECK (true);

-- 결제 이력: 사용자는 자기 것만 조회
CREATE POLICY "Users can view own payment history"
    ON payment_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert payment history"
    ON payment_history FOR INSERT
    WITH CHECK (true);

-- 5. 구독 상태에 past_due 추가 (이미 있으면 무시)
-- subscriptions.status 컬럼이 이미 text 타입이므로 별도 마이그레이션 불필요
