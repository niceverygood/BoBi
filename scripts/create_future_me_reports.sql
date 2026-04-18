-- 미래의 나 리포트 저장 테이블
-- 생성된 리포트를 보관하여 카카오톡 공유 / 재조회에 사용

CREATE TABLE IF NOT EXISTS public.future_me_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS future_me_reports_user_id_idx
    ON public.future_me_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS future_me_reports_customer_id_idx
    ON public.future_me_reports (customer_id);

-- RLS
ALTER TABLE public.future_me_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own future me reports - select" ON public.future_me_reports;
CREATE POLICY "own future me reports - select"
    ON public.future_me_reports FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own future me reports - insert" ON public.future_me_reports;
CREATE POLICY "own future me reports - insert"
    ON public.future_me_reports FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own future me reports - delete" ON public.future_me_reports;
CREATE POLICY "own future me reports - delete"
    ON public.future_me_reports FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
