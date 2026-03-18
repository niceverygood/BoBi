'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <div className="flex-1 flex flex-col min-w-0">
                <div className="lg:hidden sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
                    <MobileNav />
                    <span className="text-lg font-bold">
                        보비 <span className="text-primary">BoBi</span>
                    </span>
                    <div className="w-9" />
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
