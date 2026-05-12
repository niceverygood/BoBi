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
import AnalysisSummaryVisual from './AnalysisSummaryVisual';

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
            {/* 시각화 요약 (고객 친화적) */}
            <AnalysisSummaryVisual result={result} />

            {/* Overall Summary — 그라디언트·primary 톤 제거, 회색 베이스 */}
            <Card className="border border-gray-200 shadow-sm bg-gray-50">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
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

            {/* Analysis Items Accordion — Step 1: 항목별 고지사항 분석 (가장 핵심 섹션, 시각적 비중 ↑) */}
            <Card className="border-2 border-primary/20 shadow-md ring-1 ring-primary/5">
                <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent border-b border-primary/10">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5 font-bold">
                            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                                <Info className="w-5 h-5 text-primary" />
                            </div>
                            <span>
                                <span className="text-xs font-semibold text-primary/70 block leading-tight mb-0.5">STEP 1</span>
                                <span>항목별 고지사항 분석</span>
                            </span>
                        </CardTitle>
                        {/* 요약 카운터 — 해당 N건 한눈에 */}
                        {(() => {
                            const groups = groupItemsForDisplay(result.items);
                            const applicableCount = groups.filter(g =>
                                g.type === 'single' ? g.items[0].applicable : g.items.some(i => i.applicable)
                            ).length;
                            return (
                                <div className="flex gap-2">
                                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${applicableCount > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                        해당 {applicableCount}건
                                    </span>
                                    <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                                        총 {groups.length}건
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </CardHeader>
                <CardContent className="pt-5">
                    <Accordion className="space-y-3">
                        {groupItemsForDisplay(result.items).map((group, gIndex) => {
                            if (group.type === 'single') {
                                const item = group.items[0];
                                return (
                            <AccordionItem
                                key={gIndex}
                                value={`item-${gIndex}`}
                                className={`border-2 rounded-xl px-5 transition-all ${
                                    item.applicable
                                        ? 'border-l-[6px] border-l-red-500 border-red-200/60 bg-red-50/40 hover:bg-red-50/60'
                                        : 'border-l-[6px] border-l-emerald-500 border-emerald-200/60 bg-emerald-50/30 hover:bg-emerald-50/50'
                                }`}
                            >
                                <AccordionTrigger className="hover:no-underline py-5">
                                    <div className="flex items-center gap-4 text-left">
                                        {item.applicable ? (
                                            <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 ring-2 ring-red-500/20">
                                                <XCircle className="w-6 h-6 text-red-600" />
                                            </div>
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/20">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-bold text-base sm:text-lg text-foreground">
                                                    {getCategoryLabel(item.category)}
                                                </span>
                                                <Badge
                                                    variant={item.applicable ? 'destructive' : 'secondary'}
                                                    className={`text-xs font-bold px-2.5 py-0.5 ${
                                                        item.applicable
                                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                                    }`}
                                                >
                                                    {item.applicable ? '⚠ 해당' : '✓ 해당없음'}
                                                </Badge>
                                            </div>
                                            <p className={`text-sm leading-relaxed ${item.applicable ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                                                {item.summary}
                                            </p>
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
                            <AccordionItem
                                key={gIndex}
                                value={`item-${gIndex}`}
                                className={`border-2 rounded-xl px-5 transition-all ${
                                    anyApplicable
                                        ? 'border-l-[6px] border-l-red-500 border-red-200/60 bg-red-50/40 hover:bg-red-50/60'
                                        : 'border-l-[6px] border-l-emerald-500 border-emerald-200/60 bg-emerald-50/30 hover:bg-emerald-50/50'
                                }`}
                            >
                                <AccordionTrigger className="hover:no-underline py-5">
                                    <div className="flex items-center gap-4 text-left">
                                        {anyApplicable ? (
                                            <div className="w-11 h-11 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 ring-2 ring-red-500/20">
                                                <XCircle className="w-6 h-6 text-red-600" />
                                            </div>
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/20">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <span className="font-bold text-base sm:text-lg text-foreground">{group.label}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                                {group.items.map((sub) => (
                                                    <Badge
                                                        key={sub.category}
                                                        variant={sub.applicable ? 'destructive' : 'secondary'}
                                                        className={`text-xs font-bold px-2.5 py-0.5 ${
                                                            sub.applicable
                                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                                        }`}
                                                    >
                                                        {sub.category.includes('hospitalization') ? '입원' : sub.category.includes('surgery') ? '수술' : '7회통원'}
                                                        {sub.applicable ? ' 해당' : ' 없음'}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className={`text-sm leading-relaxed ${anyApplicable ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
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
