-- ==========================================
-- AI 인사이트 캐시 테이블
-- 일/주 단위로 집계 + Claude 분석 결과를 저장
-- (period_type, period_start) 조합으로 멱등 — 같은 기간 재생성 시 덮어쓰기
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSONB NOT NULL,           -- 집계 결과 (가입/활성/전환/매출/이탈/에러 + 직전 기간 비교)
    insights JSONB NOT NULL,          -- Claude 분석 결과 (summary/key_findings/suspected_causes/recommended_actions)
    model TEXT,                       -- 사용한 모델 (claude-sonnet-4-6 등)
    input_tokens INT,
    output_tokens INT,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_period ON ai_insights(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated_at ON ai_insights(generated_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages ai_insights"
    ON ai_insights FOR ALL
    USING (true)
    WITH CHECK (true);
