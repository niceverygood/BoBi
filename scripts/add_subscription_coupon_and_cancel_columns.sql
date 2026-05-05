-- subscriptions 테이블에 두 컬럼을 추가한다.
--
-- 1) coupon_code: 갱신 시점에 할인 단가를 다시 계산하기 위한 스냅샷.
--    cron이 정가만 청구하던 버그(2026-05-04, CF-쿠폰-001) 대응 — 무기한 쿠폰을
--    가진 사용자가 두 번째 결제부터 정가로 청구되던 문제를 해결한다.
--
-- 2) cancel_at_period_end: 사용자가 "기간 만료 후 해지"를 선택했을 때
--    쓰는 플래그. status는 active로 두고 이번 주기까지는 정상 사용,
--    cron이 만료일에 결제 대신 cancelled 처리한다.

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel_at_period_end
    ON subscriptions(cancel_at_period_end)
    WHERE cancel_at_period_end = TRUE;
