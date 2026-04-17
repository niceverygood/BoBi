'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, Sparkles, Loader2, AlertTriangle, Download,
    TrendingUp, DollarSign, AlertCircle,
    ShieldCheck, ShieldAlert, ShieldOff, FileText,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { apiFetch } from '@/lib/api/client';
import type { FutureMeResult, FutureMeScenario } from '@/types/future-me';

interface CustomerCardData {
    customer: { id: string; name: string; birth_date: string | null; gender: string | null };
    summary: {
        riskReport: {
            riskItems: Array<{ riskDisease: string; relativeRisk: number; riskLevel: string; riskCategory: string }>;
            overallAssessment: string;
        } | null;
    };
}

function FutureMeContent() {
    const searchParams = useSearchParams();
    const customerId = searchParams.get('customerId');

    const [customerData, setCustomerData] = useState<CustomerCardData | null>(null);
    const [loadingCustomer, setLoadingCustomer] = useState(true);
    const [customerError, setCustomerError] = useState<string | null>(null);

    const [coveredAmount, setCoveredAmount] = useState('');
    const [additionalPremium, setAdditionalPremium] = useState('');

    const [result, setResult] = useState<FutureMeResult | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!customerId) {
            setLoadingCustomer(false);
            return;
        }
        (async () => {
            try {
                const data = await apiFetch<CustomerCardData>(`/api/customers/${customerId}`);
                setCustomerData(data);
                if (!data.summary.riskReport || data.summary.riskReport.riskItems.length === 0) {
                    setCustomerError('이 고객의 질병위험도 리포트가 없습니다. 먼저 병력 분석과 위험도 리포트를 생성해주세요.');
                }
            } catch (err) {
                setCustomerError((err as Error).message);
            } finally {
                setLoadingCustomer(false);
            }
        })();
    }, [customerId]);

    const handleGenerate = async () => {
        if (!customerId) return;
        const covered = Number(coveredAmount);
        const premium = Number(additionalPremium);
        if (!covered || covered <= 0) {
            setError('보험으로 보장되는 금액을 입력해주세요.');
            return;
        }
        if (isNaN(premium) || premium < 0) {
            setError('추가 월 보험료를 입력해주세요.');
            return;
        }

        setGenerating(true);
        setError(null);
        try {
            const data = await apiFetch<{ result: FutureMeResult }>('/api/future-me', {
                method: 'POST',
                body: { customerId, coveredAmount: covered, additionalPremium: premium },
            });
            setResult(data.result);
            setTimeout(() => {
                reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!reportRef.current) return;
        setPdfLoading(true);
        try {
            const { generateReportPDF } = await import('@/lib/pdf/report-generator');
            await generateReportPDF(reportRef.current, '보비_미래의나_리포트');
        } catch (err) {
            console.error('PDF 생성 실패:', err);
        } finally {
            setPdfLoading(false);
        }
    };

    if (!customerId) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">미래의 나</h1>
                </div>
                <Card className="border-0 shadow-md">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                        <p>고객을 먼저 선택해주세요.</p>
                        <p className="text-sm mt-1">고객 카드에서 &quot;미래의 나&quot;를 클릭하면 자동으로 연결됩니다.</p>
                        <Link href="/dashboard/customers" className="mt-4 inline-block">
                            <Button>고객 카드로 이동</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loadingCustomer) {
        return (
            <div className="max-w-4xl mx-auto py-12">
                <LoadingSpinner text="고객 데이터 불러오는 중..." size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <Link href={`/dashboard/customers/${customerId}`}>
                    <Button variant="ghost" size="icon" className="h-11 w-11" title="고객 카드로 돌아가기" aria-label="고객 카드로 돌아가기">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-violet-500" />
                        미래의 나
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        AI 분석 기반 · 3가지 미래 시나리오
                    </p>
                </div>
            </div>

            {/* 고객 정보 */}
            {customerData && (
                <Card className="border-0 shadow-md">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">
                                    {customerData.customer.name?.charAt(0) || '?'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-lg">{customerData.customer.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {customerData.customer.gender === 'male' ? '남성' :
                                        customerData.customer.gender === 'female' ? '여성' : '성별 미입력'}
                                    {customerData.customer.birth_date && ` · ${new Date().getFullYear() - new Date(customerData.customer.birth_date).getFullYear()}세`}
                                </p>
                            </div>
                            {result && (
                                <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0">
                                    AI 분석 완료
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 고객 데이터 에러 */}
            {customerError && !result && (
                <Card className="border-0 shadow-md border-amber-200 bg-amber-50/50">
                    <CardContent className="py-8 text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                        <p className="text-sm text-amber-800 mb-4">{customerError}</p>
                        <Link href={`/dashboard/customers/${customerId}`}>
                            <Button variant="outline">고객 카드로 이동</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* 입력 폼 (결과 없을 때만) */}
            {!result && !customerError && customerData && (
                <>
                    {/* 위험도 미리보기 */}
                    {customerData.summary.riskReport && (
                        <Card className="border-0 shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    질병위험도 리포트 연동
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {customerData.summary.riskReport.riskItems.slice(0, 4).map((item, idx) => {
                                    const percentage = Math.min(Math.round(item.relativeRisk * 18), 95);
                                    const colorClass = item.riskLevel === 'high' ? 'bg-red-500' :
                                        item.riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-green-500';
                                    return (
                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                            <span className="w-16 font-medium text-muted-foreground shrink-0">{item.riskCategory}</span>
                                            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                                <div className={`h-full ${colorClass} transition-all`} style={{ width: `${percentage}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold shrink-0 w-24 text-right">
                                                {percentage}% {item.riskLevel === 'high' ? '고위험' : item.riskLevel === 'moderate' ? '주의' : '보통'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}

                    {/* 설계사 입력 */}
                    <Card className="border-0 shadow-md bg-gradient-to-r from-primary/5 to-primary/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                설계사 직접 입력
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="coveredAmount" className="text-sm">보험으로 보장되는 금액</Label>
                                <div className="relative">
                                    <Input
                                        id="coveredAmount"
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="4200"
                                        value={coveredAmount}
                                        onChange={(e) => setCoveredAmount(e.target.value)}
                                        className="pr-12 text-right font-semibold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">만원</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="additionalPremium" className="text-sm">추가 필요 월 보험료</Label>
                                <div className="relative">
                                    <Input
                                        id="additionalPremium"
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="12"
                                        value={additionalPremium}
                                        onChange={(e) => setAdditionalPremium(e.target.value)}
                                        className="pr-12 text-right font-semibold"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">만원</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full bg-gradient-primary hover:opacity-90 h-11"
                            >
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 분석 중...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" />리포트 작성</>
                                )}
                            </Button>

                            {error && (
                                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 생성 중 안내 */}
                    {generating && (
                        <Card className="border-0 shadow-md">
                            <CardContent className="py-8 text-center">
                                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
                                <p className="font-medium">미래의 나 시나리오를 만들고 있습니다...</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    AI가 3가지 미래 시나리오를 분석합니다 (약 10~20초)
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* 결과 리포트 */}
            {result && (
                <>
                    <div className="flex justify-end gap-2 flex-wrap no-print">
                        <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                            <FileText className="w-4 h-4 mr-2" />
                            다른 조건 재분석
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                            {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            PDF 저장
                        </Button>
                    </div>
                    <div ref={reportRef}>
                        <FutureMeReportView result={result} />
                    </div>
                </>
            )}
        </div>
    );
}

// ─── 리포트 뷰 ──────────────────────────────────────
function FutureMeReportView({ result }: { result: FutureMeResult }) {
    return (
        <div className="space-y-5">
            {/* 위험도 요약 */}
            {result.riskSummary.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            질병위험도 리포트 연동
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {result.riskSummary.map((r, idx) => {
                            const colorClass = r.level === '고위험' ? 'bg-red-500' :
                                r.level === '주의' ? 'bg-amber-500' : 'bg-green-500';
                            return (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                    <span className="w-16 font-medium text-muted-foreground shrink-0">{r.category}</span>
                                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full ${colorClass} transition-all`} style={{ width: `${r.percentage}%` }} />
                                    </div>
                                    <span className="text-xs font-semibold shrink-0 w-24 text-right">
                                        {r.percentage}% {r.level}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* 설계사 입력값 요약 */}
            <Card className="border-0 shadow-sm bg-blue-50/50">
                <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">보험으로 보장되는 금액</span>
                        <span className="font-bold text-lg">{result.coveredAmount.toLocaleString()}<span className="text-xs ml-1 font-normal">만원</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">추가 필요 월 보험료</span>
                        <span className="font-bold text-lg">{result.additionalPremium.toLocaleString()}<span className="text-xs ml-1 font-normal">만원</span></span>
                    </div>
                </CardContent>
            </Card>

            {/* 현재 보장 공백 */}
            <Card className="border-0 shadow-sm border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">가상사고영수증 연동 · 현재 보장 공백</p>
                            <p className="text-xs text-muted-foreground">
                                예상 병원비 {result.estimatedTotalCost.toLocaleString()}만원 · 현재 보장 {result.currentCoverage.toLocaleString()}만원 ({Math.round((result.currentCoverage / result.estimatedTotalCost) * 100)}%)
                            </p>
                        </div>
                        <span className="text-xl font-bold text-red-600">
                            {result.coverageGap.toLocaleString()}<span className="text-xs ml-1 font-normal">만원</span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* 시나리오 비교 차트 */}
            {result.scenarios.length === 3 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-violet-500" />
                            10년 후 시나리오별 자기부담금 비교
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground justify-end">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />보험 보장</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />자기부담</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />미보장</span>
                        </div>
                        {result.scenarios.map((s, idx) => {
                            const total = s.estimatedTotalCost;
                            const coveragePct = Math.round((s.coverageAmount / total) * 100);
                            const selfPayPct = Math.round((s.selfPayAmount / total) * 100);
                            const label = s.type === 'complement' ? '지금\n보완 시' :
                                s.type === 'delay' ? '5년 후\n가입 시도' : '아무것도\n안 하면';
                            return (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-16 shrink-0 whitespace-pre-line leading-tight">{label}</span>
                                    <div className="flex-1 flex h-8 rounded-md overflow-hidden text-[10px] font-semibold text-white">
                                        <div className="bg-green-500 flex items-center justify-center px-2" style={{ width: `${coveragePct}%` }}>
                                            {coveragePct > 15 && `보장 ${s.coverageAmount.toLocaleString()}만원`}
                                        </div>
                                        <div className="bg-red-500 flex items-center justify-center px-2" style={{ width: `${selfPayPct}%` }}>
                                            {selfPayPct > 15 && `자기부담 ${s.selfPayAmount.toLocaleString()}만원`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-[11px] text-muted-foreground pt-2 space-y-0.5">
                            · 예상 총 병원비 기준: {result.estimatedTotalCost.toLocaleString()}만원<br />
                            · 5년 후 시도 시 가족력 기준 인수 거절 또는 부담보 가능성
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* 시나리오 상세 카드 */}
            {result.scenarios.map((s, idx) => (
                <ScenarioCard key={idx} scenario={s} />
            ))}

            {/* AI 종합 분석 */}
            {result.aiSummary && (
                <Card className="border-0 shadow-md bg-violet-50/50 border-violet-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-600" />
                            AI 종합 분석
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed">{result.aiSummary}</p>
                    </CardContent>
                </Card>
            )}

            {/* 면책 문구 */}
            <p className="text-[11px] text-muted-foreground text-center px-4">
                {result.disclaimer}
            </p>
        </div>
    );
}

// ─── 시나리오 카드 ───────────────────────────────────
function ScenarioCard({ scenario }: { scenario: FutureMeScenario }) {
    const isComplement = scenario.type === 'complement';
    const isDelay = scenario.type === 'delay';

    const borderColor = isComplement ? 'border-l-green-500' :
        isDelay ? 'border-l-amber-500' : 'border-l-red-500';
    const bgColor = isComplement ? 'bg-green-50/30' :
        isDelay ? 'bg-amber-50/30' : 'bg-red-50/30';
    const badgeColor = isComplement ? 'bg-green-100 text-green-700' :
        isDelay ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
    const Icon = isComplement ? ShieldCheck : isDelay ? ShieldAlert : ShieldOff;
    const iconColor = isComplement ? 'text-green-600' :
        isDelay ? 'text-amber-600' : 'text-red-600';

    return (
        <Card className={`border-0 shadow-md border-l-4 ${borderColor} ${bgColor}`}>
            <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                        <h3 className="font-bold text-base">{scenario.label}</h3>
                    </div>
                    <Badge className={`${badgeColor} border-0 shrink-0`}>{scenario.badge}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between py-1.5 px-3 rounded bg-white/60">
                        <span className="text-muted-foreground text-xs">예상 총 병원비</span>
                        <span className="font-semibold">{scenario.estimatedTotalCost.toLocaleString()}만원</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 rounded bg-white/60">
                        <span className="text-muted-foreground text-xs">보장되는 금액</span>
                        <span className="font-semibold text-green-700">{scenario.coverageAmount.toLocaleString()}만원</span>
                    </div>
                    {scenario.rejectionRisk && (
                        <div className="flex justify-between py-1.5 px-3 rounded bg-white/60 col-span-2">
                            <span className="text-muted-foreground text-xs">인수 거절 위험</span>
                            <span className="font-semibold text-xs">{scenario.rejectionRisk}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-white border">
                    <span className="text-sm text-muted-foreground">실제 자기부담금</span>
                    <span className="text-xl font-bold text-red-600">
                        약 {scenario.selfPayAmount.toLocaleString()}만원
                        {isDelay && <span className="text-xs ml-1">↑</span>}
                    </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {scenario.details}
                    {scenario.premiumNote && ` ${scenario.premiumNote}`}
                </p>
            </CardContent>
        </Card>
    );
}

export default function FutureMePage() {
    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto py-12">
                <LoadingSpinner text="페이지 로딩 중..." size="lg" />
            </div>
        }>
            <FutureMeContent />
        </Suspense>
    );
}
