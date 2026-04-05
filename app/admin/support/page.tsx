'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones, Send, Loader2, ArrowLeft, RefreshCw, User, MessageCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';

interface SupportSession {
    sessionId: string;
    userName: string;
    userEmail: string;
    lastMessage: string;
    lastSender: string;
    lastTime: string;
    messageCount: number;
    unread: boolean;
}

interface ChatMessage {
    id: string;
    sender: string;
    message: string;
    user_name: string;
    created_at: string;
}

export default function SupportPage() {
    const { hasAdminAccess, loading: adminLoading } = useAdmin();
    const [sessions, setSessions] = useState<SupportSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const data = await apiFetch<{ sessions: SupportSession[] }>('/api/chat/support/reply');
            setSessions(data.sessions || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    const fetchMessages = useCallback(async (sid: string) => {
        try {
            const data = await apiFetch<{ messages: ChatMessage[] }>(`/api/chat/support?sessionId=${sid}`);
            setMessages(data.messages || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (hasAdminAccess) fetchSessions();
    }, [hasAdminAccess, fetchSessions]);

    // 선택된 세션 메시지 폴링
    useEffect(() => {
        if (!selectedSession) return;
        fetchMessages(selectedSession);
        const interval = setInterval(() => fetchMessages(selectedSession), 5000);
        return () => clearInterval(interval);
    }, [selectedSession, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleReply = async () => {
        if (!reply.trim() || !selectedSession || sending) return;
        setSending(true);
        try {
            await apiFetch('/api/chat/support/reply', {
                method: 'POST',
                body: { sessionId: selectedSession, message: reply.trim() },
            });
            setReply('');
            fetchMessages(selectedSession);
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    if (adminLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!hasAdminAccess) {
        return <div className="p-8 text-center">관리자 권한이 필요합니다.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
                <Link href="/admin">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Headphones className="w-5 h-5" />
                    상담 관리
                </h1>
                <Button variant="outline" size="sm" onClick={fetchSessions}>
                    <RefreshCw className="w-3 h-3 mr-1" /> 새로고침
                </Button>
            </div>

            <div className="grid lg:grid-cols-[350px,1fr] gap-4 h-[calc(100vh-10rem)]">
                {/* 세션 목록 */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            상담 목록
                            <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-16rem)]">
                        {loading ? (
                            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                        ) : sessions.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">상담 내역이 없습니다</div>
                        ) : (
                            <div className="divide-y">
                                {sessions.map(s => (
                                    <button
                                        key={s.sessionId}
                                        onClick={() => setSelectedSession(s.sessionId)}
                                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                                            selectedSession === s.sessionId ? 'bg-primary/5 border-l-2 border-primary' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium truncate">
                                                {s.userName || s.userEmail || '익명'}
                                            </p>
                                            {s.unread && <Badge className="bg-red-500 text-white text-[10px] px-1.5">새 메시지</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{s.lastMessage}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {new Date(s.lastTime).toLocaleString('ko-KR')} · {s.messageCount}건
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 채팅 영역 */}
                <Card className="border-0 shadow-md flex flex-col overflow-hidden">
                    {selectedSession ? (
                        <>
                            <CardHeader className="pb-2 shrink-0">
                                <CardTitle className="text-sm">
                                    {sessions.find(s => s.sessionId === selectedSession)?.userName || '상담'} 님과의 대화
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                            msg.sender === 'admin'
                                                ? 'bg-primary text-white rounded-br-md'
                                                : 'bg-muted rounded-bl-md'
                                        }`}>
                                            <p>{msg.message}</p>
                                            <p className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </CardContent>
                            <div className="border-t p-3 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={reply}
                                        onChange={e => setReply(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
                                        placeholder="답변을 입력하세요..."
                                        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <Button onClick={handleReply} disabled={!reply.trim() || sending} size="sm">
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                            <div className="text-center">
                                <Headphones className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                                <p>왼쪽에서 상담을 선택하세요</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
