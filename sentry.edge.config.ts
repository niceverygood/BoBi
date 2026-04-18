// sentry.edge.config.ts
// Edge runtime (middleware.ts 등)에서 Sentry 초기화
// Node API 제한이 있어 최소 구성만 사용

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
        sampleRate: 1.0,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

        ignoreErrors: [
            'JWT expired',
            'invalid JWT',
            'NEXT_REDIRECT',
            'NEXT_NOT_FOUND',
        ],
    });
}
