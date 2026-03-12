'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, FileText, CreditCard, Activity, BarChart3, TrendingUp, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
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
    recentUsers: Array<{
        id: string;
        email: string;
        created_at: string;
        plan?: string;
    }>;
    recentAnalyses: Array<{
        id: string;
        user_email: string;
        status: string;
        created_at: string;
    }>;
}

export default function AdminPage() {
    const { isAdmin, loading: adminLoading } = useAdmin();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Plan change state
    const [planEmail, setPlanEmail] = useState('');
    const [planSlug, setPlanSlug] = useState('basic');
    const [planUpdating, setPlanUpdating] = useState(false);
    const [planMessage, setPlanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handlePlanChange = async () => {
        if (!planEmail.trim()) {
            setPlanMessage({ type: 'error', text: '이메일을 입력해주세요.' });
            return;
        }
        setPlanUpdating(true);
        setPlanMessage(null);
        try {
            const res = await fetch('/api/admin/update-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetEmail: planEmail.trim(), planSlug }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlanMessage({ type: 'success', text: data.message });
            setPlanEmail('');
        } catch (err) {
            setPlanMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setPlanUpdating(false);
        }
    };

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.replace('/dashboard');
            return;
        }

        if (isAdmin) {
            fetchStats();
        }
    }, [isAdmin, adminLoading, router]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to fetch admin stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

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

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <Card className="border-0 shadow-md">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">전체 사용자</p>
                                        <p className="text-2xl font-bold mt-1">
                                            {loading ? '...' : stats?.totalUsers ?? 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">총 분석 건수</p>
                                        <p className="text-2xl font-bold mt-1">
                                            {loading ? '...' : stats?.totalAnalyses ?? 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">PDF 업로드</p>
                                        <p className="text-2xl font-bold mt-1">
                                            {loading ? '...' : stats?.totalUploads ?? 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">결제 건수</p>
                                        <p className="text-2xl font-bold mt-1">
                                            {loading ? '...' : stats?.totalPayments ?? 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-amber-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Plan Change Section */}
                    <Card className="border-0 shadow-md mb-8">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                사용자 플랜 변경
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">대상 이메일</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            placeholder="user@example.com"
                                            value={planEmail}
                                            onChange={(e) => setPlanEmail(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="sm:w-40">
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">변경할 플랜</label>
                                    <select
                                        value={planSlug}
                                        onChange={(e) => setPlanSlug(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="free">무료</option>
                                        <option value="basic">베이직</option>
                                        <option value="pro">프로</option>
                                        <option value="team">팀</option>
                                    </select>
                                </div>
                                <div className="sm:self-end">
                                    <Button
                                        onClick={handlePlanChange}
                                        disabled={planUpdating}
                                        className="w-full sm:w-auto"
                                    >
                                        {planUpdating ? '변경 중...' : '플랜 변경'}
                                    </Button>
                                </div>
                            </div>
                            {planMessage && (
                                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${planMessage.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {planMessage.type === 'success'
                                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        : <AlertCircle className="w-4 h-4 shrink-0" />}
                                    {planMessage.text}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Users */}
                        <Card className="border-0 shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    최근 가입 사용자
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">로딩 중...</div>
                                ) : stats?.recentUsers?.length ? (
                                    <div className="divide-y">
                                        {stats.recentUsers.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between px-5 py-3">
                                                <div>
                                                    <p className="text-sm font-medium">{user.email}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {user.plan || 'free'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground">데이터 없음</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Analyses */}
                        <Card className="border-0 shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    최근 분석 활동
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">로딩 중...</div>
                                ) : stats?.recentAnalyses?.length ? (
                                    <div className="divide-y">
                                        {stats.recentAnalyses.map((analysis) => (
                                            <div key={analysis.id} className="flex items-center justify-between px-5 py-3">
                                                <div>
                                                    <p className="text-sm font-medium">{analysis.user_email}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(analysis.created_at).toLocaleDateString('ko-KR')}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={analysis.status === 'completed' ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {analysis.status === 'completed' ? '완료' :
                                                        analysis.status === 'processing' ? '처리중' : analysis.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-sm text-muted-foreground">데이터 없음</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8">
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
