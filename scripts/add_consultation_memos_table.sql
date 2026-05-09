-- scripts/add_consultation_memos_table.sql
--
-- 통화·미팅 음성 메모 + AI 요약·액션 추출 결과 저장.
-- 흐름: 음성 업로드 → Whisper STT → Claude 요약 → 이 테이블 INSERT.
--
-- 사용 사례 (이종인 영업이사 패턴):
--   1. 미팅 끝나고 차에서 1분 음성 메모
--   2. 보비 앱이 자동으로:
--      - 전사(transcript) 저장
--      - 요약(summary) 1~2 문장
--      - 다음 액션(next_actions) JSON 배열
--      - 키워드 태그(tags)
--      - 감정(sentiment)
--   3. 고객 카드에 즉시 표시
--
-- ⚠️ 통신비밀보호법 준수:
--   - 통화 녹음은 양 당사자 동의 필수
--   - 보비는 메모 작성 도구이며, 동의 없는 통화 녹음 보관은 사용자 책임
--   - 고객에게 "통화 내용 요약 기록" 사전 고지 권장

CREATE TABLE IF NOT EXISTS consultation_memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 원본 음성·전사
    audio_path TEXT,                -- Supabase Storage 경로 (consultations/{user_id}/{id}.mp3)
    audio_duration_seconds INT,     -- 음성 길이
    transcript TEXT,                -- Whisper 전사 결과 (전체 텍스트)
    transcript_language TEXT,       -- 'ko' | 'en' (Whisper 자동 감지)

    -- AI 분석 결과 (Claude)
    summary TEXT NOT NULL,          -- 통화 요약 (1~3 문장)
    next_actions JSONB,             -- 다음 액션 배열: [{action, due_date?, priority?}]
    tags TEXT[],                    -- 키워드 태그: ['암보험관심', '갱신문의']
    sentiment TEXT,                 -- 'positive' | 'neutral' | 'negative' | 'mixed'

    -- 메타
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 실제 통화·미팅 시점 (사용자 입력 가능)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_memos_customer
    ON consultation_memos(customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_memos_user
    ON consultation_memos(user_id, occurred_at DESC);

-- RLS
ALTER TABLE consultation_memos ENABLE ROW LEVEL SECURITY;

-- 본인 메모만 조회·수정·삭제
CREATE POLICY "Users can read own consultation_memos"
    ON consultation_memos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultation_memos"
    ON consultation_memos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultation_memos"
    ON consultation_memos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consultation_memos"
    ON consultation_memos FOR DELETE
    USING (auth.uid() = user_id);

-- service_role 전체 (cron·관리자 작업용)
CREATE POLICY "Service role full access to consultation_memos"
    ON consultation_memos FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- updated_at 자동 갱신 트리거 (간단 버전)
CREATE OR REPLACE FUNCTION update_consultation_memos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultation_memos_updated_at ON consultation_memos;
CREATE TRIGGER trg_consultation_memos_updated_at
    BEFORE UPDATE ON consultation_memos
    FOR EACH ROW EXECUTE FUNCTION update_consultation_memos_updated_at();

-- Storage 버킷 (음성 파일 임시 보관)
-- ※ Supabase Dashboard → Storage → 'consultations' 버킷 생성 (private)
-- ※ 1주일 후 자동 삭제 cron은 별도 작업 (선택)

COMMENT ON TABLE consultation_memos IS
    '고객 상담 음성 메모 + AI 요약. 통화 녹음은 사용자가 양 당사자 동의 후 업로드.';
