-- 팀 플랜 재구성:
--   기존 'team' (단일) → 'team_basic' (리네임)
--   'team_pro' 신규 생성
--
-- 앱 코드는 이미 team_basic / team_pro 두 슬러그를 기대하고 있으며,
-- /api/admin/update-plan 도 유효 슬러그로 허용되어 있다.
-- 이 스크립트는 기존 team 행을 안전하게 분리/확장한다.

BEGIN;

-- 1) 기존 team → team_basic 으로 리네임 + features 보강 + 표시명·정렬·가격 정리
UPDATE subscription_plans
SET
    slug = 'team_basic',
    display_name = '팀 베이직',
    price_monthly = 79000,
    price_yearly = 758400,
    max_analyses = 50,
    max_customers = -1,
    history_days = 180,
    max_file_size_mb = -1,
    sort_order = 4,
    features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(
        'disclosure_analysis', true,
        'product_match', true,
        'claim_analysis', true,
        'pdf_export', true,
        'custom_product_db', false,
        'priority_support', false,
        'team_dashboard', true,
        'risk_report', false,
        'future_me', false,
        'virtual_receipt', false
    )
WHERE slug = 'team';

-- 2) team_pro 신규 생성 (팀 베이직에서 파생 + Pro 전용 기능 전부 허용)
INSERT INTO subscription_plans (
    slug, display_name,
    price_monthly, price_yearly,
    max_analyses, max_customers, history_days, max_file_size_mb,
    features, sort_order
)
VALUES (
    'team_pro', '팀 프로',
    149000, 1430400,
    -1, -1, -1, -1,
    jsonb_build_object(
        'disclosure_analysis', true,
        'product_match', true,
        'claim_analysis', true,
        'pdf_export', true,
        'custom_product_db', true,
        'priority_support', true,
        'team_dashboard', true,
        'risk_report', true,
        'future_me', true,
        'virtual_receipt', true
    ),
    5
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_analyses = EXCLUDED.max_analyses,
    max_customers = EXCLUDED.max_customers,
    history_days = EXCLUDED.history_days,
    max_file_size_mb = EXCLUDED.max_file_size_mb,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order;

COMMIT;

-- 적용 확인
SELECT slug, display_name, price_monthly, max_analyses, features, sort_order
FROM subscription_plans
ORDER BY sort_order;
