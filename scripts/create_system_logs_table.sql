-- ==========================================
-- 시스템 로그 테이블
-- 결제/구독/웹훅/인증 등 주요 이벤트를 중앙에서 추적
-- Sentry는 에러 전용이지만 이 테이블은 성공 이벤트까지 포함한 전체 이벤트 스트림
-- ==========================================

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT NOT NULL DEFAULT 'info', -- debug, info, warn, error
    area TEXT NOT NULL,                 -- billing, iap, kakaopay, tosspayments, inicis, webhook, auth, subscription, coupon
    event TEXT NOT NULL,                -- e.g. payment_succeeded, payment_failed, trial_started, webhook_received
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,                    -- denormalized for admin search without joining auth schema
    message TEXT,
    metadata JSONB,                     -- 임의 추가 정보 (provider, amount, plan_slug, error_code 등)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_area ON system_logs(area);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_event ON system_logs(event);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 접근 (관리자 API에서만 조회)
CREATE POLICY "Service role manages system_logs"
    ON system_logs FOR ALL
    USING (true)
    WITH CHECK (true);
