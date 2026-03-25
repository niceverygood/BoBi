-- scripts/add_coupon_discount_columns.sql
-- promo_codes 테이블에 할인 유형/값 컬럼 추가

-- discount_type: 'percent' (퍼센트 할인), 'fixed' (고정금액 할인), 'price_override' (가격 덮어쓰기)
ALTER TABLE promo_codes
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'price_override',
ADD COLUMN IF NOT EXISTS discount_value INTEGER DEFAULT 0;

-- 기존 데이터 마이그레이션: price_override가 0이면 price_override 방식의 무료 쿠폰
UPDATE promo_codes
SET discount_type = 'price_override', discount_value = 0
WHERE discount_type IS NULL;

-- promo_code_redemptions에 할인 적용 금액 기록
ALTER TABLE promo_code_redemptions
ADD COLUMN IF NOT EXISTS original_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price INTEGER DEFAULT 0;
