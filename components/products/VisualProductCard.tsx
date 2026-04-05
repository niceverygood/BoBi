'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, Info } from 'lucide-react';
import type { ProductEligibility } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface VisualProductCardProps {
    product: ProductEligibility;
}

const PRODUCT_TYPE_INFO: Record<string, { label: string; desc: string }> = {
    simple: { label: '간편보험', desc: '간단한 건강 질문만으로 가입하는 보험이에요' },
    mild: { label: '초경증 간편보험', desc: '가벼운 질환이 있어도 가입할 수 있는 보험이에요' },
    standard: { label: '일반 보험', desc: '건강 상태가 양호한 경우 가입하는 보험이에요' },
};

export default function VisualProductCard({ product }: VisualProductCardProps) {
    const [expanded, setExpanded] = useState(false);

    const typeInfo = PRODUCT_TYPE_INFO[product.productType] || PRODUCT_TYPE_INFO.simple;

    const yesCount = product.reasons.filter(r => r.answer === '예').length;
    const noCount = product.reasons.filter(r => r.answer === '아니오').length;
    const total = product.reasons.length;

    // 보비 블루 팔레트
    const eligibleStyles = {
        'O': {
            bg: 'bg-[#1a56db]/[0.03]',
            border: 'border-[#1a56db]/20',
            iconBg: 'bg-[#1a56db]/10',
            iconColor: 'text-[#1a56db]',
            badge: 'bg-[#1a56db]',
            label: '가입 가능',
            customerMsg: '이 보험에 가입할 수 있어요 ✅',
            passColor: 'bg-[#1a56db]',
            failColor: 'bg-[#1a56db]/20',
        },
        'X': {
            bg: 'bg-slate-50/50',
            border: 'border-slate-200',
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-400',
            badge: 'bg-slate-400',
            label: '가입 어려움',
            customerMsg: '현재 상태로는 가입이 어려워요',
            passColor: 'bg-slate-300',
            failColor: 'bg-slate-400',
        },
        '△': {
            bg: 'bg-[#60a5fa]/[0.03]',
            border: 'border-[#60a5fa]/20',
            iconBg: 'bg-[#60a5fa]/10',
            iconColor: 'text-[#3b82f6]',
            badge: 'bg-[#3b82f6]',
            label: '조건부 가능',
            customerMsg: '조건을 충족하면 가입할 수 있어요',
            passColor: 'bg-[#60a5fa]',
            failColor: 'bg-[#60a5fa]/30',
        },
    };

    const style = eligibleStyles[product.eligible] || eligibleStyles['△'];
    const Icon = product.eligible === 'O' ? CheckCircle2 : product.eligible === 'X' ? XCircle : AlertTriangle;

    return (
        <Card className={cn('border shadow-sm overflow-hidden transition-all', style.bg, style.border)}>
            <CardContent className="p-0">
                <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <span className="text-xs text-slate-500 font-medium">{typeInfo.label}</span>
                            <h3 className="text-lg font-bold mt-0.5">{product.productCode || product.productName}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{typeInfo.desc}</p>
                        </div>
                        <div className="text-center shrink-0">
                            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', style.iconBg)}>
                                <Icon className={cn('w-8 h-8', style.iconColor)} />
                            </div>
                            <Badge className={cn('text-xs mt-1.5 text-white', style.badge)}>{style.label}</Badge>
                        </div>
                    </div>

                    {/* 고객 메시지 */}
                    <div className="mt-3 p-3 rounded-xl bg-white/60 border border-slate-100">
                        <p className="text-sm font-semibold mb-1">{style.customerMsg}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{product.recommendation}</p>
                    </div>

                    {/* 건강 질문 결과 — 블루 톤 */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-400">건강 질문 결과</span>
                            <span className="font-semibold text-slate-600">
                                {total}개 중 {yesCount > 0 ? `${yesCount}개 해당` : '모두 해당없음'}
                            </span>
                        </div>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                            {product.reasons.map((r, i) => (
                                <div key={i}
                                    className={cn('flex-1 rounded-full', r.answer === '아니오' ? style.passColor : style.failColor)}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                                <span className={cn('w-2 h-2 rounded-full', style.passColor)} /> 해당없음 ({noCount})
                            </span>
                            <span className="flex items-center gap-1">
                                <span className={cn('w-2 h-2 rounded-full', style.failColor)} /> 해당 ({yesCount})
                            </span>
                        </div>
                    </div>
                </div>

                {/* 상세 */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-400 hover:text-slate-600 border-t border-slate-100 bg-white/40 transition-colors"
                >
                    <Info className="w-3.5 h-3.5" />
                    어떤 건강 질문이 있었나요?
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
                </button>

                {expanded && (
                    <div className="px-5 pb-5 space-y-2 bg-white/30">
                        {product.reasons.map((reason, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-white/60 border border-slate-100">
                                {reason.answer === '아니오' ? (
                                    <CheckCircle2 className="w-5 h-5 text-[#1a56db] mt-0.5 shrink-0" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm">{reason.question}</p>
                                    {reason.detail && (
                                        <p className="text-xs text-slate-400 mt-1 bg-slate-50 p-2 rounded-lg">
                                            💡 {reason.detail}
                                        </p>
                                    )}
                                </div>
                                <Badge variant={reason.answer === '아니오' ? 'secondary' : 'outline'}
                                    className={cn('text-[10px] shrink-0 mt-0.5',
                                        reason.answer === '아니오' ? 'bg-[#1a56db]/10 text-[#1a56db] border-0' : 'text-slate-400'
                                    )}>
                                    {reason.answer === '아니오' ? '✓ 해당없음' : '해당'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
