'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, FileSearch, History, Settings, ChevronLeft, Crown, ShieldCheck, ShieldPlus, Stethoscope, Receipt, HeartPulse, Users, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import BobiLogo from '@/components/common/BobiLogo';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { FEATURE_FLAGS } from '@/lib/utils/constants';
import type { PlanFeatures } from '@/types/subscription';

type NavItem = {
    title: string;
    href: string;
    icon: typeof LayoutDashboard;
    disabled?: boolean;
    comingSoon?: boolean;
    proFeature?: keyof PlanFeatures;
};

const navItems: NavItem[] = [
    { title: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    { title: '고객 카드', href: '/dashboard/customers', icon: Users },
    { title: '새 분석', href: '/dashboard/analyze', icon: FileSearch },
    { title: '보장 분석', href: '/dashboard/coverage', icon: ShieldPlus, disabled: !FEATURE_FLAGS.coverage_analysis, comingSoon: !FEATURE_FLAGS.coverage_analysis },
    { title: '진료정보', href: '/dashboard/medical', icon: Stethoscope },
    { title: '건강검진', href: '/dashboard/health-checkup', icon: HeartPulse },
    { title: '가상 영수증', href: '/dashboard/accident-receipt', icon: Receipt, proFeature: 'virtual_receipt' },
    { title: '미래의 나', href: '/dashboard/future-me', icon: Sparkles, proFeature: 'future_me' },
    { title: '분석 이력', href: '/dashboard/history', icon: History },
    { title: '1:1 문의', href: '/dashboard/inquiries', icon: MessageCircle },
    { title: '설정', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const { plan, remainingAnalyses, loading, isFeatureEnabled } = useSubscription();
    const { hasAdminAccess } = useAdmin();

    const allNavItems: NavItem[] = hasAdminAccess
        ? [...navItems, { title: '관리자', href: '/admin', icon: ShieldCheck }]
        : navItems;

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
                    <BobiLogo size="md" className="shrink-0" />
                    {!collapsed && (
                        <span className="text-lg font-bold tracking-tight whitespace-nowrap text-gray-900">
                            보비 <span className="text-gray-500 font-medium">BoBi</span>
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
                {allNavItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    const isDisabled = 'disabled' in item && item.disabled;
                    const showComingSoon = 'comingSoon' in item && item.comingSoon;
                    const showProLock = !!item.proFeature && !loading && !isFeatureEnabled(item.proFeature);

                    if (isDisabled) {
                        return (
                            <div
                                key={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed',
                                    'text-muted-foreground',
                                    collapsed && 'justify-center px-2'
                                )}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                {!collapsed && (
                                    <span className="flex items-center gap-2">
                                        {item.title}
                                        {showComingSoon && (
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                                준비 중
                                            </Badge>
                                        )}
                                    </span>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                                // 디자인 v1: 진한 brand 채움 → 회색 9 채움 (또는 회색 100 hover)
                                isActive
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                                collapsed && 'justify-center px-2'
                            )}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            {!collapsed && (
                                <span className="flex items-center gap-2 flex-1">
                                    {item.title}
                                    {showProLock && (
                                        <Badge variant="soft" className="text-[9px] px-1.5 py-0 h-4 font-normal border-gray-200 text-gray-600 bg-gray-50">
                                            PRO
                                        </Badge>
                                    )}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Plan info — 디자인 v2: 그라디언트 + 색 강조 제거, 회색 단일 톤 */}
            {!collapsed && (
                <div className="p-3">
                    <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Crown className="w-3.5 h-3.5 text-gray-500" />
                            {loading ? (
                                <Skeleton className="h-4 w-20" />
                            ) : (
                                <span className="text-xs font-semibold text-gray-900">
                                    {plan.display_name} 플랜
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2.5">
                            이번 달 남은 분석: {loading ? (
                                <Skeleton className="h-3 w-10 inline-block align-middle" />
                            ) : (
                                <span className="font-semibold text-gray-900 tabular-nums">
                                    {displayRemaining}
                                </span>
                            )}
                        </p>
                        <Link href="/pricing">
                            <Button variant="outline" size="sm" className="w-full text-xs h-8 border-gray-200 text-gray-700 hover:bg-white">
                                {plan.slug === 'free' ? '플랜 업그레이드' : '플랜 관리'}
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </aside>
    );
}
