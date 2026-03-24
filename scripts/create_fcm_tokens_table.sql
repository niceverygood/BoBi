-- FCM 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, platform)
);

-- 토큰으로 빠른 조회
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
-- 유저별 조회
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자기 토큰만 insert/update
CREATE POLICY "Users can manage own tokens"
  ON fcm_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- service_role은 전체 접근 (서버에서 발송 시 토큰 조회용)
