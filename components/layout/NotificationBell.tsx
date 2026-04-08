'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    icon: string;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNew, setHasNew] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // 클릭 외부 감지
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/activity');
            if (res.ok) {
                const data = await res.json();
                setActivities(data.activities || []);
                // 최근 24시간 내 활동이 있으면 new 표시
                const recent = (data.activities || []).some((a: ActivityItem) =>
                    Date.now() - new Date(a.timestamp).getTime() < 24 * 60 * 60 * 1000
                );
                setHasNew(recent);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const handleOpen = () => {
        setOpen(!open);
        if (!open && activities.length === 0) fetchActivities();
        if (open) setHasNew(false);
    };

    const formatTime = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return '방금';
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}일 전`;
        return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleOpen}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
            >
                <Bell className="w-4 h-4" />
                {hasNew && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-11 w-[360px] max-h-[480px] bg-background border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                        <h3 className="text-sm font-semibold">활동 내역</h3>
                        <button onClick={fetchActivities} className="text-[10px] text-primary hover:underline">
                            새로고침
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                        {loading ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">로딩 중...</div>
                        ) : activities.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">활동 내역이 없습니다.</div>
                        ) : (
                            <div className="divide-y">
                                {activities.map(a => (
                                    <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                                        <span className="text-base mt-0.5 shrink-0">{a.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium">{a.title}</p>
                                                <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{
                                                    a.type === 'analysis' ? '분석' :
                                                    a.type === 'payment' ? '결제' :
                                                    a.type === 'subscription' ? '구독' : '활동'
                                                }</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                                            {formatTime(a.timestamp)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
