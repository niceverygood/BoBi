'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt, Download, Loader2, Calculator } from 'lucide-react';
import ReceiptView from '@/components/accident-receipt/ReceiptView';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FeatureGate from '@/components/common/FeatureGate';
import { DISEASE_COST_DATA, getDiseaseCostByCategory, type DiseaseCostInfo } from '@/lib/receipt/disease-cost-data';
import { apiFetch } from '@/lib/api/client';
import type { AccidentReceipt } from '@/types/accident-receipt';
import TrackFeatureUse from '@/components/analytics/TrackFeatureUse';

const CATEGORY_COLORS: Record<string, string> = {
    '암': 'bg-rose-100 text-rose-700 border-rose-200',
    '심혈관': 'bg-red-100 text-red-700 border-red-200',
    '뇌혈관': 'bg-purple-100 text-purple-700 border-purple-200',
    '대사': 'bg-orange-100 text-orange-700 border-orange-200',
    '근골격': 'bg-teal-100 text-teal-700 border-teal-200',
    '소화기': 'bg-lime-100 text-lime-700 border-lime-200',
    '호흡기': 'bg-sky-100 text-sky-700 border-sky-200',
    '정신': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    '기타': 'bg-gray-100 text-gray-700 border-gray-200',
};

function AccidentReceiptContent() {
    const searchParams = useSearchParams();
    const preselectedDisease = searchParams.get('disease');
    const preselectedCode = searchParams.get('code');
    const fromRiskReport = searchParams.get('from') === 'risk-report';

    // 질환 선택
    const [selectedDisease, setSelectedDisease] = useState<DiseaseCostInfo | null>(() => {
        // 1. 코드로 정확히 매칭
        if (preselectedCode) {
            const exact = DISEASE_COST_DATA.find(d => d.code === preselectedCode);
            if (exact) return exact;
        }
        // 2. 질환명으로 유연한 매칭 (괄호/특수문자 제거 후 키워드 매칭)
        if (preselectedDisease) {
            const keywords = preselectedDisease
                .replace(/[()\/·]/g, ' ')
                .split(/\s+/)
                .filter(k => k.length >= 2)
                .map(k => k.toLowerCase());

            // 키워드 중 하나라도 포함된 질환 찾기
            for (const d of DISEASE_COST_DATA) {
                const dName = d.name.toLowerCase();
                if (keywords.some(k => dName.includes(k))) return d;
            }
            // 역방향: 데이터 이름의 키워드가 검색어에 포함되는지
            for (const d of DISEASE_COST_DATA) {
                const dKeywords = d.name.replace(/[()\/]/g, ' ').split(/\s+/).filter(k => k.length >= 2);
                const searchText = preselectedDisease.toLowerCase();
                if (dKeywords.some(k => searchText.includes(k.toLowerCase()))) return d;
            }
        }
        return null;
    });

    // 입력 폼
    const [coveredCost, setCoveredCost] = useState<number>(selectedDisease?.avgCoveredCost || 0);
    const [uncoveredCost, setUncoveredCost] = useState<number>(selectedDisease?.avgUncoveredCost || 0);
    const [coveredSelfPayRatio, setCoveredSelfPayRatio] = useState<number>(selectedDisease?.coveredSelfPayRatio || 0.2);
    const [treatmentMonths, setTreatmentMonths] = useState<number>(selectedDisease?.avgTreatmentMonths || 6);
    const [monthlyLivingCost, setMonthlyLivingCost] = useState<number>(200);
    const [insurancePayout, setInsurancePayout] = useState<number>(0);

    // 결과
    const [receipt, setReceipt] = useState<AccidentReceipt | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const categoryData = getDiseaseCostByCategory();

    const handleSelectDisease = (d: DiseaseCostInfo) => {
        setSelectedDisease(d);
        setCoveredCost(d.avgCoveredCost);
        setUncoveredCost(d.avgUncoveredCost);
        setCoveredSelfPayRatio(d.coveredSelfPayRatio);
        setTreatmentMonths(d.avgTreatmentMonths);
        setReceipt(null);
        setError(null);
    };

    const handleCalculate = async () => {
        if (!selectedDisease) return;
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch<{ receipt: AccidentReceipt }>('/api/accident-receipt', {
                method: 'POST',
                body: {
                    diseaseCode: selectedDisease.code,
                    diseaseName: selectedDisease.name,
                    coveredCost,
                    uncoveredCost,
                    coveredSelfPayRatio,
                    treatmentMonths,
                    monthlyLivingCost,
                    insurancePayout,
                },
            });
            setReceipt(data.receipt);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const [pdfLoading, setPdfLoading] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (!receiptRef.current) return;
        setPdfLoading(true);
        try {
            const { generateReportPDF } = await import('@/lib/pdf/report-generator');
            await generateReportPDF(receiptRef.current, `보비_가상사고영수증_${selectedDisease?.name || ''}`);
        } catch (err) {
            console.error('PDF 생성 실패:', err);
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <TrackFeatureUse feature="accident_receipt" />
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <Link href={fromRiskReport ? '/dashboard/risk-report' : '/dashboard'}>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-slate-700" />
                        가상 사고 영수증
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        질병 발생 시 예상 비용과 보험 보장 시뮬레이션
                    </p>
                </div>
            </div>

            {/* Step 1: 질환 선택 */}
            {!receipt && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">1. 질환 선택</CardTitle>
                        <CardDescription>시뮬레이션할 질환을 선택하세요</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(categoryData).map(([category, diseases]) => (
                            <div key={category}>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
                                <div className="flex flex-wrap gap-2">
                                    {diseases.map((d) => (
                                        <button
                                            key={d.code}
                                            onClick={() => handleSelectDisease(d)}
                                            className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                                selectedDisease?.code === d.code
                                                    ? `${CATEGORY_COLORS[category] || CATEGORY_COLORS['기타']} border-current font-semibold`
                                                    : 'border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {d.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Step 2: 세부 입력 */}
            {selectedDisease && !receipt && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">2. 비용 설정</CardTitle>
                                <CardDescription>
                                    {selectedDisease.name} — {selectedDisease.note}
                                </CardDescription>
                            </div>
                            <Badge className={`text-xs ${CATEGORY_COLORS[selectedDisease.category] || ''}`}>
                                {selectedDisease.category}
                            </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            출처: {selectedDisease.source}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* 급여/비급여 진료비 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium">급여 진료비 (만원)</label>
                                <p className="text-xs text-muted-foreground mb-1">건강보험 적용 대상</p>
                                <input
                                    type="number"
                                    value={coveredCost}
                                    onChange={(e) => setCoveredCost(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">비급여 진료비 (만원)</label>
                                <p className="text-xs text-muted-foreground mb-1">전액 본인부담</p>
                                <input
                                    type="number"
                                    value={uncoveredCost}
                                    onChange={(e) => setUncoveredCost(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-2">
                            총 진료비: <strong>{(coveredCost + uncoveredCost).toLocaleString()}만원</strong> (급여 {coveredCost.toLocaleString()} + 비급여 {uncoveredCost.toLocaleString()})
                        </p>

                        {/* 급여 본인부담 비율 */}
                        <div>
                            <label className="text-sm font-medium">급여 본인부담 비율</label>
                            <p className="text-xs text-muted-foreground mb-1">
                                {selectedDisease.category === '암' ? '암 산정특례 5%' : `일반 ${Math.round(coveredSelfPayRatio * 100)}%`}
                                {' '}(비급여는 100% 본인부담)
                            </p>
                            <input
                                type="range"
                                min={0.05} max={0.5} step={0.05}
                                value={coveredSelfPayRatio}
                                onChange={(e) => setCoveredSelfPayRatio(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>5% (산정특례)</span>
                                <span className="font-semibold text-foreground">{Math.round(coveredSelfPayRatio * 100)}%</span>
                                <span>50%</span>
                            </div>
                        </div>

                        {/* 투병 기간 */}
                        <div>
                            <label className="text-sm font-medium">투병/회복 기간 (개월)</label>
                            <p className="text-xs text-muted-foreground mb-1">평균 {selectedDisease.avgTreatmentMonths}개월, 조정 가능</p>
                            <input
                                type="number"
                                value={treatmentMonths}
                                onChange={(e) => setTreatmentMonths(Number(e.target.value))}
                                min={1} max={60}
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 월 생활비 */}
                        <div>
                            <label className="text-sm font-medium">월 생활비 (만원)</label>
                            <p className="text-xs text-muted-foreground mb-1">고객이 직접 입력</p>
                            <input
                                type="number"
                                value={monthlyLivingCost}
                                onChange={(e) => setMonthlyLivingCost(Number(e.target.value))}
                                placeholder="200"
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 보험 수령 예상액 */}
                        <div>
                            <label className="text-sm font-medium">현재 보험 수령 예상액 (만원)</label>
                            <p className="text-xs text-muted-foreground mb-1">가입 중인 보험에서 받을 수 있는 예상 금액</p>
                            <input
                                type="number"
                                value={insurancePayout}
                                onChange={(e) => setInsurancePayout(Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 에러 */}
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
                        )}

                        {/* 계산 버튼 */}
                        <Button
                            onClick={handleCalculate}
                            disabled={loading}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                            size="lg"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Calculator className="w-4 h-4 mr-2" />
                            )}
                            AI 분석 + 영수증 생성
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: 영수증 결과 */}
            {receipt && (
                <>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setReceipt(null); setError(null); }}
                        >
                            다시 계산
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPdf}
                            disabled={pdfLoading}
                        >
                            {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            PDF 저장
                        </Button>
                    </div>
                    <div ref={receiptRef}>
                        <ReceiptView receipt={receipt} />
                    </div>
                </>
            )}
        </div>
    );
}

export default function AccidentReceiptPage() {
    return (
        <FeatureGate feature="virtual_receipt" title="가상 영수증" redirectTo="/upgrade/virtual-receipt">
            <Suspense fallback={
                <div className="max-w-4xl mx-auto py-12">
                    <LoadingSpinner text="페이지 로딩 중..." size="lg" />
                </div>
            }>
                <AccidentReceiptContent />
            </Suspense>
        </FeatureGate>
    );
}
