-- scripts/create_referrals_schema.sql
-- 친구 초대 리퍼럴 시스템 (2026-04)
--
-- 정책:
--   - 베이직 이상 유료 사용자가 초대 코드를 발급받아 공유
--   - 초대받은 친구가 "첫 결제 성공"하면 인바이터에게 Pro 1개월 지급
--   - 월 최대 3명까지 혜택 인정 (그 이상은 referrals 기록만 남고 보상 없음)
--   - 친구가 환불/취소 시 해당 리워드 void
--
-- 적용 전 꼭 Supabase SQL Editor에서 실행하세요.
-- 실수로 두 번 실행해도 안전하도록 IF NOT EXISTS 가드 사용.

-- =============================================================
-- 1. referral_codes — 사용자당 1개 영구 초대 코드
-- =============================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
    code TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT referral_codes_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);

-- =============================================================
-- 2. referrals — 초대 이벤트 (1 row = 1 초대받은 친구)
-- =============================================================
-- status 전이:
--   pending       → 코드만 존재 (친구가 아직 가입 안 함) — 실제로는 signed_up부터 시작
--   signed_up     → 친구가 가입 완료
--   first_paid    → 친구가 첫 결제 성공 → 리워드 지급 대상
--   rewarded      → 인바이터에게 Pro 1개월 지급 완료
--   capped        → 월 3명 한도 초과로 기록만 남음
--   voided        → 친구 환불/해지 또는 관리자 수동 무효
-- =============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'signed_up'
        CHECK (status IN ('signed_up', 'first_paid', 'rewarded', 'capped', 'voided')),
    signed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_paid_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 한 사용자는 한 번만 리퍼럴 대상이 될 수 있음
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_invitee_unique
    ON public.referrals(invitee_id)
    WHERE invitee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON public.referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_rewarded_at ON public.referrals(rewarded_at);

-- =============================================================
-- 3. pro_grants — 임시 Pro 플랜 부여 (리퍼럴 리워드 등)
-- =============================================================
-- 활성 조건: revoked_at IS NULL AND expires_at > now()
-- 사용자에게 유효한 pro_grant가 있으면 effective plan = Pro
-- =============================================================
CREATE TABLE IF NOT EXISTS public.pro_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('referral', 'admin', 'promo')),
    source_ref_id UUID, -- referrals.id 등 소스 엔티티 참조
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_grants_user_active
    ON public.pro_grants(user_id, expires_at)
    WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pro_grants_source_ref ON public.pro_grants(source_ref_id);

-- =============================================================
-- 4. RLS 정책
-- =============================================================
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_grants ENABLE ROW LEVEL SECURITY;

-- referral_codes: 본인 코드만 읽기, 쓰기는 서버(service role)만
DROP POLICY IF EXISTS "users_read_own_referral_code" ON public.referral_codes;
CREATE POLICY "users_read_own_referral_code" ON public.referral_codes
    FOR SELECT USING (auth.uid() = user_id);

-- referrals: 본인이 초대자 OR 본인이 초대받은 사람인 행만 읽기
DROP POLICY IF EXISTS "users_read_own_referrals" ON public.referrals;
CREATE POLICY "users_read_own_referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- pro_grants: 본인 행만 읽기
DROP POLICY IF EXISTS "users_read_own_pro_grants" ON public.pro_grants;
CREATE POLICY "users_read_own_pro_grants" ON public.pro_grants
    FOR SELECT USING (auth.uid() = user_id);

-- 모든 INSERT/UPDATE/DELETE는 서버 코드(service role)에서만 수행.
-- (service role은 RLS를 우회하므로 별도 정책 불필요)

-- =============================================================
-- 5. 코드 생성 함수 — 8자리 대문자+숫자 (혼동되는 0/O, 1/I 제외)
-- =============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =============================================================
-- 설치 완료 확인
-- =============================================================
-- SELECT COUNT(*) FROM public.referral_codes;  -- 0
-- SELECT COUNT(*) FROM public.referrals;       -- 0
-- SELECT COUNT(*) FROM public.pro_grants;      -- 0
-- SELECT public.generate_referral_code();       -- 예: 'A3F9QPBM'
