'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, FileSearch, History, Settings, Menu, ShieldCheck, ShieldPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { FEATURE_FLAGS } from '@/lib/utils/constants';

const navItems = [
    { title: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    { title: '새 분석', href: '/dashboard/analyze', icon: FileSearch },
    { title: '보장 분석', href: '/dashboard/coverage', icon: ShieldPlus, disabled: !FEATURE_FLAGS.coverage_analysis, comingSoon: !FEATURE_FLAGS.coverage_analysis },
    { title: '분석 이력', href: '/dashboard/history', icon: History },
    { title: '설정', href: '/dashboard/settings', icon: Settings },
];

export default function MobileNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { isAdmin } = useAdmin();

    const allNavItems = isAdmin
        ? [...navItems, { title: '관리자', href: '/admin', icon: ShieldCheck }]
        : navItems;

    return (
        <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 w-9 hover:bg-accent hover:text-accent-foreground">
                    <Menu className="w-5 h-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                    <SheetTitle className="sr-only">내비게이션 메뉴</SheetTitle>
                    <div className="flex items-center gap-3 h-16 px-6">
                        <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
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
                                    <span>{item.title}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    );
}
