-- 무료 플랜 축소 + 가격/한도 DB와 코드(pricing 페이지) 싱크
--
-- 목적:
--   (A) Free를 "평생 3건 체험판"으로 포지셔닝 강화
--   (B) 코드와 DB의 가격·한도 불일치 해소 → 코드 기준(고객 약속값)으로 통일
--
-- 적용 후 고객에게 유리한 변경이므로 별도 공지 없이 진행 가능.
-- (가격 인하 + 한도 확대 → 이탈 리스크 없음)

BEGIN;

-- ── (A) Free 플랜: 평생 3건 (기존이 3이면 유지, 5면 축소) ──────
UPDATE subscription_plans
SET
    max_analyses = 3,
    display_name = '무료 체험',
    history_days = 7
WHERE slug = 'free';

-- ── (B) Basic 플랜: 19,900원/월, 190,000원/년, 월 50건 ─────────
UPDATE subscription_plans
SET
    price_monthly = 19900,
    price_yearly = 190000,
    max_analyses = 50,
    history_days = 180
WHERE slug = 'basic';

-- ── (B) Pro 플랜: 39,900원/월, 380,000원/년, 무제한 ───────────
UPDATE subscription_plans
SET
    price_monthly = 39900,
    price_yearly = 380000,
    max_analyses = -1,
    history_days = -1
WHERE slug = 'pro';

-- ── (B) 팀 플랜 금액 싱크 (코드 pricing 페이지와 일치) ──────────
UPDATE subscription_plans
SET
    price_monthly = 79000,
    price_yearly = 758400,
    max_analyses = 50,
    history_days = 180
WHERE slug = 'team_basic';

UPDATE subscription_plans
SET
    price_monthly = 149000,
    price_yearly = 1430400,
    max_analyses = -1,
    history_days = -1
WHERE slug = 'team_pro';

COMMIT;

-- 기존 무료 유저의 usage_tracking 업데이트 (이번 달 한도 3으로 조정)
-- 이미 3건 초과 사용한 유저는 자연히 한도 도달 상태가 됨 → 업셀 기회
UPDATE usage_tracking ut
SET analyses_limit = 3
FROM subscriptions s
WHERE ut.user_id = s.user_id
  AND s.status IN ('active', 'trialing')
  AND s.plan_id = (SELECT id FROM subscription_plans WHERE slug = 'free');

-- 구독 없는 (즉 free) 유저의 usage_tracking도 조정
UPDATE usage_tracking
SET analyses_limit = 3
WHERE user_id NOT IN (
    SELECT user_id FROM subscriptions WHERE status IN ('active', 'trialing')
);

-- 확인
SELECT slug, display_name, price_monthly, max_analyses, history_days
FROM subscription_plans
ORDER BY sort_order;
