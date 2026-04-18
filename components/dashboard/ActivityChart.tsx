'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Calendar } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

interface ActivityDay {
    date: string;
    analyses: number;
    futureMe: number;
}

interface ActivityResponse {
    days: ActivityDay[];
    streak: number;
    peakWeekday: string | null;
}

export default function ActivityChart() {
    const [data, setData] = useState<ActivityResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch<ActivityResponse>('/api/dashboard/activity');
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
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || data.days.length === 0) return null;

    // 최대값 계산 (막대 높이 기준)
    const maxValue = Math.max(
        1, // 최소 1로 보장 (0일 때도 막대 보이게)
        ...data.days.map((d) => d.analyses + d.futureMe),
    );

    const totalActivity = data.days.reduce((sum, d) => sum + d.analyses + d.futureMe, 0);
    const activeDays = data.days.filter((d) => d.analyses + d.futureMe > 0).length;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        최근 30일 활동
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                        {data.streak > 0 && (
                            <span className="flex items-center gap-1 text-orange-600 font-semibold">
                                <Flame className="w-3.5 h-3.5" />
                                {data.streak}일 연속
                            </span>
                        )}
                        {data.peakWeekday && (
                            <span className="text-slate-500">
                                주로 <strong className="text-slate-700">{data.peakWeekday}요일</strong>에 활동
                            </span>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* 미니 막대 차트 */}
                <div className="flex items-end gap-[2px] h-20 mb-3">
                    {data.days.map((d, idx) => {
                        const total = d.analyses + d.futureMe;
                        const heightPct = (total / maxValue) * 100;
                        const date = new Date(d.date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const dateLabel = date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
                        return (
                            <div
                                key={idx}
                                className="flex-1 flex flex-col items-center justify-end relative group"
                                title={`${dateLabel} · 분석 ${d.analyses}건, 미래의나 ${d.futureMe}건`}
                            >
                                {/* 스택 막대: 분석(파랑) + 미래의나(보라) */}
                                <div
                                    className="w-full flex flex-col justify-end transition-all hover:opacity-80"
                                    style={{ height: total > 0 ? `${Math.max(heightPct, 4)}%` : '2px' }}
                                >
                                    {d.futureMe > 0 && (
                                        <div
                                            className="bg-violet-500 rounded-t-sm"
                                            style={{ height: `${(d.futureMe / Math.max(total, 1)) * 100}%` }}
                                        />
                                    )}
                                    {d.analyses > 0 && (
                                        <div
                                            className="bg-blue-500"
                                            style={{ height: `${(d.analyses / Math.max(total, 1)) * 100}%` }}
                                        />
                                    )}
                                    {total === 0 && (
                                        <div className="bg-slate-100 h-full rounded-sm" />
                                    )}
                                </div>
                                {/* 오늘 표시 */}
                                {isToday && (
                                    <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-rose-500" />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-sm" />
                            분석
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-violet-500 rounded-sm" />
                            미래의 나
                        </span>
                    </div>
                    <div className="text-slate-600">
                        30일간 총 <strong className="text-slate-900">{totalActivity}</strong>건 ·{' '}
                        <strong className="text-slate-900">{activeDays}</strong>일 활동
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
