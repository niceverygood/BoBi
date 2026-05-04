'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, FileSearch, UserPlus, Sparkles, Target } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

interface KpiValue {
    thisWeek: number;
    lastWeek: number;
    changePercent: number | null;
}

interface MetricsResponse {
    analyses: KpiValue;
    newCustomers: KpiValue;
    futureMe: KpiValue;
    riskReports: KpiValue;
    conversionRate: number;
}

export default function WeeklyKpiCards() {
    const [data, setData] = useState<MetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch<MetricsResponse>('/api/dashboard/metrics');
                setData(res);
            } catch {
                // 조용히 실패
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <Skeleton className="h-3 w-20 mb-2" />
                            <Skeleton className="h-8 w-16 mb-1" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">이번 주 성과</h2>
                <span className="text-[11px] text-muted-foreground">지난 주 대비 · 월요일 시작</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    icon={<FileSearch className="w-4 h-4 text-gray-500" />}
                    iconBg="bg-gray-100"
                    label="신규 분석"
                    value={data.analyses}
                    unit="건"
                />
                <KpiCard
                    icon={<UserPlus className="w-4 h-4 text-gray-500" />}
                    iconBg="bg-gray-100"
                    label="신규 고객"
                    value={data.newCustomers}
                    unit="명"
                />
                <KpiCard
                    icon={<Sparkles className="w-4 h-4 text-gray-500" />}
                    iconBg="bg-gray-100"
                    label="미래의 나 리포트"
                    value={data.futureMe}
                    unit="건"
                />
                <KpiCard
                    icon={<Target className="w-4 h-4 text-gray-500" />}
                    iconBg="bg-gray-100"
                    label="리포트 전환율"
                    value={{ thisWeek: data.conversionRate, lastWeek: 0, changePercent: null }}
                    unit="%"
                    staticValue
                    hint="분석 → 미래의나"
                />
            </div>
        </div>
    );
}

function KpiCard({
    icon,
    iconBg,
    label,
    value,
    unit,
    staticValue = false,
    hint,
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: KpiValue;
    unit: string;
    staticValue?: boolean;
    hint?: string;
}) {
    const { thisWeek, lastWeek, changePercent } = value;
    const isPositive = (changePercent ?? 0) > 0;
    const isNegative = (changePercent ?? 0) < 0;

    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                        {icon}
                    </div>
                    {!staticValue && changePercent !== null && (
                        <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                            isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                        }`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {Math.abs(changePercent)}%
                        </div>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-0.5">
                    {thisWeek.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
                </p>
                {staticValue ? (
                    hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
                ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        지난 주 {lastWeek}{unit}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
