'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { apiFetch } from '@/lib/api/client';

const DISMISS_KEY = 'bobi:trial-banner-dismissed';

function readDismissed(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const until = Number(raw);
        return Number.isFinite(until) && until > Date.now();
    } catch {
        return false;
    }
}

type EligibilityState = { checked: boolean; eligible: boolean; trialDays: number };

/**
 * 무료 유저에게 "베이직 3일 무료 체험" 을 CTA로 홍보하는 배너.
 * - 현재 플랜이 free이고, 베이직 체험 자격이 있을 때만 표시
 * - X 버튼으로 닫으면 24시간 동안 숨김 (localStorage)
 */
export default function TrialPromoBanner() {
    const { plan, loading } = useSubscription();
    const [dismissed, setDismissed] = useState<boolean>(readDismissed);
    const [eligibility, setEligibility] = useState<EligibilityState>({
        checked: false,
        eligible: false,
        trialDays: 3,
    });

    useEffect(() => {
        if (loading) return;
        if (plan.slug !== 'free') {
            return; // 비무료 유저는 호출 안 함 (기본값 그대로 — checked=false가 되어 null 렌더)
        }
        let cancelled = false;
        apiFetch<{ eligible: boolean; trialDays?: number }>(
            '/api/billing/trial-eligibility?plan=basic',
        )
            .then((data) => {
                if (cancelled) return;
                setEligibility({
                    checked: true,
                    eligible: !!data.eligible,
                    trialDays: data.trialDays ?? 3,
                });
            })
            .catch(() => {
                if (cancelled) return;
                setEligibility({ checked: true, eligible: false, trialDays: 7 });
            });
        return () => {
            cancelled = true;
        };
    }, [plan.slug, loading]);

    const handleDismiss = () => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
        } catch {
            // ignore
        }
        setDismissed(true);
    };

    if (loading || dismissed || plan.slug !== 'free') return null;
    if (!eligibility.checked || !eligibility.eligible) return null;

    const { trialDays } = eligibility;

    return (
        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-600 text-white relative overflow-hidden animate-fade-in">
            {/* 배경 장식 */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-10 -translate-x-10 pointer-events-none" />

            <button
                type="button"
                onClick={handleDismiss}
                aria-label="배너 닫기"
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-white/10 transition-colors z-10"
            >
                <X className="w-4 h-4" />
            </button>

            <CardContent className="p-5 sm:p-6 relative z-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-lg sm:text-xl">베이직 플랜 {trialDays}일 무료 체험</h3>
                            <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold">첫 이용자 한정</span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed">
                            카드 등록 후 {trialDays}일간 모든 기능 무료. 체험 전 해지 시 <strong>0원</strong>.
                        </p>
                    </div>
                    <Link href="/dashboard/subscribe?plan=basic" className="shrink-0 w-full sm:w-auto">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto bg-white text-violet-700 hover:bg-white/90 font-bold shadow-md"
                        >
                            지금 시작하기
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
