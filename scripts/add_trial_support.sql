-- 베이직 플랜 7일 무료 체험 지원
--
-- 변경 사항:
--   1. subscriptions 테이블: trial_ends_at, trial_used 컬럼 + 'trialing' status 허용
--   2. trial_history 테이블: 한 유저의 플랜별 체험 이력 (중복 방지)
--   3. tosspayments_pending_billing: intent 컬럼 추가 ('normal' | 'trial')
--   4. RLS 정책 유지

BEGIN;

-- ── 1) subscriptions 확장 ────────────────────────────────────────
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
    ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- status 제약 확장 (기존: active, cancelled, past_due → trialing 추가)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'subscriptions_status_check'
    ) THEN
        ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
    END IF;
END $$;

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'trialing', 'cancelled', 'past_due'));

-- 인덱스 (cron이 만료 트라이얼을 빠르게 찾도록)
CREATE INDEX IF NOT EXISTS subscriptions_trial_ends_at_idx
    ON public.subscriptions (trial_ends_at)
    WHERE status = 'trialing';

-- ── 2) trial_history (한 유저/플랜 조합당 1회 체험) ─────────────
CREATE TABLE IF NOT EXISTS public.trial_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_slug text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    converted boolean NOT NULL DEFAULT false,   -- 유료 전환 여부
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    UNIQUE (user_id, plan_slug)
);

CREATE INDEX IF NOT EXISTS trial_history_user_id_idx ON public.trial_history (user_id);

ALTER TABLE public.trial_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_history_select_own" ON public.trial_history;
CREATE POLICY "trial_history_select_own"
    ON public.trial_history FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 서비스 키만 insert/update (일반 사용자 차단)
DROP POLICY IF EXISTS "trial_history_service_write" ON public.trial_history;
CREATE POLICY "trial_history_service_write"
    ON public.trial_history FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ── 3) tosspayments_pending_billing 확장 ────────────────────────
ALTER TABLE public.tosspayments_pending_billing
    ADD COLUMN IF NOT EXISTS intent text NOT NULL DEFAULT 'normal'
    CHECK (intent IN ('normal', 'trial'));

COMMIT;

-- 적용 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name IN ('trial_ends_at', 'trial_used');

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tosspayments_pending_billing' AND column_name = 'intent';

SELECT COUNT(*) AS trial_history_exists FROM public.trial_history;
