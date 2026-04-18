'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog } from '@/lib/analytics/posthog';
import { capturePageview } from '@/lib/analytics/events';

/**
 * PostHog 초기화 + App Router pageview 자동 캡처.
 * root layout에서 한 번만 마운트.
 */
export default function PostHogProvider() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 최초 1회 초기화
    useEffect(() => {
        initPostHog();
    }, []);

    // 경로 변경 시 pageview 기록
    useEffect(() => {
        if (!pathname) return;
        const qs = searchParams?.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        capturePageview(url);
    }, [pathname, searchParams]);

    return null;
}
