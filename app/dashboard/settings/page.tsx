'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Building, Crown, CheckCircle2, X, Loader2, Sparkles, Zap } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PLAN_BADGE_COLORS: Record<PlanSlug, string> = {
    free: 'bg-slate-100 text-slate-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-violet-100 text-violet-700',
    team: 'bg-amber-100 text-amber-700',
};

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const { plan, usage, loading, remainingAnalyses } = useSubscription();
    const currentSlug = (plan.slug || 'free') as PlanSlug;

    const usagePercent = plan.max_analyses === -1
        ? 0
        : Math.min(100, Math.round((usage.analyses_used / usage.analyses_limit) * 100));

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">설정</h1>
                <p className="text-muted-foreground mt-1">프로필 및 플랜 관리</p>
            </div>

            {/* Profile */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        프로필 정보
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="이름을 입력하세요"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">
                                <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    소속
                                </div>
                            </Label>
                            <Input
                                id="company"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="소속 GA/보험사"
                            />
                        </div>
                    </div>
                    <Button className="bg-gradient-primary hover:opacity-90">
                        저장
                    </Button>
                </CardContent>
            </Card>

            {/* Current Plan & Usage */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-primary" />
                        현재 플랜
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Badge className={cn('text-xs', PLAN_BADGE_COLORS[currentSlug])}>
                                    {plan.display_name}
                                </Badge>
                                <span className="text-sm">
                                    {plan.price_monthly > 0
                                        ? `${plan.price_monthly.toLocaleString()}원/월`
                                        : currentSlug === 'team' ? '별도 협의' : '무료'}
                                </span>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Usage Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">이번 달 사용량</span>
                            <span className="font-medium">
                                {usage.analyses_used}건 / {plan.max_analyses === -1 ? '무제한' : `${usage.analyses_limit}건`}
                            </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    usagePercent >= 90 ? 'bg-red-500' :
                                        usagePercent >= 70 ? 'bg-amber-500' :
                                            'bg-gradient-to-r from-blue-500 to-primary'
                                )}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        {remainingAnalyses !== -1 && remainingAnalyses <= 5 && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                남은 분석 {remainingAnalyses}건 — 업그레이드하면 더 많이 분석할 수 있어요
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Plan Cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(Object.entries(PLAN_LIMITS) as [PlanSlug, typeof PLAN_LIMITS[PlanSlug]][]).map(([key, planInfo]) => (
                            <div
                                key={key}
                                className={cn(
                                    'rounded-xl border p-4 transition-all',
                                    key === currentSlug
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'hover:border-primary/30'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-sm">{planInfo.name}</h3>
                                    {key === currentSlug && (
                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">현재</Badge>
                                    )}
                                </div>
                                <p className="text-lg font-bold mb-0.5">{planInfo.price}</p>
                                <p className="text-[11px] text-muted-foreground mb-3">
                                    월 {planInfo.analysisLimit === -1 ? '무제한' : `${planInfo.analysisLimit}건`}
                                </p>
                                <ul className="space-y-1 mb-3">
                                    {planInfo.features.slice(0, 3).map((f) => (
                                        <li key={f} className="text-[11px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                    {planInfo.lockedFeatures.slice(0, 1).map((f) => (
                                        <li key={f} className="text-[11px] flex items-center gap-1 text-muted-foreground/50">
                                            <X className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                {key !== currentSlug && (
                                    <Link href="/pricing">
                                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                            {key === 'team' ? '문의하기' : '자세히 보기'}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Danger Zone */}
            <Card className="border-0 shadow-sm border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-lg text-destructive">위험 구역</CardTitle>
                    <CardDescription>아래 작업은 되돌릴 수 없습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" size="sm">
                        계정 삭제
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
