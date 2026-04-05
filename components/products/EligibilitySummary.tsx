'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Shield } from 'lucide-react';
import type { ProductEligibility } from '@/types/analysis';

interface EligibilitySummaryProps {
    products: ProductEligibility[];
}

export default function EligibilitySummary({ products }: EligibilitySummaryProps) {
    const oCount = products.filter(p => p.eligible === 'O').length;
    const xCount = products.filter(p => p.eligible === 'X').length;
    const tCount = products.filter(p => p.eligible === '△').length;
    const total = products.length;

    // 도넛 차트 SVG
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const oAngle = (oCount / total) * circumference;
    const tAngle = (tCount / total) * circumference;
    const xAngle = (xCount / total) * circumference;

    const overallMessage = oCount > 0
        ? `${total}개 상품 중 ${oCount}개 가입 가능합니다`
        : tCount > 0
        ? `조건부로 가입 가능한 상품이 ${tCount}개 있습니다`
        : '현재 조건으로 가입 가능한 상품이 없습니다';

    const overallColor = oCount > 0 ? 'text-green-600' : tCount > 0 ? 'text-amber-600' : 'text-red-600';

    return (
        <Card className="border-0 shadow-md overflow-hidden">
            <div className={`h-1 ${oCount > 0 ? 'bg-green-500' : tCount > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    가입 가능 여부 한눈에 보기
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-6">
                    {/* 도넛 차트 */}
                    <div className="relative w-28 h-28 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            {/* 배경 원 */}
                            <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                            {/* 가입가능 (O) */}
                            {oCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#22c55e" strokeWidth="10"
                                    strokeDasharray={`${oAngle} ${circumference - oAngle}`}
                                    strokeDashoffset="0"
                                    strokeLinecap="round" />
                            )}
                            {/* 조건부 (△) */}
                            {tCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#f59e0b" strokeWidth="10"
                                    strokeDasharray={`${tAngle} ${circumference - tAngle}`}
                                    strokeDashoffset={`${-oAngle}`}
                                    strokeLinecap="round" />
                            )}
                            {/* 불가 (X) */}
                            {xCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#ef4444" strokeWidth="10"
                                    strokeDasharray={`${xAngle} ${circumference - xAngle}`}
                                    strokeDashoffset={`${-(oAngle + tAngle)}`}
                                    strokeLinecap="round" />
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black">{oCount + tCount}</span>
                            <span className="text-[10px] text-muted-foreground">/ {total}</span>
                        </div>
                    </div>

                    {/* 요약 */}
                    <div className="flex-1 space-y-3">
                        <p className={`text-sm font-semibold ${overallColor}`}>{overallMessage}</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-2.5 py-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <div>
                                    <p className="text-lg font-bold text-green-700">{oCount}</p>
                                    <p className="text-[10px] text-green-600">가입가능</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <div>
                                    <p className="text-lg font-bold text-amber-700">{tCount}</p>
                                    <p className="text-[10px] text-amber-600">조건부</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2.5 py-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <div>
                                    <p className="text-lg font-bold text-red-700">{xCount}</p>
                                    <p className="text-[10px] text-red-600">불가</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
