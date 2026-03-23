-- scripts/create_promo_codes_table.sql
-- 프로모션 코드 시스템 테이블

-- 1. 프로모션 코드 테이블
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    plan_slug TEXT NOT NULL DEFAULT 'pro',
    price_override INTEGER NOT NULL DEFAULT 0,
    duration_months INTEGER NOT NULL DEFAULT 3,
    max_uses INTEGER NOT NULL DEFAULT -1,
    used_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 프로모션 코드 사용 이력 테이블
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    plan_slug TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(promo_code_id, user_id)
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_status ON promo_code_redemptions(status);

-- 4. RLS 정책
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 프로모 코드 읽기/쓰기 가능 (API에서 관리자 체크)
CREATE POLICY "Allow authenticated access to promo_codes" ON promo_codes
    FOR ALL USING (auth.role() = 'authenticated');

-- 사용 이력: 인증된 사용자 모두 접근 가능 (API에서 관리자/본인 체크)
CREATE POLICY "Allow authenticated access to promo_code_redemptions" ON promo_code_redemptions
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. 기본 프로모 코드 삽입 (3개월 무료 이용)
INSERT INTO promo_codes (code, description, plan_slug, price_override, duration_months, max_uses)
VALUES
    ('BOBI-FREE-3M', '보비 3개월 무료 이용 (프로 플랜)', 'pro', 0, 3, -1),
    ('WONFIN2026', '원금융서비스 직원 전용 (베이직 월 10,000원)', 'basic', 10000, -1, -1),
    ('JONGIN-FREE', '이종인 팀 무료 사용', 'pro', 0, -1, -1),
    ('BOBI-ALL', 'BoBi 종합분석 프로모션 (프로 월 60,000원)', 'pro', 60000, -1, -1)
ON CONFLICT (code) DO NOTHING;
