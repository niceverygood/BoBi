import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    ArrowRight,
    Stethoscope,
    CheckCircle2,
    Sparkles,
    FileText,
    Zap,
    Database,
    ShieldCheck,
} from 'lucide-react';
import { DisclosurePreviewCard } from '@/components/landing/ReportPreviewGallery';
import ReportPreviewGallery from '@/components/landing/ReportPreviewGallery';
import TestimonialMarquee from '@/components/landing/TestimonialMarquee';
import BobiLogo from '@/components/common/BobiLogo';

const VALUE_BULLETS: Array<{ icon: typeof Zap; text: string; highlight?: string }> = [
    { icon: Zap, text: '고객 간편인증 5초 → 5년치 진료이력 자동 로딩', highlight: '5초' },
    { icon: FileText, text: '14,283개 KCD 질병코드로 고지사항 자동 판정', highlight: '14,283개' },
    { icon: Database, text: '심평원 + 공단 검진 + 자동차보험 통합 조회' },
    { icon: ShieldCheck, text: '통원 7회 이상 질환·상시 복용약 자동 검출' },
    { icon: CheckCircle2, text: '분석 결과를 PDF·카카오 알림톡으로 고객 직송' },
];

export default function MedicalInfoUpgradePage() {
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
                        <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>베이직 플랜부터 이용 가능</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3 sm:mb-5 leading-tight">
                        고객 진료정보를 <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">1분 만에</span><br className="hidden sm:block" />
                        <span className="sm:hidden"> </span>자동 조회합니다
                    </h1>
                    <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                        심평원 진료이력 · 공단 검진 · 자동차보험까지 한 번에 통합 분석해
                        고지사항 누락으로 인한 수수료 환수 리스크를 원천 차단합니다
                    </p>
                </div>
            </section>

            {/* 메인 섹션: 좌 미리보기 + 우 CTA */}
            <section className="py-8 sm:py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-5 gap-6 sm:gap-10 items-start">
                        {/* 좌: 실제 아웃풋 미리보기 */}
                        <div className="lg:col-span-3 order-2 lg:order-1">
                            <div className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                실제 분석 결과
                            </div>
                            <DisclosurePreviewCard />
                            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                ↑ 고객 진료이력을 분석해 고지사항 질문별 "예/아니오"를 자동 판정하고,
                                검출된 질환을 KCD 코드로 분류한 샘플입니다.
                            </p>
                        </div>

                        {/* 우: 가치 리스트 + CTA */}
                        <div className="lg:col-span-2 order-1 lg:order-2 lg:sticky lg:top-24">
                            <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-lg">
                                <div className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                                    이런 걸 해드립니다
                                </div>
                                <ul className="space-y-3 mb-6">
                                    {VALUE_BULLETS.map((bullet) => {
                                        const Icon = bullet.icon;
                                        const parts = bullet.highlight
                                            ? bullet.text.split(bullet.highlight)
                                            : null;
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
                                        <span className="text-xs sm:text-sm text-muted-foreground">베이직 플랜</span>
                                        <span className="text-xs text-muted-foreground">7일간 <span className="font-bold text-emerald-600">무료</span></span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-3xl font-bold tracking-tight">19,900</span>
                                        <span className="text-sm text-muted-foreground">원/월</span>
                                        <span className="text-xs text-muted-foreground ml-1">(체험 후)</span>
                                    </div>
                                    <div className="text-[11px] sm:text-xs text-muted-foreground mt-1.5">
                                        카드 등록 후 7일 내 해지 시 결제 0원
                                    </div>
                                </div>

                                {/* Primary CTA */}
                                <Link href="/dashboard/subscribe?plan=basic" className="block">
                                    <Button size="lg" className="w-full h-12 text-sm sm:text-base bg-gradient-primary hover:opacity-90 shadow-lg animate-pulse-glow font-semibold">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        7일 무료로 시작하기
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
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
                    <div>
                        <div className="text-2xl sm:text-4xl font-bold tabular-nums">14,283<span className="text-base sm:text-xl text-muted-foreground">개</span></div>
                        <div className="text-[11px] sm:text-sm text-muted-foreground mt-1">KCD 질병코드</div>
                    </div>
                    <div className="border-x">
                        <div className="text-2xl sm:text-4xl font-bold tabular-nums">1<span className="text-base sm:text-xl text-muted-foreground">분 이내</span></div>
                        <div className="text-[11px] sm:text-sm text-muted-foreground mt-1">자동 조회 완료</div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-4xl font-bold tabular-nums">7<span className="text-base sm:text-xl text-muted-foreground">일</span></div>
                        <div className="text-[11px] sm:text-sm text-muted-foreground mt-1">무료 체험</div>
                    </div>
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
                            진료정보 하나로 시작해서<br className="sm:hidden" /> 전체 보장 분석까지
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
                            통원 7회 누락으로 고민하던 설계사들의 이야기
                        </p>
                    </div>
                </div>
                <TestimonialMarquee />
            </section>

            {/* 마지막 CTA */}
            <section className="py-12 sm:py-20 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-xl sm:text-3xl font-bold tracking-tight mb-3">
                        지금 고객 상담이 있으세요?
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                        7일 무료 체험을 시작하면 오늘 바로 진료정보 조회부터 모든 기능을 쓸 수 있습니다
                    </p>
                    <Link href="/dashboard/subscribe?plan=basic">
                        <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 h-12 bg-gradient-primary hover:opacity-90 shadow-lg">
                            <Sparkles className="w-4 h-4 mr-2" />
                            7일 무료로 시작하기
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-4">
                        카드 등록 후 7일 내 해지 시 결제 0원 · 언제든 해지 가능
                    </p>
                </div>
            </section>
        </div>
    );
}
