'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft, User, FileSearch, CreditCard, Activity, AlertCircle,
    CheckCircle2, Clock, TrendingUp, Building2, Mail, Phone, Calendar,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

type FunnelStage =
    | 'signed_up'
    | 'uploaded'
    | 'analyzed'
    | 'limit_reached'
    | 'viewed_subscribe'
    | 'trial_started'
    | 'subscribed'
    | 'churned';

interface ActivityResponse {
    profile: {
        id: string;
        email: string;
        phone: string;
        name: string;
        company: string;
        suspended: boolean;
        suspended_reason: string;
        created_at: string;
        last_sign_in_at: string | null;
    };
    subscription: {
        plan_slug: string | null;
        plan_name: string | null;
        status: string;
        payment_method: string | null;
        started_at: string | null;
        current_period_end: string | null;
    } | null;
    usage: {
        period_start: string;
        analyses_used: number;
        analyses_limit: number;
    };
    analyses: {
        total_count: number;
        recent: Array<{
            id: string;
            status: string;
            created_at: string;
            overall_summary: string | null;
            has_medical_history: boolean;
            has_product_eligibility: boolean;
            has_claim_assessment: boolean;
            has_risk_report: boolean;
        }>;
    };
    uploads: { total_count: number };
    payments: {
        total_count: number;
        recent: Array<{
            id: string;
            amount: number;
            status: string;
            payment_method: string | null;
            created_at: string;
            cancelled_at: string | null;
        }>;
    };
    logs: {
        recent: Array<{
            id: string;
            area: string;
            level: string;
            event: string;
            message: string;
            created_at: string;
            metadata: Record<string, unknown> | null;
        }>;
    };
    funnel: {
        stage: FunnelStage;
        last_activity_at: string | null;
    };
}

const STAGE_LABELS: Record<FunnelStage, { label: string; color: string; description: string }> = {
    signed_up: {
        label: '가입만',
        color: 'bg-slate-100 text-slate-700',
        description: '가입은 했지만 아직 아무 행동 없음',
    },
    uploaded: {
        label: '업로드',
        color: 'bg-blue-50 text-blue-700',
        description: 'PDF 업로드는 했지만 분석은 시작 안 함',
    },
    analyzed: {
        label: '분석 진행',
        color: 'bg-violet-50 text-violet-700',
        description: '분석을 1건 이상 완료. 활성 무료 유저',
    },
    limit_reached: {
        label: '한도 도달',
        color: 'bg-amber-50 text-amber-700',
        description: '월 한도 소진 — 결제 윈도우. 후속 액션 추천',
    },
    viewed_subscribe: {
        label: '결제 페이지 진입',
        color: 'bg-orange-50 text-orange-700',
        description: '결제 페이지를 봤지만 결제 안 함',
    },
    trial_started: {
        label: '체험 시작',
        color: 'bg-emerald-50 text-emerald-700',
        description: '무료 체험 진행 중',
    },
    subscribed: {
        label: '유료 구독',
        color: 'bg-[#1a56db]/10 text-[#1a56db]',
        description: '유료 결제 활성',
    },
    churned: {
        label: '이탈',
        color: 'bg-rose-50 text-rose-700',
        description: '구독 해지 후 미가입 상태',
    },
};

function timeAgo(iso: string | null): string {
    if (!iso) return '없음';
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return `${diffSec}초 전`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
    return `${Math.floor(diffSec / 86400)}일 전`;
}

