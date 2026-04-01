'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Loader2, ArrowLeft, CreditCard, Shield, Zap, Crown, Apple, Smartphone, Users, Building, Tag, X } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getPlatform, isNative, type AppPlatform } from '@/lib/iap/platform';

const PLAN_ICONS: Record<string, typeof Zap> = {
    basic: Zap,
    pro: Crown,
    team_basic: Users,
    team_pro: Building,
};

export default function SubscribePage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
            <SubscribeContent />
        </Suspense>
    );
}

function SubscribeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planParam = searchParams.get('plan') as PlanSlug | null;
    const { plan: currentPlan, subscription, loading: subLoading } = useSubscription();

    const [selectedPlan, setSelectedPlan] = useState<PlanSlug>(planParam || 'basic');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [paymentMethod, setPaymentMethod] = useState<'kakaopay' | 'card'>('card');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [platform, setPlatform] = useState<AppPlatform>('web');
    const [iapReady, setIapReady] = useState(false);

    // Coupon
    const couponParam = searchParams.get('coupon');
    const [couponCode, setCouponCode] = useState(couponParam || '');
    const [couponAutoApplied, setCouponAutoApplied] = useState(false);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<{
        id: string;
        code: string;
        description: string;
        discountLabel: string;
        discountAmount: number;
        finalPrice: number;
        upgradeToPlan?: string | null;
        upgradePlanName?: string | null;
    } | null>(null);

    useEffect(() => {
        const detectedPlatform = getPlatform();
        setPlatform(detectedPlatform);

        // 네이티브 앱이면 인앱결제 초기화
        if (detectedPlatform !== 'web') {
            import('@/lib/iap/store').then(({ initializeStore }) => {
                initializeStore().then(setIapReady);
            });
        }
    }, []);

    useEffect(() => {
        if (planParam && planParam !== 'free' && PLAN_LIMITS[planParam]) {
            setSelectedPlan(planParam);
        }
    }, [planParam]);

    // 카카오페이 콜백 처리 (approve 후 리다이렉트)
    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'success') {
            setSuccess(true);
            const plan = searchParams.get('plan');
            if (plan && PLAN_LIMITS[plan as PlanSlug]) {
                setSelectedPlan(plan as PlanSlug);
            }
        } else if (status === 'fail') {
            setError(searchParams.get('error') ? decodeURIComponent(searchParams.get('error')!) : '결제에 실패했습니다.');
        } else if (status === 'cancel') {
            setError('결제가 취소되었습니다.');
        }
    }, [searchParams]);

    // URL 쿠폰 파라미터 자동 적용 (네이티브 앱 → 웹 결제 시)
    useEffect(() => {
        if (couponParam && !couponAutoApplied && !appliedCoupon && selectedPlan) {
            setCouponAutoApplied(true);
            setCouponCode(couponParam.toUpperCase());
            // 자동 쿠폰 검증
            (async () => {
                setCouponLoading(true);
                try {
                    const res = await fetch('/api/coupon/validate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: couponParam,
                            planSlug: selectedPlan,
                            billingCycle,
                        }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setAppliedCoupon({
                            id: data.coupon.id,
                            code: data.coupon.code,
                            description: data.coupon.description,
                            discountLabel: data.pricing.discountLabel,
                            discountAmount: data.pricing.discountAmount,
                            finalPrice: data.pricing.finalPrice,
                            upgradeToPlan: data.coupon.upgradeToPlan || null,
                            upgradePlanName: data.upgradePlan?.name || null,
                        });
                    }
                } catch { /* ignore */ } finally {
                    setCouponLoading(false);
                }
            })();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [couponParam, selectedPlan]);

    const planInfo = PLAN_LIMITS[selectedPlan];
    const originalAmount = billingCycle === 'yearly' ? planInfo.priceYearly : planInfo.priceMonthly;
    const couponDiscount = appliedCoupon?.discountAmount || 0;
    const amount = appliedCoupon ? appliedCoupon.finalPrice : originalAmount;
    const discount = billingCycle === 'yearly'
        ? Math.round((1 - planInfo.priceYearly / (planInfo.priceMonthly * 12)) * 100)
        : 0;

    // 쿠폰 검증
    const validateCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError('쿠폰 코드를 입력해주세요.');
            return;
        }
        setCouponLoading(true);
        setCouponError(null);

        try {
            const res = await fetch('/api/coupon/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCode,
                    planSlug: selectedPlan,
                    billingCycle,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setCouponError(data.error || '유효하지 않은 쿠폰입니다.');
                return;
            }
            setAppliedCoupon({
                id: data.coupon.id,
                code: data.coupon.code,
                description: data.coupon.description,
                discountLabel: data.pricing.discountLabel,
                discountAmount: data.pricing.discountAmount,
                finalPrice: data.pricing.finalPrice,
                upgradeToPlan: data.coupon.upgradeToPlan || null,
                upgradePlanName: data.upgradePlan?.name || null,
            });
        } catch {
            setCouponError('쿠폰 검증 중 오류가 발생했습니다.');
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError(null);
    };

    // 플랜 변경 시 쿠폰 초기화
    useEffect(() => {
        if (appliedCoupon) {
            removeCoupon();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlan, billingCycle]);

    // 인앱결제 (iOS / Android)
    const handleIAPSubscribe = async () => {
        setLoading(true);
        setError(null);

        try {
            const { purchase } = await import('@/lib/iap/store');
            const result = await purchase(selectedPlan as 'basic' | 'pro', billingCycle);

            if (!result.success) {
                setError(result.error || '결제에 실패했습니다.');
                setLoading(false);
                return;
            }

            // 영수증/토큰 둘 다 없으면 에러
            if (!result.receipt && !result.transactionId) {
                console.error('[IAP] No receipt or transactionId returned from purchase');
                setError('결제는 완료되었으나 영수증 정보를 받지 못했습니다. 앱을 재시작한 후 구매 복원을 시도해주세요.');
                setLoading(false);
                return;
            }

            console.log('[IAP] Sending receipt to server:', {
                platform,
                hasReceipt: !!result.receipt,
                hasToken: !!result.transactionId,
                productId: `kr.bobi.app.${selectedPlan}.${billingCycle}`,
            });

            // 서버에 영수증 검증 요청
            const res = await fetch('/api/iap/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    receipt: result.receipt,
                    productId: `kr.bobi.app.${selectedPlan}.${billingCycle}`,
                    purchaseToken: result.transactionId || result.receipt,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '구독 등록에 실패했습니다.');
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch (err) {
            console.error('[IAP] Subscribe error:', err);
            setError((err as Error).message || '결제 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 웹 결제 — 카카오페이 직접 API
    const handleKakaoPaySubscribe = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/kakaopay/ready', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planSlug: selectedPlan,
                    billingCycle,
                    ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                    ...(appliedCoupon?.upgradeToPlan ? { upgradePlanSlug: appliedCoupon.upgradeToPlan } : {}),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '카카오페이 결제 준비에 실패했습니다.');
                setLoading(false);
                return;
            }

            // 카카오페이 결제 페이지로 리다이렉트
            const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
            window.location.href = isMobile ? data.mobileRedirectUrl : data.redirectUrl;
        } catch (err) {
            setError((err as Error).message || '결제 처리 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    // 웹 결제 — 신용카드 (PortOne)
    const handleCardSubscribe = async () => {
        setLoading(true);
        setError(null);

        try {
            const PortOne = await import('@portone/browser-sdk/v2');

            const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
            const channelKey = process.env.NEXT_PUBLIC_PORTONE_INICIS_CHANNEL_KEY || process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

            if (!storeId || !channelKey) {
                console.error('[PortOne] Missing env vars:', { storeId: !!storeId, channelKey: !!channelKey });
                setError('결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요. (PORTONE_KEY_MISSING)');
                setLoading(false);
                return;
            }

            const response = await PortOne.requestIssueBillingKey({
                storeId,
                channelKey,
                billingKeyMethod: 'CARD',
                issueId: `billing-${Date.now()}`,
                issueName: `보비 ${planInfo.name} 플랜 (${billingCycle === 'yearly' ? '연간' : '월간'})`,
                customer: {
                    customerId: `bobi-user-${Date.now()}`,
                },
            });

            if (response?.code) {
                if (response.code === 'FAILURE_TYPE_PG') {
                    setError('결제가 취소되었습니다.');
                } else {
                    setError(response.message || '빌링키 발급에 실패했습니다.');
                }
                setLoading(false);
                return;
            }

            if (!response?.billingKey) {
                setError('빌링키를 발급받지 못했습니다.');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/billing/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billingKey: response.billingKey,
                    planSlug: selectedPlan,
                    billingCycle,
                    paymentMethod: 'card',
                    ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                    ...(appliedCoupon?.upgradeToPlan ? { upgradePlanSlug: appliedCoupon.upgradeToPlan } : {}),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '구독 등록에 실패했습니다.');
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError((err as Error).message || '결제 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 무료 쿠폰 결제 (금액 0원일 때 — 결제 없이 구독 생성)
    const handleFreeCouponSubscribe = async () => {
        setLoading(true);
        setError(null);

        try {
            if (!appliedCoupon) {
                setError('쿠폰 정보가 없습니다.');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/coupon/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    couponCode: appliedCoupon.code,
                    planSlug: appliedCoupon.upgradeToPlan || selectedPlan,
                    billingCycle,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '쿠폰 구독 처리에 실패했습니다.');
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError((err as Error).message || '쿠폰 처리 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 웹 결제: 금액 0원이면 무료 쿠폰 처리, 아니면 결제 수단별 분기
    const handleWebSubscribe = async () => {
        // 쿠폰 적용으로 0원인 경우 결제 없이 바로 구독 생성
        if (amount === 0 && appliedCoupon) {
            return handleFreeCouponSubscribe();
        }
        if (paymentMethod === 'kakaopay') {
            return handleKakaoPaySubscribe();
        }
        return handleCardSubscribe();
    };

    const handleSubscribe = platform === 'web' ? handleWebSubscribe : handleIAPSubscribe;

    if (success) {
        return (
            <div className="max-w-lg mx-auto mt-12 animate-fade-in">
                <Card className="border-0 shadow-xl text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl">구독 완료!</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {planInfo.name} 플랜이 활성화되었습니다.<br />
                            지금 바로 모든 기능을 사용할 수 있습니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={() => router.push('/dashboard')}
                            className="w-full h-11 bg-gradient-primary hover:opacity-90"
                        >
                            대시보드로 이동
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard/analyze')}
                            className="w-full h-11"
                        >
                            바로 분석 시작하기
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const paymentLabel = (amount === 0 && appliedCoupon)
        ? '🎉 무료 쿠폰 적용하기'
        : platform === 'ios'
            ? 'Apple로 결제하기'
            : platform === 'android'
                ? 'Google Play로 결제하기'
                : paymentMethod === 'kakaopay'
                    ? '카카오페이로 결제하기'
                    : '신용카드로 결제하기';

    const paymentProviderLabel = platform === 'ios'
        ? 'Apple App Store'
        : platform === 'android'
            ? 'Google Play'
            : paymentMethod === 'kakaopay'
                ? '카카오페이'
                : 'KG이니시스';

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">구독 신청</h1>
                    <p className="text-muted-foreground mt-0.5">플랜을 선택하고 결제를 진행하세요</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
                {/* Left: Plan Selection */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Plan Selector */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">플랜 선택</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">개인 플랜</p>
                            {(['basic', 'pro'] as PlanSlug[]).map((slug) => {
                                const info = PLAN_LIMITS[slug];
                                const Icon = PLAN_ICONS[slug];
                                const colorMap: Record<string, string> = { basic: 'bg-blue-100', pro: 'bg-violet-100', team: 'bg-teal-100', business: 'bg-amber-100', enterprise: 'bg-rose-100' };
                                const textMap: Record<string, string> = { basic: 'text-blue-600', pro: 'text-violet-600', team: 'text-teal-600', business: 'text-amber-600', enterprise: 'text-rose-600' };
                                return (
                                    <button
                                        key={slug}
                                        onClick={() => setSelectedPlan(slug)}
                                        className={cn(
                                            'w-full p-4 rounded-xl border-2 text-left transition-all',
                                            selectedPlan === slug
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/30'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[slug])}>
                                                    <Icon className={cn('w-5 h-5', textMap[slug])} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{info.name}</span>
                                                        {info.recommended && <Badge variant="default" className="text-[10px] px-1.5 py-0">추천</Badge>}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {info.analysisLimit === -1 ? '무제한 분석' : `월 ${info.analysisLimit}건 분석`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{info.priceMonthly.toLocaleString()}원<span className="font-normal text-sm text-muted-foreground">/월</span></p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            <p className="text-xs text-muted-foreground mb-2 mt-4 font-medium">팀 / GA 플랜</p>
                            {(['team_basic', 'team_pro'] as PlanSlug[]).map((slug) => {
                                const info = PLAN_LIMITS[slug];
                                const Icon = PLAN_ICONS[slug];
                                const colorMap: Record<string, string> = { team_basic: 'bg-teal-100', team_pro: 'bg-amber-100' };
                                const textMap: Record<string, string> = { team_basic: 'text-teal-600', team_pro: 'text-amber-600' };
                                return (
                                    <button
                                        key={slug}
                                        onClick={() => setSelectedPlan(slug)}
                                        className={cn(
                                            'w-full p-4 rounded-xl border-2 text-left transition-all',
                                            selectedPlan === slug
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/30'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[slug])}>
                                                    <Icon className={cn('w-5 h-5', textMap[slug])} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{info.name}</span>
                                                        {info.recommended && <Badge variant="default" className="text-[10px] px-1.5 py-0">인기</Badge>}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {info.includedSeats}명 포함 · 인당 {info.perSeatPrice?.toLocaleString()}원
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{info.priceMonthly.toLocaleString()}원<span className="font-normal text-sm text-muted-foreground">/월</span></p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Billing Cycle */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">결제 주기</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {(['monthly', 'yearly'] as const).map((cycle) => {
                                const info = PLAN_LIMITS[selectedPlan];
                                const cycleAmount = cycle === 'yearly' ? info.priceYearly : info.priceMonthly;
                                const cycleMonthly = cycle === 'yearly' ? Math.round(info.priceYearly / 12) : info.priceMonthly;
                                const cycleDiscount = cycle === 'yearly'
                                    ? Math.round((1 - info.priceYearly / (info.priceMonthly * 12)) * 100)
                                    : 0;

                                return (
                                    <button
                                        key={cycle}
                                        onClick={() => setBillingCycle(cycle)}
                                        className={cn(
                                            'w-full p-4 rounded-xl border-2 text-left transition-all',
                                            billingCycle === cycle
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/30'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{cycle === 'monthly' ? '월간 결제' : '연간 결제'}</span>
                                                    {cycleDiscount > 0 && (
                                                        <Badge className="bg-green-100 text-green-700 text-[10px]">
                                                            {cycleDiscount}% 할인
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                    {cycle === 'monthly' ? '매월 자동 결제' : '매년 자동 결제'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{cycleAmount.toLocaleString()}원</p>
                                                {cycle === 'yearly' && (
                                                    <p className="text-xs text-muted-foreground">월 {cycleMonthly.toLocaleString()}원</p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Features */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">포함 기능</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2.5">
                                {planInfo.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Order Summary */}
                <div className="lg:col-span-2">
                    <div className="sticky top-20 space-y-4">
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    결제 정보
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">플랜</span>
                                        <span className="font-medium">{planInfo.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">결제 주기</span>
                                        <span className="font-medium">{billingCycle === 'yearly' ? '연간' : '월간'}</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>할인</span>
                                            <span>-{discount}%</span>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* 쿠폰 코드 입력 */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-primary" />
                                        할인 쿠폰
                                    </p>

                                    {appliedCoupon ? (
                                        <div className="space-y-2">
                                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <code className="text-sm font-mono font-bold text-green-700 dark:text-green-400">{appliedCoupon.code}</code>
                                                        <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                                                            {appliedCoupon.discountLabel}
                                                            {appliedCoupon.description && ` — ${appliedCoupon.description}`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={removeCoupon}
                                                        className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                    >
                                                        <X className="w-4 h-4 text-green-600" />
                                                    </button>
                                                </div>
                                            </div>
                                            {appliedCoupon.upgradeToPlan && appliedCoupon.upgradePlanName && (
                                                <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900">
                                                    <div className="flex items-center gap-2">
                                                        <Crown className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                                                                🚀 {appliedCoupon.upgradePlanName} 플랜으로 업그레이드!
                                                            </p>
                                                            <p className="text-xs text-violet-600 dark:text-violet-500">
                                                                {planInfo.name} 가격으로 {appliedCoupon.upgradePlanName} 플랜의 모든 기능을 이용할 수 있습니다.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* 네이티브 앱에서 쿠폰 적용 시 웹 결제 안내 */}
                                            {platform !== 'web' && (
                                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                                                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                                                        💳 쿠폰 할인은 {platform === 'ios' ? 'App Store' : 'Google Play'} 결제에 적용할 수 없어 웹 결제로 진행됩니다.
                                                    </p>
                                                    <a
                                                        href={`https://bo-bi.vercel.app/dashboard/subscribe?plan=${selectedPlan}&coupon=${appliedCoupon.code}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-full py-2.5 text-center text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                                    >
                                                        🌐 웹에서 {amount.toLocaleString()}원으로 결제하기
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex gap-2">
                                                <input
                                                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    placeholder="쿠폰 코드 입력"
                                                    value={couponCode}
                                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                    onKeyDown={e => e.key === 'Enter' && validateCoupon()}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={validateCoupon}
                                                    disabled={couponLoading || !couponCode.trim()}
                                                    className="shrink-0"
                                                >
                                                    {couponLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        '적용'
                                                    )}
                                                </Button>
                                            </div>
                                            {couponError && (
                                                <p className="text-xs text-destructive">{couponError}</p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <Separator />

                                <div className="flex justify-between items-baseline">
                                    <span className="text-muted-foreground text-sm">결제 금액</span>
                                    <div className="text-right">
                                        {appliedCoupon && (
                                            <p className="text-sm text-muted-foreground line-through">
                                                {originalAmount.toLocaleString()}원
                                            </p>
                                        )}
                                        <p className="text-2xl font-bold">
                                            {amount.toLocaleString()}원
                                            {appliedCoupon && amount === 0 && (
                                                <span className="text-sm font-normal text-green-600 ml-1">무료</span>
                                            )}
                                        </p>
                                        {appliedCoupon && couponDiscount > 0 && (
                                            <p className="text-xs text-green-600 font-medium">
                                                -{couponDiscount.toLocaleString()}원 할인 적용
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {billingCycle === 'yearly' ? '연간' : '월간'} (VAT 포함)
                                        </p>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                                        {error}
                                    </div>
                                )}

                                {/* 결제 수단 */}
                                {platform === 'web' && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">결제 수단</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            <button
                                                onClick={() => setPaymentMethod('card')}
                                                className={cn(
                                                    'p-3 rounded-lg border-2 text-center text-sm transition-all',
                                                    'border-primary bg-primary/5 font-semibold'
                                                )}
                                            >
                                                신용카드 (KG이니시스)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 네이티브 앱 결제 안내 */}
                                {platform !== 'web' && (
                                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                                        <div className="flex items-center gap-2 font-medium mb-1">
                                            {platform === 'ios' ? (
                                                <><Apple className="w-4 h-4" /> Apple로 결제</>
                                            ) : (
                                                <><Smartphone className="w-4 h-4" /> Google Play로 결제</>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {platform === 'ios' ? 'App Store' : 'Google Play'} 결제 시스템을 통해 안전하게 처리됩니다.
                                        </p>
                                    </div>
                                )}

                                {/* 네이티브에서 쿠폰 적용 시 IAP 버튼 숨김 (웹 결제 링크 사용) */}
                                {!(platform !== 'web' && appliedCoupon) && (
                                <Button
                                    onClick={handleSubscribe}
                                    disabled={loading || subLoading || (platform !== 'web' && !iapReady)}
                                    className="w-full h-12 text-base bg-gradient-primary hover:opacity-90 transition-opacity"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            결제 진행 중...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5 mr-2" />
                                            {paymentLabel}
                                        </>
                                    )}
                                </Button>
                                )}

                                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                                    <Shield className="w-3.5 h-3.5" />
                                    안전한 결제 ({paymentProviderLabel})
                                </div>

                                <div className="text-[11px] text-muted-foreground space-y-1 pt-2 border-t">
                                    <p>• 구독은 자동 갱신되며, {platform === 'ios' ? '설정 앱' : platform === 'android' ? 'Google Play' : '설정 페이지'}에서 언제든 해지 가능합니다.</p>
                                    <p>• 7일 이내 미사용 시 전액 환불 가능합니다.</p>
                                    <p>• 결제 진행 시 <Link href="/terms" className="text-primary underline">이용약관</Link> 및 <Link href="/privacy" className="text-primary underline">개인정보처리방침</Link>에 동의합니다.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
