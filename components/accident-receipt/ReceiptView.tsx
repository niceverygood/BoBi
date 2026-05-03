'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, Brain, Stethoscope, Wallet, HeartPulse, MessageCircle } from 'lucide-react';
import type { AccidentReceipt } from '@/types/accident-receipt';

interface ReceiptViewProps {
    receipt: AccidentReceipt;
}

function formatMoney(amount: number): string {
    if (Math.abs(amount) >= 10000) {
        return `${(amount / 10000).toFixed(1)}억`;
    }
    return `${amount.toLocaleString()}만`;
}

export default function ReceiptView({ receipt }: ReceiptViewProps) {
    const isPositive = receipt.finalAmount >= 0;

    return (
        <div className="space-y-4">
            <Card className="border-0 shadow-lg overflow-hidden">
                {/* 헤더 — 영수증 도메인 어두운 톤 보존 (그라디언트만 단색화) */}
                <div className="bg-gray-900 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 tracking-wider uppercase">가상 사고 영수증</p>
                            <h2 className="text-xl font-bold mt-1">{receipt.diseaseName}</h2>
                            {receipt.diseaseCode && (
                                <p className="text-xs text-gray-400 mt-0.5">질병코드: {receipt.diseaseCode}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">투병 기간</p>
                            <p className="text-lg font-bold">{receipt.treatmentMonths}개월</p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    {/* 항목별 내역 */}
                    <div className="divide-y">
                        <div className="flex items-center justify-between px-6 py-4">
                            <div>
                                <p className="text-sm font-medium">총 진료비</p>
                                <p className="text-xs text-muted-foreground">
                                    급여 {formatMoney(receipt.coveredCost)}원 + 비급여 {formatMoney(receipt.uncoveredCost)}원
                                </p>
                            </div>
                            <p className="text-base font-bold text-slate-800">{formatMoney(receipt.totalMedicalCost)}원</p>
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 bg-green-50/50">
                            <div>
                                <p className="text-sm font-medium text-green-700">건강보험 적용</p>
                                <p className="text-xs text-muted-foreground">급여 {formatMoney(receipt.coveredCost)}원의 {Math.round((1 - receipt.coveredSelfPayRatio) * 100)}% 공제</p>
                            </div>
                            <p className="text-base font-bold text-green-600">- {formatMoney(receipt.insuranceCoverage)}원</p>
                        </div>

                        <div className="px-6 py-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">개인 부담금 합계</p>
                                </div>
                                <p className="text-base font-bold text-red-600">{formatMoney(receipt.selfPayAmount)}원</p>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5 pl-2 border-l-2 border-red-200">
                                <p>급여 본인부담 ({Math.round(receipt.coveredSelfPayRatio * 100)}%): {formatMoney(receipt.coveredSelfPay)}원</p>
                                <p>비급여 전액부담: {formatMoney(receipt.uncoveredCost)}원</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 bg-blue-50/50">
                            <div>
                                <p className="text-sm font-medium text-blue-700">설계 보험금</p>
                                <p className="text-xs text-muted-foreground">현재 보험 수령 예상액</p>
                            </div>
                            <p className="text-base font-bold text-blue-600">+ {formatMoney(receipt.insurancePayout)}원</p>
                        </div>

                        <div className="flex items-center justify-between px-6 py-4">
                            <div>
                                <p className="text-sm font-medium">생활비</p>
                                <p className="text-xs text-muted-foreground">월 {receipt.monthlyLivingCost.toLocaleString()}만원 × {receipt.treatmentMonths}개월</p>
                            </div>
                            <p className="text-base font-bold text-red-600">- {formatMoney(receipt.totalLivingCost)}원</p>
                        </div>
                    </div>

                    {/* 구분선 */}
                    <div className="px-6">
                        <div className="border-t-2 border-dashed border-slate-300" />
                    </div>

                    {/* 최종 결과 */}
                    <div className={`px-6 py-5 ${isPositive ? 'bg-blue-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isPositive ? (
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                )}
                                <div>
                                    <p className="text-sm font-bold">
                                        {isPositive ? '최종 수령 예상액' : '부족 예상 금액'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        보험금 - 개인부담금 - 생활비
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-black ${isPositive ? 'text-blue-700' : 'text-red-700'}`}>
                                    {isPositive ? '+' : ''}{formatMoney(receipt.finalAmount)}원
                                </p>
                                <Badge className={`text-[10px] mt-1 ${isPositive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                    {isPositive ? '여유' : '부족'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* 부족분 안내 */}
                    {!isPositive && (
                        <div className="px-6 py-4 bg-amber-50 border-t">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-semibold text-amber-800">
                                        최소 {formatMoney(Math.abs(receipt.finalAmount))}원의 추가 보장이 필요합니다
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        투병 기간 {receipt.treatmentMonths}개월간 생활비와 치료비를 감안할 때,
                                        현재 보험만으로는 부족할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI 분석 */}
            {receipt.aiAnalysis && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary" />
                            AI 상세 분석
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                                질환 개요
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{receipt.aiAnalysis.diseaseOverview}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                                <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                                치료 과정
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{receipt.aiAnalysis.treatmentProcess}</p>
                        </div>

                        {/* 추가 치료법 (심평원에 안 잡히는 항목) */}
                        {receipt.aiAnalysis.additionalTreatments && receipt.aiAnalysis.additionalTreatments.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                    <HeartPulse className="w-3.5 h-3.5 text-violet-600" />
                                    추가 치료법 및 비용
                                    <Badge variant="outline" className="text-[9px]">심평원 외</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    심평원 평균 통계에 잡히지 않는 실제 환자가 받는 치료법입니다.
                                </p>
                                <div className="space-y-2">
                                    {receipt.aiAnalysis.additionalTreatments.map((t, i) => (
                                        <div key={i} className="border rounded-lg p-3 bg-violet-50/30 border-violet-100">
                                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                                <p className="text-sm font-bold text-violet-900">{t.name}</p>
                                                <Badge className={`text-[10px] ${t.isCovered === '비급여' ? 'bg-red-500 text-white' : t.isCovered === '급여' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                    {t.isCovered}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{t.description}</p>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">💰 예상 비용</span>
                                                <span className="font-bold text-violet-700">{t.estimatedCost}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs mt-0.5">
                                                <span className="text-muted-foreground">📅 치료 주기</span>
                                                <span className="text-foreground">{t.frequency}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 숨은 비용 */}
                        {receipt.aiAnalysis.hiddenCosts && receipt.aiAnalysis.hiddenCosts.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                    숨은 비용 (영수증에 안 잡히는 부담)
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {receipt.aiAnalysis.hiddenCosts.map((h, i) => (
                                        <div key={i} className="border border-red-100 bg-red-50/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-bold text-red-900">{h.item}</p>
                                                <span className="text-xs font-bold text-red-700">{h.estimatedCost}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">{h.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                                비용 구조
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{receipt.aiAnalysis.costBreakdown}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                                투병 중 생활 영향
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{receipt.aiAnalysis.lifeImpact}</p>
                        </div>

                        {receipt.aiAnalysis.consultingPoints && receipt.aiAnalysis.consultingPoints.length > 0 && (
                            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                                    상담 포인트
                                </div>
                                <ul className="space-y-1.5">
                                    {receipt.aiAnalysis.consultingPoints.map((point, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 면책 고지 */}
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-4 leading-relaxed">
                {receipt.disclaimer}
            </div>
        </div>
    );
}
