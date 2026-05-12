'use client';

import { useEffect, useRef } from 'react';
import { track, type EventProperties } from '@/lib/analytics/events';
import { trackConversion } from '@/lib/analytics/fb-pixel';

type FeatureName = 'medical' | 'health_checkup' | 'accident_receipt' | 'risk_report' | 'future_me';

// Lead 이벤트로 보낼 핵심 기능 (구매 의향 강한 신호 = 광고 ROI 측정에 의미)
const LEAD_FEATURES: ReadonlyArray<FeatureName> = ['medical', 'health_checkup', 'accident_receipt'];

/**
 * 특정 기능 페이지 진입을 1회만 기록.
 * 각 기능 페이지의 최상위에서 렌더하면 mount 시점에 feature_used 이벤트 발화.
 *
 * 추가: 핵심 기능(LEAD_FEATURES)은 Meta Pixel + CAPI로 Lead 전환 이벤트도 발사.
 * 광고 클릭 → 진료조회/건강검진/사고접수 시도까지 가면 구매 의향 ↑ 신호.
 */
export default function TrackFeatureUse({
    feature,
    extra,
}: {
    feature: FeatureName;
    extra?: EventProperties;
}) {
    const firedRef = useRef(false);
    useEffect(() => {
        if (firedRef.current) return;
        firedRef.current = true;
        track('feature_used', { feature, ...extra });
        if (LEAD_FEATURES.includes(feature)) {
            void trackConversion('Lead', {
                eventId: `lead-${feature}-${Date.now()}`,
                feature,
                ...(extra || {}),
            });
        }
    }, [feature, extra]);
    return null;
}
