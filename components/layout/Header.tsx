'use client';

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
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent">
                        <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                <User className="w-4 h-4" />
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <div className="flex items-center gap-2 p-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">U</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium">사용자</p>
                                <p className="text-xs text-muted-foreground">Basic 플랜</p>
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
