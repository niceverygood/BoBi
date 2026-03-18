// app/dashboard/coverage/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, History } from 'lucide-react';
import PolicyInputForm from '@/components/coverage/PolicyInputForm';
import CoverageReport from '@/components/coverage/CoverageReport';
import CoverageReportPrint from '@/components/coverage/CoverageReportPrint';
import type { CoverageInput, CoverageAnalysisResult } from '@/types/coverage';
import { toast } from 'sonner';

export default function CoveragePage() {
    const [step, setStep] = useState<'input' | 'result'>('input');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoverageAnalysisResult | null>(null);
    const [inputData, setInputData] = useState<CoverageInput | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

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
    };

    const handleDownloadPdf = useCallback(async () => {
        if (!printRef.current || !result) return;
        setPdfGenerating(true);
        toast.info('PDF 생성 중...');

        try {
            // Dynamic import to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            // Wait for render
            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let position = 0;
            let remaining = imgHeight;

            // First page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            remaining -= pdfHeight;

            // Additional pages
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
        } finally {
            setPdfGenerating(false);
        }
    }, [result]);

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
                {step === 'result' && (
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        새 분석
                    </Button>
                )}
                {step === 'input' && (
                    <Link href="/dashboard/coverage/history">
                        <Button variant="ghost" size="sm">
                            <History className="w-4 h-4 mr-2" />
                            이력
                        </Button>
                    </Link>
                )}
            </div>

            {/* Step Content */}
            {step === 'input' && (
                <PolicyInputForm onSubmit={handleSubmit} loading={loading} />
            )}

            {step === 'result' && result && (
                <>
                    <CoverageReport result={result} onDownloadPdf={handleDownloadPdf} />

                    {/* Hidden print layout for PDF generation */}
                    <div style={{ position: 'absolute', left: '-9999px', top: 0, overflow: 'visible' }}>
                        <CoverageReportPrint ref={printRef} result={result} />
                    </div>
                </>
            )}
        </div>
    );
}
