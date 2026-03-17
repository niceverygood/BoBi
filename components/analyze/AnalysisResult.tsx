'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, XCircle, Info, Shield } from 'lucide-react';
import type { AnalysisResult } from '@/types/analysis';
import { getCategoryLabel } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { getBodyPartIcon } from '@/lib/kcd/client-utils';

interface AnalysisResultProps {
    result: AnalysisResult;
}

export default function AnalysisResultView({ result }: AnalysisResultProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Overall Summary */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">분석 요약</h3>
                            <p className="text-muted-foreground leading-relaxed">{result.overallSummary}</p>
                            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                                <span>분석일: {result.analysisDate}</span>
                                <span>데이터 기간: {result.dataRange}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Flags */}
            {result.riskFlags.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {result.riskFlags.map((flag, index) => (
                        <Card key={index} className={cn(
                            'border-0 shadow-sm',
                            flag.severity === 'high' && 'bg-red-50 dark:bg-red-950/20',
                            flag.severity === 'medium' && 'bg-amber-50 dark:bg-amber-950/20',
                            flag.severity === 'low' && 'bg-blue-50 dark:bg-blue-950/20'
                        )}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className={cn(
                                        'w-4 h-4',
                                        flag.severity === 'high' && 'text-red-500',
                                        flag.severity === 'medium' && 'text-amber-500',
                                        flag.severity === 'low' && 'text-blue-500'
                                    )} />
                                    <Badge variant={flag.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                        {flag.severity === 'high' ? '주의' : flag.severity === 'medium' ? '참고' : '정보'}
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium">{flag.flag}</p>
                                <p className="text-xs text-muted-foreground mt-1">{flag.recommendation}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Disease Summary */}
            {result.diseaseSummary && result.diseaseSummary.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            📊 질병별 치료 요약
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {result.diseaseSummary.map((d, i) => (
                                <div key={i} className="rounded-lg border p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm flex items-center gap-1.5">
                                            <span className="text-base" title={d.diseaseCode}>{getBodyPartIcon(d.diseaseCode)}</span>
                                            {d.diseaseName}
                                        </span>
                                        <Badge variant="outline" className="text-xs font-mono">{d.diseaseCode}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                        <span>최초: {d.firstDate}</span>
                                        <span>최근: {d.lastDate}</span>
                                        <span>방문: {String(d.totalVisits).replace(/회$/, '')}회</span>
                                        <span>기간: {d.treatmentPeriod}</span>
                                    </div>
                                    <Badge variant={d.status === '현재 치료중' ? 'destructive' : 'secondary'} className="text-xs">
                                        {d.status}
                                    </Badge>
                                    {d.hospitals && d.hospitals.length > 0 && (
                                        <p className="text-xs text-muted-foreground">🏥 {d.hospitals.join(', ')}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Analysis Items Accordion */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        항목별 고지사항 분석
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion className="space-y-2">
                        {result.items.map((item, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3 text-left">
                                        {item.applicable ? (
                                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-medium text-sm">
                                                    {getCategoryLabel(item.category)}
                                                </span>
                                                <Badge variant={item.applicable ? 'destructive' : 'secondary'} className="text-xs">
                                                    {item.applicable ? '해당' : '해당없음'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{item.summary}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4">
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                            <strong>질문:</strong> {item.question}
                                        </p>

                                        {item.details.length > 0 && (
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">날짜</TableHead>
                                                            <TableHead className="text-xs">병원</TableHead>
                                                            <TableHead className="text-xs">진단코드</TableHead>
                                                            <TableHead className="text-xs">진단명</TableHead>
                                                            <TableHead className="text-xs">유형</TableHead>
                                                            <TableHead className="text-xs">기간</TableHead>
                                                            <TableHead className="text-xs">비고</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {item.details.map((detail, dIndex) => (
                                                            <TableRow key={dIndex}>
                                                                <TableCell className="text-xs whitespace-nowrap">{detail.date}</TableCell>
                                                                <TableCell className="text-xs">{detail.hospital}</TableCell>
                                                                <TableCell className="text-xs font-mono">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <span className="text-sm">{getBodyPartIcon(detail.diagnosisCode)}</span>
                                                                        {detail.diagnosisCode}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-xs">{detail.diagnosisName}</TableCell>
                                                                <TableCell className="text-xs">
                                                                    <Badge variant="outline" className="text-xs">{detail.type}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-xs">{detail.duration}</TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">
                                                                    {detail.medication || detail.note || '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}

                                        {item.details.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                해당 기간 내 관련 진료기록이 없습니다.
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
