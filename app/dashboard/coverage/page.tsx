// app/dashboard/coverage/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, History, BarChart3, FileText, Loader2, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FEATURE_FLAGS } from '@/lib/utils/constants';

// ── Feature Flag Guard ──
// coverage_analysis가 false일 때 Coming Soon 페이지를 렌더링합니다.
// 마이데이터 사업자 등록 완료 후 FEATURE_FLAGS.coverage_analysis = true로 변경하면 즉시 활성화됩니다.
// 아래 기존 코드는 feature flag가 true일 때만 실행됩니다.

import PolicyInputForm from '@/components/coverage/PolicyInputForm';
import CoverageReport from '@/components/coverage/CoverageReport';
import CoverageReportPrint from '@/components/coverage/CoverageReportPrint';
import ComparisonCoverageTable from '@/components/coverage/ComparisonCoverageTable';
import RemodelingProposalView from '@/components/coverage/RemodelingProposalView';
import RemodelingProposalPrint from '@/components/coverage/RemodelingProposalPrint';
import type { CoverageInput, CoverageAnalysisResult, RemodelingProposal } from '@/types/coverage';
import { toast } from 'sonner';

type ViewMode = 'report' | 'comparison' | 'remodeling';

export default function CoveragePage() {
    // ── Feature Flag Guard ──
    if (!FEATURE_FLAGS.coverage_analysis) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <h2 className="text-xl font-bold">보장 분석</h2>
                                <Badge variant="secondary" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    준비 중
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                                마이데이터 사업자 등록 후 보장분석 기능이 활성화됩니다.
                                <br />
                                현재는 <strong>고지사항 분석</strong>과 <strong>상품 판단</strong> 기능을 이용해주세요.
                            </p>
                        </div>
                        <Link href="/dashboard/analyze">
                            <Button className="bg-gradient-primary hover:opacity-90 mt-2">
                                <Sparkles className="w-4 h-4 mr-2" />
                                고지사항 분석하기
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const [step, setStep] = useState<'input' | 'result'>('input');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoverageAnalysisResult | null>(null);
    const [inputData, setInputData] = useState<CoverageInput | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('report');

    // Remodeling
    const [proposal, setProposal] = useState<RemodelingProposal | null>(null);
    const [proposalLoading, setProposalLoading] = useState(false);

    // PDF refs
    const printRef = useRef<HTMLDivElement>(null);
    const proposalPrintRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (data: CoverageInput) => {
        setLoading(true);
        setInputData(data);

        try {
            const res = await fetch('/api/coverage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '분석 실패');
            }

            const { result: analysisResult } = await res.json();
            setResult(analysisResult);
            setStep('result');
            setViewMode('report');
            setProposal(null);
            toast.success('보장 분석이 완료되었습니다!');
        } catch (error) {
            toast.error((error as Error).message || '보장 분석 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep('input');
        setResult(null);
        setProposal(null);
        setViewMode('report');
    };

    // Generate remodeling proposal
    const handleGenerateProposal = async () => {
        if (!result || !inputData) return;
        setProposalLoading(true);
        toast.info('리모델링 제안서 생성 중... (약 15~30초 소요)');

        try {
            const res = await fetch('/api/coverage/remodeling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coverageResult: result,
                    inputData: inputData,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '제안서 생성 실패');
            }

            const { proposal: proposalResult } = await res.json();
            setProposal(proposalResult);
            setViewMode('remodeling');
            toast.success('리모델링 제안서가 생성되었습니다!');
        } catch (error) {
            toast.error((error as Error).message || '리모델링 제안서 생성 중 오류가 발생했습니다.');
        } finally {
            setProposalLoading(false);
        }
    };

    // PDF download - coverage report
    const handleDownloadCoveragePdf = useCallback(async () => {
        if (!printRef.current || !result) return;
        toast.info('PDF 생성 중...');

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(printRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let position = 0;
            let remaining = imgHeight;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            remaining -= pdfHeight;

            while (remaining > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                remaining -= pdfHeight;
            }

            const filename = `보장분석표_${result.customer_summary.name}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            toast.success('PDF가 다운로드되었습니다!');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('PDF 생성 중 오류가 발생했습니다.');
        }
    }, [result]);

    // PDF download - remodeling proposal
    const handleDownloadProposalPdf = useCallback(async () => {
        if (!proposalPrintRef.current || !proposal) return;
        toast.info('제안서 PDF 생성 중...');

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(proposalPrintRef.current, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let position = 0;
            let remaining = imgHeight;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            remaining -= pdfHeight;

            while (remaining > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                remaining -= pdfHeight;
            }

            const filename = `리모델링제안서_${proposal.customer_name}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            toast.success('제안서 PDF가 다운로드되었습니다!');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('PDF 생성 중 오류가 발생했습니다.');
        }
    }, [proposal]);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {step === 'result' && (
                        <Button variant="ghost" size="icon" onClick={handleReset}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            보장 분석표
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {step === 'input'
                                ? '고객의 보험 가입 내역을 입력하면 AI가 보장을 분석합니다'
                                : `${result?.customer_summary.name}님의 보장 분석 결과`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {step === 'result' && (
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            새 분석
                        </Button>
                    )}
                    {step === 'input' && (
                        <div className="flex items-center gap-1">
                            <Link href="/dashboard/coverage/terms">
                                <Button variant="ghost" size="sm">
                                    <FileText className="w-4 h-4 mr-2" />
                                    약관 조회
                                </Button>
                            </Link>
                            <Link href="/dashboard/coverage/history">
                                <Button variant="ghost" size="sm">
                                    <History className="w-4 h-4 mr-2" />
                                    이력
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* View Mode Tabs (only in result step) */}
            {step === 'result' && result && (
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                    <Button
                        variant={viewMode === 'report' ? 'default' : 'ghost'}
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => setViewMode('report')}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        보장 분석
                    </Button>
                    <Button
                        variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => setViewMode('comparison')}
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        비교보장표
                    </Button>
                    <Button
                        variant={viewMode === 'remodeling' ? 'default' : 'ghost'}
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => {
                            if (!proposal && !proposalLoading) {
                                handleGenerateProposal();
                            } else {
                                setViewMode('remodeling');
                            }
                        }}
                        disabled={proposalLoading}
                    >
                        {proposalLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <FileText className="w-3.5 h-3.5" />
                        )}
                        리모델링 제안서
                    </Button>
                </div>
            )}

            {/* Step Content */}
            {step === 'input' && (
                <PolicyInputForm onSubmit={handleSubmit} loading={loading} />
            )}

            {step === 'result' && result && (
                <>
                    {/* Report View */}
                    {viewMode === 'report' && (
                        <CoverageReport result={result} onDownloadPdf={handleDownloadCoveragePdf} />
                    )}

                    {/* Comparison Table View */}
                    {viewMode === 'comparison' && (
                        <ComparisonCoverageTable result={result} />
                    )}

                    {/* Remodeling Proposal View */}
                    {viewMode === 'remodeling' && (
                        <>
                            {proposalLoading && (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium">리모델링 제안서 생성 중...</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            AI가 최적의 보험 리모델링 방안을 분석하고 있습니다
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!proposalLoading && proposal && (
                                <RemodelingProposalView
                                    proposal={proposal}
                                    onDownloadPdf={handleDownloadProposalPdf}
                                />
                            )}

                            {!proposalLoading && !proposal && (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <FileText className="w-12 h-12 text-muted-foreground" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium">리모델링 제안서를 생성해보세요</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            보장 분석 결과를 기반으로 유지/해지/신규가입 제안서를 AI가 자동 작성합니다
                                        </p>
                                    </div>
                                    <Button onClick={handleGenerateProposal} className="gap-2 mt-2">
                                        <Sparkles className="w-4 h-4" />
                                        제안서 생성하기
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Hidden print layouts for PDF generation */}
                    <div style={{ position: 'absolute', left: '-9999px', top: 0, overflow: 'visible' }}>
                        <CoverageReportPrint ref={printRef} result={result} />
                        {proposal && (
                            <RemodelingProposalPrint ref={proposalPrintRef} proposal={proposal} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

