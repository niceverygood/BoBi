-- 1:1 고객 문의 테이블
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '일반',
    status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 문의 댓글 테이블
CREATE TABLE IF NOT EXISTS inquiry_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_comments_inquiry_id ON inquiry_comments(inquiry_id);

-- RLS (서비스 키로 접근하므로 기본 정책만)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_comments ENABLE ROW LEVEL SECURITY;

-- 서비스 키 사용 시 모든 접근 허용
CREATE POLICY "Service role full access" ON inquiries FOR ALL USING (true);
CREATE POLICY "Service role full access" ON inquiry_comments FOR ALL USING (true);
