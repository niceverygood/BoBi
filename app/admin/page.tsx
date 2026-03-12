'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Users, FileText, CreditCard, Activity, BarChart3,
    TrendingUp, AlertCircle, Search, CheckCircle2, ArrowUpDown,
    ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAdmin } from '@/hooks/useAdmin';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

interface AdminStats {
    totalUsers: number;
    totalAnalyses: number;
    totalUploads: number;
    totalPayments: number;
}

interface AdminUser {
    id: string;
    email: string;
    name: string;
    company: string;
    created_at: string;
    plan_slug: string;
    plan_name: string;
}

const PLAN_BADGE_COLORS: Record<string, string> = {
    free: 'bg-slate-100 text-slate-700 border-slate-200',
    basic: 'bg-blue-100 text-blue-700 border-blue-200',
    pro: 'bg-violet-100 text-violet-700 border-violet-200',
    team: 'bg-amber-100 text-amber-700 border-amber-200',
};

type SortKey = 'created_at' | 'name' | 'email' | 'plan_slug';

export default function AdminPage() {
    const { isAdmin, loading: adminLoading } = useAdmin();
    const router = useRouter();

    // Stats
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // User list
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    // Plan change
    const [changingPlan, setChangingPlan] = useState<string | null>(null); // user ID being changed
    const [planMessage, setPlanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.replace('/dashboard');
            return;
        }
        if (isAdmin) {
            fetchStats();
            fetchUsers();
        }
    }, [isAdmin, adminLoading, router, fetchStats, fetchUsers]);

    const handlePlanChange = async (targetUserId: string, targetEmail: string, newPlan: string) => {
        setChangingPlan(targetUserId);
        setPlanMessage(null);
        try {
            const res = await fetch('/api/admin/update-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetEmail, planSlug: newPlan }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlanMessage({ type: 'success', text: data.message });
            // Update local state
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === targetUserId
                        ? { ...u, plan_slug: newPlan, plan_name: { free: '무료', basic: '베이직', pro: '프로', team: '팀' }[newPlan] || newPlan }
                        : u
                )
            );
        } catch (err) {
            setPlanMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setChangingPlan(null);
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(key === 'name' || key === 'email'); // asc for name/email, desc for date
        }
    };

    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = users.filter(
                (u) =>
                    u.email.toLowerCase().includes(q) ||
                    u.name.toLowerCase().includes(q) ||
                    u.company.toLowerCase().includes(q)
            );
        }
        return [...filtered].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'created_at':
                    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'name':
                    cmp = (a.name || a.email).localeCompare(b.name || b.email, 'ko');
                    break;
                case 'email':
                    cmp = a.email.localeCompare(b.email);
                    break;
                case 'plan_slug': {
                    const order = { free: 0, basic: 1, pro: 2, team: 3 };
                    cmp = (order[a.plan_slug as keyof typeof order] ?? 0) - (order[b.plan_slug as keyof typeof order] ?? 0);
                    break;
                }
            }
            return sortAsc ? cmp : -cmp;
        });
    }, [users, searchQuery, sortKey, sortAsc]);

    if (adminLoading || (!isAdmin && !error)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 lg:hidden px-4 h-16 border-b">
                    <MobileNav />
                    <span className="font-semibold">보비 BoBi</span>
                </div>
                <Header title="관리자 대시보드" />

                <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                    {/* Admin Badge */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">총괄 관리자</h2>
                            <p className="text-sm text-muted-foreground">시스템 전체 현황을 관리합니다</p>
                        </div>
                        <Badge variant="destructive" className="ml-auto">ADMIN</Badge>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Plan change feedback */}
                    {planMessage && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${planMessage.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {planMessage.type === 'success'
                                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                : <AlertCircle className="w-4 h-4 shrink-0" />}
                            {planMessage.text}
                            <button onClick={() => setPlanMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
                        </div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: '전체 사용자', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
                            { label: '총 분석 건수', value: stats?.totalAnalyses ?? 0, icon: BarChart3, color: 'bg-green-100 text-green-600' },
                            { label: 'PDF 업로드', value: stats?.totalUploads ?? 0, icon: FileText, color: 'bg-purple-100 text-purple-600' },
                            { label: '결제 건수', value: stats?.totalPayments ?? 0, icon: CreditCard, color: 'bg-amber-100 text-amber-600' },
                        ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <Card key={stat.label} className="border-0 shadow-md">
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                                                <p className="text-xl sm:text-2xl font-bold mt-1">
                                                    {statsLoading ? '...' : stat.value}
                                                </p>
                                            </div>
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* User Management */}
                    <Card className="border-0 shadow-md mb-8">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    사용자 관리
                                    <Badge variant="secondary" className="ml-1 text-xs">{users.length}명</Badge>
                                </CardTitle>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="이메일, 이름, 소속 검색..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />

                        {/* Sort Controls */}
                        <div className="px-5 py-2 flex items-center gap-1 text-xs border-b bg-muted/30">
                            <span className="text-muted-foreground mr-2">정렬:</span>
                            {([
                                { key: 'created_at' as SortKey, label: '가입순' },
                                { key: 'name' as SortKey, label: '이름순' },
                                { key: 'email' as SortKey, label: '이메일순' },
                                { key: 'plan_slug' as SortKey, label: '플랜순' },
                            ]).map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => handleSort(opt.key)}
                                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${sortKey === opt.key
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent text-muted-foreground'
                                        }`}
                                >
                                    {opt.label}
                                    {sortKey === opt.key && (
                                        <ArrowUpDown className="w-3 h-3" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* User List */}
                        <CardContent className="p-0">
                            {usersLoading ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                                    사용자 목록 로딩 중...
                                </div>
                            ) : filteredAndSortedUsers.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다` : '등록된 사용자가 없습니다'}
                                </div>
                            ) : (
                                <div className="divide-y max-h-[500px] overflow-y-auto">
                                    {filteredAndSortedUsers.map((u) => (
                                        <div
                                            key={u.id}
                                            className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                                        >
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-semibold text-primary">
                                                    {(u.name || u.email).charAt(0).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium truncate">
                                                        {u.name || '(이름 없음)'}
                                                    </p>
                                                    {u.company && (
                                                        <span className="text-xs text-muted-foreground hidden sm:inline">
                                                            {u.company}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                            </div>

                                            {/* Date */}
                                            <div className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(u.created_at).toLocaleDateString('ko-KR')}
                                            </div>

                                            {/* Plan Badge */}
                                            <Badge
                                                variant="outline"
                                                className={`text-xs shrink-0 ${PLAN_BADGE_COLORS[u.plan_slug] || PLAN_BADGE_COLORS.free}`}
                                            >
                                                {u.plan_name}
                                            </Badge>

                                            {/* Plan Change Dropdown */}
                                            <div className="relative shrink-0">
                                                <select
                                                    value={u.plan_slug}
                                                    disabled={changingPlan === u.id}
                                                    onChange={(e) => handlePlanChange(u.id, u.email, e.target.value)}
                                                    className="appearance-none pl-2 pr-6 py-1 text-xs border rounded-md bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                                >
                                                    <option value="free">무료</option>
                                                    <option value="basic">베이직</option>
                                                    <option value="pro">프로</option>
                                                    <option value="team">팀</option>
                                                </select>
                                                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            빠른 작업
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                className="h-auto py-4 flex flex-col items-center gap-2"
                                onClick={() => window.open('https://supabase.com/dashboard/project/urnagawdqxetwwyymdeh', '_blank')}
                            >
                                <TrendingUp className="w-5 h-5" />
                                <span className="text-sm">Supabase 대시보드</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto py-4 flex flex-col items-center gap-2"
                                onClick={() => window.open('https://vercel.com/malshues-projects/bo-bi', '_blank')}
                            >
                                <Activity className="w-5 h-5" />
                                <span className="text-sm">Vercel 배포 관리</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto py-4 flex flex-col items-center gap-2"
                                onClick={() => window.open('https://platform.openai.com/usage', '_blank')}
                            >
                                <BarChart3 className="w-5 h-5" />
                                <span className="text-sm">OpenAI 사용량</span>
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
