'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, HeartPulse, Download } from 'lucide-react';
import RiskReportView from '@/components/risk-report/RiskReportView';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FeatureGate from '@/components/common/FeatureGate';
import { apiFetch } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import type { RiskReport } from '@/types/risk-report';

function RiskReportContent() {
    const searchParams = useSearchParams();
    const analysisId = searchParams.get('analysisId');

    const [report, setReport] = useState<RiskReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (!reportRef.current) return;
        setPdfLoading(true);
        try {
            const { generateReportPDF } = await import('@/lib/pdf/report-generator');
            await generateReportPDF(reportRef.current, '보비_질병위험도리포트');
        } catch (err) {
            console.error('PDF 생성 실패:', err);
        } finally {
            setPdfLoading(false);
        }
    };

    // 기존 리포트 확인
    useEffect(() => {
        if (!analysisId) {
            setLoadingExisting(false);
            return;
        }

        const loadExisting = async () => {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('analyses')
                    .select('risk_report')
                    .eq('id', analysisId)
                    .single();

                if (data?.risk_report) {
                    setReport(data.risk_report as unknown as RiskReport);
                }
            } catch {
                // 기존 결과 없으면 무시
            } finally {
                setLoadingExisting(false);
            }
        };

        loadExisting();
    }, [analysisId]);

    const handleGenerate = async (regenerate = false) => {
        if (!analysisId) return;
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch<{ report: RiskReport }>('/api/risk-report', {
                method: 'POST',
                body: { analysisId, regenerate },
            });
            setReport(data.report);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 기존 결과 없고 analysisId 있으면 자동 생성
    useEffect(() => {
        if (!loadingExisting && analysisId && !report && !loading) {
            handleGenerate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingExisting, analysisId]);

    if (!analysisId) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">질병 위험도 리포트</h1>
                </div>
                <Card className="border-0 shadow-md">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                        <p>분석 ID가 필요합니다.</p>
                        <p className="text-sm mt-1">먼저 STEP 1 병력 분석을 완료해주세요.</p>
                        <Link href="/dashboard/analyze" className="mt-4 inline-block">
                            <Button>병력 분석하기</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loadingExisting) {
        return (
            <div className="max-w-4xl mx-auto py-12">
                <LoadingSpinner text="기존 리포트 확인 중..." size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <Link href={`/dashboard/analyze?analysisId=${analysisId}`}>
                    <Button variant="ghost" size="icon" className="h-11 w-11" title="분석 결과로 돌아가기" aria-label="분석 결과로 돌아가기">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <HeartPulse className="w-6 h-6 text-red-500" />
                        질병 위험도 리포트
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        의학 통계 기반 연관 질환 위험도 분석
                    </p>
                </div>
            </div>

            {/* 로딩 */}
            {loading && (
                <Card className="border-0 shadow-md">
                    <CardContent className="py-12 text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
                        <p className="font-medium">질병 위험도를 분석하고 있습니다...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            의학 통계 데이터를 매칭하고 AI가 맞춤 리포트를 작성합니다 (약 15~30초)
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* 에러 */}
            {error && !loading && (
                <Card className="border-0 shadow-md border-red-200">
                    <CardContent className="py-8 text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                        <p className="text-sm text-red-600 mb-4">{error}</p>
                        <Button onClick={() => handleGenerate(true)} variant="outline">
                            재시도
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* 리포트 */}
            {report && !loading && (
                <>
                    <div className="flex justify-end gap-2 flex-wrap">
                        <Link href="/dashboard/health-checkup">
                            <Button variant="outline" size="sm" className="border-[#1a56db] text-[#1a56db] hover:bg-[#1a56db]/5">
                                <HeartPulse className="w-4 h-4 mr-2" />
                                건강검진 조회하기
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerate(true)}
                            disabled={loading}
                        >
                            <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
                            재생성
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                            {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            PDF 저장
                        </Button>
                    </div>
                    <div ref={reportRef}>
                        <RiskReportView report={report} />
                    </div>
                </>
            )}
        </div>
    );
}

export default function RiskReportPage() {
    return (
        <FeatureGate feature="risk_report" title="질병 위험도 리포트">
            <Suspense fallback={
                <div className="max-w-4xl mx-auto py-12">
                    <LoadingSpinner text="페이지 로딩 중..." size="lg" />
                </div>
            }>
                <RiskReportContent />
            </Suspense>
        </FeatureGate>
    );
}
