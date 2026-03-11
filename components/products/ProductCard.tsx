'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ProductEligibility } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: ProductEligibility;
}

export default function ProductCard({ product }: ProductCardProps) {
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

    return (
        <Card className={cn('border-0 shadow-sm overflow-hidden', config.bg)}>
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                            {productTypeLabels[product.productType] || product.productType}
                        </p>
                        <h3 className="text-lg font-bold">{product.productName}</h3>
                    </div>
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', config.bg, config.border, 'border-2')}>
                        <Icon className={cn('w-8 h-8', config.color)} />
                    </div>
                </div>

                {/* Eligibility Badge */}
                <Badge
                    className={cn(
                        'text-sm px-3 py-1 mb-4',
                        product.eligible === 'O' && 'bg-green-500 hover:bg-green-600',
                        product.eligible === 'X' && 'bg-red-500 hover:bg-red-600',
                        product.eligible === '△' && 'bg-amber-500 hover:bg-amber-600'
                    )}
                >
                    {product.eligibleText}
                </Badge>

                {/* Recommendation */}
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {product.recommendation}
                </p>

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
                </Accordion>
            </CardContent>
        </Card>
    );
}
