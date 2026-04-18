import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
    serverExternalPackages: ['pdf-parse'],
    turbopack: {},
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
};

// Sentry 옵션 — 빌드 시 소스맵 업로드 + 런타임 옵션
// SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT 환경변수가 있어야 소스맵 업로드됨
// 없으면 빌드는 되지만 소스맵 없이 운영됨 (스택트레이스에 원본 코드 안 보임)
export default withSentryConfig(nextConfig, {
    // Sentry 조직/프로젝트
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // 빌드 로그 최소화
    silent: !process.env.CI,

    // 소스맵 업로드 (라이브 환경에서만)
    sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
    },

    // 클라이언트 번들 크기 축소 — 사용 안 하는 integration 제거
    widenClientFileUpload: true,

    // Sentry 터널 라우트 — 광고 차단기 우회 (ad-block이 sentry.io 차단 시)
    tunnelRoute: "/monitoring",

    // 로거 문구 제거 (프로덕션 번들 크기)
    disableLogger: true,

    // 자동 trace 생성 (Vercel에서만 활성)
    automaticVercelMonitors: true,
});
