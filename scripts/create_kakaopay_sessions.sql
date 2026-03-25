-- 카카오페이 정기결제 세션 테이블
-- 결제 준비(ready) ~ 승인(approve) 사이의 임시 데이터 저장
CREATE TABLE IF NOT EXISTS kakaopay_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tid TEXT NOT NULL,                    -- 카카오페이 거래 ID
    partner_order_id TEXT NOT NULL,       -- 주문 ID
    plan_slug TEXT NOT NULL,              -- 구독 플랜 slug
    billing_cycle TEXT NOT NULL,          -- monthly / yearly
    amount INTEGER NOT NULL,              -- 결제 금액
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT kakaopay_sessions_user_id_key UNIQUE (user_id)
);

-- RLS 정책
ALTER TABLE kakaopay_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage kakaopay_sessions"
    ON kakaopay_sessions FOR ALL
    USING (true)
    WITH CHECK (true);
