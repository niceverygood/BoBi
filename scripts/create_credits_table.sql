-- ==========================================
-- 분석 크레딧 시스템 테이블
-- ==========================================

-- 1. 크레딧 잔액 테이블
CREATE TABLE IF NOT EXISTS credit_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_remaining INTEGER NOT NULL DEFAULT 0,
    credits_purchased INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. 크레딧 구매 트랜잭션 테이블
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount INTEGER NOT NULL,  -- 결제 금액 (원)
    payment_key TEXT,         -- 결제 키 (포트원 연동 시)
    type TEXT NOT NULL DEFAULT 'purchase', -- purchase, usage, refund
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_credit_balances_user ON credit_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);

-- 4. RLS 정책
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 크레딧만 조회 가능
CREATE POLICY "Users can view own credit balance"
    ON credit_balances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credit balance"
    ON credit_balances FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit balance"
    ON credit_balances FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 트랜잭션은 조회/삽입만 가능
CREATE POLICY "Users can view own credit transactions"
    ON credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions"
    ON credit_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 5. 크레딧 차감 함수 (분석 시 호출)
CREATE OR REPLACE FUNCTION use_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    -- 잔여 크레딧 확인
    SELECT credits_remaining INTO v_remaining
    FROM credit_balances
    WHERE user_id = p_user_id;

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        RETURN FALSE;
    END IF;

    -- 크레딧 1건 차감
    UPDATE credit_balances
    SET credits_remaining = credits_remaining - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 사용 트랜잭션 기록
    INSERT INTO credit_transactions (user_id, pack_id, credits, amount, type)
    VALUES (p_user_id, 'usage', -1, 0, 'usage');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
