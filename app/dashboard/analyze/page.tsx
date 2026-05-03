'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Loader2, Lock, Sparkles, Coins, Zap, HeartPulse } from 'lucide-react';
import StepIndicator from '@/components/common/StepIndicator';
import PdfUploader from '@/components/analyze/PdfUploader';
import AnalysisResultView from '@/components/analyze/AnalysisResult';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TrialUpsellModal from '@/components/subscribe/TrialUpsellModal';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { CREDIT_PACKS } from '@/lib/utils/constants';
import { apiFetch } from '@/lib/api/client';
import type { AnalysisResult } from '@/types/analysis';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { track } from '@/lib/analytics/events';

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
    const { canAnalyze, remainingAnalyses, plan, credits, needsCredit, planLimitReached, isFeatureEnabled, loading: subLoading, refresh } = useSubscription();
    const [showCreditShop, setShowCreditShop] = useState(false);
    const [buyingCredit, setBuyingCredit] = useState<string | null>(null);

    // 한도 소진 감지 — 결제 전환 퍼널의 핵심 지점
    useEffect(() => {
        if (!subLoading && planLimitReached && !canAnalyze) {
            track('analysis_limit_reached', {
                plan_slug: plan.slug,
                has_credits: credits > 0,
            });
        }
    }, [subLoading, planLimitReached, canAnalyze, plan.slug, credits]);

    // 크레딧 구매 핸들러 (플랫폼별 분기)
    const handleBuyCredit = async (packId: string) => {
        setBuyingCredit(packId);
        setError(null);

        try {
            const { getPlatform } = await import('@/lib/iap/platform');
            const platform = getPlatform();
            const pack = CREDIT_PACKS.find(p => p.id === packId);
            if (!pack) throw new Error('유효하지 않은 상품');

            if (platform !== 'web') {
                // ── 네이티브 인앱결제 (iOS/Android) ──
                const { purchaseCredit } = await import('@/lib/iap/store');
                const iapResult = await purchaseCredit(packId as 'credit_1' | 'credit_10' | 'credit_30');

                if (!iapResult.success) {
                    throw new Error(iapResult.error || '인앱결제 실패');
                }

                // 서버에 영수증 검증 + 크레딧 충전 요청
                await apiFetch('/api/credits/purchase', {
                    method: 'POST',
                    body: {
                        packId,
                        platform,
                        receipt: iapResult.receipt,
                        transactionId: iapResult.transactionId,
                    },
                });

            } else {
                // ── 웹 결제 (PortOne + KG이니시스) ──
                const PortOne = await import('@portone/browser-sdk/v2');

                const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID!;
                const channelKey = process.env.NEXT_PUBLIC_PORTONE_INICIS_CHANNEL_KEY || process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!;

                const paymentId = `credit-${packId}-${Date.now()}`;

                const response = await PortOne.requestPayment({
                    storeId,
                    channelKey,
                    paymentId,
                    orderName: `보비 분석 크레딧 ${pack.name}`,
                    totalAmount: pack.price,
                    currency: 'CURRENCY_KRW',
                    payMethod: 'CARD',
                });

                if (response?.code) {
                    if (response.code === 'FAILURE_TYPE_PG') {
                        throw new Error('결제가 취소되었습니다.');
                    }
                    throw new Error(response.message || '결제에 실패했습니다.');
                }

                // 서버에 결제 확인 + 크레딧 충전 요청
                await apiFetch('/api/credits/purchase', {
                    method: 'POST',
                    body: {
                        packId,
                        paymentId,
                        platform: 'web',
                    },
                });
            }

            refresh(); // 크레딧 잔량 새로고침
            setShowCreditShop(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBuyingCredit(null);
        }
    };

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
                    let result = data.medical_history as unknown as AnalysisResult;

                    // ⚠️ 기존 분석 결과도 오늘 날짜 기준으로 재검증
                    const todayDate = new Date().toISOString().split('T')[0];
                    const { validateAndCorrectDates } = await import('@/lib/ai/date-validator');
                    const validation = validateAndCorrectDates(result, todayDate);
                    if (validation.corrected) {
                        console.log('[DateValidator] 기존 분석 재검증: 교정 적용됨');
                    }
                    result = validation.result;

                    setAnalysisResult(result);
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

        const startedAt = Date.now();
        const fileCount = successFiles.length;

        setAnalyzing(true);
        setError(null);

        track('analysis_started', {
            file_count: fileCount,
            plan_slug: plan.slug,
        });

        try {
            const data = await apiFetch<{ result: AnalysisResult; analysisId: string }>('/api/analyze', {
                method: 'POST',
                body: { uploadIds: successFiles.map((f) => f.id) },
            });

            // ⚠️ 클라이언트 측에서도 날짜 교정 적용 (이중 방어)
            let result = data.result as AnalysisResult;
            const todayDate = new Date().toISOString().split('T')[0];
            const { validateAndCorrectDates } = await import('@/lib/ai/date-validator');
            const validation = validateAndCorrectDates(result, todayDate);
            if (validation.corrected) {
                console.log('[DateValidator] 신규 분석 결과 클라이언트 교정 적용');
            }
            result = validation.result;

            setAnalysisResult(result);
            setAnalysisId(data.analysisId);

            track('analysis_completed', {
                analysis_id: data.analysisId,
                file_count: fileCount,
                duration_ms: Date.now() - startedAt,
                disease_count: result.diseaseSummary?.length ?? 0,
                risk_flag_count: result.riskFlags?.length ?? 0,
                plan_slug: plan.slug,
            });

            refresh(); // Refresh usage count
        } catch (err) {
            console.error('[Analyze] Error:', err);
            const msg = (err as Error).message || '알 수 없는 오류';
            // 디버깅: uploadIds 로깅
            console.error('[Analyze] uploadIds:', successFiles.map((f) => f.id));
            setError(msg);

            track('analysis_failed', {
                file_count: fileCount,
                duration_ms: Date.now() - startedAt,
                error_message: msg.slice(0, 200),
                plan_slug: plan.slug,
            });
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
            {/* 무료 유저 한도 도달 시 자동 업셀 모달 */}
            <TrialUpsellModal />

            <StepIndicator
                steps={steps}
                currentStep={1}
                completedSteps={analysisResult ? [1] : []}
            />

            <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold">STEP 1: 고지사항 분석</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                        <Sparkles className="w-2.5 h-2.5" />
                        Claude Sonnet 4.5
                    </span>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    심평원 진료이력 PDF를 업로드하면 AI가 보험 고지사항을 자동으로 분석합니다.
                </p>
            </div>

            {/* Usage Limit Warning - 한도 초과 + 크레딧 없음 */}
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
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => setShowCreditShop(true)}>
                                    <Coins className="w-3.5 h-3.5 mr-1.5" />
                                    크레딧 구매
                                </Button>
                                <Link href="/pricing">
                                    <Button size="sm" className="shadow-sm">
                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                        업그레이드
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 크레딧으로 분석 가능 알림 */}
            {!subLoading && needsCredit && (
                <Card className="border-0 shadow-sm border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Coins className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">플랜 한도를 초과했지만 크레딧이 있어 분석 가능합니다</p>
                                <p className="text-xs text-muted-foreground">남은 크레딧: {credits}건 (분석 시 1크레딧 차감)</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setShowCreditShop(true)} className="text-xs">
                                + 충전
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Remaining analyses info */}
            {!subLoading && canAnalyze && remainingAnalyses !== -1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        이번 달 남은 분석: <span className="font-semibold text-foreground">{remainingAnalyses}건</span>
                        {credits > 0 && (
                            <span className="ml-2 text-blue-600 flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                + 크레딧 {credits}건
                            </span>
                        )}
                    </div>
                    {plan.max_analyses !== -1 && (
                        <Button size="sm" variant="ghost" onClick={() => setShowCreditShop(true)} className="text-xs text-muted-foreground">
                            <Coins className="w-3 h-3 mr-1" />
                            크레딧 충전
                        </Button>
                    )}
                </div>
            )}

            {/* Credit Shop Modal */}
            {showCreditShop && (
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Coins className="w-5 h-5 text-amber-500" />
                                분석 크레딧 구매
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowCreditShop(false)}>닫기</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            월간 분석 한도를 초과했을 때 크레딧으로 추가 분석할 수 있습니다. 크레딧은 만료되지 않습니다.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {CREDIT_PACKS.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => handleBuyCredit(pack.id)}
                                    disabled={buyingCredit !== null}
                                    className={`relative p-4 rounded-xl border-2 text-center transition-all hover:shadow-md ${pack.popular
                                        ? 'border-primary bg-primary/5'
                                        : 'border-muted hover:border-primary/30'
                                        } ${buyingCredit === pack.id ? 'opacity-50' : ''}`}
                                >
                                    {pack.popular && (
                                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-2">인기</Badge>
                                    )}
                                    <p className="text-lg font-bold mt-1">{pack.name}</p>
                                    <p className="text-2xl font-bold text-primary mt-1">
                                        {pack.price.toLocaleString()}원
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        건당 {pack.pricePerCredit.toLocaleString()}원
                                    </p>
                                    {pack.discount && (
                                        <Badge variant="secondary" className="mt-2 text-[10px]">{pack.discount}</Badge>
                                    )}
                                    {buyingCredit === pack.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {credits > 0 && (
                            <p className="text-xs text-muted-foreground text-center mt-3">
                                현재 보유 크레딧: <span className="font-semibold text-foreground">{credits}건</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
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

                    <div className="flex justify-end gap-3 flex-wrap">
                        <Link href={`/dashboard/risk-report${analysisId ? `?analysisId=${analysisId}` : ''}`}>
                            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                                <HeartPulse className="w-4 h-4 mr-2" />
                                질병 위험도 리포트
                            </Button>
                        </Link>
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
