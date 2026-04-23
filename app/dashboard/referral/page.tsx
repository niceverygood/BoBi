'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Share2, Copy, Check, Gift, Users, Crown, Calendar,
    ArrowRight, Sparkles, AlertCircle, Loader2, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { apiFetch } from '@/lib/api/client';
import type { ReferralStatusSummary, ReferralStatus } from '@/types/referral';

const STATUS_META: Record<ReferralStatus, { label: string; className: string; Icon: typeof Clock }> = {
    signed_up: { label: '가입 완료', className: 'bg-slate-100 text-slate-700', Icon: Clock },
    first_paid: { label: '첫 결제', className: 'bg-amber-100 text-amber-700', Icon: Sparkles },
    rewarded: { label: 'Pro 1개월 지급', className: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
    capped: { label: '월 한도 초과', className: 'bg-muted text-muted-foreground', Icon: AlertCircle },
    voided: { label: '무효', className: 'bg-rose-100 text-rose-700', Icon: XCircle },
};

function formatDate(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function ReferralPage() {
    const router = useRouter();
    const { plan, loading: planLoading } = useSubscription();
    const [status, setStatus] = useState<ReferralStatusSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // 무료 플랜은 접근 불가 → 가격 페이지로 유도
    useEffect(() => {
        if (!planLoading && plan.slug === 'free') {
            router.replace('/pricing');
        }
    }, [planLoading, plan.slug, router]);

    useEffect(() => {
        if (planLoading || plan.slug === 'free') return;
        (async () => {
            try {
                const data = await apiFetch<ReferralStatusSummary>('/api/referral/status');
                setStatus(data);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        })();
    }, [planLoading, plan.slug]);

    if (planLoading || plan.slug === 'free' || loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{error ?? '데이터를 불러올 수 없습니다.'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/signup?ref=${status.code}`
        : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleShareKakao = () => {
        // 카카오 SDK가 아직 없으므로 링크 복사 + 안내 (추후 카카오 공유 API 연동 가능)
        handleCopy();
        alert('초대 링크가 복사되었습니다. 카카오톡에 붙여넣기 해주세요.');
    };

    const remainingThisMonth = Math.max(0, status.monthlyLimit - status.rewardedThisMonth);
    const activeProDays = daysUntil(status.activeProGrantExpiresAt);

    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 space-y-6 animate-fade-in">
            {/* 헤더 */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">친구 초대하고 Pro 1개월 받기</h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    초대한 설계사가 첫 결제를 완료하면 <span className="font-semibold text-foreground">Pro 1개월</span>이 자동 지급됩니다.
                    매월 최대 <span className="font-semibold text-foreground">{status.monthlyLimit}명</span>까지 혜택 인정.
                </p>
            </div>

            {/* 현재 Pro 혜택 상태 */}
            {activeProDays !== null && activeProDays > 0 && (
                <Card className="border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10">
                    <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0">
                                <Crown className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-violet-700 dark:text-violet-300 font-semibold">
                                    🎉 Pro 플랜 혜택 활성 중
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(status.activeProGrantExpiresAt)} 까지 (D-{activeProDays})
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 초대 코드 / 공유 */}
            <Card className="bg-gradient-to-br from-background to-primary/5 border-2">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-primary" />
                        나의 초대 링크
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-xl bg-muted/50 border">
                        <div className="text-xs text-muted-foreground mb-2">초대 코드</div>
                        <div className="text-2xl sm:text-3xl font-bold tracking-[0.2em] tabular-nums font-mono">
                            {status.code}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-card min-w-0">
                            <span className="text-xs sm:text-sm text-muted-foreground truncate">{inviteUrl}</span>
                        </div>
                        <Button onClick={handleCopy} variant="outline" className="shrink-0 h-10">
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                                    복사됨
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-1.5" />
                                    링크 복사
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleShareKakao} className="h-11 bg-[#FEE500] hover:bg-[#FDD800] text-[#191600] font-semibold">
                            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.72 1.76 5.12 4.4 6.48l-.64 2.4c-.08.24.16.4.32.28L9 18.4c.96.16 1.92.24 3 .24 5.52 0 10-3.48 10-7.84C22 6.48 17.52 3 12 3z"/></svg>
                            카카오톡 공유
                        </Button>
                        <Link href={`/dashboard/referral/history`} className="contents">
                            <Button variant="outline" className="h-11 w-full">
                                <Users className="w-4 h-4 mr-1.5" />
                                초대 내역 보기
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* 이번 달 현황 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        이번 달 현황
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6">
                        <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/40">
                            <div className="text-2xl sm:text-3xl font-bold tabular-nums">{status.rewardedThisMonth}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">이번 달 리워드</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/40 border-x">
                            <div className="text-2xl sm:text-3xl font-bold tabular-nums">{remainingThisMonth}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">남은 혜택 기회</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/40">
                            <div className="text-2xl sm:text-3xl font-bold tabular-nums">{status.totalRewarded}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">누적 리워드</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 동작 원리 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        어떻게 받나요?
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <Step num={1} title="초대 링크 공유">
                        위 링크를 설계사 동료에게 카카오톡·문자로 보내주세요.
                    </Step>
                    <Step num={2} title="친구 가입 & 체험">
                        친구가 링크로 가입 후 베이직 7일 무료 체험을 시작합니다.
                    </Step>
                    <Step num={3} title="친구 첫 결제 성공">
                        체험 종료 후 친구의 첫 결제가 성공하면 자동으로 Pro 1개월 지급.
                    </Step>
                    <Step num={4} title="Pro 30일 자동 활성화">
                        지급 즉시 Pro 전체 기능 사용 가능 (기존 플랜 위에 30일 부여).
                    </Step>
                    <div className="pt-3 border-t text-xs text-muted-foreground space-y-1 leading-relaxed">
                        <p>• 매월 최대 {status.monthlyLimit}명까지 혜택 인정 (초과 시 기록만 남음)</p>
                        <p>• 친구가 환불·해지 시 해당 Pro 리워드는 취소될 수 있습니다</p>
                        <p>• 본인 계정 자기참조는 차단됩니다</p>
                    </div>
                </CardContent>
            </Card>

            {/* 최근 초대 내역 (preview) */}
            {status.referrals.length > 0 && (
                <Card>
                    <CardHeader className="pb-3 flex-row items-center justify-between">
                        <CardTitle className="text-base sm:text-lg">최근 초대 내역</CardTitle>
                        <Badge variant="outline" className="text-xs">{status.totalInvited}명</Badge>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {status.referrals.slice(0, 5).map((r) => {
                            const meta = STATUS_META[r.status];
                            const Icon = meta.Icon;
                            return (
                                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {r.inviteeMaskedName ?? '초대받은 설계사'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            가입: {formatDate(r.signedUpAt)}
                                            {r.firstPaidAt && ` · 첫 결제: ${formatDate(r.firstPaidAt)}`}
                                        </div>
                                    </div>
                                    <Badge className={`${meta.className} gap-1 shrink-0 border-0`}>
                                        <Icon className="w-3 h-3" />
                                        {meta.label}
                                    </Badge>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            <div className="text-center pt-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4 mr-1.5 rotate-180" />
                        대시보드로 돌아가기
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                {num}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-0.5">{title}</div>
                <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{children}</div>
            </div>
        </div>
    );
}
