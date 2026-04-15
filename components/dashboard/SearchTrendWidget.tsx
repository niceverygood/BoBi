'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Flame, Loader2, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface TrendKeyword {
    keyword: string;
    thisWeek: number;
    lastWeek: number;
    changeRate: number;
}

interface TrendGroup {
    ageGroup: string;
    gender: string;
    genderLabel: string;
    topKeywords: TrendKeyword[];
    fetchedAt: string;
}

const AGE_TABS = ['40대', '50대', '30대', '60대+'] as const;

export default function SearchTrendWidget() {
    const [trends, setTrends] = useState<TrendGroup[]>([]);
    const [date, setDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAge, setSelectedAge] = useState('40대');

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch<{ trends: TrendGroup[]; date: string | null }>('/api/trends');
                setTrends(data.trends || []);
                setDate(data.date);
            } catch { /* */ }
            setLoading(false);
        })();
    }, []);

    const maleData = trends.find(t => t.ageGroup === selectedAge && t.gender === 'm');
    const femaleData = trends.find(t => t.ageGroup === selectedAge && t.gender === 'f');

    const renderKeywords = (group: TrendGroup | undefined, label: string) => {
        if (!group || group.topKeywords.length === 0) {
            return (
                <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">데이터 준비 중...</p>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                {group.topKeywords.map((kw, i) => (
                    <div key={kw.keyword} className="flex items-center gap-3">
                        <span className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            i === 0 ? 'bg-red-500 text-white' :
                            i === 1 ? 'bg-orange-400 text-white' :
                            i === 2 ? 'bg-amber-400 text-white' :
                            'bg-muted text-muted-foreground'
                        )}>
                            {i + 1}
                        </span>
                        <span className="text-sm font-medium flex-1 truncate">{kw.keyword}</span>
                        <Badge className={cn(
                            'text-[10px] shrink-0',
                            kw.changeRate > 50 ? 'bg-red-500 text-white' :
                            kw.changeRate > 20 ? 'bg-orange-500 text-white' :
                            kw.changeRate > 0 ? 'bg-green-500 text-white' :
                            'bg-slate-400 text-white'
                        )}>
                            {kw.changeRate > 0 ? '+' : ''}{kw.changeRate}%
                            {kw.changeRate > 50 && ' 🔥'}
                        </Badge>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-400 to-amber-400" />
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Flame className="w-5 h-5 text-red-500" />
                        실시간 보험 검색 트렌드
                    </CardTitle>
                    {date && (
                        <Badge variant="outline" className="text-[10px]">
                            {new Date(date).toLocaleDateString('ko-KR')} 기준
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-xs">이번 주 급상승 보험 검색 키워드 TOP 5</CardDescription>

                {/* 연령 탭 */}
                <div className="flex gap-1 mt-3">
                    {AGE_TABS.map(age => (
                        <Button
                            key={age}
                            size="sm"
                            variant={selectedAge === age ? 'default' : 'outline'}
                            className="text-xs h-7 px-3"
                            onClick={() => setSelectedAge(age)}
                        >
                            {age}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : trends.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                        <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">트렌드 데이터 수집 중입니다.</p>
                        <p className="text-xs text-muted-foreground">매일 오전 7시에 자동 업데이트됩니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 overflow-hidden">
                        {renderKeywords(maleData, `${selectedAge} 남성 🔵`)}
                        {renderKeywords(femaleData, `${selectedAge} 여성 🔴`)}
                    </div>
                )}

                {trends.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                        <p className="text-[10px] text-muted-foreground text-center">
                            💡 오늘 {selectedAge} 고객에게 <strong className="text-foreground">
                            {maleData?.topKeywords?.[0]?.keyword || femaleData?.topKeywords?.[0]?.keyword || '트렌드'}
                            </strong> 관련 상담을 제안해보세요!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
