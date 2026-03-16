'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSearch, TrendingUp, Clock, ArrowRight, Plus, FileText, Sparkles, Crown } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { useSubscription } from '@/hooks/useSubscription';

export default function DashboardPage() {
    const { plan, usage, remainingAnalyses, loading } = useSubscription();

    const displayRemaining = remainingAnalyses === -1 ? '무제한' : `${remainingAnalyses}건`;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">대시보드</h1>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-muted-foreground">보비와 함께하는 스마트한 보험 분석</p>
                    <Badge variant="outline" className="text-[10px] gap-1 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                        <Sparkles className="w-2.5 h-2.5" />
                        Claude Sonnet 4.5
                    </Badge>
                </div>
            </div>

            {/* Free plan upgrade banner */}
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
                                    월 30건 분석 + 상품 매칭 기능을 이용하세요
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
                                <p className="text-2xl font-bold mt-1">{loading ? '...' : `${usage.analyses_used}건`}</p>
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
                                <p className="text-2xl font-bold mt-1">0건</p>
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
                                <p className="text-2xl font-bold mt-1">0건</p>
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
                                <p className="text-2xl font-bold mt-1">{loading ? '...' : displayRemaining}</p>
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
                    <Link href="/dashboard/analyze">
                        <Button className="bg-gradient-primary hover:opacity-90 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            새 분석 시작하기
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
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
                </CardContent>
            </Card>
        </div>
    );
}
