-- 중복 active 구독 정리: 각 user_id별로 최신 updated_at 기준 1건만 남기고 나머지 cancelled 처리
-- Supabase SQL Editor에서 실행

WITH ranked_subs AS (
    SELECT 
        id,
        user_id,
        status,
        updated_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
    FROM subscriptions
    WHERE status = 'active'
)
UPDATE subscriptions
SET status = 'cancelled', updated_at = NOW()
WHERE id IN (
    SELECT id FROM ranked_subs WHERE rn > 1
);
