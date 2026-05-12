'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, XCircle, Info, Shield } from 'lucide-react';
import type { AnalysisResult, AnalysisItem } from '@/types/analysis';
import { cn } from '@/lib/utils';
import { getBodyPartIcon } from '@/lib/kcd/client-utils';

// 이종인 이사님 5/11 요청 — 6개 카테고리로 재구성, 입원&수술·7회이상통원은 중첩 아코디언.
type DisplaySection = {
    key: string;
    label: string;
    icon: string;
    /** 단순 단일 항목 */
    single?: AnalysisItem;
    /** 년수별로 묶인 중첩 항목 (예: 1년/2년/3년/4년/5년) */
    nested?: Array<{ yearLabel: string; items: AnalysisItem[] }>;
};

const YEARS = ['1year', '2year', '3year', '4year', '5year'] as const;
const YEAR_LABEL: Record<string, string> = {
    '1year': '최근 1년 이내',
    '2year': '최근 2년 이내',
    '3year': '최근 3년 이내',
    '4year': '최근 4년 이내',
    '5year': '최근 5년 이내',
};

/**
 * 분석 항목을 6개 큰 섹션으로 재구성.
 *   1. 3개월 이내 통원
 *   2. 7회 이상 통원       (1·2·3·4·5년 중첩)
 *   3. 3개월 이내 투약
 *   4. 입원 & 수술          (1·2·3·4·5년 중첩, 각 년도에 입원·수술)
 *   5. 5년 이내 주요질병
 *   6. 상시 복용약
 */
function buildDisplaySections(items: AnalysisItem[]): DisplaySection[] {
    const find = (cat: string) => items.find(i => i.category === cat);

    const sections: DisplaySection[] = [];

    // 1. 3개월 이내 통원
    const m3Visit = find('3months_visit');
    if (m3Visit) sections.push({ key: '3m_visit', label: '3개월 이내 통원', icon: '🏃', single: m3Visit });

    // 2. 7회 이상 통원 (1~5년 visit 합)
    const visitNested = YEARS.map(y => ({
        yearLabel: YEAR_LABEL[y],
        items: [find(`${y}_visit`)].filter(Boolean) as AnalysisItem[],
    })).filter(n => n.items.length > 0);
    if (visitNested.length > 0) {
        sections.push({ key: 'freq_visit', label: '7회 이상 통원', icon: '🏥', nested: visitNested });
    }

    // 3. 3개월 이내 투약
    const m3Med = find('3months_medication');
    if (m3Med) sections.push({ key: '3m_med', label: '3개월 이내 투약', icon: '💊', single: m3Med });

    // 4. 입원 & 수술 (1~5년 hospitalization + surgery 합)
    const hsNested = YEARS.map(y => {
        const list = [find(`${y}_hospitalization`), find(`${y}_surgery`)].filter(Boolean) as AnalysisItem[];
        return { yearLabel: YEAR_LABEL[y], items: list };
    }).filter(n => n.items.length > 0);
    if (hsNested.length > 0) {
        sections.push({ key: 'hosp_surg', label: '입원 & 수술', icon: '🏨', nested: hsNested });
    }

    // 5. 5년 이내 주요질병
    const majorDisease = find('5year_major_disease');
    if (majorDisease) sections.push({ key: 'major_disease', label: '5년 이내 주요질병', icon: '⚕️', single: majorDisease });

    // 6. 상시 복용약
    const ongoing = find('ongoing_medication');
    if (ongoing) sections.push({ key: 'ongoing', label: '상시 복용약', icon: '💊', single: ongoing });

    return sections;
}

/** 한 섹션이 "해당"인지 (single이면 그 항목의 applicable, nested면 하나라도 applicable) */
function sectionApplicable(s: DisplaySection): boolean {
    if (s.single) return s.single.applicable;
    if (s.nested) return s.nested.some(n => n.items.some(i => i.applicable));
    return false;
}

interface AnalysisResultProps {
    result: AnalysisResult;
}

