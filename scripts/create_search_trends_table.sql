-- 보험 검색 트렌드 저장 테이블
CREATE TABLE IF NOT EXISTS search_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    age_group TEXT NOT NULL,      -- '30대', '40대', '50대', '60대+'
    gender TEXT NOT NULL,          -- 'm', 'f'
    gender_label TEXT NOT NULL,    -- '남성', '여성'
    top_keywords JSONB NOT NULL DEFAULT '[]',  -- [{keyword, thisWeek, lastWeek, changeRate}]
    fetched_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_search_trends_date ON search_trends(date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_trends_unique ON search_trends(date, age_group, gender);

-- RLS
ALTER TABLE search_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON search_trends FOR ALL USING (true);
