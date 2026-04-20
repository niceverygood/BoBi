-- Pro 전용 기능(질병 위험도 리포트, 미래의 나, 가상 영수증) 플래그를 plan.features JSONB에 반영
-- 앱 코드는 DB에 해당 키가 없을 때 slug 기반으로 fallback 하므로 이 스크립트 없이도 정상 동작하나,
-- DB에 명시적으로 기록해두면 관리 일관성이 확보된다.

UPDATE subscription_plans
SET features = features
    || jsonb_build_object(
        'risk_report', false,
        'future_me', false,
        'virtual_receipt', false
    )
WHERE slug IN ('free', 'basic', 'team_basic');

UPDATE subscription_plans
SET features = features
    || jsonb_build_object(
        'risk_report', true,
        'future_me', true,
        'virtual_receipt', true
    )
WHERE slug IN ('pro', 'team_pro');

-- 적용 확인
SELECT slug, display_name, features
FROM subscription_plans
ORDER BY sort_order;
