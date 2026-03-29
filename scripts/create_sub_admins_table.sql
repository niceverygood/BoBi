-- scripts/create_sub_admins_table.sql
-- 중간관리자 테이블: 총괄관리자가 지정, 쿠폰 코드 발행/관리 권한만 가짐

CREATE TABLE IF NOT EXISTS sub_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,         -- 서비스 가입 이메일 (로그인용)
    kakao_id TEXT,                      -- 카톡 아이디 (표시용, 선택)
    name TEXT,                          -- 이름 (표시용, 선택)
    note TEXT DEFAULT '',               -- 메모
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sub_admins_email ON sub_admins(email);
CREATE INDEX IF NOT EXISTS idx_sub_admins_active ON sub_admins(active);

-- RLS
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 접근 허용 (API에서 권한 체크)
CREATE POLICY "Allow authenticated access to sub_admins" ON sub_admins
    FOR ALL USING (auth.role() = 'authenticated');
