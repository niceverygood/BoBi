'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import type { ClaimableItem } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface ClaimResultProps {
    items: ClaimableItem[];
}

function getClaimIcon(claimable: string) {
    if (claimable === 'O') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (claimable === 'X') return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
}

function getClaimBadge(claimable: string, claimableText: string) {
    if (claimable === 'O') {
        return <Badge className="text-xs bg-green-500">청구가능</Badge>;
    }
    if (claimable === 'X') {
        return <Badge variant="secondary" className="text-xs">청구불가</Badge>;
    }
    return <Badge className="text-xs bg-amber-500">{claimableText || '확인필요'}</Badge>;
}

export default function ClaimResultView({ items }: ClaimResultProps) {
    if (!items || items.length === 0) {
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
                                {item.diagnosisCode && (
                                    <p className="text-xs text-muted-foreground/60">코드: {item.diagnosisCode}</p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline">{item.treatmentType}</Badge>
                                {item.surgeryGrade && (
                                    <Badge variant="outline" className="text-xs">{item.surgeryGrade}</Badge>
                                )}
                            </div>
                        </div>

                        {/* Claim Results */}
                        {item.claimResults && item.claimResults.length > 0 && (
                            <Accordion>
                                {item.claimResults.map((result, cIndex) => (
                                    <AccordionItem key={cIndex} value={`clause-${index}-${cIndex}`} className="border rounded-lg px-3 mb-2">
                                        <AccordionTrigger className="py-3 hover:no-underline">
                                            <div className="flex items-center gap-2">
                                                {getClaimIcon(result.claimable)}
                                                <span className="text-sm font-medium">{result.clauseType}</span>
                                                {getClaimBadge(result.claimable, result.claimableText)}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-3">
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-start gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                                    <p className="text-muted-foreground">{result.reason}</p>
                                                </div>
                                                {result.excludedBy && (
                                                    <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded-md">
                                                        <p className="text-xs text-red-600 dark:text-red-400">
                                                            보상제외: {result.excludedBy}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
