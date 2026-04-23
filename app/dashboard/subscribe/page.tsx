'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Loader2, ArrowLeft, CreditCard, Shield, Zap, Crown, Apple, Smartphone, Building2, Tag, X, ArrowRight, Sparkles as SparklesIcon, Calendar } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api/client';
import Link from 'next/link';
import { getPlatform, isNative, type AppPlatform } from '@/lib/iap/platform';
import { openExternal } from '@/lib/open-external';
import EnterpriseInquiryDialog from '@/components/subscribe/EnterpriseInquiryDialog';
import { SocialProofInline } from '@/components/common/SocialProof';

// 개인 플랜 아이콘 (팀 플랜은 엔터프라이즈 문의로 대체됨)
const PLAN_ICONS: Record<string, typeof Zap> = {
    basic: Zap,
    pro: Crown,
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
    const [paymentMethod, setPaymentMethod] = useState<'kakaopay' | 'card' | 'tosspayments'>('kakaopay');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [platform, setPlatform] = useState<AppPlatform>('web');
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userName, setUserName] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [iapReady, setIapReady] = useState(false);
    const [enterpriseDialogOpen, setEnterpriseDialogOpen] = useState(false);

    // 7일 무료 체험
    const [trialEligible, setTrialEligible] = useState(false);
    const [trialDays, setTrialDays] = useState(7);
    const [useTrial, setUseTrial] = useState(false);
    const [trialChecked, setTrialChecked] = useState(false);

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

        // 모바일 감지 — 이니시스 빌링키가 모바일 웹 미지원
        const mobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
        setIsMobile(mobile);
        if (mobile) setPaymentMethod('kakaopay'); // 모바일은 카카오페이 기본

        // 유저 이메일 가져오기 (이니시스 V2 빌링키 필수)
        import('@/lib/supabase/client').then(({ createClient }) => {
            const supabase = createClient();
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user?.email) setUserEmail(user.email);
                if (user?.phone) setUserPhone(user.phone);
                else if (user?.user_metadata?.phone) setUserPhone(user.user_metadata.phone);
                const name = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
                if (name) setUserName(name);
            });
        });
    }, []);

    useEffect(() => {
        if (planParam && planParam !== 'free' && PLAN_LIMITS[planParam]) {
            setSelectedPlan(planParam);
        }
    }, [planParam]);

    // 체험 모드일 때 결제 수단 제한:
    //   토스·카카오페이는 체험 지원. 신용카드(이니시스)는 미지원 → 토스로 강제.
    useEffect(() => {
        if (useTrial && trialEligible && paymentMethod === 'card') {
            setPaymentMethod('tosspayments');
        }
    }, [useTrial, trialEligible, paymentMethod]);

    // 선택 플랜에 대한 7일 무료 체험 자격 체크
    useEffect(() => {
        if (subLoading) return;
        const fetchEligibility = async () => {
            try {
                const data = await apiFetch<{ eligible: boolean; trialDays?: number }>(
                    `/api/billing/trial-eligibility?plan=${selectedPlan}`,
                );
                setTrialEligible(!!data.eligible);
                if (data.trialDays) setTrialDays(data.trialDays);
                // 자격이 있고 월간 결제면 기본으로 체험 모드 체크 (월간에서만 체험 제공)
                if (data.eligible && billingCycle === 'monthly') {
                    setUseTrial(true);
                } else {
                    setUseTrial(false);
                }
            } catch {
                setTrialEligible(false);
                setUseTrial(false);
            } finally {
                setTrialChecked(true);
            }
        };
        fetchEligibility();
    }, [selectedPlan, billingCycle, subLoading]);

    // 토스페이먼츠 콜백 처리
    useEffect(() => {
        const tossStatus = searchParams.get('toss_status');
        if (tossStatus === 'success') {
            setSuccess(true);
            import('@/lib/analytics/events').then(({ track }) => {
                track('checkout_completed', { provider: 'tosspayments_direct' });
            }).catch(() => { });
            return;
        }
        if (tossStatus === 'failed' || tossStatus === 'payment_failed' || tossStatus === 'sub_create_failed') {
            const code = searchParams.get('code') || '';
            const msg = searchParams.get('msg') || '';
            setError(`토스페이먼츠 결제 실패 (${code}): ${decodeURIComponent(msg) || '다시 시도해주세요.'}`);
            import('@/lib/analytics/events').then(({ track }) => {
                track('checkout_failed', { provider: 'tosspayments_direct', code });
            }).catch(() => { });
            return;
        }
    }, [searchParams]);

    // INICIS 직접 연동 콜백 처리
    useEffect(() => {
        const inicisStatus = searchParams.get('inicis_status');
        if (inicisStatus === 'success') {
            setSuccess(true);
            import('@/lib/analytics/events').then(({ track }) => {
                track('checkout_completed', { provider: 'inicis_direct' });
            }).catch(() => { });
            return;
        }
        if (inicisStatus === 'failed' || inicisStatus === 'payment_failed' || inicisStatus === 'sub_create_failed') {
            const code = searchParams.get('code') || '';
            const msg = searchParams.get('msg') || '';
            setError(`결제 실패 (${code}): ${decodeURIComponent(msg) || '다시 시도해주세요.'}`);
            import('@/lib/analytics/events').then(({ track }) => {
                track('checkout_failed', { provider: 'inicis_direct', code });
            }).catch(() => { });
            return;
        }
        if (inicisStatus === 'closed' || searchParams.get('inicis_closed') === 'true') {
            setError('결제가 취소되었습니다.');
            return;
        }
    }, [searchParams]);

    // 카카오페이 콜백 처리 (approve 후 리다이렉트)
    useEffect(() => {
        const status = searchParams.get('status');
        const cardPaymentId = searchParams.get('paymentId');

        // 카드 결제 리다이렉트 콜백 (모바일에서 리다이렉트 방식)
        if (status === 'card_success' && cardPaymentId) {
            (async () => {
                setLoading(true);
                try {
                    const res = await fetch('/api/billing/issue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paymentId: cardPaymentId,
                            planSlug: selectedPlan,
                            billingCycle,
                            paymentMethod: 'card',
                        }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setSuccess(true);
                    } else {
                        setError(data.error || '결제 처리에 실패했습니다.');
                    }
                } catch {
                    setError('결제 처리 중 오류가 발생했습니다.');
                } finally {
                    setLoading(false);
                }
            })();
            return;
        }

        // 빌링키 발급 콜백 (requestIssueBillingKey 리다이렉트)
        const billingKeyParam = searchParams.get('billingKey');
        const billingCallback = searchParams.get('billing_callback');
        if (billingKeyParam && billingCallback === 'true') {
            const callbackPlan = searchParams.get('plan') as PlanSlug || selectedPlan;
            const callbackCycle = searchParams.get('cycle') || billingCycle;
            const callbackCoupon = searchParams.get('coupon') || undefined;

            (async () => {
                setLoading(true);
                try {
                    await apiFetch('/api/billing/issue', {
                        method: 'POST',
                        body: {
                            billingKey: billingKeyParam,
                            planSlug: callbackPlan,
                            billingCycle: callbackCycle,
                            paymentMethod: 'card',
                            ...(callbackCoupon ? { couponCode: callbackCoupon } : {}),
                        },
                    });
                    setSuccess(true);
                } catch (err) {
                    setError((err as Error).message || '결제 처리에 실패했습니다.');
                } finally {
                    setLoading(false);
                }
            })();
            return;
        }

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
                    const data = await apiFetch<{ coupon: { id: string; code: string; description: string; upgradeToPlan?: string }; pricing: { discountLabel: string; discountAmount: number; finalPrice: number }; upgradePlan?: { name: string } }>('/api/coupon/validate', {
                        method: 'POST',
                        body: {
                            code: couponParam,
                            planSlug: selectedPlan,
                            billingCycle,
                        },
                    });
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
            const data = await apiFetch<{ coupon: { id: string; code: string; description: string; upgradeToPlan?: string }; pricing: { discountLabel: string; discountAmount: number; finalPrice: number }; upgradePlan?: { name: string } }>('/api/coupon/validate', {
                method: 'POST',
                body: {
                    code: couponCode,
                    planSlug: selectedPlan,
                    billingCycle,
                },
            });
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
        } catch (err) {
            setCouponError((err as Error).message || '쿠폰 검증 중 오류가 발생했습니다.');
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
            await apiFetch('/api/iap/verify', {
                method: 'POST',
                body: {
                    platform,
                    receipt: result.receipt,
                    productId: `kr.bobi.app.${selectedPlan}.${billingCycle}`,
                    purchaseToken: result.transactionId || result.receipt,
                },
            });

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
            const data = await apiFetch<{ mobileRedirectUrl: string; redirectUrl: string }>('/api/kakaopay/ready', {
                method: 'POST',
                body: {
                    planSlug: selectedPlan,
                    billingCycle,
                    ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                    ...(appliedCoupon?.upgradeToPlan ? { upgradePlanSlug: appliedCoupon.upgradeToPlan } : {}),
                    // 체험 자격 + 베이직 월간일 때만 체험 의도 전달.
                    // 서버에서도 재검증되므로 클라이언트 조작 안전.
                    ...(useTrial && trialEligible ? { intent: 'trial' } : {}),
                },
            });

            // 카카오페이 결제 페이지로 리다이렉트
            const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
            window.location.href = isMobile ? data.mobileRedirectUrl : data.redirectUrl;
        } catch (err) {
            setError((err as Error).message || '결제 처리 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    // 웹 결제 — 신용카드 (KG이니시스 직접 연동 + INIpay Standard JS SDK)
    const handleCardSubscribe = async () => {
        if (!userName || !userEmail || !userPhone) {
            setError('결제를 위해 이름, 이메일, 휴대폰 번호가 모두 필요합니다.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. 서버에서 빌링키 발급 폼 파라미터 받아오기 (signature 포함)
            const prepResult = await apiFetch<{
                form: Record<string, string>;
                scriptUrl: string;
                oid: string;
            }>('/api/inicis/prepare-billing-key', {
                method: 'POST',
                body: {
                    planSlug: selectedPlan,
                    billingCycle,
                    buyerName: userName,
                    buyerEmail: userEmail,
                    buyerTel: userPhone.replace(/-/g, ''),
                    ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                    ...(appliedCoupon?.upgradeToPlan ? { upgradePlanSlug: appliedCoupon.upgradeToPlan } : {}),
                },
            });

            // 2. INIpay Standard JS SDK 로드
            await loadInipayScript(prepResult.scriptUrl);

            // 3. 동적으로 form 생성하여 document.body에 추가
            const formId = `SendPayForm_id_${prepResult.oid}`;
            let form = document.getElementById(formId) as HTMLFormElement | null;
            if (form) form.remove();
            form = document.createElement('form');
            form.id = formId;
            form.method = 'POST';
            form.style.display = 'none';
            for (const [key, value] of Object.entries(prepResult.form)) {
                if (value === undefined || value === null) continue;
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(value);
                form.appendChild(input);
            }
            document.body.appendChild(form);

            // 4. INIStdPay.pay(formId) 호출 → 결제창 팝업
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const INIStdPay = (window as any).INIStdPay;
            if (!INIStdPay || typeof INIStdPay.pay !== 'function') {
                setError('이니시스 결제창 로드에 실패했습니다. 새로고침 후 다시 시도해주세요.');
                setLoading(false);
                return;
            }
            INIStdPay.pay(formId);
            // 결제창에서 완료되면 returnUrl(/api/inicis/billing-key-return)로 POST
            // 서버에서 빌링키 승인 + 구독 생성 + 리다이렉트(inicis_status=success|failed)
            // → useEffect의 inicisStatus 감지로 success/error 표시
        } catch (err) {
            setError((err as Error).message || '결제 처리 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    // INIpay Standard JS SDK 동적 로드
    const loadInipayScript = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('INIpay JS SDK 로드 실패'));
            document.head.appendChild(script);
        });
    };

    // 토스페이먼츠 JS SDK 동적 로드
    const loadTossPaymentsScript = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            const src = 'https://js.tosspayments.com/v1/payment';
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('TossPayments JS SDK 로드 실패'));
            document.head.appendChild(script);
        });
    };

    // 웹 결제 — 토스페이먼츠 자동결제 (빌링키 SDK 방식)
    // 공동인증서 불필요 — 카드 정보 + 휴대폰 본인인증만으로 등록
    const handleTosspaymentsSubscribe = async () => {
        if (!userName || !userEmail || !userPhone) {
            setError('결제를 위해 이름, 이메일, 휴대폰 번호가 모두 필요합니다.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // 1. 서버에서 customerKey + SDK 파라미터 받기
            const prepResult = await apiFetch<{
                customerKey: string;
                clientKey: string;
                successUrl: string;
                failUrl: string;
                orderName: string;
                displayAmount: number;
                buyerName: string;
                buyerEmail: string;
            }>('/api/tosspayments/prepare-billing', {
                method: 'POST',
                body: {
                    planSlug: selectedPlan,
                    billingCycle,
                    buyerName: userName,
                    buyerEmail: userEmail,
                    buyerTel: userPhone.replace(/-/g, ''),
                    ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                    ...(appliedCoupon?.upgradeToPlan ? { upgradePlanSlug: appliedCoupon.upgradeToPlan } : {}),
                    ...(useTrial && trialEligible ? { intent: 'trial' } : {}),
                },
            });

            // 2. 토스페이먼츠 SDK 로드
            await loadTossPaymentsScript();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const TossPayments = (window as any).TossPayments;
            if (typeof TossPayments !== 'function') {
                setError('토스페이먼츠 SDK 로드에 실패했습니다. 새로고침 후 다시 시도해주세요.');
                setLoading(false);
                return;
            }

            const tossPayments = TossPayments(prepResult.clientKey);

            // 3. 카드 빌링키 요청 (결제창 팝업 → 카드입력 → 휴대폰 본인인증)
            //    성공 시 successUrl로 자동 리다이렉트 (authKey + customerKey 쿼리 파라미터)
            await tossPayments.requestBillingAuth('카드', {
                customerKey: prepResult.customerKey,
                successUrl: prepResult.successUrl,
                failUrl: prepResult.failUrl,
            });
            // 리다이렉트되므로 여기 코드는 실행 안 됨
        } catch (err) {
            // SDK가 Promise reject 시 여기로 옴
            const e = err as { code?: string; message?: string };
            if (e?.code === 'USER_CANCEL') {
                setError('결제가 취소되었습니다.');
            } else {
                setError(e?.message || '결제 처리 중 오류가 발생했습니다.');
            }
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

            await apiFetch('/api/coupon/subscribe', {
                method: 'POST',
                body: {
                    couponCode: appliedCoupon.code,
                    planSlug: appliedCoupon.upgradeToPlan || selectedPlan,
                    billingCycle,
                },
            });

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
        if (paymentMethod === 'tosspayments') {
            return handleTosspaymentsSubscribe();
        }
        return handleCardSubscribe();
    };

    const handleSubscribe = platform === 'web' ? handleWebSubscribe : handleIAPSubscribe;

    if (success) {
        const isTrialSuccess = searchParams.get('trial') === '1';
        return (
            <div className="max-w-lg mx-auto mt-12 animate-fade-in">
                <Card className="border-0 shadow-xl text-center">
                    <CardHeader>
                        <div className={cn(
                            "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
                            isTrialSuccess ? "bg-violet-500" : "bg-green-500",
                        )}>
                            {isTrialSuccess ? (
                                <SparklesIcon className="w-8 h-8 text-white" />
                            ) : (
                                <Check className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <CardTitle className="text-2xl">
                            {isTrialSuccess ? `${trialDays}일 무료 체험 시작!` : '구독 완료!'}
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            {isTrialSuccess ? (
                                <>
                                    {planInfo.name} 플랜의 모든 기능을 <strong>{trialDays}일간 무료</strong>로 사용하세요.<br />
                                    체험 종료일에 자동 결제되며, 그 전에 언제든 해지할 수 있습니다.
                                </>
                            ) : (
                                <>
                                    {planInfo.name} 플랜이 활성화되었습니다.<br />
                                    지금 바로 모든 기능을 사용할 수 있습니다.
                                </>
                            )}
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
                        {isTrialSuccess && (
                            <p className="text-xs text-muted-foreground pt-2">
                                해지는 언제든 <Link href="/dashboard/settings" className="text-primary underline">설정 &gt; 구독 관리</Link>에서 가능합니다.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 체험 가능 결제수단: 토스·카카오페이 (신용카드는 체험 미지원 → 일반 결제)
    const trialActive = useTrial && trialEligible
        && (paymentMethod === 'tosspayments' || paymentMethod === 'kakaopay')
        && platform === 'web';

    const paymentLabel = trialActive
        ? `✨ ${trialDays}일 무료 체험 시작`
        : (amount === 0 && appliedCoupon)
            ? '🎉 무료 쿠폰 적용하기'
            : platform === 'ios'
                ? 'Apple로 결제하기'
                : platform === 'android'
                    ? 'Google Play로 결제하기'
                    : paymentMethod === 'kakaopay'
                        ? '카카오페이로 결제하기'
                        : paymentMethod === 'tosspayments'
                            ? '토스로 카드 등록하기'
                            : '신용카드로 결제하기';

    const paymentProviderLabel = platform === 'ios'
        ? 'Apple App Store'
        : platform === 'android'
            ? 'Google Play'
            : paymentMethod === 'kakaopay'
                ? '카카오페이'
                : paymentMethod === 'tosspayments'
                    ? '토스페이먼츠'
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

            {/* 사회적 증거 — 결제 직전 안심 */}
            <SocialProofInline />

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
                            {/* 엔터프라이즈 / 팀 플랜 — 직접 구독 대신 문의 접수 */}
                            <p className="text-xs text-muted-foreground mb-2 mt-4 font-medium">팀 / 엔터프라이즈</p>
                            <button
                                type="button"
                                onClick={() => setEnterpriseDialogOpen(true)}
                                className="w-full p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 text-left transition-all hover:border-amber-400 hover:shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">엔터프라이즈</span>
                                                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 hover:bg-amber-500">맞춤형</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                다수 인원 · 맞춤 보장 분석 · 전담 매니저
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-700 shrink-0">
                                        <span className="text-sm font-semibold">문의하기</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </button>
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed pl-1">
                                💡 5명 이상 팀/조직 도입 시 단가 협의 가능 · 영업일 1~2일 내 담당자 연락
                            </p>
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
                                                    <button
                                                        onClick={() => openExternal(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.bobi.co.kr'}/dashboard/subscribe?plan=${selectedPlan}&billing=${billingCycle}&coupon=${appliedCoupon.code}`)}
                                                        className="block w-full py-2.5 text-center text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                                    >
                                                        🌐 웹에서 {amount.toLocaleString()}원으로 결제하기
                                                    </button>
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
                                        {currentPlan.slug !== 'free' && currentPlan.slug !== selectedPlan && (
                                            <p className="text-[10px] text-blue-600 mt-1">
                                                * 기존 플랜 잔여 금액이 차감됩니다
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                                        {error}
                                    </div>
                                )}

                                {/* 7일 무료 체험 — 베이직 선택 + 자격 있음 + 월간일 때만 노출 */}
                                {trialChecked && trialEligible && selectedPlan === 'basic' && billingCycle === 'monthly' && platform === 'web' && (
                                    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10 p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
                                                <SparklesIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-violet-900 dark:text-violet-200">
                                                        첫 결제 {trialDays}일 무료 체험
                                                    </p>
                                                    <Badge className="bg-violet-600 text-white text-[10px]">NEW</Badge>
                                                </div>
                                                <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                                                    오늘 카드를 등록하고 {trialDays}일간 모든 기능을 써보세요.
                                                    {' '}체험 종료일({new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })})에 자동 결제되며,
                                                    그 전에 해지하면 <strong>단 한 푼도 청구되지 않습니다.</strong>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-violet-200/60">
                                            <input
                                                type="checkbox"
                                                id="use-trial"
                                                checked={useTrial}
                                                onChange={(e) => setUseTrial(e.target.checked)}
                                                className="w-4 h-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                                            />
                                            <label htmlFor="use-trial" className="text-sm font-medium text-violet-900 dark:text-violet-200 cursor-pointer flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                {trialDays}일 무료 체험 사용 (권장)
                                            </label>
                                        </div>
                                        {useTrial && (
                                            <div className="text-[11px] text-violet-600 dark:text-violet-400 leading-relaxed pl-6 space-y-1">
                                                <p>
                                                    💳 체험 가능 결제수단: <strong>카카오페이</strong> 또는 <strong>토스 카드</strong>
                                                </p>
                                                <p>
                                                    오늘은 0원, {trialDays}일 후 {planInfo.priceMonthly.toLocaleString()}원이 청구됩니다.
                                                </p>
                                                {paymentMethod === 'kakaopay' && (
                                                    <p className="text-[10px] opacity-80">
                                                        * 카카오페이는 SID 등록을 위해 100원이 임시 청구 후 즉시 환불됩니다 (순 결제 0원).
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 결제 수단 — 카카오페이 / 토스(카드) / 신용카드 (이니시스) */}
                                {platform === 'web' && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">결제 수단</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setPaymentMethod('kakaopay')}
                                                disabled={billingCycle === 'yearly'}
                                                className={cn(
                                                    'p-2.5 rounded-lg border-2 text-center text-xs transition-all',
                                                    paymentMethod === 'kakaopay'
                                                        ? 'border-primary bg-primary/5 font-semibold'
                                                        : 'border-muted hover:border-primary/30',
                                                    billingCycle === 'yearly' && 'opacity-40 cursor-not-allowed'
                                                )}
                                            >
                                                카카오페이
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('tosspayments')}
                                                className={cn(
                                                    'p-2.5 rounded-lg border-2 text-center text-xs transition-all relative',
                                                    paymentMethod === 'tosspayments'
                                                        ? 'border-primary bg-primary/5 font-semibold'
                                                        : 'border-muted hover:border-primary/30'
                                                )}
                                            >
                                                <span>토스 카드</span>
                                                <span className="absolute -top-1.5 -right-1 bg-blue-500 text-white text-[9px] px-1 rounded font-semibold">쉬움</span>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod('card')}
                                                className={cn(
                                                    'p-2.5 rounded-lg border-2 text-center text-xs transition-all',
                                                    paymentMethod === 'card'
                                                        ? 'border-primary bg-primary/5 font-semibold'
                                                        : 'border-muted hover:border-primary/30'
                                                )}
                                            >
                                                신용카드
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {paymentMethod === 'kakaopay' && '카카오페이에 등록된 카드 또는 카카오머니로 결제됩니다.'}
                                            {paymentMethod === 'tosspayments' && '토스페이먼츠 안전결제 · 카드번호 + 휴대폰 본인인증만으로 등록 (공동인증서 불필요)'}
                                            {paymentMethod === 'card' && 'KG이니시스를 통한 안전결제 (국내 주요 카드사 지원)'}
                                        </p>
                                        {billingCycle === 'yearly' && (
                                            <p className="text-[11px] text-amber-600">연간 결제는 신용카드(토스·이니시스)만 가능합니다.</p>
                                        )}
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

                                {/* 신용카드 결제 시 필수 정보 입력 */}
                                {platform === 'web' && (paymentMethod === 'card' || paymentMethod === 'tosspayments') && (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">구매자 이름 (필수)</label>
                                            <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="이름을 입력해주세요" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">결제자 이메일 (필수)</label>
                                            <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="이메일을 입력해주세요" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground">휴대폰 번호 (필수)</label>
                                            <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="010-1234-5678" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        </div>
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

            {/* 엔터프라이즈 문의 다이얼로그 */}
            <EnterpriseInquiryDialog
                open={enterpriseDialogOpen}
                onOpenChange={setEnterpriseDialogOpen}
                defaultName={userName}
                defaultEmail={userEmail}
                defaultPhone={userPhone}
            />
        </div>
    );
}
