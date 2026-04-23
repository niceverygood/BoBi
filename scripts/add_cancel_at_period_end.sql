-- 구독 해지를 "기간 만료 시 해지"(cancel-at-period-end) 시맨틱으로 전환하기 위한 마이그레이션.
--
-- 정책:
--   - 유저가 active 구독을 해지하면 cancel_at_period_end=true 로만 표시하고
--     status='active' 는 current_period_end 까지 유지. 이용자는 남은 기간 이용 가능.
--   - current_period_end 도달 시 renew-subscriptions cron 이 "갱신 결제" 대신
--     status='cancelled' 로 전환 + usage_tracking 을 무료 한도로 리셋.
--   - 체험(trialing) 중 해지는 즉시 취소 (100원 임시 청구는 이미 환불 상태이므로
--     남은 기간 혜택을 이어줄 이유 없음).
--
-- 보호 장치:
--   - IF NOT EXISTS / DO $$ ... $$ 패턴으로 재실행 안전 (idempotent).
--   - cancelled_by 컬럼은 code 에서 이미 사용 중이지만 create_billing_tables.sql 에
--     정의돼 있지 않아 프로덕션에 없는 환경도 있음 → 같이 보강.

BEGIN;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS cancelled_by text;

-- cancel_at_period_end=true 상태의 구독만 빠르게 찾기 위한 인덱스
-- (renew cron 이 current_period_end 이 지난 해지 예약 구독을 골라낼 때 사용)
CREATE INDEX IF NOT EXISTS subscriptions_cancel_at_period_end_idx
    ON public.subscriptions (current_period_end)
    WHERE cancel_at_period_end = true AND status = 'active';

COMMIT;

-- 적용 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
  AND column_name IN ('cancel_at_period_end', 'cancelled_by')
ORDER BY column_name;
