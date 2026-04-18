// instrumentation.ts
// Next.js 13+ 공식 권장 — 서버 초기화 진입점
// Sentry Node/Edge 환경을 runtime별로 로드

export async function register() {
    // 서버 (Node.js runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }
    // Edge runtime (middleware.ts 등)
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

// Next.js 15+ onRequestError hook — 자동 에러 캡처
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
export async function onRequestError(
    err: unknown,
    request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
    context: { routerKind: string; routePath: string; routeType: string },
) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(err, request, context);
}
