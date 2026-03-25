'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, Building2 } from 'lucide-react';
import type { ProductEligibility } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: ProductEligibility;
}

export default function ProductCard({ product }: ProductCardProps) {
    const [insurersOpen, setInsurersOpen] = useState(false);

    const eligibleConfig = {
        'O': { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-900' },
        'X': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900' },
        '△': { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900' },
    };

    const config = eligibleConfig[product.eligible] || eligibleConfig['△'];
    const Icon = config.icon;

    const productTypeLabels: Record<string, string> = {
        simple: '간편보험',
        mild: '초경증 간편보험',
        standard: '일반 표준체',
    };

    // 상품명에서 보험사 이름을 제거하고 상품 유형명만 표시
    const displayName = product.productCode || extractProductTypeName(product.productName);
    const insurers = product.insurers || extractInsurers(product.productName);

    return (
        <Card className={cn('border-0 shadow-sm overflow-hidden', config.bg)}>
            <CardContent className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                            {productTypeLabels[product.productType] || product.productType}
                        </p>
                        <h3 className="text-base sm:text-lg font-bold truncate">{displayName}</h3>
                    </div>
                    <div className={cn('w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0', config.bg, config.border, 'border-2')}>
                        <Icon className={cn('w-6 h-6 sm:w-8 sm:h-8', config.color)} />
                    </div>
                </div>

                {/* Eligibility Badge */}
                <Badge
                    className={cn(
                        'text-sm px-3 py-1 mb-3',
                        product.eligible === 'O' && 'bg-green-500 hover:bg-green-600',
                        product.eligible === 'X' && 'bg-red-500 hover:bg-red-600',
                        product.eligible === '△' && 'bg-amber-500 hover:bg-amber-600'
                    )}
                >
                    {product.eligibleText}
                </Badge>

                {/* Recommendation */}
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {product.recommendation}
                </p>

                {/* 보험사 목록 (아코디언) */}
                {insurers.length > 0 && (
                    <div className="mb-3">
                        <button
                            onClick={() => setInsurersOpen(!insurersOpen)}
                            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full py-2"
                        >
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span>취급 보험사 ({insurers.length}개사)</span>
                            <ChevronDown className={cn(
                                'w-4 h-4 ml-auto transition-transform duration-200',
                                insurersOpen && 'rotate-180'
                            )} />
                        </button>
                        <div className={cn(
                            'overflow-hidden transition-all duration-300 ease-in-out',
                            insurersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        )}>
                            <div className="pl-6 pt-1 space-y-1.5">
                                {insurers.map((insurer, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 text-sm text-muted-foreground py-1 px-2 rounded-md hover:bg-background/50 transition-colors"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                                        {insurer}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail Reasons */}
                <Accordion>
                    <AccordionItem value="reasons" className="border-0">
                        <AccordionTrigger className="text-sm py-2 hover:no-underline">
                            고지의무 질문별 상세
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pt-2">
                                {product.reasons.map((reason, index) => (
                                    <div key={index} className="bg-card rounded-lg p-3 border">
                                        <div className="flex items-center gap-2 mb-1">
                                            {reason.answer === '아니오' ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                            )}
                                            <Badge variant={reason.answer === '아니오' ? 'secondary' : 'destructive'} className="text-xs">
                                                {reason.answer}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{reason.question}</p>
                                        {reason.detail && (
                                            <p className="text-xs mt-1 bg-muted/50 p-2 rounded">{reason.detail}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* 예외질환 체크 결과 */}
                    {product.exceptionDiseaseCheck && product.exceptionDiseaseCheck.length > 0 && (
                        <AccordionItem value="exceptions" className="border-0">
                            <AccordionTrigger className="text-sm py-2 hover:no-underline">
                                🏥 예외질환 매칭 결과 ({product.exceptionDiseaseCheck.length}건)
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2 pt-2">
                                    {product.exceptionDiseaseCheck.map((check, index) => (
                                        <div key={index} className={cn(
                                            'rounded-lg p-3 border text-xs',
                                            check.isException ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-muted/50'
                                        )}>
                                            <div className="flex items-center gap-2 mb-1">
                                                {check.isException ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                ) : (
                                                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                                )}
                                                <span className="font-medium">{check.insurer}</span>
                                                <Badge className={cn('text-[10px]', check.isException ? 'bg-green-500' : 'bg-gray-400')}>
                                                    {check.isException ? '예외질환 해당' : '해당없음'}
                                                </Badge>
                                            </div>
                                            {check.matchedDisease && (
                                                <p className="text-muted-foreground ml-5">질환: {check.matchedDisease}</p>
                                            )}
                                            {check.conditions && (
                                                <p className="text-muted-foreground ml-5">조건: {check.conditions}</p>
                                            )}
                                            <p className="ml-5 mt-1 font-medium">{check.result}</p>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
            </CardContent>
        </Card>
    );
}

/**
 * 상품명에서 보험사 이름을 제거하고 상품 유형명만 추출
 * 예: "삼성화재 삼태노" → "삼태노"
 * 예: "DB손해보험 간편보험 305" → "간편보험 305"
 */
function extractProductTypeName(productName: string): string {
    // 보험사 이름 목록 (앞에서 제거)
    const insurerPrefixes = [
        '삼성화재', '삼성생명', 'DB손해보험', 'DB손보', '흥국화재', '흥국생명',
        '한화손해보험', '한화손보', '한화생명', '메리츠화재', '메리츠',
        '현대해상', 'KB손해보험', 'KB손보', 'KB생명', 'NH농협생명', 'NH농협손해보험',
        '교보생명', '신한라이프', 'AIA생명', '라이나생명', '처브', 'AXA손해보험',
        'MG손해보험', 'ABL생명', '하나생명', '동양생명', '푸본현대생명',
        'KDB생명', '미래에셋생명', '오렌지라이프', '카카오페이손해보험', '토스손해보험',
    ];

    let name = productName.trim();
    for (const prefix of insurerPrefixes) {
        if (name.startsWith(prefix)) {
            name = name.slice(prefix.length).trim();
            break;
        }
    }

    return name || productName;
}

/**
 * 상품명에서 보험사 이름 추출 (fallback용)
 */
function extractInsurers(productName: string): string[] {
    // 보험사가 상품명에 포함된 경우 추출
    const insurerPrefixes = [
        '삼성화재', '삼성생명', 'DB손해보험', 'DB손보', '흥국화재', '흥국생명',
        '한화손해보험', '한화손보', '한화생명', '메리츠화재', '메리츠',
        '현대해상', 'KB손해보험', 'KB손보', 'KB생명',
    ];

    for (const prefix of insurerPrefixes) {
        if (productName.startsWith(prefix)) {
            return [prefix];
        }
    }
    return [];
}
