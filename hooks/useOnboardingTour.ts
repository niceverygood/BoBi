'use client';

import { useCallback, useEffect, useState } from 'react';

const TOUR_VERSION = 'v1';
const STORAGE_KEY = `bobi_dashboard_tour_${TOUR_VERSION}`;

type TourState = 'completed' | 'skipped';

function readState(): TourState | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        return v === 'completed' || v === 'skipped' ? v : null;
    } catch {
        return null;
    }
}

function writeState(state: TourState) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, state);
    } catch { /* ignore */ }
}

interface UseOnboardingTourOptions {
    /** 자동 시작 조건. false면 수동 시작(도움말 버튼)만 허용 */
    autoStartEligible: boolean;
    /** 자동 시작 지연(ms). 데이터 렌더링 대기용 */
    autoStartDelayMs?: number;
}

export function useOnboardingTour({
    autoStartEligible,
    autoStartDelayMs = 800,
}: UseOnboardingTourOptions) {
    const [open, setOpen] = useState(false);

    // 자동 시작 — effect는 client에서만 실행되므로 별도 hydration 플래그 불필요
    useEffect(() => {
        if (!autoStartEligible) return;
        if (readState() !== null) return;

        const t = setTimeout(() => setOpen(true), autoStartDelayMs);
        return () => clearTimeout(t);
    }, [autoStartEligible, autoStartDelayMs]);

    const start = useCallback(() => setOpen(true), []);

    const close = useCallback((reason: TourState) => {
        writeState(reason);
        setOpen(false);
    }, []);

    return { open, start, close };
}
