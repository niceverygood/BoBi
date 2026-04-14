-- ============================================================
-- usage_tracking 데이터 정리
-- ============================================================
-- 목적: 기존 유저들의 usage_tracking 잘못된 한도값을 올바르게 재설정
-- 실행 시점: 카운터 버그 수정 후 1회만 실행

-- 1. 현재 상태 확인 (실행 전)
SELECT
    ut.user_id,
    ut.period_start,
    ut.analyses_used,
    ut.analyses_limit,
    p.email,
    sp.slug AS plan_slug,
    sp.max_analyses
FROM usage_tracking ut
LEFT JOIN profiles p ON p.id = ut.user_id
LEFT JOIN subscriptions s ON s.user_id = ut.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE ut.period_start = DATE_TRUNC('month', NOW())::date
ORDER BY ut.analyses_limit DESC;

-- 2. 활성 구독이 없는 유저 → 무료 플랜 (5건)으로 리셋
UPDATE usage_tracking
SET analyses_limit = 5,
    updated_at = NOW()
WHERE period_start = DATE_TRUNC('month', NOW())::date
  AND user_id NOT IN (
      SELECT user_id FROM subscriptions WHERE status = 'active'
  )
  AND analyses_limit != 5;

-- 3. 베이직 플랜 유저 → 50건으로 정확히 설정
UPDATE usage_tracking ut
SET analyses_limit = 50,
    updated_at = NOW()
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE ut.user_id = s.user_id
  AND ut.period_start = DATE_TRUNC('month', NOW())::date
  AND s.status = 'active'
  AND sp.slug IN ('basic', 'team_basic')
  AND ut.analyses_limit != 50;

-- 4. 프로 플랜 유저 → 999999 (무제한)
UPDATE usage_tracking ut
SET analyses_limit = 999999,
    updated_at = NOW()
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE ut.user_id = s.user_id
  AND ut.period_start = DATE_TRUNC('month', NOW())::date
  AND s.status = 'active'
  AND sp.slug IN ('pro', 'team_pro')
  AND ut.analyses_limit != 999999;

-- 5. 정리 후 상태 확인
SELECT
    CASE
        WHEN analyses_limit = 5 THEN '무료 (5건)'
        WHEN analyses_limit = 50 THEN '베이직 (50건)'
        WHEN analyses_limit = 999999 THEN '프로 (무제한)'
        ELSE '기타: ' || analyses_limit::text
    END AS plan_status,
    COUNT(*) AS user_count
FROM usage_tracking
WHERE period_start = DATE_TRUNC('month', NOW())::date
GROUP BY plan_status
ORDER BY user_count DESC;
