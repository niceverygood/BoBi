import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft, Sparkles, Zap, Crown, Building, Users } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug, type IndividualPlanSlug, type TeamPlanSlug } from '@/lib/utils/constants';
import { ExternalLinkButton } from '@/components/common/ExternalLinkButton';
import { SocialProofStrip, TestimonialCards } from '@/components/common/SocialProof';

const INDIVIDUAL_PLAN_ICONS: Record<IndividualPlanSlug, typeof Sparkles> = {
    free: Sparkles,
    basic: Zap,
    pro: Crown,
};

const INDIVIDUAL_PLAN_COLORS: Record<IndividualPlanSlug, string> = {
    free: 'from-slate-500 to-slate-600',
    basic: 'from-blue-500 to-blue-600',
    pro: 'from-violet-500 to-violet-600',
};

const TEAM_PLAN_ICONS: Record<TeamPlanSlug, typeof Building> = {
    team_basic: Users,
    team_pro: Building,
};

const TEAM_PLAN_COLORS: Record<TeamPlanSlug, string> = {
    team_basic: 'from-teal-500 to-teal-600',
    team_pro: 'from-amber-500 to-amber-600',
};

const INDIVIDUAL_FEATURES = [
    { label: 'AI 고지사항 분석', free: true, basic: true, pro: true },
    { label: '보장 분석 리포트', free: false, basic: true, pro: true },
    { label: '질병 위험도 리포트', free: false, basic: false, pro: true },
    { label: '미래의 나 (예상 의료비 시뮬레이션)', free: false, basic: false, pro: true },
    { label: '가상 영수증 (질병별 의료비 분석)', free: false, basic: false, pro: true },
    { label: '리모델링 제안서', free: false, basic: false, pro: true },
    { label: '보험 자동 조회 (CODEF)', free: false, basic: true, pro: true },
    { label: 'PDF 용량 무제한', free: true, basic: true, pro: true },
    { label: '결과 PDF 다운로드', free: false, basic: true, pro: true },
    { label: '맞춤 보험사 상품DB', free: false, basic: false, pro: true },
    { label: '우선 지원', free: false, basic: false, pro: true },
];

const TEAM_FEATURES = [
    { label: '기본 분석 기능 (고지사항·상품판단)', team_basic: true, team_pro: true },
    { label: '결과 PDF 다운로드', team_basic: true, team_pro: true },
    { label: '보험 자동 조회 (CODEF)', team_basic: true, team_pro: true },
    { label: '팀 관리 대시보드', team_basic: true, team_pro: true },
    { label: '팀원별 실적 리포트', team_basic: true, team_pro: true },
    { label: '질병 위험도 리포트', team_basic: false, team_pro: true },
    { label: '미래의 나 (예상 의료비 시뮬레이션)', team_basic: false, team_pro: true },
    { label: '가상 영수증 (질병별 의료비 분석)', team_basic: false, team_pro: true },
    { label: '리모델링 제안서', team_basic: false, team_pro: true },
    { label: '맞춤 보험사 상품DB', team_basic: false, team_pro: true },
    { label: '전담 매니저 배정', team_basic: false, team_pro: true },
    { label: '분석 이력 무제한 보관', team_basic: false, team_pro: true },
];

