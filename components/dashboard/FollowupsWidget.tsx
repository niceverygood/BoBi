'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, HeartPulse, Sparkles, Send, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { track, useFeatureFlag, trackExperimentExposure } from '@/lib/analytics/events';

// A/B 테스트 — PostHog에서 'followups_widget_copy' 실험 생성
// 변형:
//   control     — "팔로업 필요 고객" (기존)
//   urgent      — "⏰ 오늘 꼭 연락해야 할 고객" (긴급성 강조)
//   opportunity — "💡 전환 기회가 있는 고객" (기회 프레이밍)
type Variant = 'control' | 'urgent' | 'opportunity';

const COPY: Record<Variant, { title: string; subtitle: string }> = {
    control: {
        title: '팔로업 필요 고객',
        subtitle: '방치된 고객을 놓치지 마세요. 시간이 지날수록 전환이 어려워집니다.',
    },
    urgent: {
        title: '⏰ 오늘 꼭 연락해야 할 고객',
        subtitle: '지금 연락하지 않으면 다른 설계사에게 넘어갈 수 있습니다.',
    },
    opportunity: {
        title: '💡 전환 기회가 있는 고객',
        subtitle: '분석은 끝났지만 다음 단계로 안 넘어간 고객입니다. 지금이 마무리 타이밍.',
    },
};

type FollowupType = 'need_risk_report' | 'need_future_me' | 'need_send' | 'stale';

interface FollowupItem {
    customerId: string | null;
    customerName: string;
    analysisId: string;
    type: FollowupType;
    daysSince: number;
    actionLabel: string;
    actionHref: string;
    message: string;
}

const TYPE_CONFIG: Record<FollowupType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
    need_risk_report: { icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
    need_future_me: { icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50' },
    need_send: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
    stale: { icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
};

export default function FollowupsWidget() {
    const [items, setItems] = useState<FollowupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    // A/B 테스트 — followups_widget_copy (control / urgent / opportunity)
    const flagValue = useFeatureFlag('followups_widget_copy');
    const variant: Variant = (
        flagValue === 'urgent' || flagValue === 'opportunity' ? flagValue : 'control'
    ) as Variant;
    const copy = COPY[variant];

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch<{ followups: FollowupItem[] }>('/api/dashboard/followups');
                setItems(res.followups);
                // 위젯 노출 이벤트 (변형 기록 포함)
                track('dashboard_followup_shown', {
                    count: res.followups.length,
                    variant,
                });
                if (res.followups.length > 0) {
                    trackExperimentExposure('followups_widget_copy', variant);
                }
            } catch {
                // 조용히 실패
            } finally {
                setLoading(false);
            }
        })();
    }, [variant]);

    const handleItemClick = (item: FollowupItem) => {
        track('dashboard_followup_clicked', {
            type: item.type,
            daysSince: item.daysSince,
            variant,
        });
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
                            <Skeleton className="w-9 h-9 rounded-lg" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    // 팔로업 없음 → 긍정 메시지
    if (items.length === 0) {
        return (
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <CardContent className="p-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-emerald-900">모든 고객 관리 완료 ✨</p>
                        <p className="text-xs text-emerald-700 mt-0.5">팔로업 필요한 고객이 없습니다. 새 고객 분석을 시작해보세요.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const visibleItems = expanded ? items : items.slice(0, 3);

    return (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/40 to-transparent">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <div className="relative">
                            <Bell className="w-4 h-4 text-amber-600" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                        </div>
                        {copy.title}
                    </span>
                    <span className="text-xs font-normal text-amber-700">
                        {items.length}명 확인 필요
                    </span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground pt-1">
                    {copy.subtitle}
                </p>
            </CardHeader>
            <CardContent className="space-y-2">
                {visibleItems.map((item) => {
                    const cfg = TYPE_CONFIG[item.type];
                    const Icon = cfg.icon;
                    return (
                        <Link key={`${item.customerId}-${item.type}`} href={item.actionHref} onClick={() => handleItemClick(item)}>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group">
                                <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm truncate">{item.customerName}</p>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                            {item.daysSince}일
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {item.message}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs font-semibold text-amber-700 group-hover:text-amber-900">
                                        {item.actionLabel}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {items.length > 3 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full text-xs text-muted-foreground mt-1"
                    >
                        {expanded ? '접기' : `+ ${items.length - 3}명 더 보기`}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
