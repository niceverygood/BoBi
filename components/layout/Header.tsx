'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, BellRing, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { initPushNotifications } from '@/lib/push';

interface HeaderProps {
    title?: string;
}

export default function Header({ title }: HeaderProps) {
    const router = useRouter();
    const supabase = createClient();
    const [userName, setUserName] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userInitial, setUserInitial] = useState<string>('U');
    const [planName, setPlanName] = useState<string>('Free');
    const [pushEnabled, setPushEnabled] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 카카오 로그인: user_metadata에 이름이 있음
            const name = user.user_metadata?.full_name
                || user.user_metadata?.name
                || user.user_metadata?.preferred_username
                || user.email?.split('@')[0]
                || '사용자';
            setUserName(name);
            setUserEmail(user.email || '');
            setUserInitial(name.charAt(0).toUpperCase());

            // 구독 플랜 정보 조회
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('subscription_plans(display_name)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

            if (sub?.subscription_plans) {
                const plan = sub.subscription_plans as unknown as { display_name: string };
                setPlanName(plan.display_name || 'Free');
            }

            // FCM 푸시 초기화
            try {
                await initPushNotifications();
                setPushEnabled(true);
            } catch {
                // 웹 환경에서는 무시
            }
        };
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = async () => {
        try {
            // 1. 클라이언트 측 세션 삭제 (global scope)
            await supabase.auth.signOut({ scope: 'global' });

            // 2. 서버 측 쿠키 삭제 API 호출
            await fetch('/api/auth/logout', { method: 'POST' });

            // 3. 하드 네비게이션으로 모든 캐시 무효화
            window.location.href = '/';
        } catch {
            // 에러 발생해도 강제 이동
            window.location.href = '/';
        }
    };

    return (
        <header className="sticky top-0 z-40 h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
            <div>
                {title && <h1 className="text-lg font-semibold">{title}</h1>}
            </div>

            <div className="flex items-center gap-3">
                {/* 유저 이름 표시 */}
                {userName && (
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        <span className="font-medium text-foreground">{userName}</span>님
                    </span>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                    onClick={() => {
                        if (!pushEnabled) {
                            alert('알림은 앱에서만 지원됩니다.');
                        }
                    }}
                >
                    {pushEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                {userInitial}
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <div className="flex items-center gap-2 p-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">{userInitial}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium">{userName || '사용자'}</p>
                                <p className="text-xs text-muted-foreground">{planName} 플랜</p>
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                        <Link href="/dashboard/settings">
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                설정
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                            <LogOut className="w-4 h-4 mr-2" />
                            로그아웃
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
