'use client';

// components/analytics/MetaPixel.tsx
//
// Meta Pixel 스크립트 + 라우트 변경 시 자동 PageView 발사.
// app/layout.tsx의 <body>에 한 번 마운트.
//
// 환경변수 NEXT_PUBLIC_FB_PIXEL_ID 가 비어있으면 컴포넌트 자체가 null —
// 픽셀 스크립트도, PageView도 발사되지 않음. (안전 가드)

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { FB_PIXEL_ID, trackPixel } from '@/lib/analytics/fb-pixel';

export default function MetaPixel() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 라우트 변경 시마다 PageView 발사 (Next.js App Router는 자동 PageView 없음)
    useEffect(() => {
        if (!FB_PIXEL_ID) return;
        trackPixel('PageView');
    }, [pathname, searchParams]);

    if (!FB_PIXEL_ID) return null;

    return (
        <>
            <Script
                id="meta-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${FB_PIXEL_ID}');
fbq('track', 'PageView');
                    `.trim(),
                }}
            />
            {/* noscript fallback — 브라우저가 JS 끈 경우 1×1 픽셀 이미지로라도 추적 */}
            <noscript>
                <img
                    height="1"
                    width="1"
                    style={{ display: 'none' }}
                    src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
                    alt=""
                />
            </noscript>
        </>
    );
}
