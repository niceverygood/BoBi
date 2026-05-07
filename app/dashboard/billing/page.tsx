'use client';

// 결제·구독 마이페이지 — 사용자가 본인 결제 내역·플랜·해지를 한 곳에서 관리.
// 이전에는 settings 페이지 안에 묻혀 있어서 사용자가 못 찾는 케이스(이도경 5/6 1:1
// 문의 등)가 다수 발생 → 사이드바 1급 메뉴로 분리.
//
// 구성:
//   1. PlanStatusCard (현재 플랜 + 다음 결제일·금액·수단)
//   2. 활성 구독 상세 + 해지 (cancel_at_period_end 토글)
//   3. 결제 내역 (전 시간 + 환불 상태)
//   4. 환불·해지 정책 안내 (1차 자가 안내, 4/25 한승수 정책 카톡 기반)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, AlertTriangle, X, Receipt, MessageCircle } from 'lucide-react';
import PlanStatusCard from '@/components/dashboard/PlanStatusCard';
import { useSubscription } from '@/hooks/useSubscription';
import type { Subscription } from '@/types/subscription';

export default function BillingPage() {
    const { subscription, plan, refresh } = useSubscription();
    const currentSlug = plan.slug || 'free';
    const isActiveSub = !!subscription
        && (subscription.status === 'active' || subscription.status === 'trialing')
        && currentSlug !== 'free';

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-primary" />
                    결제·구독
                </h1>
                <p className="text-muted-foreground mt-1">
                    내 플랜 상태, 결제 내역, 구독 해지를 한 곳에서 관리하세요.
                </p>
            </div>

            {/* 1. 현재 플랜 카드 — PR #plan-status-visibility의 PlanStatusCard 재사용 */}
            <PlanStatusCard />

            {/* 2. 구독 해지 (활성 유료 구독자에게만) */}
            {isActiveSub && subscription && (
                <SubscriptionCancelSection subscription={subscription} onChanged={refresh} />
            )}

            {/* 3. 결제 내역 */}
            <PaymentHistory />

            {/* 4. 환불·해지 정책 */}
            <RefundPolicyCard />
        </div>
    );
}

