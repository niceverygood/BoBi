'use client';

import { useState, type ChangeEvent } from 'react';
import { TrendingUp, Zap, Calendar } from 'lucide-react';

const PRO_ANNUAL_PRICE = 380_000;
const PRO_MONTHLY_PRICE = 39_900;

function formatKRW(amount: number): string {
    if (amount >= 100_000_000) {
        const eok = amount / 100_000_000;
        return `${eok.toFixed(eok >= 10 ? 0 : 1)}억`;
    }
    if (amount >= 10_000) {
        return `${Math.round(amount / 10_000).toLocaleString()}만`;
    }
    return amount.toLocaleString();
}

export default function ROICalculator() {
    const [commissionManwon, setCommissionManwon] = useState(200);
    const [extraContracts, setExtraContracts] = useState(1);

    const monthlyAdd = commissionManwon * 10_000 * extraContracts;
    const annualAdd = monthlyAdd * 12;
    const roiMultiple = annualAdd / PRO_ANNUAL_PRICE;
    const payoffDays = monthlyAdd > 0
        ? Math.max(1, Math.ceil((PRO_ANNUAL_PRICE / monthlyAdd) * 30))
        : 0;

    return (
        <div className="bg-card border rounded-3xl p-6 sm:p-10 shadow-xl">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10">
                {/* 입력 영역 */}
                <div className="space-y-6 sm:space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label htmlFor="commission" className="text-sm sm:text-base font-semibold">
                                평균 계약당 수수료
                            </label>
                            <span className="text-lg sm:text-xl font-bold text-primary tabular-nums">
                                {commissionManwon.toLocaleString()}<span className="text-sm font-semibold">만원</span>
                            </span>
                        </div>
                        <input
                            id="commission"
                            type="range"
                            min={50}
                            max={500}
                            step={10}
                            value={commissionManwon}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCommissionManwon(Number(e.target.value))}
                            className="w-full accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                            <span>50만</span>
                            <span>500만</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label htmlFor="contracts" className="text-sm sm:text-base font-semibold">
                                보비로 월 추가 체결 기대
                            </label>
                            <span className="text-lg sm:text-xl font-bold text-primary tabular-nums">
                                {extraContracts}<span className="text-sm font-semibold">건</span>
                            </span>
                        </div>
                        <input
                            id="contracts"
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={extraContracts}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setExtraContracts(Number(e.target.value))}
                            className="w-full accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                            <span>1건</span>
                            <span>5건</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground leading-relaxed">
                        💡 종신·건강보험 월납 15~20만원 계약 기준 누적 수수료 150~300만원이 일반적입니다.
                        분석 속도·리포트 품질로 고객 체결률이 올라간다는 가정의 추정치입니다.
                    </div>
                </div>

                {/* 결과 영역 */}
                <div className="space-y-4">
                    <div className="p-6 sm:p-8 rounded-2xl bg-gradient-primary text-white shadow-lg">
                        <div className="flex items-center gap-2 text-xs sm:text-sm opacity-90 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <span>연 추가 수익 예상</span>
                        </div>
                        <div className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                            +{formatKRW(annualAdd)}<span className="text-2xl sm:text-3xl">원</span>
                        </div>
                        <div className="text-xs sm:text-sm opacity-90 mt-2">
                            월 {formatKRW(monthlyAdd)}원 × 12개월
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 sm:p-5 rounded-xl border bg-card">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                <span>구독료 대비 회수</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tabular-nums">
                                {Math.round(roiMultiple).toLocaleString()}<span className="text-base">배</span>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5 rounded-xl border bg-card">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>구독료 회수</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold tabular-nums">
                                {payoffDays}<span className="text-base">일</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 text-center text-xs text-muted-foreground">
                        보비 Pro 연 {PRO_ANNUAL_PRICE.toLocaleString()}원 (월 {PRO_MONTHLY_PRICE.toLocaleString()}원) 기준 · 추정치
                    </div>
                </div>
            </div>
        </div>
    );
}
