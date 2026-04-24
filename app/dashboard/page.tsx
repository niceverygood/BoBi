'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileSearch, ArrowRight, HeartPulse, Receipt, Stethoscope,
    Users, Star, Clock, TrendingUp, Eye, HelpCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import ReferralFloating from '@/components/common/ReferralFloating';
import SearchTrendWidget from '@/components/dashboard/SearchTrendWidget';
import WeeklyKpiCards from '@/components/dashboard/WeeklyKpiCards';
import FollowupsWidget from '@/components/dashboard/FollowupsWidget';
import ActivityChart from '@/components/dashboard/ActivityChart';
import TrialPromoBanner from '@/components/subscribe/TrialPromoBanner';
import { SocialProofStrip } from '@/components/common/SocialProof';
import OnboardingTour, { TourStep } from '@/components/dashboard/OnboardingTour';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        title: '보비 사용법을 1분만에 알려드릴게요 👋',
        description:
            '설계사님이 가장 많이 쓰는 핵심 기능 4가지를 순서대로 보여드려요.\n언제든 ESC 키나 우측 상단 × 로 닫을 수 있어요.',
        placement: 'center',
    },
    {
        id: 'usage-stats',
        title: '이번 달 남은 분석 건수',
        description:
            '무료 플랜은 매달 분석 건수가 제한돼요. 잔여 건수가 바닥나면 자동으로 베이직 3일 무료 체험을 안내드려요.',
        target: '[data-tour="usage-stats"]',
    },
    {
        id: 'new-analysis',
        title: '① 새 분석 시작 — 가장 많이 쓰는 기능',
        description:
            '고객의 심평원 PDF를 업로드하면 AI가 30초 안에 고지사항을 자동 분석해요.\n첫 분석을 여기서 시작하세요.',
        target: '[data-tour="new-analysis"]',
    },
    {
        id: 'medical-lookup',
        title: '② 진료정보 조회 (CODEF 연동)',
        description:
            '고객이 과거 병원 기록을 기억 못 해도 CODEF 연동으로 심평원 데이터를 자동으로 가져와요.',
        target: '[data-tour="medical-lookup"]',
    },
    {
        id: 'risk-report',
        title: '③ 질병 위험도 리포트',
        description:
            '병력 기반으로 미래에 걸릴 수 있는 질환 위험도를 리포트로 만들어요. 상담 시 강력한 설계 근거가 됩니다.',
        target: '[data-tour="risk-report"]',
    },
    {
        id: 'accident-receipt',
        title: '④ 가상 사고 영수증',
        description:
            '질환별 예상 병원비 vs 보험금 차액을 시뮬레이션해서 보여줘요. "왜 이 상품이 필요한지" 고객 설득에 효과적이에요.',
        target: '[data-tour="accident-receipt"]',
    },
    {
        id: 'plan-info',
        title: '더 많이 쓰려면 플랜 업그레이드',
        description:
            '베이직 플랜은 3일 무료 체험이 있어요. 체험 중에는 0원 청구되고 언제든 해지 가능합니다.',
        target: '[data-tour="plan-info"]',
    },
];

interface RecentAnalysis {
    id: string;
    status: string;
    created_at: string;
    customer_id: string | null;
    overall_summary: string | null;
    has_medical_history: boolean;
    has_product_eligibility: boolean;
    has_claim_assessment: boolean;
    has_risk_report: boolean;
}

