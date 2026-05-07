-- 가상영수증을 알림톡 공유 링크로 발송하려면 영수증 데이터를 어딘가 저장해야 한다.
-- 기존 accident-receipt API는 매번 AI로 즉석 생성 후 응답만 반환 (DB 미저장).
-- 알림톡 발송 시점에 receipt payload를 그대로 저장하고 7일간 공유 링크로 노출.
--
-- 7일 만료는 share token 자체에 포함되지만, 만료된 row를 cron으로 정리하는
-- 용도로 expires_at 컬럼도 함께 둔다.

CREATE TABLE IF NOT EXISTS virtual_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    disease_name TEXT NOT NULL,
    disease_code TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')
);

CREATE INDEX IF NOT EXISTS idx_virtual_receipts_user_created
    ON virtual_receipts(user_id, created_at DESC);

-- partial index의 WHERE 절은 IMMUTABLE 함수만 허용 — NOW()는 STABLE이라 사용 불가.
-- 전체 인덱스로 대체. 만료 row 정리 cron이 expires_at 컬럼 스캔할 때 충분히 빠름.
CREATE INDEX IF NOT EXISTS idx_virtual_receipts_expires
    ON virtual_receipts(expires_at);

-- RLS: 사용자 본인 영수증만 조회. share 페이지는 service_role로 토큰 검증 후 조회.
ALTER TABLE virtual_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own virtual_receipts"
    ON virtual_receipts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to virtual_receipts"
    ON virtual_receipts FOR ALL
    USING (true)
    WITH CHECK (true);
