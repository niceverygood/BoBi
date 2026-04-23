-- scripts/add_intent_to_kakaopay_sessions.sql
-- 카카오페이 체험 플로우 지원을 위한 컬럼 추가.
--
-- 'trial'이면 ready 단계에서 100원 mini 결제로 SID만 발급받고
-- approve 단계에서 즉시 환불 + status='trialing' 구독을 생성한다.
--
-- 적용 전 Supabase SQL Editor에서 실행하세요. 멱등성 보장.

ALTER TABLE public.kakaopay_sessions
    ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'subscribe'
        CHECK (intent IN ('subscribe', 'trial'));

-- 기존 레코드는 subscribe로 간주 (DEFAULT 적용)
UPDATE public.kakaopay_sessions SET intent = 'subscribe' WHERE intent IS NULL;

-- 확인
-- SELECT intent, COUNT(*) FROM public.kakaopay_sessions GROUP BY intent;
