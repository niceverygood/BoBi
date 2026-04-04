'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Pill, HeartPulse, Shield, Info, Receipt } from 'lucide-react';
import Link from 'next/link';
import RiskGauge from './RiskGauge';
import type { RiskReport, RiskCategory } from '@/types/risk-report';

interface RiskReportViewProps {
    report: RiskReport;
}

const CATEGORY_COLORS: Record<RiskCategory, string> = {
    '심혈관': 'bg-red-100 text-red-700',
    '대사': 'bg-orange-100 text-orange-700',
    '신장': 'bg-purple-100 text-purple-700',
    '암': 'bg-rose-100 text-rose-800',
    '근골격': 'bg-teal-100 text-teal-700',
    '정신': 'bg-indigo-100 text-indigo-700',
    '호흡기': 'bg-sky-100 text-sky-700',
    '소화기': 'bg-lime-100 text-lime-700',
    '신경': 'bg-violet-100 text-violet-700',
    '기타': 'bg-gray-100 text-gray-700',
};

export default function RiskReportView({ report }: RiskReportViewProps) {
    const { medicalSummary, riskItems, compoundRisks, overallAssessment, disclaimer } = report;

    return (
        <div className="space-y-6">
            {/* 현재 병력 요약 */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        현재 병력 요약
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 주요 질환 */}
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">주요 질환</p>
                        <div className="flex flex-wrap gap-2">
                            {medicalSummary.mainDiseases.map((d, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                    {d.name}
                                    <span className="text-muted-foreground ml-1">({d.code})</span>
                                </Badge>
                            ))}
                            {medicalSummary.mainDiseases.length === 0 && (
                                <span className="text-sm text-muted-foreground">진단 기록 없음</span>
                            )}
                        </div>
                    </div>

                    {/* 복용 약물 */}
                    {medicalSummary.currentMedications.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <Pill className="w-3 h-3" /> 복용 약물
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {medicalSummary.currentMedications.map((med, i) => (
                                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                                        {med}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 진료 패턴 */}
                    <p className="text-sm text-muted-foreground">
                        {medicalSummary.treatmentPattern}
                    </p>
                </CardContent>
            </Card>

            {/* 위험 질환 목록 (메인) */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        위험 질환 분석
                        <Badge variant="secondary" className="ml-1 text-xs">{riskItems.length}건</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {riskItems.map((item, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-sm">{item.riskDisease}</h4>
                                        <Badge className={`text-[10px] ${CATEGORY_COLORS[item.riskCategory as RiskCategory] || CATEGORY_COLORS['기타']}`}>
                                            {item.riskCategory}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {item.sourceDisease}({item.sourceCode})으로 인한 위험
                                    </p>
                                </div>
                            </div>

                            <RiskGauge relativeRisk={item.relativeRisk} riskLevel={item.riskLevel} />

                            <p className="text-sm leading-relaxed">{item.explanation}</p>

                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>
                                    <span className="font-medium">근거({item.evidenceLevel})</span>: {item.evidence}
                                </span>
                            </div>

                            {/* 가상 사고 영수증 연결 */}
                            <Link href={`/dashboard/accident-receipt?disease=${encodeURIComponent(item.riskDisease)}&code=${item.sourceCode}&from=risk-report`}>
                                <Button variant="outline" size="sm" className="w-full text-xs border-slate-300 hover:bg-slate-50">
                                    <Receipt className="w-3.5 h-3.5 mr-1.5" />
                                    이 질환으로 가상 사고 영수증 보기
                                </Button>
                            </Link>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 복합 위험 요인 */}
            {compoundRisks.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <HeartPulse className="w-4 h-4 text-red-500" />
                            복합 위험 요인
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {compoundRisks.map((cr, i) => (
                            <div key={i} className="border border-red-200 bg-red-50/50 rounded-lg p-4 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    {cr.diseases.map((d, j) => (
                                        <Badge key={j} variant="outline" className="text-xs border-red-300 text-red-700">
                                            {d}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-sm font-medium">{cr.effect}</p>
                                <p className="text-sm text-muted-foreground">{cr.additionalRisk}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 종합 소견 */}
            <Card className="border-0 shadow-md bg-primary/5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        종합 소견
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{overallAssessment}</p>
                </CardContent>
            </Card>

            {/* 면책 고지 */}
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-4 leading-relaxed">
                {disclaimer}
            </div>
        </div>
    );
}