export default function DashboardPage() {
    const { plan, usage, remainingAnalyses, loading } = useSubscription();
    const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [totalAnalyses, setTotalAnalyses] = useState(0);

    // 온보딩 투어: 무료 유저 & 누적 분석 0건일 때 자동 시작
    const tourEligible =
        !loading && !recentLoading && plan.slug === 'free' && totalAnalyses === 0;
    const { open: tourOpen, start: startTour, close: closeTour } = useOnboardingTour({
        autoStartEligible: tourEligible,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '사용자');

                // 최근 분석(RPC) + 전체 건수(count)를 병렬 실행 — JSON 컬럼 전송 없음
                const [rpcResult, countResult] = await Promise.all([
                    supabase.rpc('get_dashboard_recent_analyses', { p_user_id: user.id, p_limit: 5 }),
                    supabase
                        .from('analyses')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id),
                ]);

                if (rpcResult.data) {
                    setRecentAnalyses(rpcResult.data as RecentAnalysis[]);
                } else if (rpcResult.error) {
                    // RPC 배포 전 폴백: 슬림한 컬럼만 조회
                    const { data: fallback } = await supabase
                        .from('analyses')
                        .select('id, status, created_at, customer_id')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    if (fallback) {
                        setRecentAnalyses(
                            fallback.map((d) => ({
                                ...d,
                                overall_summary: null,
                                has_medical_history: false,
                                has_product_eligibility: false,
                                has_claim_assessment: false,
                                has_risk_report: false,
                            })) as RecentAnalysis[],
                        );
                    }
                }

                setTotalAnalyses(countResult.count || 0);
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
        if (a.has_risk_report) return '질병 위험도 리포트';
        if (a.has_claim_assessment) return '보험금 청구 안내';
        if (a.has_product_eligibility) return '가입가능 상품 판단';
        if (a.has_medical_history) return '고지사항 분석';
        return '분석 중';
    };

    const getStatusBadge = (status: string) => {
        if (status === 'completed') return <Badge className="text-[10px] bg-[#1a56db]/10 text-[#1a56db] border-0">완료</Badge>;
        if (status === 'processing') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">검토중</Badge>;
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 인사말 + 도움말 */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        {loading ? <Skeleton className="h-9 w-64" /> : `안녕하세요, ${userName}님 👋`}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {loading ? <Skeleton className="h-5 w-80 mt-1" /> : `오늘도 성공적인 상담 되세요. 이번 달 남은 분석 ${displayRemaining}건입니다.`}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={startTour}
                    className="text-xs shrink-0"
                    aria-label="보비 사용법 가이드 다시 보기"
                >
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    사용법
                </Button>
            </div>

            {/* 🎁 베이직 3일 무료 체험 프로모션 (무료 유저 + 자격 있을 때만) */}
            <TrialPromoBanner />

            {/* 📊 사회적 증거 — 무료 유저에게 집중 노출 */}
            {plan.slug === 'free' && !loading && <SocialProofStrip compact />}

            {/* ⭐ 팔로업 필요 고객 (리텐션 핵심 — 최상단 배치) */}
            <FollowupsWidget />

            {/* 주간 KPI — 이번 주 vs 지난 주 */}
            <WeeklyKpiCards />

            {/* 최근 30일 활동 차트 */}
            <ActivityChart />

            {/* 사용량 요약 (기존 3개 통계를 1줄로 축약) */}
            <Card data-tour="usage-stats" className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-white">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-6 flex-wrap">
                        <div>
                            <p className="text-[11px] text-muted-foreground">이번 달 분석</p>
                            <p className="text-lg font-bold mt-0.5">
                                {loading ? '...' : `${usage.analyses_used}`}
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                    / {usage.analyses_limit === -1 ? '∞' : usage.analyses_limit}건
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">총 누적</p>
                            <p className="text-lg font-bold mt-0.5">
                                {recentLoading ? '...' : totalAnalyses}
                                <span className="text-xs font-normal text-muted-foreground ml-1">건</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">잔여</p>
                            <p className="text-lg font-bold text-[#1a56db] mt-0.5">
                                {loading ? '...' : displayRemaining}
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                    {remainingAnalyses !== -1 ? '건' : ''}
                                </span>
                            </p>
                        </div>
                    </div>
                    <Link href="/dashboard/settings">
                        <Button variant="outline" size="sm" className="text-xs">
                            플랜 관리 →
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* 실시간 보험 검색 트렌드 */}
            <SearchTrendWidget />

            {/* 주요 기능 4개 카드 */}
            <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">주요 기능</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* 새 분석 시작 */}
                    <Link href="/dashboard/analyze" data-tour="new-analysis">
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
                    <Link href="/dashboard/medical" data-tour="medical-lookup">
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
                    <Link href="/dashboard/risk-report" data-tour="risk-report">
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
                    <Link href="/dashboard/accident-receipt" data-tour="accident-receipt">
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
                <Card data-tour="plan-info" className="border-0 shadow-sm">
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
                                                {a.overall_summary
                                                    ? a.overall_summary.substring(0, 40) + '...'
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

            <OnboardingTour
                steps={TOUR_STEPS}
                open={tourOpen}
                onClose={closeTour}
            />
        </div>
    );
}
