'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Lightbulb, Loader2 } from 'lucide-react';
import StepIndicator from '@/components/common/StepIndicator';
import ClaimResultView from '@/components/claims/ClaimResult';
import { apiFetch } from '@/lib/api/client';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import type { ClaimResult } from '@/types/analysis';
import Link from 'next/link';
import DownloadReportButton from '@/components/report/DownloadReportButton';

const steps = [
    { id: 1, title: '고지사항 분석', description: 'PDF 업로드 후 AI 분석' },
    { id: 2, title: '상품 판단', description: '가입 가능 상품 판단' },
    { id: 3, title: '청구 안내', description: '보험금 청구 가능여부' },
];

function ClaimsContent() {
    const searchParams = useSearchParams();
    const analysisId = searchParams.get('analysisId');
    const [loading, setLoading] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(true);
    const [result, setResult] = useState<ClaimResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load existing result from DB first
    useEffect(() => {
        if (!analysisId) {
            setLoadingExisting(false);
            return;
        }

        const loadExisting = async () => {
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const { data } = await supabase
                    .from('analyses')
                    .select('claim_assessment')
                    .eq('id', analysisId)
                    .single();

                if (data?.claim_assessment) {
                    setResult(data.claim_assessment as unknown as ClaimResult);
                }
            } catch {
                // Ignore - will run analysis instead
            } finally {
                setLoadingExisting(false);
            }
        };

        loadExisting();
    }, [analysisId]);

    const runClaimAnalysis = async () => {
        if (!analysisId) return;
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch<{ claims: unknown }>('/api/claims', {
                method: 'POST',
                body: { analysisId },
            });

            setResult(data.claims);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-run only if no existing result
    useEffect(() => {
        if (!loadingExisting && analysisId && !result) {
            runClaimAnalysis();
        }
    }, [loadingExisting, analysisId]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <StepIndicator steps={steps} currentStep={3} completedSteps={result ? [1, 2, 3] : [1, 2]} />

            <div>
                <h1 className="text-2xl font-bold">STEP 3: 보험금 청구 안내</h1>
                <p className="text-muted-foreground mt-1">
                    고객의 진료이력을 약관과 대조하여 보험금 청구 가능 항목을 안내합니다.
                </p>
            </div>

            {!analysisId && (
                <EmptyState
                    title="분석 결과가 필요합니다"
                    description="먼저 STEP 1에서 고지사항 분석을 진행해주세요."
                    action={
                        <Link href="/dashboard/analyze">
                            <Button variant="outline">STEP 1으로 이동</Button>
                        </Link>
                    }
                />
            )}

            {loading && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-12">
                        <LoadingSpinner text="AI가 약관을 분석하고 있습니다..." size="lg" />
                    </CardContent>
                </Card>
            )}

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                    {error}
                    <Button variant="link" size="sm" className="ml-2 text-destructive" onClick={runClaimAnalysis}>
                        재시도
                    </Button>
                </div>
            )}

            {result && (
                <>
                    {/* Summary */}
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-6 h-6 text-violet-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-2">청구 분석 결과</h3>
                                    {result.claimSummary && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <Badge className="bg-violet-500">
                                                전체 {result.claimSummary.totalItems}건
                                            </Badge>
                                            <Badge className="bg-green-500">
                                                청구가능 {result.claimSummary.claimableCount}건
                                            </Badge>
                                            <Badge variant="secondary">
                                                청구불가 {result.claimSummary.notClaimableCount}건
                                            </Badge>
                                            {result.claimSummary.needCheckCount && result.claimSummary.needCheckCount !== '0' && (
                                                <Badge className="bg-amber-500">
                                                    확인필요 {result.claimSummary.needCheckCount}건
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-muted-foreground text-sm leading-relaxed">{result.summary}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Key Findings */}
                    {result.keyFindings && result.keyFindings.length > 0 && (
                        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                    <Lightbulb className="w-4 h-4" />
                                    핵심 발견사항
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {result.keyFindings.map((kf, index) => (
                                        <li key={index} className="text-sm">
                                            <p className="font-medium text-foreground">{kf.finding}</p>
                                            <p className="text-muted-foreground text-xs mt-0.5">→ {kf.action}</p>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Claim Items */}
                    <ClaimResultView items={result.claimableItems} />

                    {/* Important Notes */}
                    {result.importantNotes && result.importantNotes.length > 0 && (
                        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    주의사항
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {result.importantNotes.map((note, index) => (
                                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-amber-500 shrink-0">•</span>
                                            {note}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Done */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6 text-center">
                            <p className="text-lg font-semibold mb-2">✅ 분석이 완료되었습니다!</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                종합 리포트를 PDF로 다운받거나, 이력에서 다시 확인할 수 있습니다.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {analysisId && (
                                    <DownloadReportButton
                                        analysisId={analysisId}
                                        variant="default"
                                        size="default"
                                        className="bg-gradient-primary hover:opacity-90"
                                        label="종합 리포트 PDF 다운로드"
                                    />
                                )}
                                <Link href="/dashboard/history">
                                    <Button variant="outline">분석 이력 보기</Button>
                                </Link>
                                <Link href="/dashboard/analyze">
                                    <Button variant="outline">새 분석 시작</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

export default function ClaimsPage() {
    return (
        <Suspense fallback={<LoadingSpinner text="로딩 중..." />}>
            <ClaimsContent />
        </Suspense>
    );
}
