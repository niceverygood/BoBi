-- scripts/add_upgrade_to_plan_column.sql
-- 프로모 코드에 '플랜 업그레이드' 기능 추가
-- 예: 베이직 가격 결제 시 프로 플랜으로 등급 업그레이드

-- 1. promo_codes 테이블에 upgrade_to_plan 컬럼 추가
ALTER TABLE promo_codes
ADD COLUMN IF NOT EXISTS upgrade_to_plan TEXT DEFAULT NULL;

-- 2. kakaopay_sessions 테이블에 업그레이드 정보 저장용 컬럼 추가
ALTER TABLE kakaopay_sessions
ADD COLUMN IF NOT EXISTS upgrade_plan_slug TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL;

-- 3. BOBI-PRO 쿠폰 등록: 베이직 가격(19,900원)으로 프로 플랜 업그레이드
INSERT INTO promo_codes (code, description, plan_slug, price_override, duration_months, max_uses, upgrade_to_plan)
VALUES ('BOBI-PRO', '베이직 가격으로 프로 업그레이드 프로모션', 'basic', 19900, -1, -1, 'pro')
ON CONFLICT (code) DO UPDATE SET upgrade_to_plan = 'pro', updated_at = NOW();
