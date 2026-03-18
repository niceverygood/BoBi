// components/coverage/ComparisonCoverageTable.tsx
// 현재 보장 vs 추천 보장 비교표
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight, TrendingDown, TrendingUp, Minus, BarChart3
} from 'lucide-react';
import type { CoverageAnalysisResult } from '@/types/coverage';

interface Props {
    result: CoverageAnalysisResult;
}

function formatAmount(amount: number): string {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 === 0 ? 0 : 1)}억원`;
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만원`;
    return `${amount.toLocaleString()}원`;
}

function getBarWidth(current: number, recommended: number): number {
    if (recommended === 0) return 100;
    return Math.min(Math.round((current / recommended) * 100), 150);
}

export default function ComparisonCoverageTable({ result }: Props) {
    const { coverage_analysis } = result;

    // Flatten all subcategories into comparison items
    const items = coverage_analysis.flatMap(cat =>
        cat.subcategories.map(sub => ({
            category: cat.category,
            icon: cat.icon,
            name: sub.name,
            current: sub.total_amount,
            recommended: sub.recommended_amount,
            gap: sub.gap,
            status: sub.status,
            sources: sub.sources,
        }))
    );

    const deficient = items.filter(i => i.status === '부족');
    const adequate = items.filter(i => i.status === '적정');
    const excessive = items.filter(i => i.status === '과다');

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    비교보장표
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                        현재 보장 vs 적정 기준
                    </span>
                </CardTitle>
                <div className="flex gap-2 mt-2">
                    <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                        🔴 부족 {deficient.length}건
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                        ✅ 적정 {adequate.length}건
                    </Badge>
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
                        🟡 과다 {excessive.length}건
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b bg-muted/30 rounded-t-lg">
                    <div className="col-span-3">보장 항목</div>
                    <div className="col-span-2 text-right">현재 보장</div>
                    <div className="col-span-1 text-center"></div>
                    <div className="col-span-2 text-right">적정 기준</div>
                    <div className="col-span-2 text-center">차이</div>
                    <div className="col-span-2 text-center">상태</div>
                </div>

                {/* Deficient items first (priority) */}
                {deficient.length > 0 && (
                    <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500 mt-2">
                            ⚠️ 보강 필요 항목
                        </div>
                        {deficient.map((item, i) => (
                            <ComparisonRow key={`def-${i}`} item={item} />
                        ))}
                    </div>
                )}

                {/* Adequate items */}
                {adequate.length > 0 && (
                    <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-emerald-500 mt-2">
                            ✅ 적정 보장 항목
                        </div>
                        {adequate.map((item, i) => (
                            <ComparisonRow key={`ade-${i}`} item={item} />
                        ))}
                    </div>
                )}

                {/* Excessive items */}
                {excessive.length > 0 && (
                    <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500 mt-2">
                            🟡 과다 보장 항목
                        </div>
                        {excessive.map((item, i) => (
                            <ComparisonRow key={`exc-${i}`} item={item} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ComparisonRowItem {
    category: string;
    icon: string;
    name: string;
    current: number;
    recommended: number;
    gap: number;
    status: '부족' | '적정' | '과다';
    sources: { insurer: string; product: string; amount: number }[];
}

function ComparisonRow({ item }: { item: ComparisonRowItem }) {
    const barWidth = getBarWidth(item.current, item.recommended);
    const barColor = item.status === '부족' ? 'bg-red-400' : item.status === '과다' ? 'bg-amber-400' : 'bg-emerald-400';
    const bgBarColor = item.status === '부족' ? 'bg-red-100 dark:bg-red-950/30' : item.status === '과다' ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-emerald-100 dark:bg-emerald-950/30';

    return (
        <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-dashed border-muted hover:bg-accent/20 transition-colors">
            {/* Item name */}
            <div className="col-span-12 sm:col-span-3">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm">{item.icon}</span>
                    <div>
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                        <p className="text-sm font-medium leading-tight">{item.name}</p>
                    </div>
                </div>
            </div>

            {/* Current amount */}
            <div className="col-span-4 sm:col-span-2 text-right">
                <span className={`text-sm font-semibold ${item.status === '부족' ? 'text-red-600' : item.status === '과다' ? 'text-amber-600' : 'text-foreground'
                    }`}>
                    {formatAmount(item.current)}
                </span>
            </div>

            {/* Arrow */}
            <div className="col-span-1 sm:col-span-1 flex justify-center">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            {/* Recommended */}
            <div className="col-span-4 sm:col-span-2 text-right">
                <span className="text-sm font-medium text-primary">
                    {item.recommended > 0 ? formatAmount(item.recommended) : '-'}
                </span>
            </div>

            {/* Gap */}
            <div className="col-span-3 sm:col-span-2 text-center">
                <div className="flex items-center justify-center gap-1">
                    {item.status === '부족' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                    {item.status === '과다' && <TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
                    {item.status === '적정' && <Minus className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className={`text-xs font-medium ${item.status === '부족' ? 'text-red-600' : item.status === '과다' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                        {item.gap !== 0
                            ? `${item.gap < 0 ? '-' : '+'}${formatAmount(Math.abs(item.gap))}`
                            : '적정'}
                    </span>
                </div>
            </div>

            {/* Visual bar */}
            <div className="col-span-12 sm:col-span-2">
                <div className={`w-full h-2 rounded-full ${bgBarColor}`}>
                    <div
                        className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(barWidth, 100)}%` }}
                    />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                    {barWidth}%
                </p>
            </div>
        </div>
    );
}
