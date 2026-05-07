'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initMetaPixel, trackMetaPixelPageView } from '@/lib/analytics/meta-pixel';

/**
 * Meta Pixel 초기화 + App Router pageview 자동 캡처.
 * root layout에서 한 번만 마운트.
 *
 * PostHogProvider와 동일 패턴:
 *   - 최초 1회 init
 *   - 경로 변경 시 PageView 발송
 *
 * 차이:
 *   - Meta Pixel 표준 PageView는 파라미터 없음 (URL은 fbq가 자동 수집)
 *   - 가입·결제 등 핵심 이벤트는 각 페이지에서 trackMetaPixel(...) 직접 호출
 */
export default function MetaPixelProvider() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 최초 1회 초기화
    useEffect(() => {
        initMetaPixel();
    }, []);

    // 경로 변경 시 PageView 발송
    useEffect(() => {
        if (!pathname) return;
        // searchParams는 의존성으로만 활용 (Pixel은 자동으로 현재 URL을 수집)
        trackMetaPixelPageView();
    }, [pathname, searchParams]);

    return null;
}
