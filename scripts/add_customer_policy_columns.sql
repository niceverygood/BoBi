-- 고객별 보험 가입 정보 + CRM 알림 인프라.
--
-- Phase A — 단순 모델: 1 customer = 1 주력 보장. 여러 보험 가입은 customer_policies
-- 별도 테이블로 추후 확장. 현재는 가장 빈번히 안내되는 4가지 날짜만 customers 컬럼.
--
-- 보험사·상품명은 검색 편의 + 알림 본문 변수용.
-- exemption_end_date / reduction_end_date 는 enrollment_date + 90일 / 1년 기본값으로
-- 자동 계산되지만 상품마다 다르므로 사용자가 덮어쓸 수 있게 별도 컬럼으로 둔다.

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS insurer TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS enrollment_date DATE,
ADD COLUMN IF NOT EXISTS exemption_end_date DATE,
ADD COLUMN IF NOT EXISTS reduction_end_date DATE,
ADD COLUMN IF NOT EXISTS renewal_date DATE,
ADD COLUMN IF NOT EXISTS policy_memo TEXT;

-- 알림 발송 로그 — cron이 매일 검사, 발송 시 row 추가. 중복 발송 방지 + 운영 추적.
CREATE TABLE IF NOT EXISTS crm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    /** 'renewal' | 'exemption_end' | 'reduction_end' | 'birthday' | 'info' */
    kind TEXT NOT NULL,
    /** D-{N} 또는 D-DAY 또는 D+{N} */
    trigger_label TEXT NOT NULL,
    target_phone TEXT,
    aligo_message_id BIGINT,
    aligo_status TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, kind, trigger_label)
);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_user_sent
    ON crm_notifications(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_customer
    ON crm_notifications(customer_id);

-- crm_notifications RLS — 사용자 본인 발송 이력만 조회. service_role은 cron 발송용.
ALTER TABLE crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own crm_notifications"
    ON crm_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to crm_notifications"
    ON crm_notifications FOR ALL
    USING (true)
    WITH CHECK (true);

-- 플랜 기능 플래그 추가:
-- crm_renewal_notify: Basic 이상 (갱신일 알림)
-- crm_full: Pro 이상 (면책·감액·생일·정보 + 가입제안서 PDF 자동 파싱)
UPDATE subscription_plans
SET features = COALESCE(features, '{}'::jsonb) || '{"crm_renewal_notify": true}'::jsonb
WHERE slug IN ('basic', 'pro', 'team_basic', 'team_pro');

UPDATE subscription_plans
SET features = COALESCE(features, '{}'::jsonb) || '{"crm_full": true}'::jsonb
WHERE slug IN ('pro', 'team_pro');
