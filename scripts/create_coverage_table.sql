-- Supabase SQL: coverage_analyses 테이블 생성
-- Dashboard > SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS coverage_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_birth TEXT,
    customer_gender TEXT,
    policy_count INTEGER DEFAULT 0,
    input_data JSONB NOT NULL,
    result_data JSONB NOT NULL,
    overall_score INTEGER,
    overall_grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE coverage_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coverage analyses"
    ON coverage_analyses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coverage analyses"
    ON coverage_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coverage analyses"
    ON coverage_analyses FOR UPDATE
    USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_coverage_analyses_user_id ON coverage_analyses(user_id);
CREATE INDEX idx_coverage_analyses_created_at ON coverage_analyses(created_at DESC);
