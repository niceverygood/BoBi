-- ==========================================
-- 진료기록 누적 저장 테이블 (user_medical_records)
-- ==========================================
-- HIRA(심평원) 단건 조회는 정책상 1년치만 허용하므로, 5년치 데이터를 모으려면
-- 사용자가 1년 단위로 여러 번 인증해야 한다. 그 결과를 영구 누적 저장해
-- 다음 방문 시 누적된 데이터를 즉시 보여주고, 비어있는 1년 윈도우만 추가 인증하도록 한다.

CREATE TABLE IF NOT EXISTS user_medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 'medical': HIRA 내진료정보, 'car_insurance': 자동차보험 진료내역, 'medicine': 내가먹는약
    record_type TEXT NOT NULL CHECK (record_type IN ('medical', 'car_insurance', 'medicine')),

    -- 조회 기간 (YYYY-MM-DD). UI는 이걸로 "어느 1년 윈도우가 수집됐는지" 판단
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- HIRA가 반환한 records 배열 그대로 (전체 구조 보존 — 추후 포맷 변경 대응)
    records JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- 진료내역 record 개수 — UI에서 "이번 청크에 N건 추가됨" 안내에 활용
    record_count INTEGER NOT NULL DEFAULT 0,

    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 같은 user의 같은 record_type에 같은 period가 중복 INSERT 되지 않도록 멱등 보장
    UNIQUE(user_id, record_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_user_medical_records_user_type
    ON user_medical_records(user_id, record_type, period_end DESC);

-- RLS — 사용자는 본인 것만 조회 가능
ALTER TABLE user_medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own medical records" ON user_medical_records;
CREATE POLICY "Users can view own medical records"
    ON user_medical_records FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage medical records" ON user_medical_records;
CREATE POLICY "Service can manage medical records"
    ON user_medical_records FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE user_medical_records IS
    'HIRA/CODEF 인증 후 받은 진료기록을 1년 윈도우 단위로 누적 저장. ' ||
    '같은 사용자가 다른 1년 윈도우로 추가 인증 시 새 row INSERT, 같은 윈도우는 ON CONFLICT로 갱신.';
