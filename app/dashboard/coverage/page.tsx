// app/dashboard/coverage/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import PolicyInputForm from '@/components/coverage/PolicyInputForm';
import CoverageReport from '@/components/coverage/CoverageReport';
import type { CoverageInput, CoverageAnalysisResult } from '@/types/coverage';
import { toast } from 'sonner';

export default function CoveragePage() {
    const [step, setStep] = useState<'input' | 'result'>('input');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoverageAnalysisResult | null>(null);
    const [inputData, setInputData] = useState<CoverageInput | null>(null);

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
            </div>

            {/* Step Content */}
            {step === 'input' && (
                <PolicyInputForm onSubmit={handleSubmit} loading={loading} />
            )}

            {step === 'result' && result && (
                <CoverageReport result={result} />
            )}
        </div>
    );
}
