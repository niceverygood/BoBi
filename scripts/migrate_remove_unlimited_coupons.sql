-- scripts/migrate_remove_unlimited_coupons.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 무기한 쿠폰 금지 (이종인 5/11 정책)
--
-- 배경:
--   기존에는 promo_codes.duration_months = -1 이 "무기한 락-인"을 의미했고,
--   갱신 결제(cron)가 promo_codes.expires_at만 보고 만료 처리하던 구조였다.
--   이종인 영업이사 정책: "쿠폰에 무기한 쿠폰은 있어서는 안 된다".
--   매출 누수 + 회계/예측 왜곡 + 영구 락-인 리스크 제거 목적.
--
-- 적용:
--   1) 기존 duration_months = -1 → 12 개월로 일괄 변경
--   2) duration_months 컬럼에 CHECK 제약 (>= 1) 추가
--   3) expires_at 이 NULL 인 row 는 created_at + 12개월로 보강
--
-- ⚠️ 이미 무기한 쿠폰으로 결제 중인 사용자의 갱신 결제도 영향을 받는다.
--    "여태 약속한 가격은 지키자" 정책이 필요하면 별도 SQL 로 special-case 처리.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- (1) 기존 -1 → 12 개월
UPDATE promo_codes
SET duration_months = 12,
    updated_at = NOW()
WHERE duration_months = -1;

-- (2) expires_at 이 NULL 이면 created_at + 12개월로 채움
UPDATE promo_codes
SET expires_at = COALESCE(created_at, NOW()) + INTERVAL '12 months',
    updated_at = NOW()
WHERE expires_at IS NULL;

-- (3) CHECK 제약 추가 — 새 row 도, UPDATE 도 -1/0/음수 모두 차단.
--     ALREADY EXISTS 면 무시.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'promo_codes_duration_months_positive'
    ) THEN
        ALTER TABLE promo_codes
            ADD CONSTRAINT promo_codes_duration_months_positive
            CHECK (duration_months >= 1);
    END IF;
END$$;

-- (4) expires_at 도 NOT NULL 강제 — "무기한" 우회 차단.
ALTER TABLE promo_codes
    ALTER COLUMN expires_at SET NOT NULL;

-- (5) duration_months DEFAULT 도 3 유지 (-1 우회 없도록 코드 검사 함께 필요)
ALTER TABLE promo_codes
    ALTER COLUMN duration_months SET DEFAULT 3;

COMMIT;

-- 검증:
-- SELECT code, duration_months, expires_at, active FROM promo_codes ORDER BY created_at DESC;
-- → 모든 row 가 duration_months >= 1, expires_at IS NOT NULL 이어야 함.
