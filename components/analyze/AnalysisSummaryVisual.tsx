'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, Activity, Calendar, Pill, Building2 } from 'lucide-react';
import type { AnalysisResult } from '@/types/analysis';
import { getBodyPartIcon } from '@/lib/kcd/client-utils';

interface AnalysisSummaryVisualProps {
    result: AnalysisResult;
}

export default function AnalysisSummaryVisual({ result }: AnalysisSummaryVisualProps) {
    const applicableCount = result.items.filter(i => i.applicable).length;
    const totalCount = result.items.length;
    const passRate = totalCount > 0 ? Math.round(((totalCount - applicableCount) / totalCount) * 100) : 0;

    const highRisks = result.riskFlags.filter(f => f.severity === 'high');
    const medRisks = result.riskFlags.filter(f => f.severity === 'medium');

    // 질환 수
    const diseaseCount = result.diseaseSummary?.length || 0;
    const activeDiseases = result.diseaseSummary?.filter(d => d.status === '현재 치료중') || [];

    return (
        <div className="space-y-4">
            {/* 고지사항 통과율 카드 */}
            <Card className="border-0 shadow-md overflow-hidden">
                <div className={`h-1 ${passRate >= 80 ? 'bg-green-500' : passRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                <CardContent className="p-5">
                    <div className="flex items-center gap-5">
                        {/* 원형 게이지 */}
                        <div className="relative w-24 h-24 shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                <circle cx="50" cy="50" r="40" fill="none"
                                    stroke={passRate >= 80 ? '#22c55e' : passRate >= 50 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="8"
                                    strokeDasharray={`${passRate * 2.51} ${251 - passRate * 2.51}`}
                                    strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-black">{passRate}%</span>
                                <span className="text-[9px] text-muted-foreground">통과율</span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-base font-bold mb-1">고지사항 분석 결과</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {totalCount}개 항목 중 <strong className="text-green-600">{totalCount - applicableCount}개 통과</strong>,{' '}
                                <strong className="text-red-600">{applicableCount}개 해당</strong>
                            </p>

                            {/* 항목별 통과/해당 바 */}
                            <div className="flex gap-0.5 mt-3 h-2 rounded-full overflow-hidden bg-muted">
                                {result.items.map((item, i) => (
                                    <div key={i}
                                        className={`flex-1 ${item.applicable ? 'bg-red-400' : 'bg-green-400'}`}
                                        title={item.category}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400" /> 해당없음</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> 해당</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 주요 지표 요약 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Activity className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-2xl font-black">{diseaseCount}</p>
                        <p className="text-[10px] text-muted-foreground">진단 질환 수</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Pill className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-2xl font-black">{activeDiseases.length}</p>
                        <p className="text-[10px] text-muted-foreground">현재 치료중</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${highRisks.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
                        <p className="text-2xl font-black">{highRisks.length}</p>
                        <p className="text-[10px] text-muted-foreground">고위험 플래그</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-black">{totalCount - applicableCount}</p>
                        <p className="text-[10px] text-muted-foreground">통과 항목</p>
                    </CardContent>
                </Card>
            </div>

            {/* 질환 타임라인 */}
            {result.diseaseSummary && result.diseaseSummary.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            질환별 치료 현황
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {result.diseaseSummary.map((d, i) => {
                            const isActive = d.status === '현재 치료중';
                            return (
                                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${isActive ? 'bg-red-50/50 border-red-200' : 'bg-muted/30'}`}>
                                    <span className="text-xl shrink-0">{getBodyPartIcon(d.diseaseCode)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold truncate">{d.diseaseName}</span>
                                            <Badge variant={isActive ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                                                {d.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                            <span>{d.firstDate} ~ {d.lastDate}</span>
                                            <span>·</span>
                                            <span>{d.treatmentPeriod}</span>
                                            <span>·</span>
                                            <span>{String(d.totalVisits).replace(/회$/, '')}회</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">{d.diseaseCode}</Badge>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
