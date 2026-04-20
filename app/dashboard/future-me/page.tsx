'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, Sparkles, Loader2, AlertTriangle, Download,
    ShieldCheck, ShieldAlert, ShieldOff,
    MessageCircle, Users, DollarSign,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FeatureGate from '@/components/common/FeatureGate';
import SendKakaoDialog from '@/components/future-me/SendKakaoDialog';
import { apiFetch } from '@/lib/api/client';
import type { FutureMeResult, FutureMeScenario, CategoryAmount } from '@/types/future-me';

interface CustomerCardData {
    customer: { id: string; name: string; birth_date: string | null; gender: string | null; phone?: string | null };
    summary: {
        riskReport: {
            riskItems: Array<{ riskDisease: string; relativeRisk: number; riskLevel: string; riskCategory: string }>;
            overallAssessment: string;
        } | null;
    };
}

// 위험도 카테고리 → 막대 색상
const RISK_CATEGORY_COLORS: Record<string, { bar: string; label: string }> = {
    '암': { bar: 'bg-rose-500', label: 'text-rose-700' },
    '뇌혈관': { bar: 'bg-orange-500', label: 'text-orange-700' },
    '심혈관': { bar: 'bg-amber-500', label: 'text-amber-700' },
    '대사': { bar: 'bg-emerald-500', label: 'text-emerald-700' },
    '신장': { bar: 'bg-teal-500', label: 'text-teal-700' },
    '호흡기': { bar: 'bg-sky-500', label: 'text-sky-700' },
    '정신': { bar: 'bg-indigo-500', label: 'text-indigo-700' },
    '근골격': { bar: 'bg-violet-500', label: 'text-violet-700' },
    '소화기': { bar: 'bg-lime-500', label: 'text-lime-700' },
    '신경': { bar: 'bg-fuchsia-500', label: 'text-fuchsia-700' },
    '기타': { bar: 'bg-slate-500', label: 'text-slate-700' },
};

function getCategoryStyle(cat: string): { bar: string; label: string } {
    return RISK_CATEGORY_COLORS[cat] || RISK_CATEGORY_COLORS['기타'];
}

function FutureMeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const customerId = searchParams.get('customerId');

    const [customerData, setCustomerData] = useState<CustomerCardData | null>(null);
    const [loadingCustomer, setLoadingCustomer] = useState(true);
    const [customerError, setCustomerError] = useState<string | null>(null);

    // 카테고리별 설계 보험금 입력 (신규로 설계해줄 보장)
    const [cancerAmount, setCancerAmount] = useState('');
    const [brainAmount, setBrainAmount] = useState('');
    const [cardioAmount, setCardioAmount] = useState('');
    // 카테고리별 현재 보유 보험 입력 (고객이 이미 가입한 보장 — 설계사가 직접 입력)
    const [currentCancer, setCurrentCancer] = useState('');
    const [currentBrain, setCurrentBrain] = useState('');
    const [currentCardio, setCurrentCardio] = useState('');
    const [additionalPremium, setAdditionalPremium] = useState('');

    const [result, setResult] = useState<FutureMeResult | null>(null);
    const [reportId, setReportId] = useState<string | null>(null);
    const [customerPhone, setCustomerPhone] = useState<string>('');
    const [kakaoOpen, setKakaoOpen] = useState(false);
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
                if (data.customer.phone) setCustomerPhone(data.customer.phone);
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
        const cancer = Number(cancerAmount) || 0;
        const brain = Number(brainAmount) || 0;
        const cardio = Number(cardioAmount) || 0;
        const currCancer = Number(currentCancer) || 0;
        const currBrain = Number(currentBrain) || 0;
        const currCardio = Number(currentCardio) || 0;
        const premium = Number(additionalPremium);

        const coveredTotal = cancer + brain + cardio;
        if (coveredTotal <= 0) {
            setError('설계해줄 보험의 암/뇌혈관/심혈관 중 최소 한 가지 보장 금액을 입력해주세요.');
            return;
        }
        if (isNaN(premium) || premium < 0) {
            setError('추가 월 보험료를 입력해주세요.');
            return;
        }

        setGenerating(true);
        setError(null);
        try {
            const data = await apiFetch<{ result: FutureMeResult; reportId: string | null }>('/api/future-me', {
                method: 'POST',
                body: {
                    customerId,
                    coveredAmountByCategory: { cancer, brain, cardio },
                    currentInsuranceByCategory: { cancer: currCancer, brain: currBrain, cardio: currCardio },
                    additionalPremium: premium,
                },
            });
            setResult(data.result);
            setReportId(data.reportId);
            // 분석 완료 이벤트
            import('@/lib/analytics/events').then(({ track }) => {
                track('future_me_generated', {
                    hasCurrentInsurance: (currCancer + currBrain + currCardio) > 0,
                    totalCoverage: cancer + brain + cardio,
                });
            }).catch(() => { });
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

    const handleSendKakao = async () => {
        if (!result) return;
        if (!reportId) {
            setError('리포트 저장이 완료되지 않아 발송할 수 없습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        setKakaoOpen(true);
    };

    const handleAnalyzeAnother = () => {
        router.push('/dashboard/customers');
    };

    if (!customerId) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
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
            <div className="max-w-3xl mx-auto py-12">
                <LoadingSpinner text="고객 데이터 불러오는 중..." size="lg" />
            </div>
        );
    }

    const customerAge = customerData?.customer.birth_date
        ? new Date().getFullYear() - new Date(customerData.customer.birth_date).getFullYear()
        : null;
    const genderDisplay = customerData?.customer.gender === 'male' ? '남성' :
        customerData?.customer.gender === 'female' ? '여성' : '성별 미입력';

    return (
        <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-8">
            {/* 헤더 */}
            <div className="flex items-center gap-2">
                <Link href={`/dashboard/customers/${customerId}`}>
                    <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="뒤로">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">미래의 나</h1>
                    <p className="text-xs text-muted-foreground">AI 분석 기반 · 3가지 미래 시나리오</p>
                </div>
            </div>

            {/* 고객 카드 */}
            {customerData && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-base font-bold text-slate-700">
                                    {customerData.customer.name?.charAt(0) || '?'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-base">{customerData.customer.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {genderDisplay}
                                    {customerAge !== null && ` · 만 ${customerAge}세`}
                                </p>
                            </div>
                            {result && (
                                <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0 shrink-0 text-[11px]">
                                    AI 분석 완료
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 고객 데이터 에러 */}
            {customerError && !result && (
                <Card className="border-0 shadow-sm bg-amber-50 border border-amber-200">
                    <CardContent className="py-6 text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                        <p className="text-sm text-amber-900 mb-4">{customerError}</p>
                        <Link href={`/dashboard/customers/${customerId}`}>
                            <Button variant="outline" size="sm">고객 카드로 이동</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* 입력 단계 */}
            {!result && !customerError && customerData && (
                <>
                    {/* 질병위험도 리포트 연동 */}
                    {customerData.summary.riskReport && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                    질병위험도 리포트 연동
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-2.5 pt-1">
                                {customerData.summary.riskReport.riskItems.slice(0, 4).map((item, idx) => (
                                    <RiskBar
                                        key={idx}
                                        category={item.riskCategory}
                                        percentage={Math.min(Math.round(item.relativeRisk * 18), 95)}
                                        level={item.riskLevel === 'high' ? '고위험' : item.riskLevel === 'moderate' ? '주의' : '보통'}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* 설계사 직접 입력 */}
                    <Card className="border-0 shadow-sm bg-blue-50/60">
                        <CardHeader className="pb-2">
                            <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5" />
                                설계사 직접 입력
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-1">
                            {/* ① 현재 보유 보험 (설계사가 기존 보유 보험을 직접 입력 — 보장분석 연동 전 임시) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="text-sm font-semibold text-slate-800">현재 보유 보험</Label>
                                    <span className="text-[10px] text-muted-foreground">비워두면 없음 처리</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <CategoryInput
                                        label="암(치료비포함)"
                                        value={currentCancer}
                                        onChange={setCurrentCancer}
                                        placeholder="0"
                                    />
                                    <CategoryInput
                                        label="뇌혈관(치료비포함)"
                                        value={currentBrain}
                                        onChange={setCurrentBrain}
                                        placeholder="0"
                                    />
                                    <CategoryInput
                                        label="심혈관(치료비포함)"
                                        value={currentCardio}
                                        onChange={setCurrentCardio}
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    💡 고객이 이미 가입한 보험의 보장 금액을 직접 입력해주세요. 이후 시나리오 비교의 기준값이 됩니다.
                                </p>
                            </div>

                            {/* ② 설계해줄 신규 보험 (추가로 가입할 보장) */}
                            <div className="space-y-2 pt-3 border-t border-blue-200/60">
                                <Label className="text-sm font-semibold text-slate-800">설계해줄 신규 보험 (추가 보장)</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <CategoryInput
                                        label="암(치료비포함)"
                                        value={cancerAmount}
                                        onChange={setCancerAmount}
                                        placeholder="0"
                                    />
                                    <CategoryInput
                                        label="뇌혈관(치료비포함)"
                                        value={brainAmount}
                                        onChange={setBrainAmount}
                                        placeholder="0"
                                    />
                                    <CategoryInput
                                        label="심혈관(치료비포함)"
                                        value={cardioAmount}
                                        onChange={setCardioAmount}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* 추가 월 보험료 */}
                            <div className="space-y-2">
                                <Label htmlFor="additionalPremium" className="text-sm font-semibold text-slate-800">
                                    추가 필요 월 보험료
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="additionalPremium"
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="12"
                                        value={additionalPremium}
                                        onChange={(e) => setAdditionalPremium(e.target.value)}
                                        className="pr-12 text-right font-bold bg-white h-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">만원</span>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full bg-gradient-primary hover:opacity-90 h-11 text-sm"
                            >
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 분석 중...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" />리포트 작성</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* 생성 중 안내 */}
                    {generating && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="py-6 text-center">
                                <Loader2 className="w-7 h-7 mx-auto mb-3 animate-spin text-primary" />
                                <p className="font-semibold text-sm">미래의 나 시나리오를 만들고 있습니다...</p>
                                <p className="text-xs text-muted-foreground mt-1">
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
                    <div ref={reportRef}>
                        <FutureMeReportView result={result} />
                    </div>

                    {/* 액션 버튼 영역 */}
                    <div className="space-y-2 no-print">
                        <Button
                            onClick={handleSendKakao}
                            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-base font-semibold"
                        >
                            <MessageCircle className="w-5 h-5 mr-2" />
                            카카오톡으로 고객에게 전송
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                onClick={handleDownloadPdf}
                                disabled={pdfLoading}
                                className="h-11"
                            >
                                {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                <span className="font-semibold">PDF</span>&nbsp;저장
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleAnalyzeAnother}
                                className="h-11"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                다른 고객 분석
                            </Button>
                        </div>
                    </div>

                    {/* 카카오톡 발송 다이얼로그 */}
                    {result && (
                        <SendKakaoDialog
                            open={kakaoOpen}
                            onOpenChange={setKakaoOpen}
                            reportId={reportId}
                            result={result}
                            defaultPhone={customerPhone}
                            defaultCustomerName={customerData?.customer.name || ''}
                        />
                    )}
                </>
            )}
        </div>
    );
}

/* ── 카테고리 인풋 (작은 박스 + 라벨) ── */
function CategoryInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div>
            <p className="text-[10px] text-slate-600 mb-1 text-center leading-tight">{label}</p>
            <div className="relative">
                <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="pr-7 text-right font-bold bg-white h-9 text-sm"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">만원</span>
            </div>
        </div>
    );
}

/* ── 위험도 프로그레스 바 ── */
function RiskBar({ category, percentage, level }: { category: string; percentage: number; level: string }) {
    const style = getCategoryStyle(category);
    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="w-14 font-semibold text-slate-700 shrink-0">{category}</span>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${style.bar} rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className={`text-xs font-bold shrink-0 w-[72px] text-right ${style.label}`}>
                {percentage}% <span className="text-muted-foreground font-medium">{level}</span>
            </span>
        </div>
    );
}

/* ── 카테고리 3분할 금액 표시 ── */
function CategoryBreakdown({
    amounts,
    colorClass = 'text-slate-900',
    labelClass = 'text-muted-foreground',
}: {
    amounts: CategoryAmount;
    colorClass?: string;
    labelClass?: string;
}) {
    return (
        <div className="flex justify-end gap-3 text-[11px]">
            <span>
                <span className={labelClass}>암</span>{' '}
                <span className={`font-bold ${colorClass}`}>{amounts.cancer.toLocaleString()}</span>
                <span className={labelClass}>만원</span>
            </span>
            <span>
                <span className={labelClass}>뇌혈관</span>{' '}
                <span className={`font-bold ${colorClass}`}>{amounts.brain.toLocaleString()}</span>
                <span className={labelClass}>만원</span>
            </span>
            <span>
                <span className={labelClass}>심혈관</span>{' '}
                <span className={`font-bold ${colorClass}`}>{amounts.cardio.toLocaleString()}</span>
                <span className={labelClass}>만원</span>
            </span>
        </div>
    );
}

/* ── 리포트 뷰 ── */
function FutureMeReportView({ result }: { result: FutureMeResult }) {
    const scenarios = result.scenarios || [];
    const totalForChart = Math.max(
        result.estimatedTotalCost,
        ...scenarios.map(s => s.estimatedTotalCost),
    );

    return (
        <div className="space-y-4">
            {/* 위험도 리포트 연동 */}
            {result.riskSummary.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            질병위험도 리포트 연동
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-2.5 pt-1">
                        {result.riskSummary.map((r, idx) => (
                            <RiskBar
                                key={idx}
                                category={r.category}
                                percentage={r.percentage}
                                level={r.level}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 설계사 입력값 요약 */}
            <Card className="border-0 shadow-sm bg-blue-50/60">
                <CardHeader className="pb-2">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        설계사 직접 입력
                    </p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm pt-1">
                    <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-700 font-medium shrink-0">보험으로 보장되는 금액</span>
                        <div className="text-right">
                            <CategoryBreakdown amounts={result.coveredAmountByCategory} colorClass="text-blue-700" />
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                합계 <strong className="text-slate-900">{result.coveredAmount.toLocaleString()}</strong>만원
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-blue-200/60">
                        <span className="text-slate-700 font-medium">추가 필요 월 보험료</span>
                        <span className="font-bold text-base">
                            <span className="text-blue-700">{result.additionalPremium.toLocaleString()}</span>
                            <span className="text-xs ml-1 font-normal text-muted-foreground">만원</span>
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* 현재 보장 공백 — 카테고리별 */}
            <Card className="border-0 shadow-sm bg-rose-50 border border-rose-200">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold text-rose-700">
                            가상사고영수증 연동 · 현재 보장 공백
                        </p>
                        <span className="text-2xl font-bold text-rose-700 shrink-0">
                            {result.coverageGap.toLocaleString()}<span className="text-xs ml-0.5 font-normal">만원</span>
                        </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-700 border-t border-rose-200 pt-2">
                        <div className="flex justify-between">
                            <span className="text-rose-600">예상 총 병원비</span>
                            <CategoryBreakdown amounts={result.estimatedCostByCategory} colorClass="text-slate-900" />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rose-600">현재 보장 가능</span>
                            <CategoryBreakdown amounts={result.currentCoverageByCategory} colorClass="text-emerald-700" />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rose-600 font-semibold">현재 보장 공백</span>
                            <CategoryBreakdown amounts={result.coverageGapByCategory} colorClass="text-rose-700" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 10년 후 시나리오별 비교 */}
            {scenarios.length === 3 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-800">
                            10년 후 시나리오별 자기부담금 비교
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-1">
                        {/* 범례 */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 justify-end">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />보험 보장
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />자기부담
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />미보장
                            </span>
                        </div>

                        {/* 시나리오 막대 */}
                        {scenarios.map((s, idx) => (
                            <ScenarioBar key={idx} scenario={s} total={totalForChart} />
                        ))}

                        <div className="text-[11px] text-muted-foreground pt-2 border-t space-y-1">
                            <div className="flex justify-between">
                                <span>· 예상 총 병원비 기준</span>
                                <CategoryBreakdown amounts={result.estimatedCostByCategory} colorClass="text-slate-900" />
                            </div>
                            <p className="text-[11px]">
                                · 5년 후 시도 시 가족력 기준 인수 거절 또는 부담보 가능성
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 3가지 시나리오 상세 카드 */}
            {scenarios.map((s, idx) => (
                <ScenarioCard key={idx} scenario={s} />
            ))}

            {/* AI 종합 분석 */}
            {result.aiSummary && (
                <Card className="border-0 shadow-sm bg-violet-50/60 border border-violet-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-violet-900">
                            <Sparkles className="w-4 h-4 text-violet-600" />
                            AI 종합 분석
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-1">
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                            {result.aiSummary}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* 면책 */}
            <p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">
                {result.disclaimer}
            </p>
        </div>
    );
}

/* ── 시나리오 가로 막대 ── */
function ScenarioBar({ scenario, total }: { scenario: FutureMeScenario; total: number }) {
    const coveragePct = Math.min(100, (scenario.coverageAmount / total) * 100);
    const selfPayPct = Math.min(100 - coveragePct, (scenario.selfPayAmount / total) * 100);

    const label = scenario.type === 'complement' ? { main: '지금', sub: '보완 시' } :
        scenario.type === 'delay' ? { main: '5년 후', sub: '가입 시도' } :
            { main: '아무것도', sub: '안 하면' };

    const coverageColor = scenario.type === 'complement' ? 'bg-emerald-500' :
        scenario.type === 'delay' ? 'bg-emerald-400' : 'bg-slate-400';

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-3">
                <div className="w-16 text-xs text-slate-600 shrink-0 leading-tight">
                    <div className="font-semibold">{label.main}</div>
                    <div>{label.sub}</div>
                </div>
                <div className="flex-1 flex h-7 rounded overflow-hidden text-[10px] font-semibold text-white shadow-sm">
                    {coveragePct > 0 && (
                        <div className={`${coverageColor} flex items-center justify-center px-2 whitespace-nowrap`}
                            style={{ width: `${coveragePct}%` }}>
                            {coveragePct > 18 && `보장 ${scenario.coverageAmount.toLocaleString()}만원`}
                        </div>
                    )}
                    {selfPayPct > 0 && (
                        <div className="bg-rose-500 flex items-center justify-center px-2 whitespace-nowrap"
                            style={{ width: `${selfPayPct}%` }}>
                            {selfPayPct > 18 && `자기부담 ${scenario.selfPayAmount.toLocaleString()}만원`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── 시나리오 상세 카드 (카테고리별 분해) ── */
function ScenarioCard({ scenario }: { scenario: FutureMeScenario }) {
    const isComplement = scenario.type === 'complement';
    const isDelay = scenario.type === 'delay';

    const borderColor = isComplement ? 'border-l-emerald-500' :
        isDelay ? 'border-l-amber-500' : 'border-l-rose-500';
    const badgeColor = isComplement ? 'bg-emerald-500 text-white' :
        isDelay ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white';
    const Icon = isComplement ? ShieldCheck : isDelay ? ShieldAlert : ShieldOff;
    const iconColor = isComplement ? 'text-emerald-600' :
        isDelay ? 'text-amber-600' : 'text-rose-600';

    const selfPayColor = isComplement ? 'text-emerald-700' :
        isDelay ? 'text-rose-700' : 'text-rose-700';

    return (
        <Card className={`border-0 shadow-sm border-l-4 ${borderColor}`}>
            <CardContent className="p-4 space-y-3">
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                        <Icon className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`} />
                        <div className="min-w-0">
                            <h3 className="font-bold text-base leading-tight">{scenario.label}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isComplement && '현재 45세 → 55세 시점'}
                                {isDelay && '50세 시점 가입 시도'}
                                {scenario.type === 'nothing' && '현재 보장 그대로'}
                            </p>
                        </div>
                    </div>
                    <Badge className={`${badgeColor} border-0 shrink-0 text-[11px] font-semibold`}>
                        {scenario.badge}
                    </Badge>
                </div>

                {/* 카테고리별 숫자 요약 */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-600 shrink-0 pt-0.5">예상 총 병원비</span>
                        <div className="text-right">
                            <CategoryBreakdown amounts={scenario.estimatedCostByCategory} colorClass="text-slate-900" />
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                합계 <strong className="text-slate-900">{scenario.estimatedTotalCost.toLocaleString()}</strong>만원
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-600 shrink-0 pt-0.5">
                            {scenario.type === 'nothing' ? '현재 보장 가능 금액' : '보장되는 금액'}
                        </span>
                        <div className="text-right">
                            <CategoryBreakdown amounts={scenario.coverageByCategory} colorClass="text-emerald-700" />
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                합계 <strong className="text-emerald-700">{scenario.coverageAmount.toLocaleString()}</strong>만원
                                {scenario.type === 'nothing' && scenario.estimatedTotalCost > 0 && (
                                    <span className="ml-1">({Math.round((scenario.coverageAmount / scenario.estimatedTotalCost) * 100)}%)</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {scenario.type === 'nothing' && (
                        <div className="flex items-start justify-between gap-3">
                            <span className="text-slate-600 shrink-0 pt-0.5">현재 보장 공백</span>
                            <div className="text-right">
                                <CategoryBreakdown amounts={scenario.selfPayByCategory} colorClass="text-rose-700" />
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    합계 <strong className="text-rose-700">{scenario.selfPayAmount.toLocaleString()}</strong>만원
                                </p>
                            </div>
                        </div>
                    )}

                    {isDelay && scenario.rejectionRisk && (
                        <div className="flex items-start justify-between gap-3 pt-1 border-t">
                            <span className="text-slate-600 shrink-0">인수 거절 가능성</span>
                            <span className="font-semibold text-rose-700 text-right max-w-[55%] text-[11px] leading-snug">
                                {scenario.rejectionRisk}
                            </span>
                        </div>
                    )}

                    {isComplement && scenario.premiumNote && (
                        <div className="flex items-center justify-between gap-3 pt-1 border-t">
                            <span className="text-slate-600">추가 필요 월 보험료</span>
                            <span className="font-bold">{scenario.premiumNote}</span>
                        </div>
                    )}
                </div>

                {/* 실제 자기부담금 하이라이트 — 카테고리별 분해 */}
                <div className="rounded-lg bg-slate-50 border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">실제 자기부담금</span>
                        <span className={`text-xl font-bold ${selfPayColor}`}>
                            약 {scenario.selfPayAmount.toLocaleString()}만원
                            {isDelay && <span className="text-xs ml-1">↑</span>}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                        <SelfPayCategoryCell label="암" amount={scenario.selfPayByCategory.cancer} />
                        <SelfPayCategoryCell label="뇌혈관" amount={scenario.selfPayByCategory.brain} />
                        <SelfPayCategoryCell label="심혈관" amount={scenario.selfPayByCategory.cardio} />
                    </div>
                </div>

                {/* 하단 설명 */}
                {scenario.details && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {scenario.details}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/* ── 시나리오 카드 내 카테고리별 자기부담 셀 ── */
function SelfPayCategoryCell({ label, amount }: { label: string; amount: number }) {
    return (
        <div className="text-center">
            <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
            <p className="text-sm font-bold text-slate-900">
                {amount.toLocaleString()}
                <span className="text-[10px] font-normal text-slate-500 ml-0.5">만원</span>
            </p>
        </div>
    );
}

export default function FutureMePage() {
    return (
        <FeatureGate feature="future_me" title="미래의 나">
            <Suspense fallback={
                <div className="max-w-3xl mx-auto py-12">
                    <LoadingSpinner text="페이지 로딩 중..." size="lg" />
                </div>
            }>
                <FutureMeContent />
            </Suspense>
        </FeatureGate>
    );
}
