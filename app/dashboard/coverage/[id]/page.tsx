// app/dashboard/coverage/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Loader2 } from 'lucide-react';
import CoverageReport from '@/components/coverage/CoverageReport';
import CoverageReportPrint from '@/components/coverage/CoverageReportPrint';
import type { CoverageAnalysisResult } from '@/types/coverage';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';

export default function CoverageDetailPage() {
    const params = useParams<{ id: string }>();
    const [result, setResult] = useState<CoverageAnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await apiFetch<{ result: CoverageAnalysisResult }>(`/api/coverage/${params.id}`);
                setResult(data.result);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };
        if (params.id) fetchDetail();
    }, [params.id]);

    const handleDownloadPdf = useCallback(async () => {
        if (!printRef.current || !result) return;
        toast.info('PDF 생성 중...');

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
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
            toast.error('PDF 생성 중 오류가 발생했습니다.');
        }
    }, [result]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/coverage/history">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">분석 결과를 찾을 수 없습니다</h1>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/coverage/history">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            보장 분석표
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {result.customer_summary.name}님의 보장 분석 결과
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/coverage">
                    <Button variant="outline" size="sm">새 분석</Button>
                </Link>
            </div>

            <CoverageReport result={result} onDownloadPdf={handleDownloadPdf} />

            {/* Hidden print layout */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, overflow: 'visible' }}>
                <CoverageReportPrint ref={printRef} result={result} />
            </div>
        </div>
    );
}