export default function PricingPage() {
    const individualSlugs: IndividualPlanSlug[] = ['free', 'basic', 'pro'];
    const teamSlugs: TeamPlanSlug[] = ['team_basic', 'team_pro'];

    return (
        <div className="min-h-screen bg-gradient-hero">
            {/* Header */}
            <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        홈으로
                    </Link>
                    <Link href="/auth/login">
                        <Button variant="outline" size="sm">로그인</Button>
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-16">
                {/* Hero */}
                <div className="text-center mb-16 animate-fade-in">
                    <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">요금제</Badge>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                        보험 분석의 새로운 기준,<br />
                        <span className="text-primary">합리적인 가격</span>으로 시작하세요
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        무료로 시작하고, 필요할 때 업그레이드하세요. 연간 결제 시 20% 할인됩니다.
                    </p>
                </div>

                {/* 사회적 증거 — 헤더 바로 아래 */}
                <div className="mb-16 animate-fade-in">
                    <SocialProofStrip />
                </div>

                {/* ═══════════════════════════════════════ */}
                {/* 개인 플랜 섹션 */}
                {/* ═══════════════════════════════════════ */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-center mb-2">👤 개인 플랜</h2>
                    <p className="text-center text-muted-foreground mb-8">설계사 개인이 사용하기 적합한 플랜</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 stagger-children">
                    {individualSlugs.map((slug) => {
                        const plan = PLAN_LIMITS[slug];
                        const Icon = INDIVIDUAL_PLAN_ICONS[slug];
                        const gradient = INDIVIDUAL_PLAN_COLORS[slug];
                        const isRecommended = plan.recommended;

                        return (
                            <Card
                                key={slug}
                                className={`border-0 shadow-lg relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${isRecommended ? 'ring-2 ring-primary' : ''}`}
                            >
                                {isRecommended && (
                                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                                        추천
                                    </div>
                                )}
                                <CardHeader className="pb-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                                        {slug === 'basic' && (
                                            <Badge className="bg-violet-600 text-white text-[10px] px-2 py-0.5">
                                                7일 무료 체험
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="mt-2">
                                        {plan.priceMonthly > 0 ? (
                                            <>
                                                <span className="text-3xl font-bold">
                                                    {plan.priceMonthly.toLocaleString()}원
                                                </span>
                                                <span className="text-muted-foreground text-sm">/월</span>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    연간 결제 시 {Math.round(plan.priceYearly / 12).toLocaleString()}원/월
                                                </p>
                                                {slug === 'basic' && (
                                                    <p className="text-xs text-violet-600 font-semibold mt-1">
                                                        ✨ 첫 7일 무료 · 언제든 해지 가능
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-3xl font-bold">무료</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {slug === 'free'
                                            ? `${plan.analysisLimit}건 체험 (누적)`
                                            : `월 ${plan.analysisLimit === -1 ? '무제한' : `${plan.analysisLimit}건`} 분석`}
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2.5 mb-6">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-sm">
                                                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                {feature}
                                            </li>
                                        ))}
                                        {plan.lockedFeatures.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground/50">
                                                <X className="w-4 h-4 shrink-0 mt-0.5" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href={slug === 'free' ? '/auth/signup' : `/dashboard/subscribe?plan=${slug}`}>
                                        <Button
                                            className={`w-full ${isRecommended ? 'bg-gradient-primary hover:opacity-90' : ''}`}
                                            variant={isRecommended ? 'default' : 'outline'}
                                        >
                                            {slug === 'free' ? '무료로 시작' : slug === 'basic' ? '7일 무료 체험 시작' : '구독 시작하기'}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* 개인 기능 비교표 */}
                <div className="animate-fade-in mb-24">
                    <h3 className="text-xl font-bold text-center mb-6">개인 플랜 기능 비교</h3>
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[620px]">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-4 font-medium text-sm min-w-[220px] whitespace-nowrap">기능</th>
                                            {individualSlugs.map((slug) => (
                                                <th key={slug} className="p-4 text-center font-medium text-sm min-w-[120px] whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">분석 건수</td>
                                            {individualSlugs.map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm font-semibold whitespace-nowrap">
                                                    {slug === 'free'
                                                        ? `${PLAN_LIMITS[slug].analysisLimit}건 (누적 체험)`
                                                        : PLAN_LIMITS[slug].analysisLimit === -1 ? '월 무제한' : `월 ${PLAN_LIMITS[slug].analysisLimit}건`}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b bg-muted/10">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">분석 이력 보관</td>
                                            {individualSlugs.map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].historyDays === -1 ? '무제한' : `${PLAN_LIMITS[slug].historyDays}일`}
                                                </td>
                                            ))}
                                        </tr>
                                        {INDIVIDUAL_FEATURES.map((feature, idx) => (
                                            <tr key={feature.label} className={`border-b ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}>
                                                <td className="p-4 text-sm whitespace-nowrap">{feature.label}</td>
                                                {individualSlugs.map((slug) => (
                                                    <td key={slug} className="p-4 text-center">
                                                        {feature[slug] ? (
                                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[11px] text-muted-foreground text-center py-2 sm:hidden">← 좌우로 스크롤해서 확인하세요 →</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ═══════════════════════════════════════ */}
                {/* 팀/GA 플랜 섹션 */}
                {/* ═══════════════════════════════════════ */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-center mb-2">🏢 팀 / GA 플랜</h2>
                    <p className="text-center text-muted-foreground mb-8">GA·법인보험대리점에 최적화된 단체 구독</p>
                </div>

                {/* 인당 단가 비교 배너 */}
                <div className="mb-8">
                    <Card className="border-0 shadow-md bg-gradient-to-r from-primary/5 to-violet-500/5">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">개인 베이직 × 5명</p>
                                    <p className="text-2xl font-bold line-through text-muted-foreground">99,500원<span className="text-sm font-normal">/월</span></p>
                                </div>
                                <div className="text-2xl text-primary font-bold">→</div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">팀 베이직 (5명 포함)</p>
                                    <p className="text-2xl font-bold text-primary">79,000원<span className="text-sm font-normal">/월</span></p>
                                </div>
                                <Badge className="bg-red-500 text-white text-sm px-3 py-1">21% 할인</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16 stagger-children">
                    {teamSlugs.map((slug) => {
                        const plan = PLAN_LIMITS[slug];
                        const Icon = TEAM_PLAN_ICONS[slug];
                        const gradient = TEAM_PLAN_COLORS[slug];
                        const isRecommended = plan.recommended;

                        return (
                            <Card
                                key={slug}
                                className={`border-0 shadow-lg relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${isRecommended ? 'ring-2 ring-primary' : ''}`}
                            >
                                {isRecommended && (
                                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                                        인기
                                    </div>
                                )}
                                <CardHeader className="pb-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <div className="mt-2">
                                        <span className="text-3xl font-bold">
                                            {plan.priceMonthly.toLocaleString()}원
                                        </span>
                                        <span className="text-muted-foreground text-sm">/월</span>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            연간 결제 시 {Math.round(plan.priceYearly / 12).toLocaleString()}원/월
                                        </p>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm font-medium text-primary">
                                            {plan.includedSeats}명 포함 · 인당 {plan.perSeatPrice?.toLocaleString()}원
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            추가 1인당 월 {plan.extraSeatPrice?.toLocaleString()}원
                                            {plan.maxSeats && plan.maxSeats > 0 ? ` · 최대 ${plan.maxSeats}명` : ' · 인원 무제한'}
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2.5 mb-6">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-sm">
                                                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                {feature}
                                            </li>
                                        ))}
                                        {plan.lockedFeatures.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground/50">
                                                <X className="w-4 h-4 shrink-0 mt-0.5" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <ExternalLinkButton
                                        url="https://open.kakao.com/o/sBoBi"
                                        className={`w-full ${isRecommended ? 'bg-gradient-primary hover:opacity-90' : ''}`}
                                        variant={isRecommended ? 'default' : 'outline'}
                                    >
                                        도입 문의하기
                                    </ExternalLinkButton>
                                    <p className="text-[11px] text-center text-muted-foreground mt-2">
                                        조직 규모·요구사항 확인 후 담당자가 안내드립니다.
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* GA 견적 시뮬레이션 */}
                <div className="animate-fade-in mb-16">
                    <h3 className="text-xl font-bold text-center mb-6">💰 GA 규모별 예상 비용</h3>
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px]">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-4 font-medium text-sm whitespace-nowrap min-w-[180px]">GA 규모</th>
                                            <th className="p-4 text-center font-medium text-sm whitespace-nowrap min-w-[110px]">추천 플랜</th>
                                            <th className="p-4 text-center font-medium text-sm whitespace-nowrap min-w-[110px]">월 비용</th>
                                            <th className="p-4 text-center font-medium text-sm whitespace-nowrap min-w-[110px]">인당 단가</th>
                                            <th className="p-4 text-center font-medium text-sm whitespace-nowrap min-w-[130px]">연간 비용</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">소규모 팀 (5명)</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap"><Badge variant="outline">팀 베이직</Badge></td>
                                            <td className="p-4 text-center text-sm font-semibold whitespace-nowrap">79,000원</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap">15,800원</td>
                                            <td className="p-4 text-center text-sm text-muted-foreground whitespace-nowrap">758,400원</td>
                                        </tr>
                                        <tr className="border-b bg-muted/10">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">중소 GA (10명)</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap"><Badge variant="outline">팀 베이직</Badge></td>
                                            <td className="p-4 text-center text-sm font-semibold whitespace-nowrap">139,000원</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap">13,900원</td>
                                            <td className="p-4 text-center text-sm text-muted-foreground whitespace-nowrap">1,334,400원</td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">중형 GA (10명, 무제한)</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap"><Badge className="bg-amber-100 text-amber-700">팀 프로</Badge></td>
                                            <td className="p-4 text-center text-sm font-semibold whitespace-nowrap">274,000원</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap">27,400원</td>
                                            <td className="p-4 text-center text-sm text-muted-foreground whitespace-nowrap">2,630,400원</td>
                                        </tr>
                                        <tr className="border-b bg-primary/5">
                                            <td className="p-4 text-sm font-bold whitespace-nowrap">대형 GA (20명, 무제한)</td>
                                            <td className="p-4 text-center text-sm whitespace-nowrap"><Badge className="bg-amber-100 text-amber-700">팀 프로</Badge></td>
                                            <td className="p-4 text-center text-sm font-bold text-primary whitespace-nowrap">524,000원</td>
                                            <td className="p-4 text-center text-sm font-bold text-primary whitespace-nowrap">26,200원</td>
                                            <td className="p-4 text-center text-sm text-muted-foreground whitespace-nowrap">5,030,400원</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[11px] text-muted-foreground text-center py-2 sm:hidden">← 좌우로 스크롤해서 확인하세요 →</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 팀 기능 비교표 */}
                <div className="animate-fade-in mb-16">
                    <h3 className="text-xl font-bold text-center mb-6">팀 플랜 기능 비교</h3>
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px]">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-4 font-medium text-sm min-w-[220px] whitespace-nowrap">기능</th>
                                            {teamSlugs.map((slug) => (
                                                <th key={slug} className="p-4 text-center font-medium text-sm min-w-[140px] whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">월간 분석 건수</td>
                                            {teamSlugs.map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm font-semibold whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].analysisLimit === -1 ? '무제한' : `${PLAN_LIMITS[slug].analysisLimit}건/인`}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b bg-muted/10">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">포함 인원</td>
                                            {teamSlugs.map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].includedSeats}명
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">최대 인원</td>
                                            {teamSlugs.map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].maxSeats === -1 ? '무제한' : `${PLAN_LIMITS[slug].maxSeats}명`}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-b bg-muted/10">
                                            <td className="p-4 text-sm font-medium whitespace-nowrap">추가 인당 비용</td>
                                            {teamSlugs.map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm whitespace-nowrap">
                                                    {PLAN_LIMITS[slug].extraSeatPrice?.toLocaleString()}원/월
                                                </td>
                                            ))}
                                        </tr>
                                        {TEAM_FEATURES.map((feature, idx) => (
                                            <tr key={feature.label} className={`border-b ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}>
                                                <td className="p-4 text-sm whitespace-nowrap">{feature.label}</td>
                                                {teamSlugs.map((slug) => (
                                                    <td key={slug} className="p-4 text-center">
                                                        {feature[slug] ? (
                                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 설계사 후기 */}
                <div className="mt-20 mb-8 animate-fade-in">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">현장 설계사들의 실제 이야기</h2>
                        <p className="text-sm text-muted-foreground">이미 보비로 성과를 내고 있는 분들의 후기입니다</p>
                    </div>
                    <TestimonialCards />
                </div>

                {/* CTA */}
                <div className="text-center mt-16 animate-fade-in">
                    <h2 className="text-2xl font-bold mb-3">지금 바로 시작하세요</h2>
                    <p className="text-muted-foreground mb-6">무료 플랜으로 보비의 AI 분석을 직접 체험해보세요.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href="/auth/signup">
                            <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg px-8">
                                무료로 시작하기
                            </Button>
                        </Link>
                        <ExternalLinkButton url="https://open.kakao.com/o/sBoBi" variant="outline" size="lg" className="px-8">
                            GA 도입 상담
                        </ExternalLinkButton>
                    </div>
                </div>

                {/* 결제 관련 고지 */}
                <div className="mt-16 max-w-3xl mx-auto">
                    <Card className="border-0 shadow-sm bg-muted/30">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-sm mb-3">💳 결제 관련 안내</h3>
                            <ul className="text-xs text-muted-foreground space-y-2">
                                <li>• 유료 플랜은 구독 형태로 제공되며, 구독 기간 종료 시 <strong>자동으로 갱신</strong>됩니다.</li>
                                <li>• 자동 갱신을 원하지 않으시면 구독 기간 만료 전에 설정 페이지에서 해지해주세요.</li>
                                <li>• 결제일로부터 7일 이내이고 서비스를 이용하지 않은 경우 <strong>전액 환불</strong>이 가능합니다.</li>
                                <li>• 결제일로부터 7일 이내이나 서비스를 이용한 경우, 이용 건수에 해당하는 금액을 차감 후 환불됩니다.</li>
                                <li>• 결제일로부터 7일 경과 후에는 환불이 불가합니다 (회사 귀책 사유 제외).</li>
                                <li>• 팀/GA 플랜은 계약 기간에 따라 별도 환불 정책이 적용될 수 있습니다.</li>
                                <li>• 환불 요청은 설정 페이지 또는 고객센터(010-2309-7443)를 통해 신청할 수 있습니다.</li>
                            </ul>
                            <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                                결제를 진행하시면{' '}
                                <Link href="/terms" className="text-primary underline">이용약관</Link>
                                {' '}및{' '}
                                <Link href="/privacy" className="text-primary underline">개인정보처리방침</Link>
                                에 동의하는 것으로 간주됩니다.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 사업자 정보 푸터 */}
                <div className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground space-y-1">
                    <p>주식회사 바틀 | 대표자: 한승수 | 사업자등록번호: 376-87-01076 | 통신판매업신고번호: 제2019-성남분당B-0177호</p>
                    <p>경기도 성남시 분당구 판교로289번길 20, 2동 8층 (삼평동, 판교테크노밸리 스타트업 캠퍼스)</p>
                    <p>연락처: 010-2309-7443 | 이메일: dev@bottlecorp.kr</p>
                    <p className="mt-2">주식회사 바틀에서 운영하는 보비(BoBi)에서 판매되는 모든 상품은 주식회사 바틀에서 책임지고 있습니다.</p>
                    <p className="mt-2">
                        <Link href="/terms" className="underline hover:text-foreground">이용약관</Link>
                        {' | '}
                        <Link href="/privacy" className="underline hover:text-foreground">개인정보처리방침</Link>
                    </p>
                    <p className="mt-2">© 2026 BoBi. All rights reserved.</p>
                </div>
            </main>
        </div>
    );
}

