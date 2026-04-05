'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle, ThumbsUp, HelpCircle, ThumbsDown } from 'lucide-react';
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

    const getMessage = () => {
        if (oCount >= 3) return { text: '가입할 수 있는 보험이 많아요! 👍', color: 'text-[#1a56db]' };
        if (oCount > 0) return { text: '가입 가능한 보험이 있어요', color: 'text-[#1a56db]' };
        if (tCount > 0) return { text: '조건에 따라 가입할 수 있는 보험이 있어요', color: 'text-[#60a5fa]' };
        return { text: '현재 조건으로는 가입이 어려워요', color: 'text-[#94a3b8]' };
    };
    const msg = getMessage();

    return (
        <Card className="border-0 shadow-md overflow-hidden">
            <div className="h-1.5 bg-[#1a56db]" />
            <CardContent className="p-5">
                <h3 className={`text-lg font-bold mb-4 ${msg.color}`}>{msg.text}</h3>

                <div className="flex items-center gap-6">
                    {/* 도넛 차트 — 보비 블루 팔레트 */}
                    <div className="relative w-28 h-28 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                            {oCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#1a56db" strokeWidth="10"
                                    strokeDasharray={`${oAngle} ${circumference - oAngle}`}
                                    strokeLinecap="round" />
                            )}
                            {tCount > 0 && (
                                <circle cx="50" cy="50" r={radius} fill="none"
                                    stroke="#60a5fa" strokeWidth="10"
                                    strokeDasharray={`${tAngle} ${circumference - tAngle}`}
                                    strokeDashoffset={`${-oAngle}`}
                                    strokeLinecap="round" />
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-[#1a56db]">{oCount + tCount}</span>
                            <span className="text-[10px] text-slate-400">/ {total}개</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1a56db]/5 border border-[#1a56db]/10">
                            <ThumbsUp className="w-5 h-5 text-[#1a56db]" />
                            <div>
                                <p className="text-sm font-bold text-[#1a56db]">{oCount}개 가입 가능</p>
                                <p className="text-[11px] text-slate-500">바로 가입을 진행할 수 있어요</p>
                            </div>
                        </div>
                        {tCount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#60a5fa]/5 border border-[#60a5fa]/10">
                                <HelpCircle className="w-5 h-5 text-[#60a5fa]" />
                                <div>
                                    <p className="text-sm font-bold text-[#3b82f6]">{tCount}개 조건부</p>
                                    <p className="text-[11px] text-slate-500">추가 서류나 조건 확인이 필요해요</p>
                                </div>
                            </div>
                        )}
                        {xCount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <ThumbsDown className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-500">{xCount}개 가입 어려움</p>
                                    <p className="text-[11px] text-slate-400">현재 건강 상태로는 가입이 어려워요</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
