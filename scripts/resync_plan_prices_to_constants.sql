-- 긴급: subscription_plans 가격을 코드 상수(lib/utils/constants.ts PLAN_LIMITS)와 재동기화
--
-- 배경:
--   프론트엔드는 lib/utils/constants.ts의 PLAN_LIMITS 가격을 표시하지만
--   카카오페이 결제 금액은 DB의 subscription_plans.price_monthly/yearly에서 읽음
--   (app/api/kakaopay/ready/route.ts:52). 두 출처가 어긋나면 사용자가 본 금액과
--   실제 청구 금액이 달라져 부당청구 사고로 이어짐.
--
-- 정책: 코드 상수가 고객에게 표시한 약속값이므로 DB를 코드에 맞춤.
-- 적용 후 즉시 PostgREST 스키마 캐시도 reload.

BEGIN;

UPDATE public.subscription_plans
SET price_monthly = 19900, price_yearly = 190000
WHERE slug = 'basic';

UPDATE public.subscription_plans
SET price_monthly = 39900, price_yearly = 380000
WHERE slug = 'pro';

UPDATE public.subscription_plans
SET price_monthly = 79000, price_yearly = 758400
WHERE slug = 'team_basic';

UPDATE public.subscription_plans
SET price_monthly = 149000, price_yearly = 1430400
WHERE slug = 'team_pro';

UPDATE public.subscription_plans
SET price_monthly = 0, price_yearly = 0
WHERE slug = 'free';

COMMIT;

-- PostgREST 스키마 캐시 갱신 (intent 컬럼 등 이번 세션의 스키마 변경 즉시 반영)
NOTIFY pgrst, 'reload schema';

-- 검증
SELECT slug, display_name, price_monthly, price_yearly
FROM public.subscription_plans
ORDER BY price_monthly;
