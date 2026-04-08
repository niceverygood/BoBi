'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, MessageCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

interface Inquiry {
    id: string;
    title: string;
    category: string;
    status: string;
    created_at: string;
    comment_count: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    open: { label: '접수', color: 'bg-blue-500 text-white' },
    in_progress: { label: '답변 중', color: 'bg-amber-500 text-white' },
    resolved: { label: '해결', color: 'bg-green-500 text-white' },
    closed: { label: '종료', color: 'bg-slate-400 text-white' },
};

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch<{ inquiries: Inquiry[] }>('/api/inquiries');
                setInquiries(data.inquiries || []);
            } catch { /* */ }
            setLoading(false);
        })();
    }, []);

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">1:1 문의</h1>
                    <p className="text-muted-foreground mt-1">궁금한 점이나 불편사항을 남겨주세요.</p>
                </div>
                <Link href="/dashboard/inquiries/new">
                    <Button className="bg-gradient-primary hover:opacity-90 gap-2">
                        <MessageSquarePlus className="w-4 h-4" />
                        문의하기
                    </Button>
                </Link>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        내 문의 내역
                    </CardTitle>
                    <CardDescription>총 {inquiries.length}건</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                    ) : inquiries.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">문의 내역이 없습니다.</p>
                    ) : (
                        <div className="space-y-2">
                            {inquiries.map(inq => {
                                const st = STATUS_MAP[inq.status] || STATUS_MAP.open;
                                return (
                                    <Link key={inq.id} href={`/dashboard/inquiries/${inq.id}`}>
                                        <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-[10px] shrink-0">{inq.category}</Badge>
                                                    <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                                                </div>
                                                <p className="text-sm font-medium truncate">{inq.title}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                                                    {inq.comment_count > 0 && <span className="ml-2 text-primary font-medium">답변 {inq.comment_count}개</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
