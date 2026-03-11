'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, FileSearch, History, Settings, ChevronLeft, Crown, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/hooks/useSubscription';

const navItems = [
    { title: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    { title: '새 분석', href: '/dashboard/analyze', icon: FileSearch },
    { title: '분석 이력', href: '/dashboard/history', icon: History },
    { title: '요금제', href: '/pricing', icon: CreditCard },
    { title: '설정', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const { plan, remainingAnalyses, loading } = useSubscription();

    const displayRemaining = remainingAnalyses === -1 ? '무제한' : `${remainingAnalyses}건`;

    return (
        <aside
            className={cn(
                'hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0',
                collapsed ? 'w-[72px]' : 'w-[260px]'
            )}
        >
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4">
                <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <span className="text-lg font-bold tracking-tight whitespace-nowrap">
                            보비 <span className="text-primary">BoBi</span>
                        </span>
                    )}
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn('shrink-0 h-8 w-8', collapsed && 'mx-auto')}
                >
                    <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
                </Button>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                collapsed && 'justify-center px-2'
                            )}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Plan info */}
            {!collapsed && (
                <div className="p-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">
                                {loading ? '...' : `${plan.display_name} 플랜`}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            이번 달 남은 분석: <span className="font-semibold text-foreground">
                                {loading ? '...' : displayRemaining}
                            </span>
                        </p>
                        <Link href="/pricing">
                            <Button variant="outline" size="sm" className="w-full text-xs">
                                {plan.slug === 'free' ? '플랜 업그레이드' : '플랜 관리'}
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </aside>
    );
}
