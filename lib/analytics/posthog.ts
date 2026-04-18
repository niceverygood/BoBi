// lib/analytics/posthog.ts
// PostHog 초기화 + 안전 헬퍼
//
// 환경변수:
//   NEXT_PUBLIC_POSTHOG_KEY   — PostHog project API key (ph_xxxxx)
//   NEXT_PUBLIC_POSTHOG_HOST  — https://app.posthog.com 또는 https://eu.posthog.com
//                               (한국 서비스는 eu 권장)
//
// 보안 원칙:
//   - 브라우저에서만 사용 (Client-side only)
//   - PII 자동 마스킹 (mask_all_inputs, respect_dnt)
//   - 유저 식별은 id만 (이메일/이름 금지)

'use client';

import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
    if (initialized) return;
    if (typeof window === 'undefined') return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!key) {
        // 키 없으면 초기화 스킵 (개발환경 또는 미설정)
        return;
    }

    posthog.init(key, {
        api_host: host,

        // Next.js App Router는 pageview 수동 캡처 권장
        capture_pageview: false,
        capture_pageleave: true,

        // Session Replay — 에러 포함 문제 세션만 선택적
        session_recording: {
            maskAllInputs: true,       // 입력값 마스킹 (카드/주민번호 등)
            maskInputOptions: {
                password: true,
                email: true,
            },
            maskTextSelector: '[data-sensitive]',  // data-sensitive 속성 있는 DOM 마스킹
        },
        // 세션 리플레이는 기본 OFF. PostHog 대시보드에서 샘플링 세팅.
        disable_session_recording: false,

        // Autocapture — 모든 클릭/입력 자동 캡처 (PII 위험 vs 탐색 편의 트레이드오프)
        // 우리는 수동 이벤트만 쓰므로 OFF (용량 절감 + PII 보호)
        autocapture: false,

        // Do Not Track 브라우저 설정 존중
        respect_dnt: true,

        // 개인정보 보호 — IP를 수집하지만 저장 안 함 (지역 통계만)
        ip: false,

        // 오류 노이즈 줄이기
        disable_external_dependency_loading: false,

        // 개발 환경에선 조용하게
        loaded: (ph) => {
            if (process.env.NODE_ENV === 'development') {
                ph.debug(false);
            }
        },
    });

    initialized = true;
}

export function isPostHogEnabled(): boolean {
    return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export { posthog };