export default function AnalysisResultView({ result }: AnalysisResultProps) {
    // 이종인 5/11 요청: 상단 통과율 차트·통계 카드·질환별 치료 현황 삭제 (정보 중복).
    // → AnalysisSummaryVisual 컴포넌트 제거. 분석 요약·주의 박스·항목별 고지사항만 표시.
    return (
        <div className="space-y-6 animate-fade-in">
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

            {/* (이종인 5/11) 질병별 치료 요약 카드 제거 — 정보 중복. 항목별 고지사항 분석에 집중. */}

            {/* Analysis Items Accordion — Step 1: 항목별 고지사항 분석 (6개 큰 카테고리, 글자 크게) */}
            <Card className="border-2 border-primary/20 shadow-md ring-1 ring-primary/5">
                <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent border-b border-primary/10 py-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3 font-extrabold">
                            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                                <Info className="w-6 h-6 text-primary" />
                            </div>
                            <span>
                                <span className="text-sm font-bold text-primary/70 block leading-tight mb-0.5">STEP 1</span>
                                <span>항목별 고지사항 분석</span>
                            </span>
                        </CardTitle>
                        {/* 요약 카운터 — 해당 N건 한눈에 */}
                        {(() => {
                            const sections = buildDisplaySections(result.items);
                            const applicableCount = sections.filter(sectionApplicable).length;
                            return (
                                <div className="flex gap-2">
                                    <span className={`text-base font-bold px-4 py-2 rounded-full ${applicableCount > 0 ? 'bg-red-50 text-red-700 border-2 border-red-200' : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200'}`}>
                                        해당 {applicableCount}건
                                    </span>
                                    <span className="text-base font-bold px-4 py-2 rounded-full bg-gray-50 text-gray-700 border-2 border-gray-200">
                                        총 {sections.length}건
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <Accordion className="space-y-4">
                        {buildDisplaySections(result.items).map((section) => {
                            const applicable = sectionApplicable(section);
                            return (
                                <AccordionItem
                                    key={section.key}
                                    value={section.key}
                                    className={`border-2 rounded-2xl px-6 transition-all ${
                                        applicable
                                            ? 'border-l-[8px] border-l-red-500 border-red-200/60 bg-red-50/40 hover:bg-red-50/60'
                                            : 'border-l-[8px] border-l-emerald-500 border-emerald-200/60 bg-emerald-50/30 hover:bg-emerald-50/50'
                                    }`}
                                >
                                    <AccordionTrigger className="hover:no-underline py-6">
                                        <div className="flex items-center gap-4 sm:gap-5 text-left w-full">
                                            {/* 아이콘 박스 — 큼지막 */}
                                            {applicable ? (
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0 ring-2 ring-red-500/20">
                                                    <XCircle className="w-8 h-8 sm:w-9 sm:h-9 text-red-600" />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/20">
                                                    <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                                    <span className="text-2xl shrink-0">{section.icon}</span>
                                                    <span className="font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
                                                        {section.label}
                                                    </span>
                                                    <Badge
                                                        className={`text-sm font-bold px-3 py-1 ${
                                                            applicable
                                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                                : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-200'
                                                        }`}
                                                    >
                                                        {applicable ? '⚠ 해당' : '✓ 해당없음'}
                                                    </Badge>
                                                </div>
                                                {/* 요약 한 줄 — single은 그 항목의 summary, nested는 해당 년도/유형 압축 */}
                                                {section.single && (
                                                    <p className={`text-base sm:text-lg leading-relaxed ${applicable ? 'text-foreground/80 font-semibold' : 'text-muted-foreground'}`}>
                                                        {section.single.summary}
                                                    </p>
                                                )}
                                                {section.nested && (
                                                    <p className={`text-base sm:text-lg leading-relaxed ${applicable ? 'text-foreground/80 font-semibold' : 'text-muted-foreground'}`}>
                                                        {(() => {
                                                            const applicableNests = section.nested.filter(n => n.items.some(i => i.applicable));
                                                            if (applicableNests.length === 0) return '해당 기간 내 해당사항 없음';
                                                            return applicableNests.map(n => n.yearLabel.replace('최근 ', '').replace(' 이내', '')).join(' · ') + ' 해당';
                                                        })()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-6 pt-2">
                                        {/* 단일 항목 — 질문 + 진료기록 상세 표/카드 */}
                                        {section.single && (
                                            <SingleItemDetail item={section.single} />
                                        )}

                                        {/* 중첩 항목 — 1년/2년/3년/4년/5년 내부 아코디언 */}
                                        {section.nested && (
                                            <Accordion className="space-y-2.5">
                                                {section.nested.map((year, yi) => {
                                                    const yearApplicable = year.items.some(i => i.applicable);
                                                    return (
                                                        <AccordionItem
                                                            key={yi}
                                                            value={`${section.key}-y${yi}`}
                                                            className={`border-2 rounded-xl px-5 ${
                                                                yearApplicable
                                                                    ? 'border-l-[5px] border-l-red-400 border-red-200/50 bg-red-50/30'
                                                                    : 'border-l-[5px] border-l-emerald-400 border-emerald-200/50 bg-emerald-50/20'
                                                            }`}
                                                        >
                                                            <AccordionTrigger className="hover:no-underline py-4">
                                                                <div className="flex items-center gap-3 text-left w-full">
                                                                    {yearApplicable ? (
                                                                        <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                            <span className="font-bold text-lg text-foreground">{year.yearLabel}</span>
                                                                            {year.items.map((sub) => {
                                                                                const subLabel = sub.category.includes('hospitalization')
                                                                                    ? '입원'
                                                                                    : sub.category.includes('surgery')
                                                                                    ? '수술'
                                                                                    : '7회통원';
                                                                                return (
                                                                                    <Badge
                                                                                        key={sub.category}
                                                                                        className={`text-xs font-bold px-2.5 py-0.5 ${
                                                                                            sub.applicable
                                                                                                ? 'bg-red-600 text-white'
                                                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                                        }`}
                                                                                    >
                                                                                        {subLabel} {sub.applicable ? '해당' : '없음'}
                                                                                    </Badge>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        <p className={`text-sm leading-relaxed ${yearApplicable ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                                                                            {year.items.filter(i => i.applicable).map(i => i.summary).join(' / ') || '해당 기간 내 해당사항 없음'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pb-3">
                                                                <div className="space-y-3 pl-1">
                                                                    {year.items.map((sub) => (
                                                                        <div key={sub.category} className="space-y-2">
                                                                            <SingleItemDetail item={sub} showQuestion={false} subtypeLabel={
                                                                                sub.category.includes('hospitalization') ? '입원'
                                                                                : sub.category.includes('surgery') ? '수술'
                                                                                : '7회이상통원'
                                                                            } />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    );
                                                })}
                                            </Accordion>
                                        )}
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

/**
 * 단일 항목 상세 — 질문 + 진료기록 표/카드.
 * 중첩 아코디언 안에서도 재사용 (subtypeLabel만 다름).
 */
function SingleItemDetail({
    item,
    showQuestion = true,
    subtypeLabel,
}: {
    item: AnalysisItem;
    showQuestion?: boolean;
    subtypeLabel?: string;
}) {
    return (
        <div className="space-y-3">
            {subtypeLabel && (
                <div className="flex items-center gap-2">
                    <Badge className={`text-sm font-bold px-3 py-1 ${item.applicable ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 border-2 border-slate-300'}`}>
                        {subtypeLabel} {item.applicable ? '해당' : '없음'}
                    </Badge>
                    <span className="text-sm text-foreground/80 font-medium">{item.summary}</span>
                </div>
            )}
            {showQuestion && (
                <p className="text-sm sm:text-base text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <strong>질문:</strong> {item.question}
                </p>
            )}

            {item.details.length > 0 && (
                <>
                    {/* Desktop: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-sm">날짜</TableHead>
                                    <TableHead className="text-sm">병원</TableHead>
                                    <TableHead className="text-sm">진단코드</TableHead>
                                    <TableHead className="text-sm">진단명</TableHead>
                                    <TableHead className="text-sm">유형</TableHead>
                                    <TableHead className="text-sm">기간</TableHead>
                                    <TableHead className="text-sm">비고</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {item.details.map((detail, dIndex) => (
                                    <TableRow key={dIndex}>
                                        <TableCell className="text-sm whitespace-nowrap font-medium">{detail.date}</TableCell>
                                        <TableCell className="text-sm">{detail.hospital}</TableCell>
                                        <TableCell className="text-sm font-mono">
                                            <span className="inline-flex items-center gap-1">
                                                <span className="text-base">{getBodyPartIcon(detail.diagnosisCode)}</span>
                                                {detail.diagnosisCode}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">{detail.diagnosisName}</TableCell>
                                        <TableCell className="text-sm">
                                            <Badge variant="outline" className="text-xs">{detail.type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{detail.duration}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
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
                            <div key={dIndex} className="rounded-lg border-2 p-3 space-y-1.5 bg-white/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold">{detail.date}</span>
                                    <Badge variant="outline" className="text-xs">{detail.type}</Badge>
                                </div>
                                <p className="text-base font-bold flex items-center gap-1.5">
                                    <span className="text-lg">{getBodyPartIcon(detail.diagnosisCode)}</span>
                                    {detail.diagnosisName}
                                    <span className="text-xs font-mono text-muted-foreground ml-1 font-normal">{detail.diagnosisCode}</span>
                                </p>
                                <div className="text-sm text-muted-foreground space-y-0.5">
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
    );
}
