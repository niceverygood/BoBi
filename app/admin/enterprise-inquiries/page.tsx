'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Building2, Phone, Mail, Loader2, RefreshCw, CheckCircle2,
    Clock, PhoneCall, AlertCircle, Crown, Check,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { apiFetch } from '@/lib/api/client';

interface EnterpriseInquiry {
    id: string;
    user_id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    company_name: string | null;
    team_size: string | null;
    inquiry_message: string;
    status: 'new' | 'contacted' | 'in_progress' | 'completed' | 'cancelled';
    admin_memo: string | null;
    handled_by: string | null;
    handled_at: string | null;
    created_at: string;
    updated_at: string;
    user_email?: string;
    user_name?: string;
}

const STATUS_LABELS: Record<EnterpriseInquiry['status'], { label: string; className: string; icon: typeof Clock }> = {
    new: { label: '신규', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertCircle },
    contacted: { label: '연락완료', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: PhoneCall },
    in_progress: { label: '협의중', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    completed: { label: '완료', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    cancelled: { label: '취소', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertCircle },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'new', label: '신규' },
    { value: 'contacted', label: '연락완료' },
    { value: 'in_progress', label: '협의중' },
    { value: 'completed', label: '완료' },
    { value: 'cancelled', label: '취소' },
];

function formatPhone(p: string): string {
    const d = (p || '').replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return p;
}

function formatDate(s: string): string {
    return new Date(s).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function AdminEnterpriseInquiriesPage() {
    const router = useRouter();
    const { hasAdminAccess, role, loading: adminLoading } = useAdmin();

    const [inquiries, setInquiries] = useState<EnterpriseInquiry[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [updating, setUpdating] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!adminLoading && !hasAdminAccess) {
            router.push('/dashboard');
        }
    }, [adminLoading, hasAdminAccess, router]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const qs = statusFilter === 'all' ? '?admin=true' : `?admin=true&status=${statusFilter}`;
            const data = await apiFetch<{ inquiries: EnterpriseInquiry[] }>(`/api/enterprise-inquiries${qs}`);
            setInquiries(data.inquiries);
        } catch (err) {
            console.error('inquiries fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        if (hasAdminAccess) fetchList();
    }, [hasAdminAccess, fetchList]);

    const updateStatus = async (id: string, status: EnterpriseInquiry['status'], memo?: string) => {
        setUpdating(id);
        try {
            const body: Record<string, unknown> = { id, status };
            if (memo !== undefined) body.adminMemo = memo;
            await apiFetch('/api/enterprise-inquiries', { method: 'PATCH', body });
            await fetchList();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    const saveMemo = async (id: string, memo: string) => {
        setUpdating(id);
        try {
            await apiFetch('/api/enterprise-inquiries', {
                method: 'PATCH',
                body: { id, adminMemo: memo },
            });
            await fetchList();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setUpdating(null);
        }
    };

    /**
     * 문의자에게 팀 플랜 지정 + 상태를 '완료'로 변경.
     * 총괄관리자(super) 전용.
     */
    const assignTeamPlan = async (inq: EnterpriseInquiry, planSlug: 'team_basic' | 'team_pro') => {
        if (!inq.user_email) {
            alert('문의자 이메일을 찾을 수 없습니다.');
            return;
        }
        const planLabel = planSlug === 'team_basic' ? '팀 베이직' : '팀 프로';
        if (!confirm(
            `[${inq.contact_name}] ${inq.user_email}에게 ${planLabel} 플랜을 지정하시겠습니까?\n\n` +
            `기존 활성 구독은 취소되고, 지정일로부터 1년간 유효한 신규 구독이 생성됩니다.`,
        )) return;

        setUpdating(inq.id);
        try {
            await apiFetch('/api/admin/update-plan', {
                method: 'POST',
                body: { targetEmail: inq.user_email, planSlug },
            });
            // 문의 상태 자동 완료 처리 + 메모 자동 기록
            const memoLine = `[${new Date().toLocaleString('ko-KR')}] ${planLabel} 플랜 지정 완료`;
            const combinedMemo = inq.admin_memo ? `${inq.admin_memo}\n${memoLine}` : memoLine;
            await apiFetch('/api/enterprise-inquiries', {
                method: 'PATCH',
                body: { id: inq.id, status: 'completed', adminMemo: combinedMemo },
            });
            await fetchList();
            alert(`${planLabel} 플랜이 지정되었습니다.`);
        } catch (err) {
            alert(`플랜 지정 실패: ${(err as Error).message}`);
        } finally {
            setUpdating(null);
        }
    };

    if (adminLoading) return null;
    if (!hasAdminAccess) return null;

    const newCount = inquiries.filter(i => i.status === 'new').length;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} aria-label="뒤로">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-amber-600" />
                            엔터프라이즈 문의 관리
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {role === 'super' ? '총괄관리자' : '중간관리자'} · 신규 {newCount}건
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                </Button>
            </div>

            {/* 상태 필터 */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === f.value
                            ? 'bg-slate-800 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                            }`}
                    >
                        {f.label}
                        {f.value === 'new' && newCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px]">{newCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* 목록 */}
            {loading && inquiries.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-16 text-center">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : inquiries.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                        조회된 문의가 없습니다.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {inquiries.map((inq) => {
                        const statusInfo = STATUS_LABELS[inq.status];
                        const StatusIcon = statusInfo.icon;
                        const isExpanded = expandedId === inq.id;
                        return (
                            <Card key={inq.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <CardTitle className="text-base">
                                                    {inq.contact_name}
                                                    {inq.company_name && <span className="text-sm font-normal text-muted-foreground ml-2">{inq.company_name}</span>}
                                                </CardTitle>
                                                <Badge className={`${statusInfo.className} text-[11px] border`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {statusInfo.label}
                                                </Badge>
                                                {inq.team_size && (
                                                    <Badge variant="outline" className="text-[11px]">{inq.team_size}</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-rose-500" />
                                                    <a href={`tel:${inq.contact_phone}`} className="font-semibold text-slate-900 hover:underline">
                                                        {formatPhone(inq.contact_phone)}
                                                    </a>
                                                </span>
                                                {inq.contact_email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        <a href={`mailto:${inq.contact_email}`} className="hover:underline">
                                                            {inq.contact_email}
                                                        </a>
                                                    </span>
                                                )}
                                                <span>{formatDate(inq.created_at)}</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                                        >
                                            {isExpanded ? '접기' : '자세히'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-1 space-y-3">
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className={`text-sm text-slate-700 leading-relaxed whitespace-pre-line ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                            {inq.inquiry_message}
                                        </p>
                                    </div>

                                    {isExpanded && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <p className="font-semibold text-muted-foreground mb-1">계정 이메일</p>
                                                    <p>{inq.user_email || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-muted-foreground mb-1">계정명</p>
                                                    <p>{inq.user_name || '-'}</p>
                                                </div>
                                                {inq.handled_at && (
                                                    <div className="col-span-2">
                                                        <p className="font-semibold text-muted-foreground mb-1">최근 처리</p>
                                                        <p>{formatDate(inq.handled_at)}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 관리자 메모 */}
                                            <MemoEditor
                                                inquiryId={inq.id}
                                                initialMemo={inq.admin_memo || ''}
                                                onSave={saveMemo}
                                                disabled={updating === inq.id}
                                            />

                                            {/* 팀 플랜 지정 — 총괄관리자 전용 */}
                                            {role === 'super' && (
                                                <div className="rounded-lg border border-violet-200 bg-violet-50/40 dark:bg-violet-950/10 p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Crown className="w-4 h-4 text-violet-600" />
                                                        <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">팀 플랜 지정</p>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                                                        협의 완료 후 문의자({inq.user_email || '(이메일 없음)'})에게 팀 플랜을 지정합니다.
                                                        기존 활성 구독은 자동 취소되고 신규 구독(1년 유효)이 생성됩니다. 문의 상태는 &quot;완료&quot;로 자동 변경됩니다.
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs border-violet-300 text-violet-700 hover:bg-violet-100 dark:hover:bg-violet-950/30"
                                                            disabled={updating === inq.id || !inq.user_email}
                                                            onClick={() => assignTeamPlan(inq, 'team_basic')}
                                                        >
                                                            <Check className="w-3.5 h-3.5 mr-1" />
                                                            팀 베이직 지정
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                                                            disabled={updating === inq.id || !inq.user_email}
                                                            onClick={() => assignTeamPlan(inq, 'team_pro')}
                                                        >
                                                            <Crown className="w-3.5 h-3.5 mr-1" />
                                                            팀 프로 지정
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 상태 변경 버튼 */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <StatusButton
                                            current={inq.status}
                                            target="contacted"
                                            label="연락완료"
                                            disabled={updating === inq.id}
                                            onClick={() => updateStatus(inq.id, 'contacted')}
                                        />
                                        <StatusButton
                                            current={inq.status}
                                            target="in_progress"
                                            label="협의중"
                                            disabled={updating === inq.id}
                                            onClick={() => updateStatus(inq.id, 'in_progress')}
                                        />
                                        <StatusButton
                                            current={inq.status}
                                            target="completed"
                                            label="완료"
                                            disabled={updating === inq.id}
                                            onClick={() => updateStatus(inq.id, 'completed')}
                                        />
                                        <StatusButton
                                            current={inq.status}
                                            target="cancelled"
                                            label="취소"
                                            disabled={updating === inq.id}
                                            onClick={() => updateStatus(inq.id, 'cancelled')}
                                        />
                                        {updating === inq.id && (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground self-center" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatusButton({
    current,
    target,
    label,
    disabled,
    onClick,
}: {
    current: EnterpriseInquiry['status'];
    target: EnterpriseInquiry['status'];
    label: string;
    disabled?: boolean;
    onClick: () => void;
}) {
    const isActive = current === target;
    return (
        <Button
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            onClick={onClick}
            disabled={disabled || isActive}
            className="h-8 text-xs px-3"
        >
            {label}
        </Button>
    );
}

function MemoEditor({
    inquiryId,
    initialMemo,
    onSave,
    disabled,
}: {
    inquiryId: string;
    initialMemo: string;
    onSave: (id: string, memo: string) => Promise<void>;
    disabled?: boolean;
}) {
    const [memo, setMemo] = useState(initialMemo);
    const dirty = memo !== initialMemo;
    return (
        <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">관리자 메모</p>
            <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="처리 내역, 협의 내용 등 자유 메모"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            {dirty && (
                <div className="flex justify-end mt-1.5 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMemo(initialMemo)} disabled={disabled}>
                        취소
                    </Button>
                    <Button size="sm" onClick={() => onSave(inquiryId, memo)} disabled={disabled}>
                        저장
                    </Button>
                </div>
            )}
        </div>
    );
}
