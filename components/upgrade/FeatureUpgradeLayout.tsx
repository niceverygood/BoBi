import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ReportPreviewGallery from '@/components/landing/ReportPreviewGallery';
import TestimonialMarquee from '@/components/landing/TestimonialMarquee';
import BobiLogo from '@/components/common/BobiLogo';

export type PlanTier = 'basic' | 'pro';

export type ValueBullet = {
    icon: LucideIcon;
    text: string;
    highlight?: string;
};

export type StatItem = {
    value: string;
    unit: string;
    label: string;
};

export type FeatureUpgradeLayoutProps = {
    /** 배지 텍스트 (예: "Pro 플랜 전용 기능") */
    badgeText: string;
    /** 배지 아이콘 */
    BadgeIcon: LucideIcon;
    /** 히어로 타이틀 */
    title: ReactNode;
    /** 히어로 서브 */
    subtitle: ReactNode;
    /** 실제 아웃풋 미리보기 카드 (ReportPreviewGallery의 카드 하나) */
    previewCard: ReactNode;
    /** 미리보기 하단 설명 */
    previewCaption: string;
    /** 우측 가치 불릿 */
    valueBullets: ValueBullet[];
    /** 필요 플랜 정보 */
    planTier: PlanTier;
    /** 하단 3분할 스탯 밴드 */
    stats: [StatItem, StatItem, StatItem];
    /** 현장 후기 섹션 서브카피 */
    testimonialsSubcopy: string;
    /** 마지막 CTA 섹션 타이틀 */
    finalCtaTitle: string;
    /** 마지막 CTA 섹션 서브카피 */
    finalCtaSubcopy: string;
};

const PLAN_META: Record<PlanTier, { displayName: string; priceMonthly: string; ctaLabel: string }> = {
    basic: {
        displayName: '베이직',
        priceMonthly: '19,900',
        ctaLabel: '3일 무료로 시작하기',
    },
    pro: {
        displayName: 'Pro',
        priceMonthly: '39,900',
        ctaLabel: 'Pro 플랜으로 시작하기',
    },
};

