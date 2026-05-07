'use client';

// 대시보드 상단 — 사용자가 본인 구독 상태를 즉시 확인할 수 있는 카드.
// 이도경 5/6 1:1 문의 케이스(결제했는데 처리됐는지 모름) 대응.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { CheckCircle2, AlertTriangle, Crown, Receipt, Calendar, CreditCard, Sparkles } from 'lucide-react';

interface BillingCurrent {
    planSlug: 'free' | 'basic' | 'pro' | 'team_basic' | 'team_pro';
    planName: string;
    status: 'free' | 'active' | 'trialing' | 'past_due';
    billingCycle?: 'monthly' | 'yearly';
    nextChargeAmount: number | null;
    nextChargeDate: string | null;
    periodStart?: string | null;
    paymentMethod: string | null;
    paymentMethodLabel: string | null;
    couponCode: string | null;
    cancelAtPeriodEnd: boolean;
    isIap: boolean;
    billingKeyRegistered: boolean;
    lastPayment: {
        paymentId: string;
        amount: number;
        status: string;
        createdAt: string;
    } | null;
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function daysUntil(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function PlanStatusCard() {
    const [data, setData] = useState<BillingCurrent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch<BillingCurrent>('/api/billing/current')
            .then(setData)
            .catch(() => { /* silent */ })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                <div className="h-6 w-48 bg-gray-200 rounded" />
            </div>
        );
    }
    if (!data) return null;

    // 무료 플랜 — 안내 + CTA
    if (data.status === 'free' || data.planSlug === 'free') {
        return (
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Crown className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">현재 플랜</p>
                            <p className="text-base font-bold text-gray-900">무료 플랜</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">월 3건 분석 가능 · PDF 업로드 · 고객카드</p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/subscribe?plan=basic"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition shrink-0"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        베이직 3일 무료 시작
                    </Link>
                </div>
            </div>
        );
    }

    // 유료 플랜 — 활성 / 해지 예약 / past_due 분기
    const dDay = daysUntil(data.nextChargeDate);
    const isPastDue = data.status === 'past_due';
    const isCancelScheduled = data.cancelAtPeriodEnd;
    const isTrialing = data.status === 'trialing';

    let statusBadge: { label: string; cls: string; Icon: typeof CheckCircle2 };
    if (isPastDue) {
        statusBadge = {
            label: '결제 실패 · 재시도 중',
            cls: 'bg-rose-50 text-rose-700 border-rose-200',
            Icon: AlertTriangle,
        };
    } else if (isCancelScheduled) {
        statusBadge = {
            label: `${fmtDate(data.nextChargeDate)} 해지 예약됨`,
            cls: 'bg-amber-50 text-amber-700 border-amber-200',
            Icon: AlertTriangle,
        };
    } else if (isTrialing) {
        statusBadge = {
            label: '무료 체험 중',
            cls: 'bg-violet-50 text-violet-700 border-violet-200',
            Icon: Sparkles,
        };
    } else {
        statusBadge = {
            label: '활성 구독 중',
            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            Icon: CheckCircle2,
        };
    }

    const StatusIcon = statusBadge.Icon;

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            {/* 1행 — 플랜 + 상태 배지 */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500">현재 플랜</p>
                        <p className="text-base font-bold text-gray-900">{data.planName}</p>
                        <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                        </span>
                    </div>
                </div>
                <Link
                    href="/dashboard/billing"
                    className="text-xs text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
                >
                    구독 관리 →
                </Link>
            </div>

            {/* 2행 — 다음 결제일 / 금액 / 수단 / 결제내역 4분할 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                <InfoCell
                    icon={Calendar}
                    label={isCancelScheduled ? '이용 종료일' : isTrialing ? '체험 종료일' : '다음 결제일'}
                    value={fmtDate(data.nextChargeDate)}
                    sub={dDay != null && dDay > 0 ? `D-${dDay}` : null}
                />
                <InfoCell
                    icon={CreditCard}
                    label={isCancelScheduled ? '다음 청구' : '청구 예정'}
                    value={
                        isCancelScheduled
                            ? '청구 없음'
                            : data.nextChargeAmount != null
                                ? `${data.nextChargeAmount.toLocaleString()}원`
                                : '-'
                    }
                    sub={data.couponCode ? `쿠폰 ${data.couponCode}` : data.billingCycle === 'yearly' ? '연간' : '월간'}
                />
                <InfoCell
                    icon={CreditCard}
                    label="결제 수단"
                    value={data.paymentMethodLabel || '-'}
                />
                <Link
                    href="/dashboard/billing#payment-history"
                    className="rounded-lg border border-gray-200 bg-gray-50/40 hover:bg-gray-50 p-3 transition flex flex-col justify-center"
                >
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> 영수증 확인
                    </p>
                    <p className="text-xs font-semibold text-gray-900 mt-1">
                        {data.lastPayment
                            ? `최근 ${data.lastPayment.amount.toLocaleString()}원`
                            : '결제 내역 보기'}
                    </p>
                    {data.lastPayment && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                            {fmtDate(data.lastPayment.createdAt)}
                        </p>
                    )}
                </Link>
            </div>

            {/* IAP 사용자 — 해지는 스토어에서 안내 */}
            {data.isIap && !isCancelScheduled && (
                <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    📱 인앱 구독 — 해지·결제 수단 변경은 {data.paymentMethod === 'apple_iap' ? '아이폰 [설정] → [본인] → [구독]' : '플레이 스토어 [구독]'}에서 직접 처리해주세요.
                </p>
            )}
        </div>
    );
}

function InfoCell({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: typeof CheckCircle2;
    label: string;
    value: string;
    sub?: string | null;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-3">
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {label}
            </p>
            <p className="text-xs font-semibold text-gray-900 mt-1 truncate">{value}</p>
            {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}
