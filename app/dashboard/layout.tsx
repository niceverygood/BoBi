// app/dashboard/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { User } from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const supabase = createClient();
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.full_name
                    || user.user_metadata?.name
                    || user.user_metadata?.preferred_username
                    || user.email?.split('@')[0]
                    || '';
                setUserName(name);

                // 기기 등록 (최대 2대 제한)
                import('@/lib/device').then(({ registerDevice }) => {
                    registerDevice().then(result => {
                        if (!result.allowed) {
                            alert(result.message || '기기 수 제한(2대)에 도달했습니다. 설정 > 기기 관리에서 기존 기기를 제거해주세요.');
                        }
                    });
                });
            }
        };
        fetchUser();
    }, []);

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <div className="flex-1 flex flex-col min-w-0">
                <div className="lg:hidden sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
                    <MobileNav />
                    <span className="text-lg font-bold">
                        보비 <span className="text-primary">BoBi</span>
                    </span>
                    {/* 모바일 헤더 우측: 유저 이름 */}
                    {userName ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span className="font-medium text-foreground max-w-[60px] truncate">{userName}</span>
                        </span>
                    ) : (
                        <div className="w-9" />
                    )}
                </div>
                <div className="hidden lg:block">
                    <Header />
                </div>
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
