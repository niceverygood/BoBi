'use client';

import {
    useEffect,
    useLayoutEffect,
    useState,
    useCallback,
    useRef,
    useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { posthog, isPostHogEnabled } from '@/lib/analytics/posthog';

export type TourStep = {
    id: string;
    title: string;
    description: string;
    target?: string;
    placement?: 'top' | 'bottom' | 'center';
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 12;

function getTargetRect(selector: string): Rect | null {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function track(event: string, props?: Record<string, unknown>) {
    if (isPostHogEnabled()) {
        try { posthog.capture(event, props); } catch { /* ignore */ }
    }
}

const emptySubscribe = () => () => {};

function subscribeWindow(callback: () => void) {
    window.addEventListener('resize', callback);
    window.addEventListener('scroll', callback, true);
    return () => {
        window.removeEventListener('resize', callback);
        window.removeEventListener('scroll', callback, true);
    };
}

interface OnboardingTourProps {
    steps: TourStep[];
    open: boolean;
    onClose: (reason: 'completed' | 'skipped') => void;
}

export default function OnboardingTour({ steps, open, onClose }: OnboardingTourProps) {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    // viewport 크기를 외부 스토어로 구독 — resize/scroll 시 자동 갱신
    const viewportKey = useSyncExternalStore(
        subscribeWindow,
        () => `${window.innerWidth},${window.innerHeight}`,
        () => '0,0',
    );
    const [vwStr, vhStr] = viewportKey.split(',');
    const viewport = { w: Number(vwStr), h: Number(vhStr) };

    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<Rect | null>(null);
    const shownStepsRef = useRef<Set<string>>(new Set());

    const step = steps[stepIndex];
    const isCenter = !step?.target || step.placement === 'center';

    // 스텝 변경 시 타깃으로 스크롤 후 rect 측정 (setTimeout 콜백에서 setState — effect body 아님)
    useLayoutEffect(() => {
        if (!open || !step || isCenter) return;

        const el = document.querySelector(step.target!) as HTMLElement | null;
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const t = setTimeout(() => {
            setRect(getTargetRect(step.target!));
        }, 350);

        return () => clearTimeout(t);
    }, [open, step, isCenter]);

    // 스크롤/리사이즈 시 rect 업데이트 (event callback에서 setState)
    useEffect(() => {
        if (!open || !step || isCenter) return;
        const update = () => setRect(getTargetRect(step.target!));
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, step, isCenter]);

    // 스텝 노출 analytics
    useEffect(() => {
        if (!open || !step) return;
        if (!shownStepsRef.current.has(step.id)) {
            shownStepsRef.current.add(step.id);
            track('onboarding_tour_step_shown', { step_id: step.id, step_index: stepIndex });
        }
    }, [open, step, stepIndex]);

    const handleNext = useCallback(() => {
        if (stepIndex >= steps.length - 1) {
            track('onboarding_tour_completed', { total_steps: steps.length });
            onClose('completed');
            return;
        }
        setStepIndex((i) => i + 1);
    }, [stepIndex, steps.length, onClose]);

    const handlePrev = useCallback(() => {
        if (stepIndex === 0) return;
        setStepIndex((i) => i - 1);
    }, [stepIndex]);

    const handleSkip = useCallback(() => {
        track('onboarding_tour_skipped', { step_id: step?.id, step_index: stepIndex });
        onClose('skipped');
    }, [step, stepIndex, onClose]);

    // 키보드 네비게이션
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleSkip();
            else if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
            else if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, handleNext, handlePrev, handleSkip]);

    // 투어 활성화 시 body 스크롤 잠금
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    if (!isClient || !open || !step) return null;

    // 툴팁 위치 계산
    let tooltipStyle: React.CSSProperties;
    const effectiveRect = isCenter ? null : rect;
    if (!effectiveRect) {
        tooltipStyle = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: Math.min(TOOLTIP_WIDTH, viewport.w - 32),
        };
    } else {
        const spaceBelow = viewport.h - (effectiveRect.top + effectiveRect.height);
        const placeBelow = step.placement === 'bottom' || (step.placement !== 'top' && spaceBelow > 220);
        const top = placeBelow
            ? effectiveRect.top + effectiveRect.height + TOOLTIP_GAP + PADDING
            : effectiveRect.top - TOOLTIP_GAP - PADDING;
        let left = effectiveRect.left + effectiveRect.width / 2 - TOOLTIP_WIDTH / 2;
        left = Math.max(16, Math.min(left, viewport.w - TOOLTIP_WIDTH - 16));
        tooltipStyle = {
            position: 'fixed',
            top: placeBelow ? top : undefined,
            bottom: placeBelow ? undefined : viewport.h - top,
            left,
            width: Math.min(TOOLTIP_WIDTH, viewport.w - 32),
        };
    }

    const cutout = effectiveRect
        ? {
            top: effectiveRect.top - PADDING,
            left: effectiveRect.left - PADDING,
            width: effectiveRect.width + PADDING * 2,
            height: effectiveRect.height + PADDING * 2,
        }
        : null;

    const progress = ((stepIndex + 1) / steps.length) * 100;

    return createPortal(
        <div
            aria-live="polite"
            role="dialog"
            aria-modal="true"
            aria-label="보비 사용법 가이드"
            className="fixed inset-0 z-[100]"
        >
            {/* SVG 오버레이 + 타깃 하이라이트 컷아웃 */}
            <svg
                className="fixed inset-0 w-full h-full pointer-events-auto"
                onClick={handleSkip}
            >
                <defs>
                    <mask id="tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {cutout && (
                            <rect
                                x={cutout.left}
                                y={cutout.top}
                                width={cutout.width}
                                height={cutout.height}
                                rx="12"
                                ry="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(15, 23, 42, 0.65)"
                    mask="url(#tour-mask)"
                />
                {cutout && (
                    <rect
                        x={cutout.left}
                        y={cutout.top}
                        width={cutout.width}
                        height={cutout.height}
                        rx="12"
                        ry="12"
                        fill="none"
                        stroke="#1a56db"
                        strokeWidth="2"
                        className="pointer-events-none"
                    />
                )}
            </svg>

            {/* 툴팁 카드 */}
            <div
                style={tooltipStyle}
                className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 진행 바 */}
                <div className="h-1 bg-slate-100">
                    <div
                        className="h-full bg-[#1a56db] transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#1a56db]/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-[#1a56db]" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">
                                {stepIndex + 1} / {steps.length}
                            </span>
                        </div>
                        <button
                            onClick={handleSkip}
                            aria-label="가이드 닫기"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <h3 className="font-bold text-base leading-snug">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line">
                        {step.description}
                    </p>

                    <div className="flex items-center justify-between mt-4 gap-2">
                        <button
                            onClick={handleSkip}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            건너뛰기
                        </button>
                        <div className="flex items-center gap-2">
                            {stepIndex > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrev}
                                    className="text-xs"
                                >
                                    <ArrowLeft className="w-3 h-3 mr-1" />
                                    이전
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleNext}
                                className="text-xs bg-[#1a56db] hover:bg-[#1a56db]/90"
                            >
                                {stepIndex === steps.length - 1 ? '시작하기' : '다음'}
                                {stepIndex < steps.length - 1 && <ArrowRight className="w-3 h-3 ml-1" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