// ── 구독 해지 섹션 (settings에서 옮김) ──
function SubscriptionCancelSection({
    subscription,
    onChanged,
}: {
    subscription: Subscription;
    onChanged: () => Promise<void> | void;
}) {
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isScheduled = !!subscription.cancel_at_period_end;
    const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;
    const isIap = subscription.payment_provider === 'apple_iap' || subscription.payment_provider === 'google_play';

    const handleCancel = async () => {
        setSubmitting(true);
        setMsg(null);
        try {
            const res = await fetch('/api/billing/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ immediate: false }),
            });
            const data = await res.json();
            if (res.ok) {
                setMsg({ type: 'success', text: data.message });
                setConfirming(false);
                await onChanged();
            } else {
                setMsg({ type: 'error', text: data.error || '해지에 실패했습니다.' });
            }
        } catch (err) {
            setMsg({ type: 'error', text: (err as Error).message || '해지에 실패했습니다.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUndo = async () => {
        setSubmitting(true);
        setMsg(null);
        try {
            const res = await fetch('/api/billing/cancel', { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setMsg({ type: 'success', text: data.message });
                await onChanged();
            } else {
                setMsg({ type: 'error', text: data.error || '해지 취소에 실패했습니다.' });
            }
        } catch (err) {
            setMsg({ type: 'error', text: (err as Error).message || '해지 취소에 실패했습니다.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <X className="w-5 h-5 text-muted-foreground" />
                    구독 해지
                </CardTitle>
                <CardDescription>
                    {isScheduled
                        ? '다음 결제일에 구독이 자동 해지될 예정입니다.'
                        : '자동 결제를 중단합니다. 환불은 결제 건에 따라 별도 요청이 필요합니다.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {isIap ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 leading-relaxed">
                        <p className="font-medium flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            앱스토어 / 플레이스토어 구독
                        </p>
                        <p className="text-xs mt-1">
                            {subscription.payment_provider === 'apple_iap'
                                ? '아이폰의 [설정] → [본인 이름] → [구독]에서 직접 해지해주세요. 보비 측에서는 인앱 구독을 끊을 수 없습니다.'
                                : '플레이 스토어 앱의 [구독]에서 직접 해지해주세요. 보비 측에서는 인앱 구독을 끊을 수 없습니다.'}
                        </p>
                    </div>
                ) : isScheduled ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <p className="font-medium flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            해지 예약됨
                        </p>
                        <p className="text-xs mt-1 leading-relaxed">
                            {periodEnd ? `${periodEnd}까지 정상 이용 가능하며, 그 이후 자동 결제는 진행되지 않습니다.` : '다음 결제일에 자동 해지됩니다.'}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={handleUndo}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            해지 예약 취소
                        </Button>
                    </div>
                ) : !confirming ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setConfirming(true)}
                    >
                        구독 해지하기
                    </Button>
                ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                        <div className="text-sm text-red-800 space-y-1">
                            <p className="font-medium">정말 구독을 해지하시겠어요?</p>
                            <ul className="text-xs space-y-0.5 list-disc pl-4">
                                <li>{periodEnd ? `${periodEnd}까지는 그대로 이용 가능합니다.` : '이번 결제 기간 만료까지는 그대로 이용 가능합니다.'}</li>
                                <li>그 이후 자동 결제가 진행되지 않고, 무료 플랜으로 전환됩니다.</li>
                                <li>이번 결제분 환불을 원하시면 카카오 채널 또는 이메일로 별도 문의 주세요.</li>
                            </ul>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirming(false)}
                                disabled={submitting}
                            >
                                돌아가기
                            </Button>
                            <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleCancel}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                해지 확정
                            </Button>
                        </div>
                    </div>
                )}

                {msg && (
                    <p className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {msg.text}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// ── 결제 내역 (settings에서 옮김 + 환불 사유 표시 강화) ──
function PaymentHistory() {
    const [payments, setPayments] = useState<Array<Record<string, any>>>([]);
    const [subs, setSubs] = useState<Array<Record<string, any>>>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const INITIAL_COUNT = 10;

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/billing/history');
                if (res.ok) {
                    const data = await res.json();
                    setPayments(data.payments || []);
                    setSubs(data.subscriptions || []);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, []);

    const allItems = [
        ...payments.map(p => ({
            kind: 'payment' as const,
            data: p,
            timestamp: new Date(p.created_at).getTime(),
        })),
        ...subs.map(s => ({
            kind: 'subscription' as const,
            data: s,
            timestamp: new Date(s.created_at).getTime(),
        })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    const visibleItems = showAll ? allItems : allItems.slice(0, INITIAL_COUNT);
    const hasMore = allItems.length > INITIAL_COUNT;

    return (
        <Card id="payment-history" className="border-0 shadow-sm scroll-mt-6">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    결제 내역
                </CardTitle>
                <CardDescription>결제·환불·구독 변동을 시간순으로 확인하세요. (총 {allItems.length}건)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="h-16 w-full bg-muted animate-pulse rounded-lg" />
                ) : allItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">결제 내역이 없습니다.</p>
                ) : (
                    <>
                        {visibleItems.map((item, i) => {
                            if (item.kind === 'payment') {
                                const p = item.data;
                                const isCancelled = p.status === 'cancelled' || p.status === 'refunded';
                                const cancelledBy = p.cancelled_by === 'admin' ? '보비 관리자' : '본인';
                                return (
                                    <div key={`p-${i}`} className={`flex items-center justify-between p-3 rounded-lg border ${isCancelled ? 'bg-red-50/50 border-red-100' : 'bg-muted/30'}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xl shrink-0">{isCancelled ? '💸' : '💳'}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    {isCancelled ? '결제 취소·환불' : '결제 완료'}
                                                    {isCancelled && <span className="text-[10px] text-red-500 ml-1">({cancelledBy} 처리)</span>}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {p.plan_slug || '-'} · {p.payment_method || '-'} · {new Date(p.created_at).toLocaleDateString('ko-KR')}
                                                </p>
                                                {p.payment_id && (
                                                    <p className="text-[10px] text-muted-foreground/70 truncate font-mono">
                                                        ID: {String(p.payment_id).slice(0, 24)}{String(p.payment_id).length > 24 ? '…' : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold shrink-0 ml-2 ${isCancelled ? 'text-red-500 line-through' : ''}`}>
                                            {(p.amount || 0).toLocaleString()}원
                                        </span>
                                    </div>
                                );
                            }
                            const s = item.data;
                            const planName = (s.plan as { display_name?: string } | null)?.display_name || '-';
                            const isCancelled = s.status === 'cancelled';
                            return (
                                <div key={`s-${i}`} className={`flex items-center justify-between p-3 rounded-lg border ${isCancelled ? 'bg-slate-50' : 'bg-blue-50/30 border-blue-100'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-xl shrink-0">{isCancelled ? '🚫' : '⭐'}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{isCancelled ? '구독 해지' : '구독 활성'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {planName} · {s.billing_cycle || '-'} · {new Date(s.created_at).toLocaleDateString('ko-KR')}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={isCancelled ? 'outline' : 'default'} className="text-[10px] shrink-0 ml-2">
                                        {isCancelled ? '해지됨' : '활성'}
                                    </Badge>
                                </div>
                            );
                        })}
                        {hasMore && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setShowAll(!showAll)}
                            >
                                {showAll ? '접기' : `더보기 (${allItems.length - INITIAL_COUNT}건 더)`}
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ── 환불·해지 정책 안내 (4/25 한승수 환불 정책 카톡 기반) ──
function RefundPolicyCard() {
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    환불·해지 정책
                </CardTitle>
                <CardDescription>
                    환불을 요청하시려면 아래 정책을 확인 후 카카오 채널로 문의해주세요.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                    <p className="font-medium text-emerald-900 text-xs mb-1">✅ 정상 환불 가능</p>
                    <ul className="text-xs text-emerald-800 list-disc pl-4 space-y-0.5">
                        <li>결제 후 7일 이내</li>
                        <li>분석·PDF 사용 이력 0건</li>
                        <li>(전자상거래법 청약철회 기준)</li>
                    </ul>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                    <p className="font-medium text-blue-900 text-xs mb-1">✅ 즉시 환불 가능 (정책 무관)</p>
                    <ul className="text-xs text-blue-800 list-disc pl-4 space-y-0.5">
                        <li>결제 시스템 오류</li>
                        <li>중복 결제</li>
                        <li>명백한 실수 결제</li>
                    </ul>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                    <p className="font-medium text-rose-900 text-xs mb-1">❌ 정상 환불 불가</p>
                    <ul className="text-xs text-rose-800 list-disc pl-4 space-y-0.5">
                        <li>결제 후 7일 초과</li>
                        <li>분석·PDF 1회 이상 사용</li>
                        <li>→ 다음 결제일 자동결제 해지로 안내드려요</li>
                    </ul>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                    <Link href="https://pf.kakao.com/_xdLxnPxj/chat" target="_blank" rel="noopener">
                        <Button size="sm" variant="outline">
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            카카오 채널로 문의
                        </Button>
                    </Link>
                    <Link href="/dashboard/inquiries">
                        <Button size="sm" variant="outline">
                            1:1 문의 게시판
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
