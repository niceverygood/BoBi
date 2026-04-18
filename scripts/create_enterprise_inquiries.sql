-- 엔터프라이즈 / 팀 플랜 문의 테이블
-- 구독 페이지의 "엔터프라이즈 문의하기"에서 작성
-- 중간관리자(sub_admins) + 총괄관리자(ADMIN_EMAILS)가 조회 + 상태 관리

CREATE TABLE IF NOT EXISTS public.enterprise_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_name text NOT NULL,
    contact_phone text NOT NULL,
    contact_email text,
    company_name text,
    team_size text,           -- '5~10명', '11~30명', '31~100명', '100명 이상' 등 문자열
    inquiry_message text NOT NULL,
    status text NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'in_progress', 'completed', 'cancelled')),
    admin_memo text,
    handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    handled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enterprise_inquiries_user_id_idx
    ON public.enterprise_inquiries (user_id);
CREATE INDEX IF NOT EXISTS enterprise_inquiries_status_idx
    ON public.enterprise_inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS enterprise_inquiries_created_at_idx
    ON public.enterprise_inquiries (created_at DESC);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enterprise_inquiries_updated_at ON public.enterprise_inquiries;
CREATE TRIGGER enterprise_inquiries_updated_at
    BEFORE UPDATE ON public.enterprise_inquiries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

-- 본인 문의 조회/작성
DROP POLICY IF EXISTS "user own enterprise inquiries - select" ON public.enterprise_inquiries;
CREATE POLICY "user own enterprise inquiries - select"
    ON public.enterprise_inquiries FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user own enterprise inquiries - insert" ON public.enterprise_inquiries;
CREATE POLICY "user own enterprise inquiries - insert"
    ON public.enterprise_inquiries FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 관리자(sub_admins)는 전체 조회/수정 가능
-- 총괄관리자는 service role로 백엔드에서 처리
DROP POLICY IF EXISTS "sub admins can view all enterprise inquiries" ON public.enterprise_inquiries;
CREATE POLICY "sub admins can view all enterprise inquiries"
    ON public.enterprise_inquiries FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sub_admins sa
            WHERE sa.email = (SELECT email FROM auth.users WHERE id = auth.uid())
              AND sa.active = true
        )
    );

DROP POLICY IF EXISTS "sub admins can update enterprise inquiries" ON public.enterprise_inquiries;
CREATE POLICY "sub admins can update enterprise inquiries"
    ON public.enterprise_inquiries FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sub_admins sa
            WHERE sa.email = (SELECT email FROM auth.users WHERE id = auth.uid())
              AND sa.active = true
        )
    );
