'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Users, FileText, CreditCard, Activity, BarChart3,
    TrendingUp, AlertCircle, Search, CheckCircle2, ArrowUpDown,
    ChevronDown, Tag
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
    team_basic: 'bg-teal-100 text-teal-700 border-teal-200',
    team_pro: 'bg-amber-100 text-amber-700 border-amber-200',
};

type SortKey = 'created_at' | 'name' | 'email' | 'plan_slug';

export default function AdminPage() {
    const { isAdmin, isSubAdmin, hasAdminAccess, loading: adminLoading } = useAdmin();
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
        if (!adminLoading && !hasAdminAccess) {
            router.replace('/dashboard');
            return;
        }
        if (isAdmin) {
            fetchStats();
        }
        if (hasAdminAccess) {
            fetchUsers();
        }
    }, [isAdmin, hasAdminAccess, adminLoading, router, fetchStats, fetchUsers]);

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
                        ? { ...u, plan_slug: newPlan, plan_name: { free: '무료', basic: '베이직', pro: '프로', team_basic: '팀 베이직', team_pro: '팀 프로' }[newPlan] || newPlan }
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
                    const order = { free: 0, basic: 1, pro: 2, team_basic: 3, team_pro: 4 };
                    cmp = (order[a.plan_slug as keyof typeof order] ?? 0) - (order[b.plan_slug as keyof typeof order] ?? 0);
                    break;
                }
            }
            return sortAsc ? cmp : -cmp;
        });
    }, [users, searchQuery, sortKey, sortAsc]);

    if (adminLoading || (!hasAdminAccess && !error)) {
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
                <Header title={isAdmin ? '관리자 대시보드' : '코드 관리'} />

                <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                    {/* Admin Badge */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{isAdmin ? '총괄 관리자' : '코드 관리자'}</h2>
                            <p className="text-sm text-muted-foreground">
                                {isAdmin ? '시스템 전체 현황을 관리합니다' : '프로모션 코드를 발행하고 관리합니다'}
                            </p>
                        </div>
                        <Badge variant={isAdmin ? 'destructive' : 'default'} className="ml-auto">
                            {isAdmin ? 'ADMIN' : 'MANAGER'}
                        </Badge>
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

                    {/* Stats Cards - 총괄관리자만 */}
                    {isAdmin && (
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
                    )}

                    {/* User Management - 관리자 + 중간관리자 */}
                    {hasAdminAccess && (
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
                                                    <option value="team_basic">팀 베이직</option>
                                                    <option value="team_pro">팀 프로</option>
                                                </select>
                                                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    )}

                    {/* Sub Admin Management - 총괄관리자만 */}
                    {isAdmin && <SubAdminManager />}

                    {/* Promo Code Management - 총괄 + 중간관리자 */}
                    <PromoCodeManager />

                    {/* Quick Actions - 총괄관리자만 */}
                    {isAdmin && (
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
                    )}
                </main>
            </div>
        </div>
    );
}

// ─── 중간관리자 관리 컴포넌트 (총괄관리자 전용) ──────────────────────

interface SubAdmin {
    id: string;
    email: string;
    kakao_id: string | null;
    name: string | null;
    note: string;
    active: boolean;
    created_at: string;
}

