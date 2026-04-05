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

const PRODUCT_TYPE_INFO: Record<string, { label: string; desc: string; emoji: string }> = {
    simple: { label: '간편보험', desc: '3가지 질문만으로 가입', emoji: '🟢' },
    mild: { label: '초경증 간편보험', desc: '경미한 질환도 가입 가능', emoji: '🔵' },
    standard: { label: '일반 표준체', desc: '건강한 경우 가입', emoji: '⭐' },
};

export default function VisualProductCard({ product }: VisualProductCardProps) {
    const [expanded, setExpanded] = useState(false);

    const typeInfo = PRODUCT_TYPE_INFO[product.productType] || PRODUCT_TYPE_INFO.simple;

    const yesCount = product.reasons.filter(r => r.answer === '예').length;
    const noCount = product.reasons.filter(r => r.answer === '아니오').length;
    const total = product.reasons.length;

    const eligibleStyles = {
        'O': {
            bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
            border: 'border-green-200',
            icon: CheckCircle2,
            iconColor: 'text-green-500',
            badge: 'bg-green-500',
            label: '가입 가능',
            barColor: 'bg-green-500',
        },
        'X': {
            bg: 'bg-gradient-to-br from-red-50 to-rose-50',
            border: 'border-red-200',
            icon: XCircle,
            iconColor: 'text-red-500',
            badge: 'bg-red-500',
            label: '가입 불가',
            barColor: 'bg-red-500',
        },
        '△': {
            bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
            border: 'border-amber-200',
            icon: AlertTriangle,
            iconColor: 'text-amber-500',
            badge: 'bg-amber-500',
            label: '조건부 가능',
            barColor: 'bg-amber-500',
        },
    };

    const style = eligibleStyles[product.eligible] || eligibleStyles['△'];
    const Icon = style.icon;

    return (
        <Card className={cn('border shadow-sm overflow-hidden transition-all', style.bg, style.border)}>
            <CardContent className="p-0">
                {/* 상단: 결과 + 상품명 */}
                <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{typeInfo.emoji}</span>
                                <span className="text-xs text-muted-foreground font-medium">{typeInfo.label}</span>
                            </div>
                            <h3 className="text-lg font-bold">{product.productCode || product.productName}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{typeInfo.desc}</p>
                        </div>
                        <div className="text-center shrink-0">
                            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', style.bg, 'border-2', style.border)}>
                                <Icon className={cn('w-8 h-8', style.iconColor)} />
                            </div>
                            <Badge className={cn('text-xs mt-1.5', style.badge)}>{style.label}</Badge>
                        </div>
                    </div>

                    {/* 추천 메시지 */}
                    <div className="mt-3 p-3 bg-white/60 rounded-xl">
                        <p className="text-sm leading-relaxed">{product.recommendation}</p>
                    </div>

                    {/* 고지사항 통과율 바 */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">고지사항 체크 결과</span>
                            <span className="font-semibold">
                                {noCount}/{total} 통과
                            </span>
                        </div>
                        <div className="h-3 bg-white/80 rounded-full overflow-hidden flex">
                            {product.reasons.map((r, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'h-full transition-all',
                                        r.answer === '아니오' ? 'bg-green-400' : 'bg-red-400',
                                    )}
                                    style={{ width: `${100 / total}%` }}
                                    title={r.question}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400" /> 해당없음 ({noCount})</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> 해당 ({yesCount})</span>
                        </div>
                    </div>
                </div>

                {/* 상세 펼치기 */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground border-t bg-white/40 transition-colors"
                >
                    <Info className="w-3.5 h-3.5" />
                    상세 질문 보기
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
                </button>

                {expanded && (
                    <div className="px-5 pb-5 space-y-2 bg-white/30">
                        {product.reasons.map((reason, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/60">
                                {reason.answer === '아니오' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className="text-xs">{reason.question}</p>
                                    {reason.detail && (
                                        <p className="text-[11px] text-muted-foreground mt-1">{reason.detail}</p>
                                    )}
                                </div>
                                <Badge variant={reason.answer === '아니오' ? 'secondary' : 'destructive'} className="text-[10px] shrink-0">
                                    {reason.answer === '아니오' ? '해당없음' : '해당'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
