'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Loader2, Lock, Sparkles } from 'lucide-react';
import StepIndicator from '@/components/common/StepIndicator';
import PdfUploader from '@/components/analyze/PdfUploader';
import AnalysisResultView from '@/components/analyze/AnalysisResult';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import type { AnalysisResult } from '@/types/analysis';
import Link from 'next/link';

interface UploadedFile {
    id?: string;
    file: File;
    fileType: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
    textPreview?: string;
}

const steps = [
    { id: 1, title: '고지사항 분석', description: 'PDF 업로드 후 AI 분석' },
    { id: 2, title: '상품 판단', description: '가입 가능 상품 판단' },
    { id: 3, title: '청구 안내', description: '보험금 청구 가능여부' },
];

function AnalyzeContent() {
    const searchParams = useSearchParams();
    const existingAnalysisId = searchParams.get('analysisId');

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [analysisId, setAnalysisId] = useState<string | null>(existingAnalysisId);
    const [error, setError] = useState<string | null>(null);
    const [loadingExisting, setLoadingExisting] = useState(!!existingAnalysisId);
    const { canAnalyze, remainingAnalyses, plan, isFeatureEnabled, loading: subLoading, refresh } = useSubscription();

    // 이력에서 기존 분석 결과 로드
    useEffect(() => {
        if (!existingAnalysisId) return;

        const loadExistingAnalysis = async () => {
            setLoadingExisting(true);
            try {
                const supabase = createClient();
                const { data, error: fetchError } = await supabase
                    .from('analyses')
                    .select('*')
                    .eq('id', existingAnalysisId)
                    .single();

                if (fetchError || !data) {
                    setError('분석 결과를 불러올 수 없습니다.');
                    return;
                }

                if (data.medical_history) {
                    setAnalysisResult(data.medical_history as unknown as AnalysisResult);
                    setAnalysisId(data.id);
                }
            } catch {
                setError('분석 결과 로드 중 오류가 발생했습니다.');
            } finally {
                setLoadingExisting(false);
            }
        };

        loadExistingAnalysis();
    }, [existingAnalysisId]);

    const handleFilesUploaded = (files: UploadedFile[]) => {
        setUploadedFiles((prev) => [...prev, ...files]);
    };

    const handleAnalyze = async () => {
        if (!canAnalyze) return;

        const successFiles = uploadedFiles.filter((f) => f.status === 'success' && f.id);
        if (successFiles.length === 0) return;

        setAnalyzing(true);
        setError(null);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uploadIds: successFiles.map((f) => f.id),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석에 실패했습니다.');
            }

            setAnalysisResult(data.result);
            setAnalysisId(data.analysisId);
            refresh(); // Refresh usage count
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setAnalyzing(false);
        }
    };

    const successFileCount = uploadedFiles.filter((f) => f.status === 'success').length;

    if (loadingExisting) {
        return (
            <div className="max-w-4xl mx-auto py-12">
                <LoadingSpinner text="이전 분석 결과를 불러오는 중..." size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <StepIndicator
                steps={steps}
                currentStep={1}
                completedSteps={analysisResult ? [1] : []}
            />

            <div>
                <h1 className="text-2xl font-bold">STEP 1: 고지사항 분석</h1>
                <p className="text-muted-foreground mt-1">
                    심평원 진료이력 PDF를 업로드하면 AI가 보험 고지사항을 자동으로 분석합니다.
                </p>
            </div>

            {/* Usage Limit Warning */}
            {!subLoading && !canAnalyze && (
                <Card className="border-0 shadow-sm border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                    <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">이번 달 분석 한도에 도달했습니다</p>
                                    <p className="text-xs text-muted-foreground">
                                        {plan.display_name} 플랜은 월 {plan.max_analyses}건까지 분석할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                            <Link href="/pricing">
                                <Button size="sm" className="bg-gradient-primary hover:opacity-90 shadow-sm">
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    업그레이드
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Remaining analyses info */}
            {!subLoading && canAnalyze && remainingAnalyses !== -1 && (
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    이번 달 남은 분석: <span className="font-semibold text-foreground">{remainingAnalyses}건</span>
                </div>
            )}

            {/* PDF Upload */}
            {!analysisResult && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">PDF 업로드</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <PdfUploader onFilesUploaded={handleFilesUploaded} />

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                                {error}
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="ml-2 text-destructive"
                                    onClick={handleAnalyze}
                                >
                                    재시도
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-muted-foreground">
                                {successFileCount > 0 ? `${successFileCount}개 파일 준비됨` : '파일을 업로드하세요'}
                            </p>
                            <Button
                                onClick={handleAnalyze}
                                disabled={successFileCount === 0 || analyzing || !canAnalyze}
                                className="bg-gradient-primary hover:opacity-90"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        분석 중...
                                    </>
                                ) : !canAnalyze ? (
                                    <>
                                        <Lock className="w-4 h-4 mr-2" />
                                        한도 초과
                                    </>
                                ) : (
                                    '분석 시작'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading */}
            {analyzing && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-12">
                        <LoadingSpinner text="AI가 진료이력을 분석하고 있습니다... (약 10~30초)" size="lg" />
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {analysisResult && (
                <>
                    <AnalysisResultView result={analysisResult} />

                    <div className="flex justify-end gap-3">
                        {!isFeatureEnabled('product_match') && (
                            <Link href="/pricing">
                                <Button variant="outline" size="sm" className="text-sm">
                                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                                    STEP 2 잠금 해제
                                </Button>
                            </Link>
                        )}
                        <Link href={`/dashboard/products${analysisId ? `?analysisId=${analysisId}` : ''}`}>
                            <Button
                                className="bg-gradient-primary hover:opacity-90"
                                disabled={!isFeatureEnabled('product_match')}
                            >
                                {isFeatureEnabled('product_match') ? (
                                    <>
                                        STEP 2로 이동: 상품 판단
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4 mr-2" />
                                        베이직 플랜 필요
                                    </>
                                )}
                            </Button>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AnalyzePage() {
    return (
        <Suspense fallback={<LoadingSpinner text="로딩 중..." />}>
            <AnalyzeContent />
        </Suspense>
    );
}