function SubAdminManager() {
    const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // User search
    const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    // Form
    const [newEmail, setNewEmail] = useState('');
    const [newKakaoId, setNewKakaoId] = useState('');
    const [newName, setNewName] = useState('');
    const [newNote, setNewNote] = useState('');

    const fetchSubAdmins = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/sub-admins');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setSubAdmins(data.subAdmins || []);
        } catch {
            console.error('Failed to fetch sub-admins');
        } finally {
            setLoading(false);
        }
    }, []);

    // 가입자 목록 불러오기
    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setAllUsers(data.users || []);
        } catch {
            console.error('Failed to fetch users');
        }
    }, []);

    useEffect(() => {
        fetchSubAdmins();
        fetchUsers();
    }, [fetchSubAdmins, fetchUsers]);

    // 검색 필터링
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const existingEmails = new Set(subAdmins.map(s => s.email.toLowerCase()));
        return allUsers
            .filter(u =>
                (u.email.toLowerCase().includes(q) ||
                 u.name.toLowerCase().includes(q) ||
                 u.company.toLowerCase().includes(q)) &&
                !existingEmails.has(u.email.toLowerCase())
            )
            .slice(0, 8);
    }, [searchQuery, allUsers, subAdmins]);

    const handleSelectUser = (user: AdminUser) => {
        setSelectedUser(user);
        setNewEmail(user.email);
        setNewName(user.name || '');
        setSearchQuery(user.email);
        setShowDropdown(false);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setShowDropdown(value.length > 0);
        // 직접 입력도 허용
        if (!selectedUser || selectedUser.email !== value) {
            setSelectedUser(null);
            setNewEmail(value);
        }
    };

    const handleAdd = async () => {
        if (!newEmail.trim()) {
            setMessage({ type: 'error', text: '이메일을 입력해주세요.' });
            return;
        }
        setAdding(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/sub-admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    kakao_id: newKakaoId || null,
                    name: newName || null,
                    note: newNote,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage({ type: 'success', text: `"${newEmail}" 중간관리자로 등록되었습니다.` });
            setNewEmail('');
            setNewKakaoId('');
            setNewName('');
            setNewNote('');
            setSearchQuery('');
            setSelectedUser(null);
            setShowAdd(false);
            fetchSubAdmins();
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setAdding(false);
        }
    };

    const toggleActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch('/api/admin/sub-admins', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, active: !currentActive }),
            });
            if (!res.ok) throw new Error('Failed');
            setSubAdmins(prev => prev.map(s => s.id === id ? { ...s, active: !currentActive } : s));
        } catch {
            setMessage({ type: 'error', text: '상태 변경 실패' });
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (!confirm(`"${email}" 중간관리자를 삭제하시겠습니까?`)) return;
        try {
            const res = await fetch(`/api/admin/sub-admins?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setSubAdmins(prev => prev.filter(s => s.id !== id));
            setMessage({ type: 'success', text: `"${email}" 삭제 완료` });
        } catch {
            setMessage({ type: 'error', text: '삭제 실패' });
        }
    };

    return (
        <Card className="border-0 shadow-md mb-8">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        중간관리자 관리
                        <Badge variant="secondary" className="ml-1 text-xs">{subAdmins.length}명</Badge>
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
                        {showAdd ? '취소' : '+ 관리자 추가'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    중간관리자는 프로모션 코드 발행/관리만 할 수 있습니다. /admin 경로로 접근합니다.
                </p>
            </CardHeader>

            {message && (
                <div className={`mx-5 mb-3 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
                </div>
            )}

            {/* Add form */}
            {showAdd && (
                <div className="mx-5 mb-4 p-4 border rounded-xl bg-muted/30 space-y-3">
                    {/* User search */}
                    <div className="relative">
                        <label className="text-xs font-medium mb-1 block">🔍 가입자 검색 (이메일, 이름, 소속)</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="이메일 또는 이름으로 검색..."
                                value={searchQuery}
                                onChange={e => handleSearchChange(e.target.value)}
                                onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            />
                        </div>

                        {/* Search dropdown */}
                        {showDropdown && filteredUsers.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredUsers.map(u => (
                                    <button
                                        key={u.id}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                                        onMouseDown={() => handleSelectUser(u)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-semibold text-primary">
                                                {(u.name || u.email).charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {u.name || '(이름 없음)'}
                                                {u.company && <span className="text-xs text-muted-foreground ml-1">({u.company})</span>}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        <Badge variant="outline" className={`text-[10px] shrink-0 ${PLAN_BADGE_COLORS[u.plan_slug] || PLAN_BADGE_COLORS.free}`}>
                                            {u.plan_name}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showDropdown && searchQuery.length > 0 && filteredUsers.length === 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
                                검색 결과가 없습니다
                            </div>
                        )}
                    </div>

                    {/* 선택된 사용자 표시 */}
                    {selectedUser && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-600">
                                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{selectedUser.name || selectedUser.email}</p>
                                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                                {selectedUser.plan_name}
                            </Badge>
                            <button onClick={() => { setSelectedUser(null); setSearchQuery(''); setNewEmail(''); setNewName(''); }}
                                className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {!selectedUser && (
                        <div className="col-span-2">
                            <label className="text-xs font-medium mb-1 block">이메일 (직접 입력) *</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="위에서 검색하거나 직접 입력"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                            />
                        </div>
                        )}
                        <div>
                            <label className="text-xs font-medium mb-1 block">카카오톡 ID (선택)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="kakao_id"
                                value={newKakaoId}
                                onChange={e => setNewKakaoId(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">메모 (선택)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="원금융서비스 팀장"
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button onClick={handleAdd} disabled={adding || !newEmail.trim()} className="w-full">
                        {adding ? '등록 중...' : '👤 중간관리자 등록'}
                    </Button>
                </div>
            )}

            <Separator />

            {/* List */}
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        로딩 중...
                    </div>
                ) : subAdmins.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        등록된 중간관리자가 없습니다.
                    </div>
                ) : (
                    <div className="divide-y">
                        {subAdmins.map(s => (
                            <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-semibold text-blue-600">
                                        {(s.name || s.email).charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{s.name || s.email}</p>
                                        {s.kakao_id && (
                                            <span className="text-[10px] text-muted-foreground bg-yellow-100 text-yellow-700 px-1.5 rounded">
                                                카톡: {s.kakao_id}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {s.email}{s.note ? ` · ${s.note}` : ''}
                                    </p>
                                </div>
                                <Badge variant={s.active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                                    {s.active ? '활성' : '비활성'}
                                </Badge>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost" size="sm" className="text-xs h-7 px-2"
                                        onClick={() => toggleActive(s.id, s.active)}
                                    >
                                        {s.active ? '비활성화' : '활성화'}
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm" className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(s.id, s.email)}
                                    >
                                        삭제
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── 프로모 코드 관리 컴포넌트 ──────────────────────

interface PromoCode {
    id: string;
    code: string;
    description: string;
    plan_slug: string;
    price_override: number;
    discount_type: 'percent' | 'fixed' | 'price_override';
    discount_value: number;
    duration_months: number;
    max_uses: number;
    used_count: number;
    active: boolean;
    expires_at: string | null;
    created_at: string;
}

function PromoCodeManager() {
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [codesLoading, setCodesLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // New code form
    const [newCode, setNewCode] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPlan, setNewPlan] = useState('all');
    const [newDiscountType, setNewDiscountType] = useState<'percent' | 'fixed' | 'price_override'>('percent');
    const [newDiscountValue, setNewDiscountValue] = useState(10);
    const [newPrice, setNewPrice] = useState(0);
    const [newDuration, setNewDuration] = useState(-1);
    const [newMaxUses, setNewMaxUses] = useState(-1);

    const fetchCodes = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/promo-codes');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setCodes(data.codes || []);
        } catch {
            console.error('Failed to fetch promo codes');
        } finally {
            setCodesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleCreate = async () => {
        if (!newCode.trim()) {
            setMessage({ type: 'error', text: '코드를 입력해주세요.' });
            return;
        }
        setCreating(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/promo-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: newCode,
                    description: newDesc,
                    plan_slug: newPlan,
                    discount_type: newDiscountType,
                    discount_value: newDiscountType === 'price_override' ? 0 : newDiscountValue,
                    price_override: newDiscountType === 'price_override' ? newPrice : 0,
                    duration_months: newDuration,
                    max_uses: newMaxUses,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage({ type: 'success', text: `코드 "${newCode.toUpperCase()}" 생성 완료!` });
            setNewCode('');
            setNewDesc('');
            setShowCreate(false);
            fetchCodes();
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setCreating(false);
        }
    };

    const toggleActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch('/api/admin/promo-codes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, active: !currentActive }),
            });
            if (!res.ok) throw new Error('Failed');
            setCodes(prev => prev.map(c => c.id === id ? { ...c, active: !currentActive } : c));
        } catch {
            setMessage({ type: 'error', text: '상태 변경 실패' });
        }
    };

    const deleteCode = async (id: string, code: string) => {
        if (!confirm(`"${code}" 코드를 삭제하시겠습니까?`)) return;
        try {
            const res = await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setCodes(prev => prev.filter(c => c.id !== id));
            setMessage({ type: 'success', text: `"${code}" 삭제 완료` });
        } catch {
            setMessage({ type: 'error', text: '삭제 실패' });
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'BOBI-';
        for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
        setNewCode(result);
    };

    const PLAN_NAMES: Record<string, string> = { free: '무료', basic: '베이직', pro: '프로', team_basic: '팀 베이직', team_pro: '팀 프로', all: '전체' };
    const DISCOUNT_LABELS: Record<string, (v: number) => string> = {
        percent: (v) => `${v}% 할인`,
        fixed: (v) => `${v.toLocaleString()}원 할인`,
        price_override: (v) => v === 0 ? '무료' : `${v.toLocaleString()}원 특별가`,
    };

    return (
        <Card className="border-0 shadow-md mb-8">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        프로모션 코드 관리
                        <Badge variant="secondary" className="ml-1 text-xs">{codes.length}개</Badge>
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                        {showCreate ? '취소' : '+ 새 코드'}
                    </Button>
                </div>
            </CardHeader>

            {message && (
                <div className={`mx-5 mb-3 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
                </div>
            )}

            {/* Create form */}
            {showCreate && (
                <div className="mx-5 mb-4 p-4 border rounded-xl bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-xs font-medium mb-1 block">쿠폰 코드 *</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="BOBI-XXXXX"
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                />
                                <Button variant="outline" size="sm" onClick={generateRandomCode} className="shrink-0 text-xs">
                                    자동생성
                                </Button>
                            </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-xs font-medium mb-1 block">설명</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="오픈 기념 30% 할인 프로모션"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                            />
                        </div>

                        {/* 할인 유형 */}
                        <div className="col-span-2">
                            <label className="text-xs font-medium mb-1.5 block">할인 유형</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'percent' as const, label: '% 할인', desc: '정가 대비 할인율' },
                                    { value: 'fixed' as const, label: '원 할인', desc: '고정 금액 차감' },
                                    { value: 'price_override' as const, label: '특별가', desc: '결제 금액 직접 지정' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setNewDiscountType(opt.value)}
                                        className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                                            newDiscountType === opt.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-primary/30'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold">{opt.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 할인 값 입력 */}
                        {newDiscountType === 'percent' && (
                            <div>
                                <label className="text-xs font-medium mb-1 block">할인율 (%)</label>
                                <div className="relative">
                                    <input
                                        type="number" min={1} max={100}
                                        className="w-full px-3 py-2 pr-8 border rounded-lg text-sm bg-background"
                                        value={newDiscountValue}
                                        onChange={e => setNewDiscountValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    />
                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {newDiscountValue}% → 베이직 {Math.round(19900 * (100 - newDiscountValue) / 100).toLocaleString()}원, 프로 {Math.round(39900 * (100 - newDiscountValue) / 100).toLocaleString()}원
                                </p>
                            </div>
                        )}
                        {newDiscountType === 'fixed' && (
                            <div>
                                <label className="text-xs font-medium mb-1 block">할인 금액 (원)</label>
                                <div className="relative">
                                    <input
                                        type="number" min={0}
                                        className="w-full px-3 py-2 pr-8 border rounded-lg text-sm bg-background"
                                        value={newDiscountValue}
                                        onChange={e => setNewDiscountValue(Math.max(0, Number(e.target.value)))}
                                    />
                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">원</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    베이직 {Math.max(0, 19900 - newDiscountValue).toLocaleString()}원, 프로 {Math.max(0, 39900 - newDiscountValue).toLocaleString()}원
                                </p>
                            </div>
                        )}
                        {newDiscountType === 'price_override' && (
                            <div>
                                <label className="text-xs font-medium mb-1 block">결제 금액 (0=무료)</label>
                                <div className="relative">
                                    <input
                                        type="number" min={0}
                                        className="w-full px-3 py-2 pr-8 border rounded-lg text-sm bg-background"
                                        value={newPrice}
                                        onChange={e => setNewPrice(Math.max(0, Number(e.target.value)))}
                                    />
                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">원</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium mb-1 block">적용 플랜</label>
                            <select className="w-full px-3 py-2 border rounded-lg text-sm bg-background" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                                <option value="all">전체 플랜</option>
                                <option value="basic">베이직만</option>
                                <option value="pro">프로만</option>
                                <option value="team_basic">팀 베이직만</option>
                                <option value="team_pro">팀 프로만</option>
                                <option value="basic,pro">베이직+프로</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">유효 기간 (개월, -1=무제한)</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">최대 사용 횟수 (-1=무제한)</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm bg-background" value={newMaxUses} onChange={e => setNewMaxUses(Number(e.target.value))} />
                        </div>
                    </div>

                    {/* 미리보기 */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium mb-1">📋 쿠폰 미리보기</p>
                        <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-bold text-primary">{newCode || 'BOBI-XXXXX'}</code>
                            <span className="text-xs text-muted-foreground">→</span>
                            <Badge variant="secondary" className="text-xs">
                                {newDiscountType === 'percent' && `${newDiscountValue}% 할인`}
                                {newDiscountType === 'fixed' && `${newDiscountValue.toLocaleString()}원 할인`}
                                {newDiscountType === 'price_override' && (newPrice === 0 ? '무료' : `${newPrice.toLocaleString()}원`)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                                {newMaxUses === -1 ? '무제한' : `${newMaxUses}회`}
                            </Badge>
                        </div>
                    </div>

                    <Button onClick={handleCreate} disabled={creating} className="w-full">
                        {creating ? '생성 중...' : '🎟️ 쿠폰 코드 생성'}
                    </Button>
                </div>
            )}

            <Separator />

            {/* Code list */}
            <CardContent className="p-0">
                {codesLoading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        로딩 중...
                    </div>
                ) : codes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        프로모션 코드가 없습니다. 위에서 새 코드를 생성해주세요.
                    </div>
                ) : (
                    <div className="divide-y max-h-[400px] overflow-y-auto">
                        {codes.map(c => (
                            <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                                {/* Code */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono font-bold">{c.code}</code>
                                        <Badge variant={c.active ? 'default' : 'secondary'} className="text-[10px]">
                                            {c.active ? '활성' : '비활성'}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px]">
                                            {PLAN_NAMES[c.plan_slug] || c.plan_slug}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</p>
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                                        <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 h-4">
                                            {c.discount_type && DISCOUNT_LABELS[c.discount_type]
                                                ? DISCOUNT_LABELS[c.discount_type](c.discount_type === 'price_override' ? c.price_override : c.discount_value)
                                                : (c.price_override === 0 ? '무료' : `월 ${c.price_override.toLocaleString()}원`)}
                                        </Badge>
                                        <span>{c.duration_months === -1 ? '무기한' : `${c.duration_months}개월`}</span>
                                        <span>·</span>
                                        <span>사용 {c.used_count}{c.max_uses === -1 ? '회' : `/${c.max_uses}회`}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost" size="sm" className="text-xs h-7 px-2"
                                        onClick={() => toggleActive(c.id, c.active)}
                                    >
                                        {c.active ? '비활성화' : '활성화'}
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm" className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                                        onClick={() => deleteCode(c.id, c.code)}
                                    >
                                        삭제
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
