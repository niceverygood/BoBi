'use client';

import { useEffect, useRef } from 'react';
import { track, type EventProperties } from '@/lib/analytics/events';

type FeatureName = 'medical' | 'health_checkup' | 'accident_receipt' | 'risk_report' | 'future_me';

/**
 * 특정 기능 페이지 진입을 1회만 기록.
 * 각 기능 페이지의 최상위에서 렌더하면 mount 시점에 feature_used 이벤트 발화.
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
    }, [feature, extra]);
    return null;
}
