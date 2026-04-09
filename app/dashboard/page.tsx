'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileSearch, ArrowRight, HeartPulse, Receipt, Stethoscope,
    Users, Star, Clock, TrendingUp, Eye,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import ReferralFloating from '@/components/common/ReferralFloating';
import SearchTrendWidget from '@/components/dashboard/SearchTrendWidget';

interface RecentAnalysis {
    id: string;
    status: string;
    created_at: string;
    customer_id: string | null;
    medical_history: { overallSummary?: string } | null;
    product_eligibility: Record<string, unknown> | null;
    claim_assessment: Record<string, unknown> | null;
    risk_report: Record<string, unknown> | null;
}

export default function DashboardPage() {
    const { plan, usage, remainingAnalyses, loading } = useSubscription();
    const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [totalAnalyses, setTotalAnalyses] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '사용자');

                // 최근 분석
                const { data } = await supabase
                    .from('analyses')
                    .select('id, status, created_at, customer_id, medical_history, product_eligibility, claim_assessment')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data) {
                    // risk_report 별도 조회 (컬럼 없을 수 있음)
                    let enriched = data.map(d => ({ ...d, risk_report: null as Record<string, unknown> | null }));
                    try {
                        const { data: rr } = await supabase
                            .from('analyses')
                            .select('id, risk_report')
                            .eq('user_id', user.id)
                            .not('risk_report', 'is', null)
                            .limit(5);
                        if (rr) {
                            const rrMap = new Map(rr.map((r: any) => [r.id, r.risk_report]));
                            enriched = enriched.map(d => ({ ...d, risk_report: rrMap.get(d.id) || null }));
                        }
                    } catch { /* ignore */ }
                    setRecentAnalyses(enriched as unknown as RecentAnalysis[]);
                }

                // 전체 분석 수
                const { count } = await supabase
                    .from('analyses')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                setTotalAnalyses(count || 0);
            } catch { /* ignore */ }
            finally { setRecentLoading(false); }
        };
        fetchData();
    }, []);

    const displayRemaining = remainingAnalyses === -1 ? '무제한' : `${remainingAnalyses}`;
    const usagePercent = usage.analyses_limit > 0
        ? Math.min(100, Math.round((usage.analyses_used / usage.analyses_limit) * 100))
        : 0;

    const getAnalysisType = (a: RecentAnalysis) => {
        if (a.risk_report) return '질병 위험도 리포트';
        if (a.claim_assessment) return '보험금 청구 안내';
        if (a.product_eligibility) return '가입가능 상품 판단';
        if (a.medical_history) return '고지사항 분석';
        return '분석 중';
    };

    const getStatusBadge = (status: string) => {
        if (status === 'completed') return <Badge className="text-[10px] bg-[#1a56db]/10 text-[#1a56db] border-0">완료</Badge>;
        if (status === 'processing') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">검토중</Badge>;
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 인사말 */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                    {loading ? <Skeleton className="h-9 w-64" /> : `안녕하세요, ${userName}님 👋`}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {loading ? <Skeleton className="h-5 w-80 mt-1" /> : `오늘도 성공적인 상담 되세요. 이번 달 남은 분석 ${displayRemaining}건입니다.`}
                </p>
            </div>

            {/* 통계 3개 */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground">이번 달 분석</p>
                        {loading ? <Skeleton className="h-9 w-16 mt-1" /> : (
                            <>
                                <p className="text-3xl font-black mt-1">{usage.analyses_used}<span className="text-base font-normal text-muted-foreground ml-1">건</span></p>
                                <p className="text-[11px] text-muted-foreground mt-1">잔여 {displayRemaining}건</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground">총 고객 분석</p>
                        {recentLoading ? <Skeleton className="h-9 w-16 mt-1" /> : (
                            <>
                                <p className="text-3xl font-black mt-1">{totalAnalyses}<span className="text-base font-normal text-muted-foreground ml-1">건</span></p>
                                <p className="text-[11px] text-muted-foreground mt-1">누적 분석 건수</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground">이번 달 남은 분석</p>
                        {loading ? <Skeleton className="h-9 w-16 mt-1" /> : (
                            <>
                                <p className="text-3xl font-black mt-1">{displayRemaining}<span className="text-base font-normal text-muted-foreground ml-1">{remainingAnalyses !== -1 ? '건' : ''}</span></p>
                                <p className="text-[11px] text-[#1a56db] mt-1 cursor-pointer hover:underline">
                                    <Link href="/dashboard/settings">잔여 횟수 확인</Link>
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 실시간 보험 검색 트렌드 */}
            <SearchTrendWidget />

            {/* 주요 기능 4개 카드 */}
            <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">주요 기능</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 새 분석 시작 */}
                    <Link href="/dashboard/analyze">
                        <Card className="border-0 shadow-sm bg-[#1a56db] text-white hover:bg-[#1a56db]/90 transition-colors cursor-pointer h-full relative overflow-hidden">
                            <Badge className="absolute top-3 right-3 bg-white/20 text-white text-[10px] border-0">AI 분석</Badge>
                            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[160px]">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <FileSearch className="w-5 h-5" />
                                </div>
                                <div className="mt-auto">
                                    <h3 className="font-bold">새 분석 시작</h3>
                                    <p className="text-xs text-white/70 mt-0.5">심평원 PDF 업로드</p>
                                    <p className="text-xs text-white/70">고지사항 30초 자동 분석</p>
                                </div>
                                <ArrowRight className="absolute bottom-5 right-5 w-5 h-5 text-white/50" />
                            </CardContent>
                        </Card>
                    </Link>

                    {/* 진료정보 조회 */}
                    <Link href="/dashboard/medical">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="p-5 flex flex-col justify-between min-h-[160px]">
                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                    <Stethoscope className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="mt-auto">
                                    <h3 className="font-bold">진료정보 조회</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">CODEF 연동으로</p>
                                    <p className="text-xs text-muted-foreground">심평원 데이터 자동 수집</p>
                                </div>
                                <ArrowRight className="absolute bottom-5 right-5 w-5 h-5 text-muted-foreground/30 hidden sm:block" />
                            </CardContent>
                        </Card>
                    </Link>

                    {/* 질병 위험도 리포트 */}
                    <Link href="/dashboard/risk-report">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full relative">
                            <Badge className="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] border-0">NEW</Badge>
                            <CardContent className="p-5 flex flex-col justify-between min-h-[160px]">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <HeartPulse className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="mt-auto">
                                    <h3 className="font-bold">질병 위험도 리포트</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">병력 기반 미래 질환</p>
                                    <p className="text-xs text-muted-foreground">위험도 분석 리포트</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* 가상 사고 영수증 */}
                    <Link href="/dashboard/accident-receipt">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full relative">
                            <Badge className="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] border-0">NEW</Badge>
                            <CardContent className="p-5 flex flex-col justify-between min-h-[160px]">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                                    <Receipt className="w-5 h-5 text-rose-600" />
                                </div>
                                <div className="mt-auto">
                                    <h3 className="font-bold">가상 사고 영수증</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">질환별 예상 병원비와</p>
                                    <p className="text-xs text-muted-foreground">보험금 차이 시뮬레이션</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* 하단: 플랜 + 최근 분석 이력 */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* 플랜 정보 */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500" />
                                <span className="font-bold">{loading ? <Skeleton className="h-5 w-20 inline-block" /> : `${plan.display_name} 플랜`}</span>
                            </div>
                            <Link href="/dashboard/settings">
                                <Button variant="outline" size="sm" className="text-xs">
                                    {plan.slug === 'free' ? '업그레이드' : '크레딧 추가'}
                                </Button>
                            </Link>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            이번 달 {loading ? '...' : `${usage.analyses_used}/${usage.analyses_limit === -1 ? '∞' : usage.analyses_limit}`}건 사용
                        </p>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-[#1a56db] rounded-full transition-all" style={{ width: `${usagePercent}%` }} />
                        </div>
                    </CardContent>
                </Card>

                {/* 최근 분석 이력 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">최근 분석 이력</CardTitle>
                        <Link href="/dashboard/history">
                            <span className="text-xs text-[#1a56db] hover:underline cursor-pointer">전체보기 →</span>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {recentLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 p-2.5"><Skeleton className="w-8 h-8 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-2.5 w-1/2" /></div></div>
                            ))
                        ) : recentAnalyses.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                아직 분석 이력이 없습니다
                            </div>
                        ) : (
                            recentAnalyses.map(a => (
                                <Link key={a.id} href={`/dashboard/analyze?analysisId=${a.id}`}>
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {a.medical_history?.overallSummary
                                                    ? String(a.medical_history.overallSummary).substring(0, 40) + '...'
                                                    : '분석 결과'}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {new Date(a.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} · {getAnalysisType(a)}
                                            </p>
                                        </div>
                                        {getStatusBadge(a.status)}
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <ReferralFloating />
        </div>
    );
}
