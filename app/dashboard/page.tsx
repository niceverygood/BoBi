'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSearch, TrendingUp, Clock, ArrowRight, Plus, FileText, Sparkles, Crown, ShieldPlus, Eye, Loader2 } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';

interface RecentAnalysis {
    id: string;
    status: string;
    created_at: string;
    medical_history: {
        overallSummary?: string;
        items?: Array<{ category: string; applicable: boolean }>;
    } | null;
    product_eligibility: Record<string, unknown> | null;
    claim_assessment: Record<string, unknown> | null;
}

export default function DashboardPage() {
    const { plan, usage, remainingAnalyses, loading } = useSubscription();
    const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);

    const displayRemaining = remainingAnalyses === -1 ? '무제한' : `${remainingAnalyses}건`;

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('analyses')
                    .select('id, status, created_at, medical_history, product_eligibility, claim_assessment')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data) {
                    setRecentAnalyses(data as unknown as RecentAnalysis[]);
                }
            } catch {
                // ignore
            } finally {
                setRecentLoading(false);
            }
        };
        fetchRecent();
    }, []);

    // 완료된 분석 중 product_eligibility가 있는 건수
    const productCount = recentAnalyses.filter(a => a.product_eligibility).length;
    const claimsCount = recentAnalyses.filter(a => a.claim_assessment).length;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getSteps = (a: RecentAnalysis) => {
        const steps = [];
        if (a.medical_history) steps.push({ label: 'S1', color: 'bg-blue-500' });
        if (a.product_eligibility) steps.push({ label: 'S2', color: 'bg-green-500' });
        if (a.claim_assessment) steps.push({ label: 'S3', color: 'bg-violet-500' });
        return steps;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome */}
            <div>
                <h1 className="text-xl sm:text-3xl font-bold">대시보드</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    <p className="text-sm sm:text-base text-muted-foreground">보비와 함께하는 스마트한 보험 분석</p>
                    <Badge variant="outline" className="text-[10px] gap-1 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                        <Sparkles className="w-2.5 h-2.5" />
                        Claude Sonnet 4.5
                    </Badge>
                </div>
            </div>

            {/* Free plan upgrade banner */}
            {loading && (
                <Skeleton className="h-20 w-full rounded-2xl" />
            )}
            {plan.slug === 'free' && !loading && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-blue-50 to-violet-50 dark:from-primary/5 dark:via-blue-950/20 dark:to-violet-950/20 p-5 border border-primary/10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                                <Crown className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">베이직 플랜으로 업그레이드</p>
                                <p className="text-xs text-muted-foreground">
                                    월 19,900원으로 30건 분석 + 보장 분석 리포트
                                </p>
                            </div>
                        </div>
                        <Link href="/pricing">
                            <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-sm text-sm">
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                요금제 보기
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">이번 달 분석</p>
                                {loading ? (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold mt-1">{usage.analyses_used}건</p>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <FileSearch className="w-5 h-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">가입가능 판단</p>
                                {recentLoading ? (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold mt-1">{productCount}건</p>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">청구 안내</p>
                                {recentLoading ? (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold mt-1">{claimsCount}건</p>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-violet-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">남은 분석</p>
                                {loading ? (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold mt-1">{displayRemaining}</p>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                        </div>
                        {!loading && plan.slug !== 'free' && (
                            <div className="mt-2">
                                <Badge variant="secondary" className="text-[10px]">{plan.display_name} 플랜</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">빠른 시작</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/dashboard/analyze">
                            <Button className="bg-gradient-primary hover:opacity-90 shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                새 분석 시작하기
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                        <Link href="/dashboard/coverage">
                            <Button variant="outline" className="shadow-sm">
                                <ShieldPlus className="w-4 h-4 mr-2" />
                                보장 분석표 만들기
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Analyses */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">최근 분석</CardTitle>
                    <Link href="/dashboard/history">
                        <Button variant="ghost" size="sm" className="text-sm">
                            전체보기 <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {recentLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                                    <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="w-4 h-4 rounded shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : recentAnalyses.length === 0 ? (
                        <EmptyState
                            title="아직 분석 이력이 없습니다"
                            description="PDF를 업로드하고 첫 번째 보험 분석을 시작해보세요."
                            action={
                                <Link href="/dashboard/analyze">
                                    <Button variant="outline" size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        새 분석 시작
                                    </Button>
                                </Link>
                            }
                        />
                    ) : (
                        <div className="space-y-2">
                            {recentAnalyses.map((analysis) => (
                                <Link key={analysis.id} href={`/dashboard/analyze?analysisId=${analysis.id}`}>
                                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <FileSearch className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate max-w-[300px]">
                                                    {analysis.medical_history?.overallSummary
                                                        ? String(analysis.medical_history.overallSummary).substring(0, 60) + '...'
                                                        : '분석 결과 확인하기'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDate(analysis.created_at)}
                                                    </span>
                                                    <div className="flex gap-0.5">
                                                        {getSteps(analysis).map((step) => (
                                                            <Badge key={step.label} className={`text-[8px] px-1 py-0 ${step.color} text-white`}>
                                                                {step.label}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
