'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, ArrowLeft, Loader2, Send, Shield, Search } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { apiFetch } from '@/lib/api/client';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

interface Inquiry {
    id: string;
    title: string;
    content: string;
    category: string;
    status: string;
    created_at: string;
    user_email: string;
    user_name: string;
    comment_count: number;
}

interface Comment {
    id: string;
    content: string;
    author_name: string;
    is_admin: boolean;
    created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    open: { label: '접수', color: 'bg-blue-500 text-white' },
    in_progress: { label: '답변 중', color: 'bg-amber-500 text-white' },
    resolved: { label: '해결', color: 'bg-green-500 text-white' },
    closed: { label: '종료', color: 'bg-slate-400 text-white' },
};

export default function AdminInquiriesPage() {
    const { hasAdminAccess, loading: adminLoading } = useAdmin();
    const router = useRouter();

    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<{ inquiry: Inquiry; comments: Comment[] } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        if (!adminLoading && !hasAdminAccess) router.push('/dashboard');
    }, [adminLoading, hasAdminAccess, router]);

    const fetchList = async () => {
        try {
            const data = await apiFetch<{ inquiries: Inquiry[] }>('/api/inquiries?admin=true');
            setInquiries(data.inquiries || []);
        } catch { /* */ }
        setLoading(false);
    };

    useEffect(() => { if (hasAdminAccess) fetchList(); }, [hasAdminAccess]);

    const openDetail = async (id: string) => {
        setSelectedId(id);
        setDetailLoading(true);
        try {
            const data = await apiFetch<{ inquiry: Inquiry; comments: Comment[] }>(`/api/inquiries/${id}`);
            setDetail(data);
        } catch { /* */ }
        setDetailLoading(false);
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !selectedId) return;
        setSending(true);
        try {
            await apiFetch(`/api/inquiries/${selectedId}/comments`, {
                method: 'POST',
                body: { content: newComment },
            });
            setNewComment('');
            openDetail(selectedId);
            fetchList();
        } catch { /* */ }
        setSending(false);
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await apiFetch(`/api/inquiries/${id}`, { method: 'PATCH', body: { status } });
            fetchList();
            if (selectedId === id) openDetail(id);
        } catch { /* */ }
    };

    const filtered = inquiries.filter(inq => {
        if (filterStatus !== 'all' && inq.status !== filterStatus) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return inq.title.toLowerCase().includes(q) || inq.user_email.toLowerCase().includes(q) || inq.user_name.toLowerCase().includes(q);
        }
        return true;
    });

    const openCount = inquiries.filter(i => i.status === 'open').length;

    if (adminLoading) return null;
    if (!hasAdminAccess) return null;

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                                <ArrowLeft className="w-4 h-4 mr-1" /> 관리자
                            </Button>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                고객 문의 관리
                                {openCount > 0 && <Badge className="bg-red-500 text-white text-xs">{openCount}건 미답변</Badge>}
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4">
                            {/* 문의 목록 */}
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="이메일, 이름, 제목 검색..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        {[{ key: 'all', label: '전체' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
                                            <Button key={f.key} size="sm" variant={filterStatus === f.key ? 'default' : 'outline'} className="text-[11px] h-7" onClick={() => setFilterStatus(f.key)}>
                                                {f.label}
                                            </Button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <Separator />
                                <CardContent className="p-0 max-h-[calc(100vh-300px)] overflow-y-auto">
                                    {loading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                                    ) : filtered.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">문의가 없습니다.</p>
                                    ) : (
                                        filtered.map(inq => {
                                            const st = STATUS_MAP[inq.status] || STATUS_MAP.open;
                                            return (
                                                <div
                                                    key={inq.id}
                                                    onClick={() => openDetail(inq.id)}
                                                    className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedId === inq.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className={`text-[9px] ${st.color}`}>{st.label}</Badge>
                                                        <Badge variant="outline" className="text-[9px]">{inq.category}</Badge>
                                                        {inq.comment_count > 0 && <span className="text-[10px] text-primary font-medium">답변 {inq.comment_count}</span>}
                                                    </div>
                                                    <p className="text-sm font-medium truncate">{inq.title}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {inq.user_name} ({inq.user_email}) · {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>

                            {/* 상세 보기 */}
                            <Card className="border-0 shadow-sm">
                                {!selectedId ? (
                                    <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                                        <p className="text-sm text-muted-foreground">문의를 선택하세요.</p>
                                    </CardContent>
                                ) : detailLoading ? (
                                    <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </CardContent>
                                ) : detail ? (
                                    <>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px]">{detail.inquiry.category}</Badge>
                                                    <Badge className={`text-[10px] ${(STATUS_MAP[detail.inquiry.status] || STATUS_MAP.open).color}`}>
                                                        {(STATUS_MAP[detail.inquiry.status] || STATUS_MAP.open).label}
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-1">
                                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                                        <Button
                                                            key={key}
                                                            size="sm"
                                                            variant={detail.inquiry.status === key ? 'default' : 'outline'}
                                                            className="text-[10px] h-6 px-2"
                                                            onClick={() => handleStatusChange(detail.inquiry.id, key)}
                                                        >
                                                            {val.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <CardTitle className="text-base mt-2">{detail.inquiry.title}</CardTitle>
                                            <p className="text-[11px] text-muted-foreground">
                                                {detail.inquiry.user_name} ({detail.inquiry.user_email}) · {new Date(detail.inquiry.created_at).toLocaleString('ko-KR')}
                                            </p>
                                        </CardHeader>
                                        <Separator />
                                        <CardContent className="space-y-4 pt-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                                            {/* 문의 본문 */}
                                            <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                                                {detail.inquiry.content}
                                            </div>

                                            {/* 댓글 */}
                                            {detail.comments.map(c => (
                                                <div key={c.id} className={`p-3 rounded-lg border ${c.is_admin ? 'bg-blue-50/50 border-blue-100' : 'bg-muted/20'}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold">
                                                            {c.is_admin ? (
                                                                <span className="flex items-center gap-1 text-blue-600"><Shield className="w-3 h-3" />보비 팀</span>
                                                            ) : c.author_name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('ko-KR')}</span>
                                                    </div>
                                                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                                                </div>
                                            ))}

                                            {/* 답변 작성 */}
                                            <div className="flex gap-2 pt-2 border-t">
                                                <textarea
                                                    placeholder="답변을 입력하세요..."
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    rows={3}
                                                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                                <Button
                                                    onClick={handleSendComment}
                                                    disabled={sending || !newComment.trim()}
                                                    className="shrink-0 self-end gap-1"
                                                >
                                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    답변
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </>
                                ) : null}
                            </Card>
                        </div>
                    </div>
                </main>
                <MobileNav />
            </div>
        </div>
    );
}
