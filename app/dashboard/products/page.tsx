'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import StepIndicator from '@/components/common/StepIndicator';
import ProductCard from '@/components/products/ProductCard';
import ComparisonTable from '@/components/products/ComparisonTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import type { ProductResult } from '@/types/analysis';
import Link from 'next/link';

const steps = [
    { id: 1, title: '고지사항 분석', description: 'PDF 업로드 후 AI 분석' },
    { id: 2, title: '상품 판단', description: '가입 가능 상품 판단' },
    { id: 3, title: '청구 안내', description: '보험금 청구 가능여부' },
];

function ProductsContent() {
    const searchParams = useSearchParams();
    const analysisId = searchParams.get('analysisId');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ProductResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runProductAnalysis = async () => {
        if (!analysisId) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysisId }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('서버 응답을 파싱할 수 없습니다. 잠시 후 다시 시도해주세요.');
            }

            if (!response.ok) {
                throw new Error(data.error || '상품 판단에 실패했습니다.');
            }

            setResult(data.products);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (analysisId && !result) {
            runProductAnalysis();
        }
    }, [analysisId]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <StepIndicator steps={steps} currentStep={2} completedSteps={result ? [1, 2] : [1]} />

            <div>
                <h1 className="text-2xl font-bold">STEP 2: 가입가능 상품 판단</h1>
                <p className="text-muted-foreground mt-1">
                    고지사항 분석 결과를 바탕으로 보험상품별 가입 가능 여부를 AI가 판단합니다.
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
                        <LoadingSpinner text="AI가 가입가능 상품을 판단하고 있습니다..." size="lg" />
                    </CardContent>
                </Card>
            )}

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                    {error}
                    <Button variant="link" size="sm" className="ml-2 text-destructive" onClick={runProductAnalysis}>
                        재시도
                    </Button>
                </div>
            )}

            {result && (
                <>
                    {/* Product Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {result.products.map((product, index) => (
                            <ProductCard key={index} product={product} />
                        ))}
                    </div>

                    {/* 간편보험 세부 유형 비교 */}
                    {result.simpleInsuranceDetail && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">📋 간편보험 3.N.5 세부유형 비교</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    N값에 따라 입원/수술 확인 기간이 달라집니다. 고객에게 가장 유리한 유형을 확인하세요.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="text-left py-2 px-3 font-medium">유형</th>
                                                <th className="text-left py-2 px-3 font-medium">확인기간</th>
                                                <th className="text-center py-2 px-3 font-medium">가입가능</th>
                                                <th className="text-left py-2 px-3 font-medium">사유</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.simpleInsuranceDetail.availableTypes.map((t, i) => (
                                                <tr key={i} className={`border-b ${t.eligible === 'O' ? 'bg-green-50 dark:bg-green-950/10' : ''}`}>
                                                    <td className="py-2 px-3 font-medium">{t.type}</td>
                                                    <td className="py-2 px-3 text-muted-foreground">{t.nYears}</td>
                                                    <td className="py-2 px-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${t.eligible === 'O' ? 'bg-green-500 text-white' :
                                                            t.eligible === 'X' ? 'bg-red-500 text-white' :
                                                                'bg-amber-500 text-white'
                                                            }`}>{t.eligible}</span>
                                                    </td>
                                                    <td className="py-2 px-3 text-xs text-muted-foreground">{t.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {result.simpleInsuranceDetail.bestType && (
                                    <div className="mt-3 p-3 bg-primary/5 rounded-lg text-sm">
                                        <strong>✅ 추천:</strong> {result.simpleInsuranceDetail.bestType}
                                        {result.simpleInsuranceDetail.note && (
                                            <span className="text-muted-foreground ml-2">({result.simpleInsuranceDetail.note})</span>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* 예외질환 요약 */}
                    {result.exceptionDiseaseSummary && result.exceptionDiseaseSummary.details && (
                        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
                            <CardHeader>
                                <CardTitle className="text-lg">🏥 보험사별 예외질환 매칭 요약</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    고객의 진단 이력과 매칭되는 보험사별 예외질환 정보입니다.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {result.exceptionDiseaseSummary.details.map((detail, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                            <div>
                                                <span className="font-medium text-sm">{detail.insurer}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({detail.productType})</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-medium">매칭 {detail.matchedCount}건</span>
                                                <p className="text-xs text-muted-foreground">{detail.recommendation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Comparison Table */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">상품 비교표</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ComparisonTable products={result.products} />
                        </CardContent>
                    </Card>

                    {/* Best Option */}
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="font-semibold mb-1">AI 추천</h3>
                                    <p className="text-sm text-muted-foreground">{result.bestOption}</p>
                                    <p className="text-sm text-muted-foreground mt-2">💡 {result.tips}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Step */}
                    <div className="flex justify-end">
                        <Link href={`/dashboard/claims?analysisId=${analysisId}`}>
                            <Button className="bg-gradient-primary hover:opacity-90">
                                STEP 3로 이동: 청구 안내
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<LoadingSpinner text="로딩 중..." />}>
            <ProductsContent />
        </Suspense>
    );
}
