'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, XCircle, Info, Shield } from 'lucide-react';
import type { AnalysisResult, AnalysisItem } from '@/types/analysis';
import { getCategoryLabel } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { getBodyPartIcon } from '@/lib/kcd/client-utils';

type DisplayGroup = { type: 'single'; items: AnalysisItem[]; label: string } | { type: 'yearly'; items: AnalysisItem[]; label: string };

const YEARLY_PREFIXES = ['1year', '2year', '3year', '4year', '5year'] as const;
const YEARLY_SUFFIXES = ['_hospitalization', '_surgery', '_visit'] as const;
const YEARLY_LABELS: Record<string, string> = {
    '1year': '최근 1년 이내 입원/수술/7회이상통원',
    '2year': '최근 2년 이내 입원/수술/7회이상통원',
    '3year': '최근 3년 이내 입원/수술/7회이상통원',
    '4year': '최근 4년 이내 입원/수술/7회이상통원',
    '5year': '최근 5년 이내 입원/수술/7회이상통원',
};

function groupItemsForDisplay(items: AnalysisItem[]): DisplayGroup[] {
    const groups: DisplayGroup[] = [];
    const used = new Set<number>();

    for (let i = 0; i < items.length; i++) {
        if (used.has(i)) continue;
        const cat = items[i].category;

        const prefix = YEARLY_PREFIXES.find(p =>
            YEARLY_SUFFIXES.some(s => cat === `${p}${s}`)
        );

        if (prefix) {
            const yearItems: AnalysisItem[] = [];
            for (let j = 0; j < items.length; j++) {
                if (YEARLY_SUFFIXES.some(s => items[j].category === `${prefix}${s}`)) {
                    yearItems.push(items[j]);
                    used.add(j);
                }
            }
            groups.push({ type: 'yearly', items: yearItems, label: YEARLY_LABELS[prefix] || `${prefix} 이내` });
        } else {
            used.add(i);
            groups.push({ type: 'single', items: [items[i]], label: getCategoryLabel(cat) });
        }
    }
    return groups;
}

interface AnalysisResultProps {
    result: AnalysisResult;
}

export default function AnalysisResultView({ result }: AnalysisResultProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Overall Summary */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg mb-2">분석 요약</h3>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{result.overallSummary}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                                <span>분석일: {result.analysisDate}</span>
                                <span>데이터 기간: {result.dataRange}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Flags */}
            {result.riskFlags.length > 0 && (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                            {result.diseaseSummary.map((d, i) => (
                                <div key={i} className="rounded-lg border p-4 space-y-2 overflow-hidden">
                                    {/* Disease Name + Code */}
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-medium text-sm flex items-center gap-1.5 min-w-0">
                                            <span className="text-base shrink-0" title={d.diseaseCode}>{getBodyPartIcon(d.diseaseCode)}</span>
                                            <span className="break-words">{d.diseaseName}</span>
                                        </span>
                                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 whitespace-nowrap">{d.diseaseCode}</Badge>
                                    </div>
                                    {/* Dates & Visits */}
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                        <span className="truncate">최초: {d.firstDate}</span>
                                        <span className="truncate">최근: {d.lastDate}</span>
                                        <span className="truncate">방문: {String(d.totalVisits).replace(/회$/, '')}회</span>
                                        <span className="truncate">기간: {d.treatmentPeriod}</span>
                                    </div>
                                    {/* Status */}
                                    <Badge variant={d.status === '현재 치료중' ? 'destructive' : 'secondary'} className="text-xs">
                                        {d.status}
                                    </Badge>
                                    {/* Hospitals */}
                                    {d.hospitals && d.hospitals.length > 0 && (
                                        <p className="text-xs text-muted-foreground break-words line-clamp-2">🏥 {d.hospitals.join(', ')}</p>
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
                        {groupItemsForDisplay(result.items).map((group, gIndex) => {
                            if (group.type === 'single') {
                                const item = group.items[0];
                                return (
                            <AccordionItem key={gIndex} value={`item-${gIndex}`} className="border rounded-lg px-4">
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
                                            <>
                                                {/* Desktop: Table */}
                                                <div className="hidden md:block overflow-x-auto">
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

                                                {/* Mobile: Card Layout */}
                                                <div className="md:hidden space-y-2">
                                                    {item.details.map((detail, dIndex) => (
                                                        <div key={dIndex} className="rounded-lg border p-3 space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-medium">{detail.date}</span>
                                                                <Badge variant="outline" className="text-[10px]">{detail.type}</Badge>
                                                            </div>
                                                            <p className="text-sm font-medium flex items-center gap-1">
                                                                <span>{getBodyPartIcon(detail.diagnosisCode)}</span>
                                                                {detail.diagnosisName}
                                                                <span className="text-[10px] font-mono text-muted-foreground ml-1">{detail.diagnosisCode}</span>
                                                            </p>
                                                            <div className="text-xs text-muted-foreground space-y-0.5">
                                                                <p>🏥 {detail.hospital}</p>
                                                                {detail.duration && <p>⏱ {detail.duration}</p>}
                                                                {(detail.medication || detail.note) && (
                                                                    <p>📝 {detail.medication || detail.note}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {item.details.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                해당 기간 내 관련 진료기록이 없습니다.
                                            </p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                                );
                            }

                            // 년수별 그룹 (입원/수술/7회이상통원 통합)
                            const anyApplicable = group.items.some(i => i.applicable);
                            return (
                            <AccordionItem key={gIndex} value={`item-${gIndex}`} className="border rounded-lg px-4">
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-3 text-left">
                                        {anyApplicable ? (
                                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className="font-medium text-sm">{group.label}</span>
                                                {group.items.map((sub) => (
                                                    <Badge key={sub.category} variant={sub.applicable ? 'destructive' : 'secondary'} className="text-[10px]">
                                                        {sub.category.includes('hospitalization') ? '입원' : sub.category.includes('surgery') ? '수술' : '7회통원'}
                                                        {sub.applicable ? ' 해당' : ' 없음'}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {group.items.filter(i => i.applicable).map(i => i.summary).join(' / ') || '해당 기간 내 해당사항 없음'}
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4">
                                    <div className="space-y-4">
                                        {group.items.map((sub) => (
                                            <div key={sub.category} className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={sub.applicable ? 'destructive' : 'outline'} className="text-xs">
                                                        {sub.category.includes('hospitalization') ? '입원' : sub.category.includes('surgery') ? '수술' : '7회이상통원'}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">{sub.summary}</span>
                                                </div>
                                                {sub.details.length > 0 && (
                                                    <div className="ml-4 space-y-1">
                                                        {sub.details.map((d, di) => (
                                                            <div key={di} className="text-xs p-2 bg-muted/30 rounded-md flex flex-wrap gap-x-3 gap-y-0.5">
                                                                <span className="font-mono">{d.date}</span>
                                                                <span>{d.hospital}</span>
                                                                {d.diagnosisName && <span className="text-muted-foreground">{d.diagnosisName}</span>}
                                                                {d.duration && <span className="text-muted-foreground">{d.duration}</span>}
                                                                {d.note && <span className="text-muted-foreground">{d.note}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
