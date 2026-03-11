'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, DollarSign, FileText } from 'lucide-react';
import type { ClaimableItem } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface ClaimResultProps {
    items: ClaimableItem[];
}

export default function ClaimResultView({ items }: ClaimResultProps) {
    if (items.length === 0) {
        return (
            <p className="text-center text-muted-foreground py-8">
                청구 가능한 항목이 없습니다.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <Card key={index} className="border-0 shadow-sm animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs text-muted-foreground">{item.treatmentDate}</p>
                                <h4 className="font-medium">{item.diagnosis}</h4>
                                <p className="text-xs text-muted-foreground">{item.hospital}</p>
                            </div>
                            <Badge variant="outline">{item.treatmentType}</Badge>
                        </div>

                        {/* Applicable Clauses */}
                        <Accordion>
                            {item.applicableClauses.map((clause, cIndex) => (
                                <AccordionItem key={cIndex} value={`clause-${cIndex}`} className="border rounded-lg px-3 mb-2">
                                    <AccordionTrigger className="py-3 hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            {clause.claimable ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className="text-sm font-medium">{clause.clauseType}</span>
                                            <Badge
                                                variant={clause.claimable ? 'default' : 'secondary'}
                                                className={cn('text-xs', clause.claimable && 'bg-green-500')}
                                            >
                                                {clause.claimable ? '청구 가능' : '청구 불가'}
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-3">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-start gap-2">
                                                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                                <p className="text-muted-foreground">{clause.reason}</p>
                                            </div>
                                            {clause.estimatedAmount && (
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
                                                    <p className="font-medium">예상 청구 금액: {clause.estimatedAmount}</p>
                                                </div>
                                            )}
                                            {clause.howToClaim && (
                                                <div className="bg-muted/50 p-3 rounded-lg">
                                                    <p className="text-xs font-semibold mb-1">청구 방법</p>
                                                    <p className="text-xs text-muted-foreground">{clause.howToClaim}</p>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
