'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { apiFetch } from '@/lib/api/client';
import type { PlanFeatures } from '@/types/subscription';

interface FeatureGateProps {
    feature: keyof PlanFeatures;
    title: string;
    description?: string;
    children: React.ReactNode;
    /** 접근 불가 시 표시 대신 이 경로로 리다이렉트 (마중물 업그레이드 페이지로 유도) */
    redirectTo?: string;
}

export default function FeatureGate({ feature, title, description, children, redirectTo }: FeatureGateProps) {
    const router = useRouter();
    const { isFeatureEnabled, plan, loading } = useSubscription();
    const [trialEligible, setTrialEligible] = useState(false);
    const [trialDays, setTrialDays] = useState(3);

    // 접근 불가 + 리다이렉트 지정 시 즉시 이동 (마중물 페이지)
    useEffect(() => {
        if (loading || !redirectTo) return;
        if (!isFeatureEnabled(feature)) {
            router.replace(redirectTo);
        }
    }, [loading, feature, redirectTo, isFeatureEnabled, router]);

    useEffect(() => {
        if (loading || plan.slug !== 'free') return;
        apiFetch<{ eligible: boolean; trialDays?: number }>('/api/billing/trial-eligibility?plan=basic')
            .then((d) => {
                setTrialEligible(!!d.eligible);
                if (d.trialDays) setTrialDays(d.trialDays);
            })
            .catch(() => setTrialEligible(false));
    }, [plan.slug, loading]);

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-12 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (isFeatureEnabled(feature)) {
        return <>{children}</>;
    }

    // 리다이렉트 모드: 이동 대기 중 로더 표시 (깜빡임 방지)
    if (redirectTo) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            {/* 잠금 게이트 — 회색 베이스 (잠금=비활성 시그널 1차). 업그레이드 권유는 CTA 버튼이 전달 */}
            <Card className="border border-gray-200 shadow-xl bg-gray-50">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Crown className="w-8 h-8 text-gray-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        {title}은 프로 플랜 전용 기능입니다
                    </CardTitle>
                    <CardDescription className="mt-3 text-base leading-relaxed">
                        현재 <span className="font-semibold text-foreground">{plan.display_name}</span> 플랜을 이용 중이세요.
                        {description ? (
                            <span className="block mt-2 text-sm">{description}</span>
                        ) : (
                            <span className="block mt-2 text-sm">
                                프로 또는 팀 프로 플랜으로 업그레이드하면 이 기능을 바로 사용할 수 있습니다.
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    {/* 3일 무료 체험 가능 시 먼저 홍보 — 트라이얼 배너 패턴(brand-50)과 일관 */}
                    {trialEligible && (
                        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-brand-600" />
                                <p className="font-semibold text-sm text-gray-900">
                                    먼저 베이직을 {trialDays}일 무료로 써보세요
                                </p>
                            </div>
                            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                                3일 무료 체험으로 주요 기능을 체험 후 필요 시 프로로 업그레이드할 수 있습니다.
                                {' '}체험 기간 해지 시 <strong>0원</strong>.
                            </p>
                            <Link href="/dashboard/subscribe?plan=basic">
                                <Button size="sm">
                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                    {trialDays}일 무료 체험 시작
                                </Button>
                            </Link>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/pricing" className="flex-1 sm:flex-initial">
                            <Button size="lg" className="shadow-md w-full sm:w-auto">
                                <Crown className="w-4 h-4 mr-2" />
                                프로 플랜으로 업그레이드
                            </Button>
                        </Link>
                        <Link href="/dashboard" className="flex-1 sm:flex-initial">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                대시보드로 돌아가기
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
