'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AnalysisReport from '@/components/report/AnalysisReport';
import type { AnalysisResult, ProductResult, ClaimResult } from '@/types/analysis';

interface DownloadReportButtonProps {
    analysisId: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'icon';
    className?: string;
    label?: string;
}

export default function DownloadReportButton({
    analysisId,
    variant = 'outline',
    size = 'sm',
    className = '',
    label = 'PDF 다운로드',
}: DownloadReportButtonProps) {
    const [loading, setLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);
    const [reportData, setReportData] = useState<{
        analysis: AnalysisResult | null;
        product: ProductResult | null;
        claim: ClaimResult | null;
        customerId: string | null;
    } | null>(null);

    const handleDownload = useCallback(async () => {
        setLoading(true);

        try {
            // Fetch analysis data from DB
            const supabase = createClient();
            const { data, error } = await supabase
                .from('analyses')
                .select('medical_history, product_eligibility, claim_assessment, customer_id')
                .eq('id', analysisId)
                .single();

            if (error || !data) {
                throw new Error('분석 결과를 불러올 수 없습니다.');
            }

            // Set report data to trigger render
            setReportData({
                analysis: data.medical_history as unknown as AnalysisResult | null,
                product: data.product_eligibility as unknown as ProductResult | null,
                claim: data.claim_assessment as unknown as ClaimResult | null,
                customerId: data.customer_id,
            });

            // Wait for render + font loading
            await document.fonts.ready;
            await new Promise(resolve => setTimeout(resolve, 800));

            // Generate PDF
            const { generateReportPDF } = await import('@/lib/pdf/report-generator');
            const el = reportRef.current;
            if (!el) throw new Error('리포트를 렌더링할 수 없습니다.');

            await generateReportPDF(el, `BoBi_분석리포트_${data.customer_id || analysisId.slice(0, 8)}`);
        } catch (err) {
            alert(`PDF 생성 실패: ${(err as Error).message}`);
        } finally {
            setLoading(false);
            setReportData(null);
        }
    }, [analysisId]);

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={className}
                onClick={handleDownload}
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                {size !== 'icon' && <span className="ml-1">{loading ? '생성 중...' : label}</span>}
            </Button>

            {/* Hidden report for PDF generation */}
            {reportData && (
                <div style={{
                    position: 'absolute',
                    left: '0px',
                    top: '0px',
                    width: '794px',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -9999,
                    overflow: 'visible',
                }}>
                    <AnalysisReport
                        ref={reportRef}
                        analysisResult={reportData.analysis}
                        productResult={reportData.product}
                        claimResult={reportData.claim}
                        customerId={reportData.customerId}
                    />
                </div>
            )}
        </>
    );
}