export default function FeatureUpgradeLayout(props: FeatureUpgradeLayoutProps) {
    const {
        badgeText,
        BadgeIcon,
        title,
        subtitle,
        previewCard,
        previewCaption,
        valueBullets,
        planTier,
        stats,
        testimonialsSubcopy,
        finalCtaTitle,
        finalCtaSubcopy,
    } = props;

    const plan = PLAN_META[planTier];
    // Pro 기능은 Pro 플랜 필요. 단, 저항을 낮추기 위해 Basic 3일 체험 유입 경로도 별도 제공.
    const primaryHref = planTier === 'pro' ? '/dashboard/subscribe?plan=pro' : '/dashboard/subscribe?plan=basic';
    const primaryLabel = planTier === 'pro' ? 'Pro 플랜으로 시작하기' : '3일 무료로 시작하기';
    const showBasicTrialFallback = planTier === 'pro';

    return (
        <div className="min-h-screen bg-background">
            {/* 상단 네비 */}
            <nav className="sticky top-0 z-50 glass border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">대시보드</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <BobiLogo size="sm" />
                            <span className="text-sm sm:text-base font-semibold tracking-tight">보비 <span className="text-primary">BoBi</span></span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-10 sm:pt-16 pb-8 sm:pb-12 px-4 bg-gradient-hero">
                <div className="max-w-6xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
                        <BadgeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>{badgeText}</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-5 leading-tight">
                        {title}
                    </h1>
                    <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                        {subtitle}
                    </p>
                </div>
            </section>

            {/* 메인: 좌 미리보기 + 우 CTA */}
            <section className="py-8 sm:py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-5 gap-6 sm:gap-10 items-start">
                        <div className="lg:col-span-3 order-2 lg:order-1">
                            <div className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                실제 분석 결과
                            </div>
                            {previewCard}
                            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                ↑ {previewCaption}
                            </p>
                        </div>

                        <div className="lg:col-span-2 order-1 lg:order-2 lg:sticky lg:top-24">
                            <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-lg">
                                <div className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                                    이런 걸 해드립니다
                                </div>
                                <ul className="space-y-3 mb-6">
                                    {valueBullets.map((bullet) => {
                                        const Icon = bullet.icon;
                                        const parts = bullet.highlight ? bullet.text.split(bullet.highlight) : null;
                                        return (
                                            <li key={bullet.text} className="flex items-start gap-3">
                                                <div className="shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                                                    <Icon className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <span className="text-sm sm:text-[15px] leading-relaxed">
                                                    {parts ? (
                                                        <>
                                                            {parts[0]}
                                                            <span className="font-bold text-primary">{bullet.highlight}</span>
                                                            {parts[1]}
                                                        </>
                                                    ) : (
                                                        bullet.text
                                                    )}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {/* 가격 안내 */}
                                <div className="p-4 rounded-xl bg-muted/60 mb-5">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className="text-xs sm:text-sm text-muted-foreground">{plan.displayName} 플랜</span>
                                        {planTier === 'basic' && (
                                            <span className="text-xs text-muted-foreground">3일간 <span className="font-bold text-emerald-600">무료</span></span>
                                        )}
                                        {planTier === 'pro' && (
                                            <span className="text-xs text-muted-foreground">모든 기능 <span className="font-bold text-emerald-600">무제한</span></span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-3xl font-bold tracking-tight">{plan.priceMonthly}</span>
                                        <span className="text-sm text-muted-foreground">원/월</span>
                                        {planTier === 'basic' && <span className="text-xs text-muted-foreground ml-1">(체험 후)</span>}
                                    </div>
                                    {planTier === 'basic' && (
                                        <div className="text-[11px] sm:text-xs text-muted-foreground mt-1.5">
                                            카드 등록 후 3일 내 해지 시 결제 0원
                                        </div>
                                    )}
                                    {planTier === 'pro' && (
                                        <div className="text-[11px] sm:text-xs text-muted-foreground mt-1.5">
                                            질병 위험도 · 미래의 나 · 가상 영수증 포함
                                        </div>
                                    )}
                                </div>

                                {/* Primary CTA */}
                                <Link href={primaryHref} className="block">
                                    <Button size="lg" className="w-full h-12 text-sm sm:text-base bg-gradient-primary hover:opacity-90 shadow-lg animate-pulse-glow font-semibold">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        {primaryLabel}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>

                                {/* Pro 기능 전용: Basic 체험 부속 경로 */}
                                {showBasicTrialFallback && (
                                    <Link href="/dashboard/subscribe?plan=basic" className="block mt-3">
                                        <Button variant="outline" size="sm" className="w-full h-10 text-xs sm:text-sm">
                                            먼저 3일 무료 체험부터 (베이직)
                                        </Button>
                                    </Link>
                                )}

                                <Link href="/dashboard" className="block mt-2">
                                    <Button variant="ghost" size="sm" className="w-full h-10 text-xs sm:text-sm text-muted-foreground">
                                        나중에 할게요
                                    </Button>
                                </Link>

                                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                    <span>심평원 · 공단 공식 데이터 기반</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 신뢰 숫자 미니 밴드 */}
            <section className="py-8 sm:py-12 px-4 bg-muted/30 border-y">
                <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
                    {stats.map((s, idx) => (
                        <div key={s.label} className={idx === 1 ? 'border-x' : ''}>
                            <div className="text-2xl sm:text-4xl font-bold tabular-nums">
                                {s.value}<span className="text-base sm:text-xl text-muted-foreground">{s.unit}</span>
                            </div>
                            <div className="text-[11px] sm:text-sm text-muted-foreground mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 함께 쓰게 되는 다른 기능들 */}
            <section className="py-12 sm:py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>함께 쓰게 되는 기능들</span>
                        </div>
                        <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
                            한 고객에게 이 모든 분석이 가능합니다
                        </h2>
                    </div>
                    <ReportPreviewGallery />
                </div>
            </section>

            {/* 설계사 후기 */}
            <section className="py-10 sm:py-16 bg-background border-y">
                <div className="max-w-6xl mx-auto mb-6 sm:mb-8 px-4">
                    <div className="text-center">
                        <h2 className="text-xl sm:text-3xl font-bold tracking-tight mb-2">
                            이미 보비로 실적을 바꾸고 있습니다
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {testimonialsSubcopy}
                        </p>
                    </div>
                </div>
                <TestimonialMarquee />
            </section>

            {/* 마지막 CTA */}
            <section className="py-12 sm:py-20 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight mb-3">
                        {finalCtaTitle}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                        {finalCtaSubcopy}
                    </p>
                    <Link href={primaryHref}>
                        <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 h-12 bg-gradient-primary hover:opacity-90 shadow-lg">
                            <Sparkles className="w-4 h-4 mr-2" />
                            {primaryLabel}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    {planTier === 'basic' && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-4">
                            카드 등록 후 3일 내 해지 시 결제 0원 · 언제든 해지 가능
                        </p>
                    )}
                    {planTier === 'pro' && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-4">
                            언제든 해지 가능 · 질병 위험도/미래의 나/가상 영수증 모두 포함
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
