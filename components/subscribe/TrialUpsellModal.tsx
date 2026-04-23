'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { apiFetch } from '@/lib/api/client';

const SHOWN_KEY = 'bobi:trial-upsell-modal-shown';

/**
 * 무료 유저가 분석 한도에 도달한 순간 자동으로 뜨는 "3일 무료 체험" 업셀 모달.
 * - 한도 도달 + 무료 유저 + 체험 자격 있음 + 처음 보는 경우에만 1회 노출
 * - localStorage에 "shown" 기록 → 재방문 시 중복 노출 방지
 * - analyze 페이지, dashboard 어디든 마운트되면 자동 판정
 */
export default function TrialUpsellModal() {
    const { plan, usage, canAnalyze, loading } = useSubscription();
    const [eligible, setEligible] = useState(false);
    const [trialDays, setTrialDays] = useState(3);
    const [open, setOpen] = useState(false);
    const [alreadyShown, setAlreadyShown] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        try {
            return !!localStorage.getItem(SHOWN_KEY);
        } catch {
            return false;
        }
    });

    // 무료 유저에 한해 체험 자격 체크
    useEffect(() => {
        if (loading || plan.slug !== 'free') return;
        let cancelled = false;
        apiFetch<{ eligible: boolean; trialDays?: number }>(
            '/api/billing/trial-eligibility?plan=basic',
        )
            .then((data) => {
                if (cancelled) return;
                setEligible(!!data.eligible);
                if (data.trialDays) setTrialDays(data.trialDays);
            })
            .catch(() => {
                if (!cancelled) setEligible(false);
            });
        return () => {
            cancelled = true;
        };
    }, [plan.slug, loading]);

    // 한도 도달 감지 → 모달 오픈
    useEffect(() => {
        if (loading) return;
        if (plan.slug !== 'free') return;
        if (!eligible) return;
        if (alreadyShown) return;

        // 한도 도달 = 플랜이 무제한이 아니고 canAnalyze가 false
        const limitReached = plan.max_analyses !== -1 && !canAnalyze;
        if (limitReached) {
            setOpen(true);
            try {
                localStorage.setItem(SHOWN_KEY, String(Date.now()));
            } catch {
                // ignore
            }
            setAlreadyShown(true);
            // PostHog 이벤트 (있다면)
            try {
                import('@/lib/analytics/events').then(({ track }) => {
                    track('trial_upsell_modal_shown', {
                        plan: plan.slug,
                        analyses_used: usage.analyses_used,
                    });
                }).catch(() => { });
            } catch {
                // ignore
            }
        }
    }, [loading, plan.slug, plan.max_analyses, canAnalyze, eligible, alreadyShown, usage.analyses_used]);

    if (!open) return null;

    const close = () => setOpen(false);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="무료 체험 안내"
        >
            <div
                className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 배경 장식 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-10 -translate-x-10 pointer-events-none" />

                <button
                    type="button"
                    onClick={close}
                    aria-label="닫기"
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative z-0 p-7 sm:p-8">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur mb-5 shadow-lg">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-2 leading-tight">
                        분석 한도에 도달하셨네요 🎉
                    </h2>
                    <p className="text-center text-white/90 mb-6 leading-relaxed">
                        이미 보비의 가치를 경험하신 당신을 위해<br />
                        <strong className="text-white">{trialDays}일 무료 체험</strong>을 준비했습니다.
                    </p>

                    <div className="rounded-xl bg-white/15 backdrop-blur p-4 mb-6 space-y-2.5">
                        {[
                            `${trialDays}일간 모든 분석 기능 무료 무제한`,
                            '결과 PDF 다운로드 · CODEF 자동 조회',
                            '체험 종료 전 해지 시 0원 청구',
                        ].map((txt) => (
                            <div key={txt} className="flex items-start gap-2 text-sm">
                                <Check className="w-5 h-5 shrink-0 text-green-300 mt-0.5" />
                                <span className="text-white/95 leading-snug">{txt}</span>
                            </div>
                        ))}
                    </div>

                    <Link href="/dashboard/subscribe?plan=basic" onClick={close}>
                        <Button
                            size="lg"
                            className="w-full bg-white text-violet-700 hover:bg-white/95 font-bold h-12 text-base shadow-lg"
                        >
                            지금 바로 무료로 시작하기 →
                        </Button>
                    </Link>

                    <p className="text-center text-[11px] text-white/70 mt-3 leading-relaxed">
                        신용카드 필요 · 언제든 1클릭 해지 · 체험 종료 1일 전 알림
                    </p>
                </div>
            </div>
        </div>
    );
}
