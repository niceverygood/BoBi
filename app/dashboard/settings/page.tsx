'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Users, Building, Crown, CheckCircle2, X, Zap, Loader2, Sparkles, LogOut, Gift, Copy, AlertTriangle } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const PLAN_BADGE_COLORS: Record<PlanSlug, string> = {
    free: 'bg-slate-100 text-slate-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-violet-100 text-violet-700',
    team_basic: 'bg-teal-100 text-teal-700',
    team_pro: 'bg-amber-100 text-amber-700',
};

// 국내 주요 GA 및 보험사 목록
const COMPANY_LIST = [
    // GA
    'GA코리아', '리치플래닛', '피플라이프', 'GA스타', '인카금융서비스', '글로벌금융판매',
    '에이플러스에셋', '유퍼스트금융', '한국보험금융', '보맵', 'KGA',
    '더케이금융그룹', '메가금융서비스', '프라임에셋', '위너스금융서비스', '다봄금융서비스',
    // 생명보험
    '삼성생명', '한화생명', '교보생명', 'NH농협생명', '신한라이프', 'KB생명',
    '미래에셋생명', '동양생명', 'ABL생명', 'DB생명', '하나생명', 'AIA생명', '라이나생명',
    // 손해보험
    '삼성화재', '현대해상', 'DB손해보험', 'KB손해보험', '메리츠화재',
    '한화손해보험', '롯데손해보험', '흥국화재', '농협손해보험', 'MG손해보험',
    '카카오페이손해보험', '토스손해보험', '하나손해보험',
    // 기타
    '기타 (직접 입력)',
];

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [customCompany, setCustomCompany] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const { subscription, plan, usage, loading, remainingAnalyses, refresh } = useSubscription();
    const currentSlug = (plan.slug || 'free') as PlanSlug;
    const planLimits = PLAN_LIMITS[currentSlug];

    const usagePercent = plan.max_analyses === -1
        ? 0
        : Math.min(100, Math.round((usage.analyses_used / usage.analyses_limit) * 100));

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: 'global' });
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    };

    const handleCompanySelect = (value: string) => {
        if (value === '기타 (직접 입력)') {
            setIsCustom(true);
            setCompany('');
        } else {
            setIsCustom(false);
            setCompany(value);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">설정</h1>
                <p className="text-muted-foreground mt-1">프로필 및 플랜 관리</p>
            </div>

            {/* Profile */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        프로필 정보
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="이름을 입력하세요"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">
                                <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    소속 GA / 보험사
                                </div>
                            </Label>
                            <select
                                value={isCustom ? '기타 (직접 입력)' : company}
                                onChange={(e) => handleCompanySelect(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">소속을 선택하세요</option>
                                <optgroup label="GA (법인대리점)">
                                    {COMPANY_LIST.filter((_, i) => i < 16).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="생명보험사">
                                    {COMPANY_LIST.filter((_, i) => i >= 16 && i < 29).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="손해보험사">
                                    {COMPANY_LIST.filter((_, i) => i >= 29 && i < 42).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                                <option value="기타 (직접 입력)">기타 (직접 입력)</option>
                            </select>
                            {isCustom && (
                                <Input
                                    value={customCompany}
                                    onChange={(e) => { setCustomCompany(e.target.value); setCompany(e.target.value); }}
                                    placeholder="소속 회사명을 입력하세요"
                                    className="mt-2"
                                />
                            )}
                        </div>
                    </div>
                    <Button>
                        저장
                    </Button>
                </CardContent>
            </Card>

            {/* Current Plan & Usage — PLAN_LIMITS 기준 가격 표시 */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-primary" />
                        현재 플랜
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Badge className={cn('text-xs', PLAN_BADGE_COLORS[currentSlug])}>
                                    {planLimits?.name || plan.display_name}
                                </Badge>
                                <span className="text-sm">
                                    {planLimits?.price || '무료'}
                                </span>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">이번 달 사용량</span>
                            <span className="font-medium">
                                {usage.analyses_used}건 / {plan.max_analyses === -1 ? '무제한' : `${usage.analyses_limit}건`}
                            </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    usagePercent >= 90 ? 'bg-red-500' :
                                        usagePercent >= 70 ? 'bg-amber-500' :
                                            'bg-brand-600'
                                )}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        {remainingAnalyses !== -1 && remainingAnalyses <= 5 && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                남은 분석 {remainingAnalyses}건 — 업그레이드하면 더 많이 분석할 수 있어요
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Plan Cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(Object.entries(PLAN_LIMITS) as [PlanSlug, typeof PLAN_LIMITS[PlanSlug]][]).map(([key, planInfo]) => (
                            <div
                                key={key}
                                className={cn(
                                    'rounded-xl border p-4 transition-all flex flex-col',
                                    key === currentSlug
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'hover:border-primary/30'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-sm">{planInfo.name}</h3>
                                    {key === currentSlug && (
                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">현재</Badge>
                                    )}
                                </div>
                                <p className="text-lg font-bold mb-0.5">{planInfo.price}</p>
                                <p className="text-[11px] text-muted-foreground mb-3">
                                    월 {planInfo.analysisLimit === -1 ? '무제한' : `${planInfo.analysisLimit}건`}
                                </p>
                                <ul className="space-y-1 mb-3 flex-1">
                                    {planInfo.features.slice(0, 3).map((f) => (
                                        <li key={f} className="text-[11px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                    {planInfo.lockedFeatures.slice(0, 1).map((f) => (
                                        <li key={f} className="text-[11px] flex items-center gap-1 text-muted-foreground/50">
                                            <X className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                {key !== currentSlug && key !== 'free' ? (
                                    <Link href={`/dashboard/subscribe?plan=${key}`}>
                                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                            구독하기
                                        </Button>
                                    </Link>
                                ) : key === currentSlug ? (
                                    <Button variant="outline" size="sm" className="w-full text-xs h-8" disabled>
                                        현재 플랜
                                    </Button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* 플랜 업그레이드 안내 */}
            {(currentSlug === 'free' || currentSlug === 'basic') && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                    <p className="font-semibold">플랜 업그레이드</p>
                                    <p className="text-sm text-muted-foreground">할인코드가 있으시면 구독 페이지에서 사용해주세요.</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => window.location.href = '/dashboard/subscribe'}
                            >
                                구독하기
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 구독 해지 */}
            {subscription && (subscription.status === 'active' || subscription.status === 'trialing') && currentSlug !== 'free' && (
                <SubscriptionCancelSection
                    subscription={subscription}
                    onChanged={refresh}
                />
            )}

            {/* 결제 내역 */}
            <PaymentHistory />

            {/* 기기 관리 */}
            <DeviceManagement />

            {/* 친구 초대 */}
            <ReferralSection />

            {/* 통계 활용 동의 관리 */}
            <StatisticsOptOutSection />

            {/* 로그아웃 */}
            <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-sm">로그아웃</p>
                            <p className="text-xs text-muted-foreground">현재 계정에서 로그아웃합니다.</p>
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                            <LogOut className="w-4 h-4 mr-2" />
                            로그아웃
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── 구독 해지 섹션 ──
// 사용자 본인이 자동결제를 끊을 수 있는 유일한 진입점.
// 기본은 "기간 만료 후 해지" — 결제한 만큼은 그대로 쓰게 두고, 다음 결제만 막는다.
// 해지 예약 후에도 마음 바꾸면 "해지 취소" 가능.
function SubscriptionCancelSection({
    subscription,
    onChanged,
}: {
    subscription: import('@/types/subscription').Subscription;
    onChanged: () => Promise<void> | void;
}) {
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isScheduled = !!subscription.cancel_at_period_end;
    const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;
    // 인앱결제 구독은 우리 cron이 갱신하지 않으므로 우리 API에서 해지해도
    // 실제 자동결제는 멈추지 않는다. 사용자에게 스토어에서 직접 해지하도록 안내한다.
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
                        : '자동 결제를 중단합니다. 환불은 결제 내역의 결제 건에 따라 별도 요청이 필요합니다.'}
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

// ── 친구 초대 섹션 ──
function ReferralSection() {
    const [data, setData] = useState<{
        code: string;
        usedCount: number;
        totalFreeDays: number;
        remainingSlots: number;
        maxReferrals: number;
        rewardPerInvite: number;
        invitees: Array<{ invitee_email: string; created_at: string }>;
        freeUntil: string | null;
        isReferralSub: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [applying, setApplying] = useState(false);
    const [applyMsg, setApplyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/referral');
                if (res.ok) setData(await res.json());
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, []);

    const handleCopy = () => {
        if (!data) return;
        navigator.clipboard.writeText(data.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApply = async () => {
        if (!inputCode.trim()) return;
        setApplying(true);
        setApplyMsg(null);
        try {
            const res = await fetch('/api/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: inputCode.trim() }),
            });
            const result = await res.json();
            if (res.ok) {
                setApplyMsg({ type: 'success', text: result.message });
                setInputCode('');
                // 데이터 새로고침
                const refreshRes = await fetch('/api/referral');
                if (refreshRes.ok) setData(await refreshRes.json());
            } else {
                setApplyMsg({ type: 'error', text: result.error });
            }
        } catch {
            setApplyMsg({ type: 'error', text: '코드 적용에 실패했습니다.' });
        } finally {
            setApplying(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-1 bg-brand-600" />
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-brand-600" />
                    친구 초대
                </CardTitle>
                <CardDescription>
                    친구를 초대하면 나는 <strong>7일</strong>, 친구는 <strong>3일</strong> 베이직 무료! (최대 5명)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="h-20 w-full bg-muted animate-pulse rounded-lg" />
                ) : data ? (
                    <>
                        {/* 내 초대 코드 */}
                        <div className="bg-[#1a56db]/5 rounded-xl p-4 border border-[#1a56db]/10">
                            <p className="text-xs text-[#1a56db] font-medium mb-2">내 초대 코드</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-[#1a56db] tracking-[0.3em] flex-1">{data.code}</span>
                                <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                                    {copied ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                                    {copied ? '복사됨' : '복사'}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                이 코드를 친구에게 공유하세요. 친구가 코드를 입력하면 나에게 7일, 친구에게 3일 무료가 제공됩니다.
                            </p>
                        </div>

                        {/* 무료 이용기간 */}
                        {data.freeUntil && data.isReferralSub && (
                            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                                <p className="text-xs text-green-700 font-medium">🎁 초대 보상 무료 이용기간</p>
                                <p className="text-sm font-bold text-green-800 mt-1">
                                    {new Date(data.freeUntil).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}까지
                                </p>
                                <p className="text-[10px] text-green-600 mt-0.5">
                                    총 {data.totalFreeDays}일 적립 (초대 {data.usedCount}명 × {data.rewardPerInvite}일)
                                </p>
                            </div>
                        )}

                        {/* 진행 현황 */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-black text-[#1a56db]">{data.usedCount}</p>
                                <p className="text-[10px] text-muted-foreground">초대 완료</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-black text-[#1a56db]">{data.totalFreeDays}일</p>
                                <p className="text-[10px] text-muted-foreground">무료 적립</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-black text-slate-400">{data.remainingSlots}</p>
                                <p className="text-[10px] text-muted-foreground">남은 초대</p>
                            </div>
                        </div>

                        {/* 프로그레스 */}
                        <div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span>초대 진행률</span>
                                <span>{data.usedCount}/{data.maxReferrals}명</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-[#1a56db] rounded-full transition-all"
                                    style={{ width: `${(data.usedCount / data.maxReferrals) * 100}%` }} />
                            </div>
                        </div>

                        {/* 초대한 친구 목록 */}
                        {data.invitees.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" /> 초대한 친구 ({data.invitees.length}명)
                                </p>
                                {data.invitees.map((inv, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-muted/30">
                                        <span>{inv.invitee_email}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('ko-KR')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : null}

                <Separator />

                {/* 초대 코드 입력 */}
                <div>
                    <p className="text-sm font-medium mb-2">초대 코드 입력</p>
                    <p className="text-xs text-muted-foreground mb-2">친구에게 받은 초대 코드를 입력하면 <strong>3일 무료</strong>로 베이직 플랜을 이용할 수 있어요.</p>
                    <div className="flex gap-2">
                        <Input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} placeholder="예: A3K7B2N" className="flex-1 font-mono uppercase tracking-wider" />
                        <Button onClick={handleApply} disabled={applying || !inputCode.trim()} size="sm">
                            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : '적용'}
                        </Button>
                    </div>
                    {applyMsg && (
                        <p className={`text-xs mt-2 ${applyMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {applyMsg.text}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ── 기기 관리 섹션 ──
function DeviceManagement() {
    const [devices, setDevices] = useState<Array<{
        id: string; device_id: string; device_name: string;
        device_type: string; last_active: string;
    }>>([]);
    const [maxDevices, setMaxDevices] = useState(2);
    const [canChange, setCanChange] = useState(true);
    const [nextChangeDate, setNextChangeDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [removeMsg, setRemoveMsg] = useState<string | null>(null);

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/auth/device');
            if (res.ok) {
                const data = await res.json();
                setDevices(data.devices || []);
                setMaxDevices(data.maxDevices || 2);
                setCanChange(data.canChange !== false);
                setNextChangeDate(data.nextChangeDate || null);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDevices(); }, []);

    const removeDevice = async (deviceId: string) => {
        if (!canChange) {
            setRemoveMsg(`기기 변경은 월 1회만 가능합니다. ${nextChangeDate ? new Date(nextChangeDate).toLocaleDateString('ko-KR') + ' 이후' : '30일 후'} 변경 가능합니다.`);
            return;
        }
        if (!confirm('이 기기를 제거하시겠습니까?\n\n⚠️ 기기 변경은 한 달에 1번만 가능합니다.')) return;
        setRemoveMsg(null);
        try {
            const res = await fetch(`/api/auth/device?deviceId=${deviceId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setRemoveMsg(data.message);
                fetchDevices();
            } else {
                setRemoveMsg(data.error);
            }
        } catch { setRemoveMsg('기기 제거에 실패했습니다.'); }
    };

    const getDeviceIcon = (type: string) => {
        if (type === 'mobile') return '📱';
        if (type === 'tablet') return '📋';
        return '💻';
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    기기 관리
                </CardTitle>
                <CardDescription>
                    최대 {maxDevices}대의 기기에서 동시 로그인 가능. 기기 변경은 <strong>월 1회</strong>만 가능합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {loading ? (
                    <div className="h-16 w-full bg-muted animate-pulse rounded-lg" />
                ) : devices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">등록된 기기가 없습니다.</p>
                ) : (
                    devices.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{getDeviceIcon(d.device_type)}</span>
                                <div>
                                    <p className="text-sm font-medium">{d.device_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        마지막 활동: {new Date(d.last_active).toLocaleString('ko-KR')}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeDevice(d.device_id)}
                                disabled={!canChange}
                                className={`text-xs ${canChange ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-muted-foreground'}`}>
                                {canChange ? '제거' : '변경 불가'}
                            </Button>
                        </div>
                    ))
                )}
                {removeMsg && (
                    <p className={`text-xs ${removeMsg.includes('실패') || removeMsg.includes('불가') || removeMsg.includes('월 1회') ? 'text-red-500' : 'text-green-600'}`}>
                        {removeMsg}
                    </p>
                )}
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>{devices.length}/{maxDevices}대 사용 중</p>
                    {!canChange && nextChangeDate && (
                        <p>🔒 다음 변경 가능일: {new Date(nextChangeDate).toLocaleDateString('ko-KR')}</p>
                    )}
                    <p>3번째 기기에서 로그인하면 차단됩니다. 기존 기기를 먼저 제거해주세요.</p>
                </div>
            </CardContent>
        </Card>
    );
}

// ── 결제 내역 섹션 ──
function PaymentHistory() {
    const [payments, setPayments] = useState<Array<Record<string, any>>>([]);
    const [subs, setSubs] = useState<Array<Record<string, any>>>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const INITIAL_COUNT = 5;

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

    // 결제 + 구독을 시간순으로 합침
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
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    결제 내역
                </CardTitle>
                <CardDescription>결제 및 취소 내역을 확인하세요. (총 {allItems.length}건)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="h-16 w-full bg-muted animate-pulse rounded-lg" />
                ) : allItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">결제 내역이 없습니다.</p>
                ) : (
                    <>
                        {visibleItems.map((item, i) => {
                            if (item.kind === 'payment') {
                                const p = item.data;
                                const isCancelled = p.status === 'cancelled' || p.status === 'refunded';
                                const cancelledBy = p.cancelled_by === 'admin' ? '보비 관리자' : '본인';
                                return (
                                    <div key={`p-${i}`} className={`flex items-center justify-between p-3 rounded-lg border ${isCancelled ? 'bg-red-50/50 border-red-100' : 'bg-muted/30'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{isCancelled ? '💸' : '💳'}</span>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {isCancelled ? '결제 취소' : '결제 완료'}
                                                    {isCancelled && <span className="text-[10px] text-red-500 ml-1">({cancelledBy} 취소)</span>}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {p.plan_slug || '-'} · {p.payment_method || '-'} · {new Date(p.created_at).toLocaleDateString('ko-KR')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${isCancelled ? 'text-red-500 line-through' : ''}`}>
                                            {(p.amount || 0).toLocaleString()}원
                                        </span>
                                    </div>
                                );
                            } else {
                                const s = item.data;
                                const planName = (s.plan as any)?.display_name || '-';
                                const isCancelled = s.status === 'cancelled';
                                return (
                                    <div key={`s-${i}`} className={`flex items-center justify-between p-3 rounded-lg border ${isCancelled ? 'bg-slate-50' : 'bg-blue-50/30 border-blue-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{isCancelled ? '🚫' : '⭐'}</span>
                                            <div>
                                                <p className="text-sm font-medium">{isCancelled ? '구독 해지' : '구독 활성'}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {planName} · {s.billing_cycle || '-'} · {new Date(s.created_at).toLocaleDateString('ko-KR')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={isCancelled ? 'outline' : 'default'} className="text-[10px]">
                                            {isCancelled ? '해지됨' : '활성'}
                                        </Badge>
                                    </div>
                                );
                            }
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

// ── 통계 활용 opt-out 섹션 ──
function StatisticsOptOutSection() {
    const [loading, setLoading] = useState(true);
    const [optedOut, setOptedOut] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/privacy/opt-out');
                if (res.ok) {
                    const data = await res.json();
                    setOptedOut(!!data.optedOut);
                }
            } catch { /* */ }
            setLoading(false);
        })();
    }, []);

    const handleToggle = async () => {
        setSubmitting(true);
        setMsg(null);
        try {
            if (optedOut) {
                const res = await fetch('/api/privacy/opt-out', { method: 'DELETE' });
                if (res.ok) {
                    setOptedOut(false);
                    setMsg({ type: 'success', text: '통계 활용 동의가 복구되었습니다.' });
                }
            } else {
                const res = await fetch('/api/privacy/opt-out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: '' }),
                });
                if (res.ok) {
                    setOptedOut(true);
                    setMsg({ type: 'success', text: '통계 활용 거부가 등록되었습니다.' });
                }
            }
        } catch (err) {
            setMsg({ type: 'error', text: (err as Error).message || '처리 실패' });
        }
        setSubmitting(false);
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    📊 통계·연구 활용 동의
                </CardTitle>
                <CardDescription className="text-xs">
                    개인정보처리방침 제5조의4에 따른 가명·익명 처리 정보의 활용 여부를 설정합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                    회사는 개인을 식별할 수 없도록 <strong>가명·익명 처리된 정보</strong>를 통계 작성,
                    학술 연구, AI 모델 고도화, 보험 상품 개발 등에 활용할 수 있습니다.
                    <br /><br />
                    활용되는 정보: 연령대, 성별, 지역(시·도), 질병 분류 코드, 복용 약물 성분명, 건강검진 수치 등<br />
                    제외되는 정보: 이름, 주민등록번호, 연락처, 이메일, 정확한 주소 등
                    <br /><br />
                    거부하시더라도 서비스 이용에는 제한이 없습니다.
                </div>

                {msg && (
                    <p className={`text-xs px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {msg.text}
                    </p>
                )}

                <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                        <p className="text-sm font-medium">
                            {optedOut ? '🚫 통계 활용 거부됨' : '✅ 통계 활용 동의'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {optedOut
                                ? '나의 데이터는 통계·연구에 사용되지 않습니다.'
                                : '가명·익명 처리 후 통계·연구 목적으로 활용됩니다.'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant={optedOut ? 'outline' : 'destructive'}
                        disabled={loading || submitting}
                        onClick={handleToggle}
                    >
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : (optedOut ? '동의하기' : '거부하기')}
                    </Button>
                </div>

                <p className="text-[10px] text-muted-foreground">
                    ※ 거부 시점 이전에 이미 익명화된 데이터는 복원할 수 없어 그대로 유지됩니다.
                    이후 생성되는 데이터부터 통계 활용에서 제외됩니다.
                </p>
            </CardContent>
        </Card>
    );
}
