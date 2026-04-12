'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock } from 'lucide-react';
import type { TrendAnalysis } from '@/lib/health/trend-analyzer';
import { cn } from '@/lib/utils';

interface TrendChartProps {
    trends: TrendAnalysis[];
}

const STATUS_COLORS: Record<string, string> = {
    normal: 'bg-green-100 text-green-700 border-green-200',
    borderline: 'bg-amber-100 text-amber-700 border-amber-200',
    abnormal: 'bg-red-100 text-red-700 border-red-200',
};

const DIRECTION_ICONS = {
    improving: TrendingDown,
    worsening: TrendingUp,
    stable: Minus,
};

function MiniChart({ points, direction }: { points: Array<{ year: string; value: number }>; direction: string }) {
    if (points.length < 2) {
        return (
            <div className="text-center py-1 text-[10px] text-muted-foreground">
                단일 연도 데이터 (추이 비교 불가)
            </div>
        );
    }

    const values = points.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 200;
    const height = 50;
    const padding = 8;

    const stroke = direction === 'worsening' ? '#ef4444' : direction === 'improving' ? '#10b981' : '#64748b';

    const coords = points.map((p, i) => {
        const x = padding + (i / (points.length - 1)) * (width - padding * 2);
        const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
        return { x, y, ...p };
    });

    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
                <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" />
                {coords.map((c, i) => (
                    <circle key={i} cx={c.x} cy={c.y} r="3" fill={stroke} />
                ))}
            </svg>
            <div className="flex justify-between text-[9px] text-muted-foreground -mt-1">
                {coords.map((c, i) => (
                    <span key={i}>{c.year.slice(-2)}년 {c.value}</span>
                ))}
            </div>
        </div>
    );
}

export default function TrendChart({ trends }: TrendChartProps) {
    if (!trends || trends.length === 0) return null;

    return (
        <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1a56db]" />
                    건강 지표 연도별 추이
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {trends.map(t => {
                        const DirIcon = DIRECTION_ICONS[t.direction];
                        return (
                            <div
                                key={t.metric}
                                className={cn(
                                    'rounded-lg border p-3 space-y-2',
                                    t.currentStatus === 'abnormal' ? 'border-red-200 bg-red-50/30' :
                                    t.currentStatus === 'borderline' ? 'border-amber-200 bg-amber-50/30' :
                                    'border-muted'
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold">{t.label}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            현재 {t.points[t.points.length - 1]?.value}{t.unit}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge className={cn('text-[10px]', STATUS_COLORS[t.currentStatus])}>
                                            {t.currentStatus === 'normal' ? '정상' : t.currentStatus === 'borderline' ? '경계' : '이상'}
                                        </Badge>
                                        {t.points.length >= 2 && (
                                            <Badge variant="outline" className="text-[10px] gap-0.5">
                                                <DirIcon className="w-3 h-3" />
                                                {t.changeRate > 0 ? '+' : ''}{t.changeRate}%/년
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <MiniChart points={t.points} direction={t.direction} />

                                {t.alert && (
                                    <div className="flex items-start gap-1 text-[11px] text-red-700 bg-red-50 rounded p-2">
                                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                        <span>{t.alert}</span>
                                    </div>
                                )}

                                {t.goldenTime && (
                                    <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 rounded p-2">
                                        <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                                        <span className="font-semibold">{t.goldenTime}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
