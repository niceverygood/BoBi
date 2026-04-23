'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'bobi_ref_code';

/**
 * 랜딩/가입 페이지에서 ?ref=XXX 쿼리를 읽어 sessionStorage에 저장.
 * 동일 탭 내에서 OAuth 리다이렉트 거쳐도 유지됨.
 *
 * 또한 로그인된 상태라면 저장된 코드를 즉시 /api/referral/apply로 시도.
 * (신규 가입 직후 대시보드 진입 시 처리하는 용도)
 */
export default function ReferralCapture() {
    const searchParams = useSearchParams();

    // 1) URL ?ref=XXX 감지 → sessionStorage 저장
    useEffect(() => {
        const ref = searchParams?.get('ref');
        if (!ref) return;
        const normalized = ref.trim().toUpperCase();
        if (!/^[A-Z0-9]{6,10}$/.test(normalized)) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, normalized);
        } catch {
            // private mode 등 저장 실패 무시
        }
    }, [searchParams]);

    // 2) 로그인된 상태에서 저장된 코드가 있으면 apply 시도
    useEffect(() => {
        let aborted = false;
        (async () => {
            try {
                const code = sessionStorage.getItem(STORAGE_KEY);
                if (!code) return;

                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || aborted) return;

                const res = await fetch('/api/referral/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });

                // 적용 성공·무효·이미 적용됨 모두 저장 코드는 정리
                if (res.ok || res.status === 400) {
                    sessionStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                // 실패해도 사용자 흐름은 막지 않음
            }
        })();
        return () => {
            aborted = true;
        };
    }, []);

    return null;
}
