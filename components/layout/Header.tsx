// components/layout/Header.tsx
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
import { Bell, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    title?: string;
}

export default function Header({ title }: HeaderProps) {
    const router = useRouter();
    const supabase = createClient();
    const [userName, setUserName] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userInitial, setUserInitial] = useState<string>('U');

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // 카카오 로그인: user_metadata에 이름이 있음
                const name = user.user_metadata?.full_name
                    || user.user_metadata?.name
                    || user.user_metadata?.preferred_username
                    || user.email?.split('@')[0]
                    || '사용자';
                setUserName(name);
                setUserEmail(user.email || '');
                setUserInitial(name.charAt(0).toUpperCase());
            }
        };
        fetchUser();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
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
                    onClick={() => alert('알림 기능이 곧 추가될 예정입니다.')}
                >
                    <Bell className="w-4 h-4" />
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
                                <p className="text-xs text-muted-foreground">{userEmail || 'Basic 플랜'}</p>
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
