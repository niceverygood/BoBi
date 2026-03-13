import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft, Sparkles, Zap, Crown, Building } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';

const PLAN_ICONS: Record<PlanSlug, typeof Sparkles> = {
    free: Sparkles,
    basic: Zap,
    pro: Crown,
    team: Building,
};

const PLAN_COLORS: Record<PlanSlug, string> = {
    free: 'from-slate-500 to-slate-600',
    basic: 'from-blue-500 to-blue-600',
    pro: 'from-violet-500 to-violet-600',
    team: 'from-amber-500 to-amber-600',
};

const FEATURE_COMPARISON = [
    { label: 'AI 고지사항 분석', free: true, basic: true, pro: true, team: true },
    { label: '가입가능 상품 매칭', free: false, basic: true, pro: true, team: true },
    { label: '약관 기반 청구 분석', free: false, basic: false, pro: true, team: true },
    { label: 'PDF 용량 무제한', free: true, basic: true, pro: true, team: true },
    { label: '결과 PDF 다운로드', free: false, basic: true, pro: true, team: true },
    { label: '맞춤 보험사 상품DB', free: false, basic: false, pro: true, team: true },
    { label: '팀 관리 대시보드', free: false, basic: false, pro: false, team: true },
    { label: '우선 지원', free: false, basic: false, pro: true, team: true },
];

export default function PricingPage() {
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
                        무료로 시작하고, 필요할 때 업그레이드하세요. 연간 결제 시 17% 할인됩니다.
                    </p>
                </div>

                {/* Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20 stagger-children">
                    {(Object.entries(PLAN_LIMITS) as [PlanSlug, typeof PLAN_LIMITS[PlanSlug]][]).map(([slug, plan]) => {
                        const Icon = PLAN_ICONS[slug];
                        const gradient = PLAN_COLORS[slug];
                        const isRecommended = plan.recommended;

                        return (
                            <Card
                                key={slug}
                                className={`border-0 shadow-lg relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${isRecommended ? 'ring-2 ring-primary' : ''
                                    }`}
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
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
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
                                            </>
                                        ) : slug === 'team' ? (
                                            <span className="text-2xl font-bold">별도 협의</span>
                                        ) : (
                                            <span className="text-3xl font-bold">무료</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        월 {plan.analysisLimit === -1 ? '무제한' : `${plan.analysisLimit}건`} 분석
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
                                    <Link href="/auth/signup">
                                        <Button
                                            className={`w-full ${isRecommended
                                                ? 'bg-gradient-primary hover:opacity-90'
                                                : ''
                                                }`}
                                            variant={isRecommended ? 'default' : 'outline'}
                                        >
                                            {slug === 'free' ? '무료로 시작' : slug === 'team' ? '문의하기' : '시작하기'}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Feature Comparison Table */}
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-center mb-8">기능 비교표</h2>
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-4 font-medium text-sm min-w-[200px]">기능</th>
                                            {(['free', 'basic', 'pro', 'team'] as PlanSlug[]).map((slug) => (
                                                <th key={slug} className="p-4 text-center font-medium text-sm min-w-[120px]">
                                                    {PLAN_LIMITS[slug].name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Analysis limits row */}
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium">월간 분석 건수</td>
                                            {(['free', 'basic', 'pro', 'team'] as PlanSlug[]).map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm font-semibold">
                                                    {PLAN_LIMITS[slug].analysisLimit === -1
                                                        ? '무제한'
                                                        : `${PLAN_LIMITS[slug].analysisLimit}건`}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* File size row */}
                                        <tr className="border-b bg-muted/10">
                                            <td className="p-4 text-sm font-medium">PDF 최대 크기</td>
                                            {(['free', 'basic', 'pro', 'team'] as PlanSlug[]).map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm">
                                                    {PLAN_LIMITS[slug].maxFileSizeMb === -1
                                                        ? '제한 없음'
                                                        : `${PLAN_LIMITS[slug].maxFileSizeMb}MB`}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* History row */}
                                        <tr className="border-b">
                                            <td className="p-4 text-sm font-medium">분석 이력 보관</td>
                                            {(['free', 'basic', 'pro', 'team'] as PlanSlug[]).map((slug) => (
                                                <td key={slug} className="p-4 text-center text-sm">
                                                    {PLAN_LIMITS[slug].historyDays === -1
                                                        ? '무제한'
                                                        : `${PLAN_LIMITS[slug].historyDays}일`}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Feature rows */}
                                        {FEATURE_COMPARISON.map((feature, idx) => (
                                            <tr key={feature.label} className={`border-b ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}>
                                                <td className="p-4 text-sm">{feature.label}</td>
                                                {(['free', 'basic', 'pro', 'team'] as PlanSlug[]).map((slug) => (
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

                {/* CTA */}
                <div className="text-center mt-16 animate-fade-in">
                    <h2 className="text-2xl font-bold mb-3">지금 바로 시작하세요</h2>
                    <p className="text-muted-foreground mb-6">무료 플랜으로 보비의 AI 분석을 직접 체험해보세요.</p>
                    <Link href="/auth/signup">
                        <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-lg px-8">
                            무료로 시작하기
                        </Button>
                    </Link>
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
                    <p>주식회사 바틀 | 대표자: 한승수 | 사업자등록번호: 376-87-01076</p>
                    <p>경기도 성남시 분당구 판교로289번길 20, 2동 8층 (삼평동, 판교테크노밸리 스타트업 캠퍼스)</p>
                    <p>연락처: 010-2309-7443</p>
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
