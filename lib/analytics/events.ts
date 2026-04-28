// lib/analytics/events.ts
// PostHog 이벤트 트래킹 + Feature Flag 헬퍼
//
// 사용 예:
//   track('dashboard_followup_clicked', { type, daysSince });
//   const variant = useFeatureFlag('followups_widget_copy') ?? 'control';

'use client';

import { posthog, isPostHogEnabled } from './posthog';
import { useEffect, useState } from 'react';

// ────────────────────────────────────────────────
// 이벤트 타입 — 오타 방지를 위해 정의된 이름만 사용
// ────────────────────────────────────────────────
export type EventName =
    // 인증
    | 'user_signup'
    | 'user_login'
    | 'user_logout'
    // 분석
    | 'analysis_started'
    | 'analysis_completed'
    | 'analysis_failed'
    | 'analysis_limit_reached'          // 무료 한도 소진 — 결제 윈도우
    // 리포트
    | 'risk_report_generated'
    | 'future_me_generated'
    | 'future_me_pdf_downloaded'
    | 'future_me_shared_kakao'
    // 기능 사용 (설계사 journey 퍼널)
    | 'feature_used'                    // props.feature: medical|health|receipt|future|risk_report
    // 대시보드 / 리텐션 (A/B 테스트 대상)
    | 'dashboard_viewed'
    | 'dashboard_followup_shown'       // 팔로업 위젯 노출
    | 'dashboard_followup_clicked'     // 팔로업 클릭
    | 'dashboard_kpi_viewed'
    // 튜토리얼 (간접 체험 → 결제 전환)
    | 'tutorial_viewed'
    | 'tutorial_step_shown'            // props.step_id, props.step_index
    | 'tutorial_completed'
    | 'tutorial_cta_clicked'           // 튜토리얼 → 실제 분석 CTA 클릭
    // 결제
    | 'subscribe_page_viewed'
    | 'subscribe_plan_selected'        // props.plan_slug
    | 'subscribe_method_selected'      // props.method
    | 'checkout_started'               // 결제 버튼 클릭 (PG 호출 직전)
    | 'checkout_completed'
    | 'checkout_failed'
    | 'coupon_applied'
    | 'trial_upsell_modal_shown'
    | 'trial_started'
    | 'trial_converted'
    // 엔터프라이즈
    | 'enterprise_inquiry_submitted';

export interface EventProperties {
    [key: string]: string | number | boolean | null | undefined;
}

/** 이벤트 전송 — PostHog 미설치 환경에선 no-op */
export function track(event: EventName, props?: EventProperties) {
    if (!isPostHogEnabled()) return;
    try {
        posthog.capture(event, props);
    } catch {
        // 조용히 실패 (분석 도구가 앱 작동을 막으면 안 됨)
    }
}

/** 사용자 식별 — 로그인 시 호출. id만 사용, 이메일/이름 금지 */
export function identifyUser(userId: string, traits?: EventProperties) {
    if (!isPostHogEnabled()) return;
    try {
        posthog.identify(userId, traits);
    } catch { /* ignore */ }
}

/** 로그아웃 시 세션 리셋 */
export function resetUser() {
    if (!isPostHogEnabled()) return;
    try {
        posthog.reset();
    } catch { /* ignore */ }
}

/** 페이지뷰 수동 캡처 — Next.js App Router 용 */
export function capturePageview(url: string) {
    if (!isPostHogEnabled()) return;
    try {
        posthog.capture('$pageview', { $current_url: url });
    } catch { /* ignore */ }
}

// ────────────────────────────────────────────────
// Feature Flags (A/B 테스트)
// ────────────────────────────────────────────────

/**
 * 특정 Feature Flag 값을 가져오는 React 훅.
 *
 * @example
 *   // PostHog에서 "followups_widget_copy" 실험 만들고
 *   // control / variant_a / variant_b 정의
 *   const variant = useFeatureFlag('followups_widget_copy') ?? 'control';
 *
 *   {variant === 'variant_a' ? '오늘 꼭 연락하세요!' : '팔로업 필요 고객'}
 */
export function useFeatureFlag(flagKey: string): string | boolean | undefined {
    const [value, setValue] = useState<string | boolean | undefined>(undefined);

    useEffect(() => {
        if (!isPostHogEnabled()) return;

        // 이미 로드된 flag가 있으면 즉시 반영
        const initial = posthog.getFeatureFlag(flagKey);
        if (initial !== undefined) setValue(initial);

        // 플래그 로드 이벤트 리스너
        const listener = posthog.onFeatureFlags(() => {
            const v = posthog.getFeatureFlag(flagKey);
            setValue(v);
        });

        return () => {
            // listener는 함수형으로 해제 (posthog-js v1 기준)
            if (typeof listener === 'function') listener();
        };
    }, [flagKey]);

    return value;
}

/**
 * 특정 변형 노출 이벤트 — A/B 테스트 참여 기록.
 * useFeatureFlag로 분기하기 전/후에 호출하면 PostHog 실험 결과에 참여자로 집계됨.
 */
export function trackExperimentExposure(experimentKey: string, variant: string) {
    if (!isPostHogEnabled()) return;
    try {
        posthog.capture('$feature_flag_called', {
            $feature_flag: experimentKey,
            $feature_flag_response: variant,
        });
    } catch { /* ignore */ }
}