function formatKRW(value: number): string {
    return `${value.toLocaleString()}원`;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const [data, setData] = useState<ActivityResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await apiFetch<ActivityResponse>(`/api/admin/users/${userId}/activity`);
                setData(res);
            } catch (err) {
                setError((err as Error).message || '데이터를 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-3 sm:p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-slate-100 rounded-xl" />
                    <div className="h-64 bg-slate-100 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-3">
                <Link href="/admin">
                    <Button variant="outline" size="sm" className="text-xs">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> 관리자 홈
                    </Button>
                </Link>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                        <p className="text-sm text-rose-700">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { profile, subscription, usage, analyses, uploads, payments, logs, funnel } = data;
    const stageInfo = STAGE_LABELS[funnel.stage];

    return (
        <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in min-w-0">
            {/* 상단 네비 */}
            <Link href="/admin">
                <Button variant="outline" size="sm" className="text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> 관리자 홈
                </Button>
            </Link>

            {/* 헤더: 프로필 + 퍼널 단계 */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1a56db]/10 flex items-center justify-center shrink-0">
                            <User className="w-6 h-6 sm:w-7 sm:h-7 text-[#1a56db]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold">
                                    {profile.name || '(이름 없음)'}
                                </h1>
                                <Badge className={`${stageInfo.color} border-0 text-[11px]`}>
                                    {stageInfo.label}
                                </Badge>
                                {profile.suspended && (
                                    <Badge variant="destructive" className="text-[11px]">
                                        정지됨
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{stageInfo.description}</p>
                            <div className="flex items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1 min-w-0 max-w-full">
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{profile.email}</span>
                                </span>
                                {profile.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {profile.phone}
                                    </span>
                                )}
                                {profile.company && (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {profile.company}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    가입 {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[11px] text-muted-foreground">마지막 활동</p>
                            <p className="text-sm font-medium">{timeAgo(funnel.last_activity_at)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={FileSearch}
                    label="총 분석"
                    value={`${analyses.total_count}건`}
                    color="violet"
                />
                <StatCard
                    icon={Activity}
                    label="총 업로드"
                    value={`${uploads.total_count}건`}
                    color="blue"
                />
                <StatCard
                    icon={CreditCard}
                    label="결제 이력"
                    value={`${payments.total_count}건`}
                    color="emerald"
                />
                <StatCard
                    icon={TrendingUp}
                    label="이번 달 사용"
                    value={`${usage.analyses_used} / ${usage.analyses_limit === -1 ? '∞' : usage.analyses_limit}`}
                    color="amber"
                />
            </div>

            {/* 구독 정보 */}
            {subscription && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">현재 구독</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-[11px] text-muted-foreground">플랜</p>
                            <p className="font-medium">{subscription.plan_name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">상태</p>
                            <p className="font-medium">{subscription.status}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">결제 수단</p>
                            <p className="font-medium">{subscription.payment_method || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">다음 결제일</p>
                            <p className="font-medium">
                                {subscription.current_period_end
                                    ? new Date(subscription.current_period_end).toLocaleDateString('ko-KR')
                                    : '—'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 활동 탭 */}
            <Tabs defaultValue="analyses" className="w-full">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="analyses">분석 ({analyses.total_count})</TabsTrigger>
                    <TabsTrigger value="payments">결제 ({payments.total_count})</TabsTrigger>
                    <TabsTrigger value="logs">로그 ({logs.recent.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="analyses" className="mt-3">
                    {analyses.recent.length === 0 ? (
                        <EmptyState text="아직 분석 이력이 없습니다." />
                    ) : (
                        <div className="space-y-2">
                            {analyses.recent.map((a) => (
                                <Card key={a.id} className="border-0 shadow-sm">
                                    <CardContent className="p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                                                {a.status === 'completed' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-violet-600" />
                                                ) : (
                                                    <Clock className="w-4 h-4 text-amber-600" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">
                                                    {a.overall_summary?.slice(0, 80) || '(요약 없음)'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(a.created_at).toLocaleString('ko-KR')}
                                                    </span>
                                                    {a.has_risk_report && (
                                                        <Badge className="text-[9px] bg-rose-50 text-rose-700 border-0">
                                                            위험도
                                                        </Badge>
                                                    )}
                                                    {a.has_product_eligibility && (
                                                        <Badge className="text-[9px] bg-emerald-50 text-emerald-700 border-0">
                                                            상품
                                                        </Badge>
                                                    )}
                                                    {a.has_claim_assessment && (
                                                        <Badge className="text-[9px] bg-amber-50 text-amber-700 border-0">
                                                            청구
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="payments" className="mt-3">
                    {payments.recent.length === 0 ? (
                        <EmptyState text="결제 이력이 없습니다." />
                    ) : (
                        <div className="space-y-2">
                            {payments.recent.map((p) => (
                                <Card key={p.id} className="border-0 shadow-sm">
                                    <CardContent className="p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    {formatKRW(p.amount)}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {p.payment_method || '—'} · {new Date(p.created_at).toLocaleString('ko-KR')}
                                                </p>
                                            </div>
                                            <Badge
                                                className={`text-[10px] border-0 ${p.status === 'paid' || p.status === 'success'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : p.status === 'cancelled' || p.status === 'refunded'
                                                        ? 'bg-rose-50 text-rose-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                    }`}
                                            >
                                                {p.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="logs" className="mt-3">
                    {logs.recent.length === 0 ? (
                        <EmptyState text="시스템 로그가 없습니다." />
                    ) : (
                        <div className="space-y-1.5">
                            {logs.recent.map((l) => (
                                <div
                                    key={l.id}
                                    className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 text-xs"
                                >
                                    <Badge
                                        className={`text-[9px] border-0 shrink-0 ${l.level === 'error'
                                            ? 'bg-rose-50 text-rose-700'
                                            : l.level === 'warn'
                                                ? 'bg-amber-50 text-amber-700'
                                                : 'bg-blue-50 text-blue-700'
                                            }`}
                                    >
                                        {l.area}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">{l.event}</p>
                                        <p className="text-muted-foreground truncate">{l.message}</p>
                                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                            {new Date(l.created_at).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: 'violet' | 'blue' | 'emerald' | 'amber';
}) {
    const styles = {
        violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    }[color];
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${styles.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${styles.text}`} />
                </div>
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="font-bold text-base mt-0.5">{value}</p>
            </CardContent>
        </Card>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {text}
            </CardContent>
        </Card>
    );
}
