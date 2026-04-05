'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Shield, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import type { ProductEligibility } from '@/types/analysis';

interface EligibilitySummaryProps {
    products: ProductEligibility[];
}

export default function EligibilitySummary({ products }: EligibilitySummaryProps) {
    const oCount = products.filter(p => p.eligible === 'O').length;
    const xCount = products.filter(p => p.eligible === 'X').length;
    const tCount = products.filter(p => p.eligible === '△').length;
    const total = products.length;

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const oAngle = (oCount / total) * circumference;
    const tAngle = (tCount / total) * circumference;

    // 고객 친화적 메시지
    const getMessage = () => {
        if (oCount >= 3) return { text: '가입할 수 있는 보험이 많아요! 👍', color: 'text-green-600' };
        if (oCount > 0) return { text: '가입 가능한 보험이 있어요', color: 'text-green-600' };
        if (tCount > 0) return { text: '조건에 따라 가입할 수 있는 보험이 있어요', color: 'text-amber-600' };
        return { text: '현재 조건으로는 가입이 어려워요', color: 'text-red-600' };
    };
    const msg = getMessage();

    return (
        <Card className="border-0 shadow-md overflow-hidden">
            <div className={`h-1.5 ${oCount > 0 ? 'bg-green-500' : tCount > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
            <CardContent className="p-5">
                {/* 제목 */}
                <h3 className={`text-lg font-bold mb-4 ${msg.color}`}>{msg.text}</h3>

                <div className="flex items-center gap-6">
                    {/* 도넛 차트 */}
                    <div className="relative w-28 h-28 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                            {oCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#22c55e" strokeWidth="10"
                                    strokeDasharray={`${oAngle} ${circumference - oAngle}`}
                                    strokeLinecap="round" />
                            )}
                            {tCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#f59e0b" strokeWidth="10"
                                    strokeDasharray={`${tAngle} ${circumference - tAngle}`}
                                    strokeDashoffset={`${-oAngle}`}
                                    strokeLinecap="round" />
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black">{oCount + tCount}</span>
                            <span className="text-[10px] text-muted-foreground">/ {total}개</span>
                        </div>
                    </div>

                    {/* 요약 카드 */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50">
                            <ThumbsUp className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-bold text-green-700">{oCount}개 가입 가능</p>
                                <p className="text-[11px] text-green-600">바로 가입을 진행할 수 있어요</p>
                            </div>
                        </div>
                        {tCount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50">
                                <HelpCircle className="w-5 h-5 text-amber-500" />
                                <div>
                                    <p className="text-sm font-bold text-amber-700">{tCount}개 조건부</p>
                                    <p className="text-[11px] text-amber-600">추가 서류나 조건 확인이 필요해요</p>
                                </div>
                            </div>
                        )}
                        {xCount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50">
                                <ThumbsDown className="w-5 h-5 text-red-400" />
                                <div>
                                    <p className="text-sm font-bold text-red-600">{xCount}개 가입 어려움</p>
                                    <p className="text-[11px] text-red-500">현재 건강 상태로는 가입이 어려워요</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
