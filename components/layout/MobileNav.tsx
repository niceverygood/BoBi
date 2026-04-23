'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileSearch, History, Settings, Menu, X as XIcon, ShieldCheck, ShieldPlus, Stethoscope, Receipt, HeartPulse, Users, MessageCircle, Sparkles, Gift } from 'lucide-react';
import BobiLogo from '@/components/common/BobiLogo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useSubscription } from '@/hooks/useSubscription';
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

export default function MobileNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { hasAdminAccess } = useAdmin();
    const { isFeatureEnabled, loading, plan } = useSubscription();

    const paidOnlyItems: NavItem[] = plan.slug !== 'free'
        ? [{ title: '친구 초대', href: '/dashboard/referral', icon: Gift }]
        : [];

    const allNavItems: NavItem[] = [
        ...navItems,
        ...paidOnlyItems,
        ...(hasAdminAccess ? [{ title: '관리자', href: '/admin', icon: ShieldCheck } as NavItem] : []),
    ];

    return (
        <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-11 w-11 hover:bg-accent hover:text-accent-foreground"
                    aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
                >
                    {open ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                    <SheetTitle className="sr-only">내비게이션 메뉴</SheetTitle>
                    <div className="flex items-center gap-3 h-16 px-6">
                        <BobiLogo size="md" />
                        <span className="text-lg font-bold">
                            보비 <span className="text-primary">BoBi</span>
                        </span>
                    </div>
                    <Separator />
                    <nav className="px-3 py-4 space-y-1">
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
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="flex items-center gap-2">
                                            {item.title}
                                            {showComingSoon && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                                    준비 중
                                                </Badge>
                                            )}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="flex items-center gap-2 flex-1">
                                        {item.title}
                                        {showProLock && (
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal border-violet-300 text-violet-600 bg-violet-50 dark:bg-violet-950/20">
                                                PRO
                                            </Badge>
                                        )}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    );
}
