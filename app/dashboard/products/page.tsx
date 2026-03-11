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

            const data = await response.json();

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
                    <div className="grid gap-4 md:grid-cols-3">
                        {result.products.map((product, index) => (
                            <ProductCard key={index} product={product} />
                        ))}
                    </div>

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
