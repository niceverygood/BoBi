'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Loader2, Headphones, Bot, User } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'admin';
    content: string;
    timestamp: Date;
}

type ChatMode = 'ai' | 'support';

export default function ChatBot() {
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>('ai');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    // 상담사 모드: 폴링으로 새 메시지 확인
    useEffect(() => {
        if (mode !== 'support' || !sessionId || !open) return;
        const interval = setInterval(async () => {
            try {
                const data = await apiFetch<{ messages: Array<{ id: string; sender: string; message: string; created_at: string }> }>(
                    `/api/chat/support?sessionId=${sessionId}`
                );
                const newMsgs: ChatMessage[] = data.messages.map(m => ({
                    id: m.id,
                    role: m.sender === 'admin' ? 'admin' : m.sender === 'user' ? 'user' : 'system',
                    content: m.message,
                    timestamp: new Date(m.created_at),
                }));
                setMessages(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const onlyNew = newMsgs.filter(m => !existingIds.has(m.id));
                    return onlyNew.length > 0 ? [...prev, ...onlyNew] : prev;
                });
            } catch { /* ignore */ }
        }, 3000);
        return () => clearInterval(interval);
    }, [mode, sessionId, open]);

    if (!mounted) return null;

    const handleSendAI = async () => {
        if (!input.trim() || loading) return;
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
                role: m.role,
                content: m.content,
            }));
            const data = await apiFetch<{ reply: string }>('/api/chat', {
                method: 'POST',
                body: { message: userMsg.content, history },
            });
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply,
                timestamp: new Date(),
            }]);
        } catch (err) {
            console.error('[ChatBot] AI error:', err);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: 'AI 응답에 실패했습니다. 상담사 연결을 눌러 직접 문의해주세요.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSendSupport = async () => {
        if (!input.trim() || loading) return;
        const msg = input.trim();
        setInput('');
        setLoading(true);

        try {
            const data = await apiFetch<{ chat: { id: string; created_at: string }; sessionId: string }>(
                '/api/chat/support',
                { method: 'POST', body: { message: msg, sessionId } }
            );
            if (!sessionId) setSessionId(data.sessionId);
            setMessages(prev => [...prev, {
                id: data.chat.id,
                role: 'user',
                content: msg,
                timestamp: new Date(data.chat.created_at),
            }]);
        } catch (err) {
            console.error('[ChatBot] Support error:', err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: '메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = mode === 'ai' ? handleSendAI : handleSendSupport;

    const switchToSupport = () => {
        setMode('support');
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: '상담사에게 연결되었습니다. 메시지를 입력해주세요. 담당자가 확인 후 답변드리겠습니다.',
            timestamp: new Date(),
        }]);
    };

    return (
        <>
            {/* 플로팅 버튼 */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                aria-label="채팅"
            >
                {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>

            {/* 채팅 창 */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                    {/* 헤더 */}
                    <div className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            <div>
                                <p className="text-sm font-semibold">보비 상담</p>
                                <p className="text-[10px] opacity-80">
                                    {mode === 'ai' ? 'AI 어시스턴트' : '상담사 연결됨'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {mode === 'ai' && (
                                <button
                                    onClick={switchToSupport}
                                    className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full flex items-center gap-1"
                                >
                                    <Headphones className="w-3 h-3" />
                                    상담사 연결
                                </button>
                            )}
                            {mode === 'support' && (
                                <button
                                    onClick={() => { setMode('ai'); }}
                                    className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full flex items-center gap-1"
                                >
                                    <Bot className="w-3 h-3" />
                                    AI 전환
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 메시지 영역 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-8">
                                <Bot className="w-10 h-10 mx-auto mb-2 text-primary/30" />
                                <p className="font-medium">안녕하세요!</p>
                                <p className="text-xs mt-1">보비 서비스에 대해 궁금한 점을 물어보세요.</p>
                                {!isLoggedIn && (
                                    <p className="text-xs mt-2 text-amber-600">로그인 후 이용 가능합니다.</p>
                                )}
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'system' ? (
                                    <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 max-w-[90%]">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-primary text-white rounded-br-md'
                                            : msg.role === 'admin'
                                            ? 'bg-amber-100 text-amber-900 rounded-bl-md'
                                            : 'bg-muted rounded-bl-md'
                                    }`}>
                                        {msg.role === 'admin' && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <Headphones className="w-3 h-3" />
                                                <span className="text-[10px] font-semibold">상담사</span>
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* 입력 */}
                    <div className="border-t p-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder={isLoggedIn ? '메시지를 입력하세요...' : '로그인이 필요합니다'}
                                disabled={!isLoggedIn || loading}
                                className="flex-1 px-3 py-2 rounded-full border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading || !isLoggedIn}
                                className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
