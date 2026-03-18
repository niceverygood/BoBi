// app/dashboard/coverage/history/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Shield, ShieldPlus, ArrowLeft, Loader2, User, Calendar,
    ChevronRight, Star, FileText
} from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

interface CoverageHistoryItem {
    id: string;
    customer_name: string;
    customer_birth: string;
    customer_gender: string;
    policy_count: number;
    overall_score: number;
    overall_grade: string;
    created_at: string;
}

function getGradeColor(grade: string) {
    switch (grade) {
        case 'A': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
        case 'B': return 'bg-blue-500/10 text-blue-600 border-blue-200';
        case 'C': return 'bg-amber-500/10 text-amber-600 border-amber-200';
        case 'D': return 'bg-orange-500/10 text-orange-600 border-orange-200';
        case 'F': return 'bg-red-500/10 text-red-600 border-red-200';
        default: return '';
    }
}

export default function CoverageHistoryPage() {
    const [items, setItems] = useState<CoverageHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/coverage/history');
                if (res.ok) {
                    const data = await res.json();
                    setItems(data.analyses || []);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/coverage">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary" />
                            보장 분석 이력
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            과거 보장 분석 결과를 확인합니다
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/coverage">
                    <Button size="sm">
                        <ShieldPlus className="w-4 h-4 mr-2" />
                        새 분석
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : items.length === 0 ? (
                <EmptyState
                    title="보장 분석 이력이 없습니다"
                    description="보장 분석을 실행하면 여기에 이력이 쌓입니다."
                    action={
                        <Link href="/dashboard/coverage">
                            <Button variant="outline" size="sm">
                                <ShieldPlus className="w-4 h-4 mr-2" />
                                보장 분석 시작
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <div className="space-y-3">
                    {items.map(item => (
                        <Link key={item.id} href={`/dashboard/coverage/${item.id}`}>
                            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group mb-3">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold">{item.customer_name}</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {item.customer_gender === 'M' ? '남' : '여'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        보험 {item.policy_count}건
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(item.created_at).toLocaleDateString('ko-KR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {item.overall_score !== null && (
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xl font-bold">{item.overall_score}</span>
                                                        <span className="text-xs text-muted-foreground">점</span>
                                                    </div>
                                                    <Badge className={`text-xs ${getGradeColor(item.overall_grade)}`}>
                                                        {item.overall_grade}등급
                                                    </Badge>
                                                </div>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
