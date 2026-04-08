'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Send, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import Link from 'next/link';

interface Comment {
    id: string;
    content: string;
    author_name: string;
    is_admin: boolean;
    created_at: string;
}

interface Inquiry {
    id: string;
    title: string;
    content: string;
    category: string;
    status: string;
    created_at: string;
    user_name: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    open: { label: '접수', color: 'bg-blue-500 text-white' },
    in_progress: { label: '답변 중', color: 'bg-amber-500 text-white' },
    resolved: { label: '해결', color: 'bg-green-500 text-white' },
    closed: { label: '종료', color: 'bg-slate-400 text-white' },
};

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [inquiry, setInquiry] = useState<Inquiry | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fetchData = async () => {
        try {
            const data = await apiFetch<{ inquiry: Inquiry; comments: Comment[] }>(`/api/inquiries/${id}`);
            setInquiry(data.inquiry);
            setComments(data.comments || []);
        } catch { /* */ }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            await apiFetch(`/api/inquiries/${id}/comments`, {
                method: 'POST',
                body: { content: newComment },
            });
            setNewComment('');
            fetchData();
        } catch { /* */ }
        setSending(false);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    if (!inquiry) return <p className="text-center py-20 text-muted-foreground">문의를 찾을 수 없습니다.</p>;

    const st = STATUS_MAP[inquiry.status] || STATUS_MAP.open;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <Link href="/dashboard/inquiries" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <ArrowLeft className="w-4 h-4" />
                문의 목록으로
            </Link>

            {/* 문의 내용 */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px]">{inquiry.category}</Badge>
                        <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                    </div>
                    <CardTitle className="text-lg">{inquiry.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{new Date(inquiry.created_at).toLocaleString('ko-KR')}</p>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                        {inquiry.content}
                    </div>
                </CardContent>
            </Card>

            {/* 댓글 목록 */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">답변 및 댓글 ({comments.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">아직 답변이 없습니다.</p>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className={`p-4 rounded-lg border ${c.is_admin ? 'bg-blue-50/50 border-blue-100' : 'bg-muted/30'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold">
                                        {c.is_admin ? (
                                            <span className="flex items-center gap-1 text-blue-600">
                                                <Shield className="w-3 h-3" />
                                                보비 팀
                                            </span>
                                        ) : c.author_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('ko-KR')}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                            </div>
                        ))
                    )}

                    {/* 댓글 작성 */}
                    {inquiry.status !== 'closed' && (
                        <div className="flex gap-2 pt-2">
                            <textarea
                                placeholder="댓글을 입력하세요..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                rows={2}
                                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button
                                onClick={handleSendComment}
                                disabled={sending || !newComment.trim()}
                                size="icon"
                                className="shrink-0 self-end h-10 w-10"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
