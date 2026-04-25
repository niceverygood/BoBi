'use client';

// 환불 정책 가이드 페이지
// 영업이사/관리자가 고객 환불 요청을 받았을 때
// 1) 시스템이 자동으로 환불 가능 여부를 판정해주고
// 2) 추천 카톡 템플릿을 바로 복사할 수 있도록 한다.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, ShieldCheck, Copy, Check, AlertCircle,
    CheckCircle2, XCircle, MessageCircle, Workflow, Phone, Search, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import { apiFetch } from '@/lib/api/client';

const POLICY_DAYS = 7;

const TEMPLATES: Array<{
    id: string;
    label: string;
    badge: string;
    badgeColor: string;
    description: string;
    body: string;
}> = [
    {
        id: 'A',
        label: '🅰️ 메인 — 정책 안내 (1차 응대)',
        badge: '모든 환불 요청',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
        description: '환불 요청을 처음 받았을 때 정책을 안내하고 확인 정보를 받는 메시지',
        body: `안녕하세요, 고객님.
BoBi 운영팀 [이름]입니다 :)

환불 요청 주셔서 감사합니다.
처리 전 BoBi 환불 정책 안내드릴게요.

━━━ BoBi 환불 정책 ━━━

✅ 정상 환불 가능
   · 결제 후 ${POLICY_DAYS}일 이내
   · 분석/PDF 사용 이력 0건
   (전자상거래법상 청약철회 기준)

✅ 즉시 환불 가능 (정책 무관)
   · 결제 시스템 오류
   · 중복 결제
   · 명백한 실수 결제

❌ 정상 환불 불가
   · 결제 후 ${POLICY_DAYS}일 초과
   · 분석/PDF 1회 이상 사용
   → 다음 결제일 자동결제 해지로 안내드려요

━━━━━━━━━━━━━━━━

확인을 위해 아래 정보 부탁드립니다.
1) 결제일 (대략 언제쯤 결제하셨는지)
2) 결제 수단 (카카오페이/카드/구글결제 등)
3) BoBi에서 분석 사용해보신 횟수
4) 환불 사유

확인 후 1영업일 내로 답변드리겠습니다 🙏`,
    },
    {
        id: 'B',
        label: '🅱️ 환불 가능 — 정책 충족',
        badge: '7일 이내 + 미사용',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        description: '결제 후 7일 이내 + 서비스 미사용으로 정상 환불이 가능한 경우',
        body: `안녕하세요, 고객님.

BoBi 환불 정책에 부합하시어
환불 처리 도와드리겠습니다.

[확인 사항]
✅ 결제 후 ${POLICY_DAYS}일 이내
✅ 서비스 미사용

[진행 절차]
1) 결제 내역 캡처 1장 부탁드립니다
   (카카오페이 → 결제내역 → 해당 건 캡처)
2) 영업일 기준 1~3일 내 환불 완료
3) 환불 완료되면 카톡으로 안내드려요

추가 문의 있으시면 편하게 말씀해주세요 :)`,
    },
    {
        id: 'C',
        label: '🅲 환불 불가 — 대안 제시',
        badge: '7일 초과 OR 사용함',
        badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
        description: '정책 미충족이지만 다운그레이드/자동해지 등 대안을 안내',
        body: `안녕하세요, 고객님.

요청 건 확인했습니다.
다만 아래 사유로 정상 환불은 어려운 점
양해 부탁드립니다 🙏

[BoBi 환불 정책]
정상 환불은
"결제 후 ${POLICY_DAYS}일 이내 + 서비스 미사용"
조건일 때만 가능합니다.
(전자상거래법 17조 청약철회 기준)

[고객님 결제 현황]
· 결제일: ____ (현재 ___일 경과)
· 분석 사용: ___회

[대신 도와드릴 수 있는 것]
① 다음 결제 자동해지
   → 이번 달까지는 정상 사용 가능
   → 다음 달부터 결제 안 됩니다

② 베이직 플랜으로 다운그레이드
   → 현재 프로(39,900원) → 베이직(19,900원)
   → 차액 부담 적게 유지 가능

원하시는 옵션 알려주시면 처리해드릴게요!`,
    },
    {
        id: 'D',
        label: '🆘 매니저 에스컬레이션',
        badge: '강력 컴플레인',
        badgeColor: 'bg-red-100 text-red-700 border-red-200',
        description: '고객이 강하게 환불 요구하거나 법적 분쟁 우려가 있을 때 — 발송 후 매니저에게 즉시 공유',
        body: `안녕하세요, 고객님.

말씀해주신 내용 상세히 검토 필요해서
담당 매니저에게 전달드렸습니다.

24시간 내로 답변 드릴 수 있도록
빠르게 확인하겠습니다.
조금만 기다려주세요 🙏`,
    },
];

const SELF_DECISION = [
    { ok: true, label: '결제 7일 이내 + 미사용', action: '🅱️ 발송 후 BoBi에서 환불 처리' },
    { ok: true, label: '결제 오류 / 중복 결제 (PG 시스템 문제 명백)', action: '🅱️ 발송 후 즉시 환불' },
    { ok: true, label: '단순 변심 + 7일 초과', action: '🅲 발송 (환불 거절 + 대안 제시)' },
    { ok: true, label: '서비스 사용 후 환불 요청', action: '🅲 발송 (환불 거절 + 대안 제시)' },
];

const ESCALATION = [
    '7일 초과인데 고객이 강력하게 환불 요구',
    'VOC 누적 / 부정적 리뷰 위협',
    '법적 분쟁 우려 (변호사 언급, 신고 언급 등)',
    '단체/기업 고객 대량 환불 요청',
];

interface AdminUserLite {
    id: string;
    email: string;
    phone: string;
    name: string;
    company: string;
    plan_slug: string;
    plan_name: string;
}

interface EligibilityResult {
    daysSincePayment: number | null;
    analysesUsed: number;
    lastPaidAt: string | null;
    lastPaidAmount: number | null;
    isPolicyViolation: boolean;
    violationReasons: string[];
}

// 정책 판정 결과 → 추천 템플릿 ID 매핑
function recommendTemplate(elig: EligibilityResult): { id: 'B' | 'C'; reason: string } {
    if (!elig.isPolicyViolation) {
        return { id: 'B', reason: '정책 충족 — 환불 가능 안내 발송 후 BoBi에서 환불 처리' };
    }
    return { id: 'C', reason: '정책 미충족 — 환불 불가 안내 + 다운그레이드/자동해지 대안 제시' };
}

export default function RefundPolicyPage() {
    const { hasAdminAccess, isAdmin, loading } = useAdmin();
    const router = useRouter();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // 환불 가능 여부 조회
    const [users, setUsers] = useState<AdminUserLite[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUserLite | null>(null);
    const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
    const [policyDays, setPolicyDays] = useState(POLICY_DAYS);
    const [checking, setChecking] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    // hasAdminAccess가 결정된 뒤에만 사용자 목록 로드
    useEffect(() => {
        if (!hasAdminAccess) return;
        setUsersLoading(true);
        apiFetch<{ users: AdminUserLite[] }>('/api/admin/users')
            .then(res => setUsers(res.users || []))
            .catch(() => { /* 권한 없으면 silently 비움 */ })
            .finally(() => setUsersLoading(false));
    }, [hasAdminAccess]);

    const filteredUsers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 2) return [];
        return users
            .filter(u =>
                u.email.toLowerCase().includes(q) ||
                u.name.toLowerCase().includes(q) ||
                u.phone.replace(/-/g, '').includes(q.replace(/-/g, '')) ||
                u.company.toLowerCase().includes(q),
            )
            .slice(0, 8);
    }, [searchQuery, users]);

    const handleSelectUser = async (u: AdminUserLite) => {
        setSelectedUser(u);
        setSearchQuery(u.email);
        setShowDropdown(false);
        setEligibility(null);
        setCheckError(null);
        setChecking(true);
        try {
            const res = await apiFetch<{
                eligibility: EligibilityResult;
                policyDays: number;
            }>('/api/admin/payments', {
                method: 'PATCH',
                body: { targetUserId: u.id },
            });
            setEligibility(res.eligibility);
            setPolicyDays(res.policyDays);
        } catch (e) {
            setCheckError((e as Error).message);
        } finally {
            setChecking(false);
        }
    };

    const handleClearLookup = () => {
        setSelectedUser(null);
        setEligibility(null);
        setSearchQuery('');
        setCheckError(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!hasAdminAccess) {
        if (typeof window !== 'undefined') router.replace('/admin');
        return null;
    }

    const recommendation = eligibility ? recommendTemplate(eligibility) : null;
    const recommendedTemplate = recommendation ? TEMPLATES.find(t => t.id === recommendation.id) : null;

    const copy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(curr => (curr === id ? null : curr)), 1500);
        } catch {
            /* 클립보드 권한 없을 수 있음 */
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-5 min-w-0">
            {/* 헤더 */}
            <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/admin" className="shrink-0">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="truncate">환불 정책 가이드</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        고객 환불 요청을 받았을 때 시스템 자동 판정 + 카톡 응대 템플릿
                    </p>
                </div>
            </div>

            {/* ▼▼▼ 환불 가능 여부 조회 (시스템 자동 판정) ▼▼▼ */}
            <Card className="border-0 shadow-md border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" />
                        환불 가능 여부 조회
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        고객 이메일/이름/전화번호로 검색하면 시스템이 자동으로 정책 부합 여부를 판정합니다.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* 검색 입력 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="이메일, 이름, 전화번호 (2자 이상)"
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setShowDropdown(true);
                                if (selectedUser && selectedUser.email !== e.target.value) {
                                    setSelectedUser(null);
                                    setEligibility(null);
                                    setCheckError(null);
                                }
                            }}
                            onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            disabled={usersLoading}
                            className="w-full pl-9 pr-9 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                        />
                        {(searchQuery || selectedUser) && (
                            <button
                                onClick={handleClearLookup}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm w-6 h-6 flex items-center justify-center"
                                aria-label="초기화"
                            >
                                ×
                            </button>
                        )}

                        {/* 검색 결과 드롭다운 */}
                        {showDropdown && filteredUsers.length > 0 && !selectedUser && (
                            <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                                {filteredUsers.map(u => (
                                    <button
                                        key={u.id}
                                        onMouseDown={() => handleSelectUser(u)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-semibold text-primary">
                                                {(u.name || u.email).charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{u.name || '(이름 없음)'}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {u.email}{u.phone ? ` · ${u.phone}` : ''}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] shrink-0">{u.plan_name}</Badge>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showDropdown && searchQuery.trim().length >= 2 && filteredUsers.length === 0 && !usersLoading && !selectedUser && (
                            <div className="absolute z-20 w-full mt-1 bg-background border rounded-lg shadow-lg p-4 text-center text-xs text-muted-foreground">
                                해당 고객이 없습니다. 이메일/이름을 다시 확인해주세요.
                            </div>
                        )}
                    </div>

                    {/* 판정 결과 */}
                    {checking && (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            정책 판정 중...
                        </div>
                    )}

                    {checkError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                            조회 실패: {checkError}
                        </div>
                    )}

                    {selectedUser && eligibility && !checking && recommendation && recommendedTemplate && (
                        <div className="space-y-3">
                            {/* 고객 정보 + 판정 */}
                            <div className={`rounded-xl border-2 overflow-hidden ${eligibility.isPolicyViolation
                                ? 'border-red-300 bg-red-50/30'
                                : 'border-emerald-300 bg-emerald-50/30'}`}
                            >
                                <div className={`px-4 py-3 ${eligibility.isPolicyViolation ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {eligibility.isPolicyViolation
                                                ? <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                                                : <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
                                            <div className="min-w-0">
                                                <p className={`text-base font-bold ${eligibility.isPolicyViolation ? 'text-red-900' : 'text-emerald-900'}`}>
                                                    {eligibility.isPolicyViolation ? '환불 불가 (정책 위반)' : '환불 가능 (정책 충족)'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {selectedUser.name || selectedUser.email} · {selectedUser.plan_name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 space-y-2 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="p-2 rounded bg-background border">
                                            <p className="text-muted-foreground text-[10px]">결제일</p>
                                            <p className="font-medium">
                                                {eligibility.lastPaidAt
                                                    ? `${new Date(eligibility.lastPaidAt).toLocaleDateString('ko-KR')}`
                                                    : '결제 이력 없음'}
                                            </p>
                                            {eligibility.daysSincePayment !== null && (
                                                <p className={`text-[10px] mt-0.5 ${eligibility.daysSincePayment > policyDays ? 'text-red-600 font-semibold' : 'text-emerald-700'}`}>
                                                    {eligibility.daysSincePayment}일 경과 (정책 {policyDays}일 이내)
                                                </p>
                                            )}
                                        </div>
                                        <div className="p-2 rounded bg-background border">
                                            <p className="text-muted-foreground text-[10px]">이번 달 분석 사용</p>
                                            <p className="font-medium">{eligibility.analysesUsed}회</p>
                                            <p className={`text-[10px] mt-0.5 ${eligibility.analysesUsed > 0 ? 'text-red-600 font-semibold' : 'text-emerald-700'}`}>
                                                {eligibility.analysesUsed > 0 ? '미사용 조건 위반' : '미사용'}
                                            </p>
                                        </div>
                                    </div>
                                    {eligibility.lastPaidAmount != null && (
                                        <div className="p-2 rounded bg-background border">
                                            <p className="text-muted-foreground text-[10px]">결제 금액</p>
                                            <p className="font-medium">{eligibility.lastPaidAmount.toLocaleString()}원</p>
                                        </div>
                                    )}
                                    {eligibility.violationReasons.length > 0 && (
                                        <div className="p-2.5 rounded bg-red-50 border border-red-200">
                                            <p className="font-semibold text-red-900 mb-1">위반 사유</p>
                                            <ul className="text-red-800 space-y-0.5">
                                                {eligibility.violationReasons.map((r, i) => <li key={i}>· {r}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 추천 액션 */}
                            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                                <div>
                                    <p className="text-[11px] font-semibold text-primary mb-1">📋 추천 응대 액션</p>
                                    <p className="text-sm font-medium">{recommendation.reason}</p>
                                </div>

                                <div className="rounded-lg border bg-background overflow-hidden">
                                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b flex-wrap">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-semibold truncate">{recommendedTemplate.label}</span>
                                            <Badge variant="outline" className={`text-[10px] shrink-0 ${recommendedTemplate.badgeColor}`}>
                                                {recommendedTemplate.badge}
                                            </Badge>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={copiedId === `lookup-${recommendedTemplate.id}` ? 'default' : 'outline'}
                                            className="text-xs h-7 shrink-0"
                                            onClick={() => copy(`lookup-${recommendedTemplate.id}`, recommendedTemplate.body)}
                                        >
                                            {copiedId === `lookup-${recommendedTemplate.id}`
                                                ? <><Check className="w-3 h-3 mr-1" /> 복사됨</>
                                                : <><Copy className="w-3 h-3 mr-1" /> 카톡 복사</>}
                                        </Button>
                                    </div>
                                    <pre className="px-3 py-3 text-xs leading-relaxed font-sans whitespace-pre-wrap break-words">
                                        {recommendedTemplate.body}
                                    </pre>
                                </div>

                                {/* 후속 안내 */}
                                {!eligibility.isPolicyViolation ? (
                                    <div className="text-xs text-emerald-800 bg-emerald-100/50 rounded-lg p-2.5 border border-emerald-200">
                                        ✅ 환불 처리는 PG사(카카오페이/이니시스 등) 가맹점 어드민에서 먼저 진행한 뒤,{' '}
                                        <Link href="/admin#payment-history" className="underline font-semibold">관리자 → 결제 관리</Link>의 "환불/취소" 버튼으로 BoBi 구독을 취소해주세요.
                                    </div>
                                ) : isAdmin ? (
                                    <div className="text-xs text-amber-900 bg-amber-100/60 rounded-lg p-2.5 border border-amber-200">
                                        ⚠️ 정책 위반 — 총괄관리자 권한으로 예외 처리하시려면{' '}
                                        <Link href="/admin#payment-history" className="underline font-semibold">결제 관리 → 환불/취소</Link>{' '}
                                        에서 사유 입력 후 처리하세요.
                                    </div>
                                ) : (
                                    <div className="text-xs text-amber-900 bg-amber-100/60 rounded-lg p-2.5 border border-amber-200">
                                        🚫 정책 위반 환불은 <strong>중간관리자가 단독 처리할 수 없습니다.</strong>
                                        🅲 템플릿으로 1차 응대한 뒤, 고객이 강력히 요청하면{' '}
                                        매니저(<code className="bg-white px-1 rounded">niceverygood@naver.com</code>)에게 슬랙/카톡으로 전달해주세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!selectedUser && !checking && (
                        <p className="text-[11px] text-muted-foreground text-center py-2">
                            💡 고객 카톡 메시지에 적힌 이메일이나 이름을 검색해보세요.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 정책 요약 */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        환불 정책 요약
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                        <p className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            정상 환불 가능
                        </p>
                        <ul className="text-xs text-emerald-800 space-y-1">
                            <li>· 결제 후 <strong>{POLICY_DAYS}일 이내</strong></li>
                            <li>· 분석/PDF <strong>0회 사용</strong></li>
                            <li>· 결제 시스템 오류 / 중복 결제</li>
                        </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm font-semibold text-red-900 flex items-center gap-1.5 mb-2">
                            <XCircle className="w-4 h-4" />
                            정상 환불 불가
                        </p>
                        <ul className="text-xs text-red-800 space-y-1">
                            <li>· 결제 후 <strong>{POLICY_DAYS}일 초과</strong></li>
                            <li>· 분석/PDF <strong>1회 이상 사용</strong></li>
                            <li>→ 자동결제 해지 / 다운그레이드 안내</li>
                        </ul>
                    </div>
                </CardContent>
                <CardContent className="pt-0">
                    <p className="text-[11px] text-muted-foreground">
                        근거: 전자상거래법 17조(청약철회), BoBi 이용약관
                    </p>
                </CardContent>
            </Card>

            {/* 셀프 판단 가이드 */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Workflow className="w-4 h-4" />
                        본인 판단으로 처리 가능한 케이스
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        아래 케이스는 매니저 확인 없이 처리 가능합니다.
                    </p>
                </CardHeader>
                <CardContent className="space-y-2">
                    {SELF_DECISION.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border bg-background">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{item.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">→ {item.action}</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 매니저 확인 필수 */}
            <Card className="border-0 shadow-md border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        매니저 확인 필수 (단독 처리 금지)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {ESCALATION.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/50 border border-red-100">
                            <Phone className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm">{item}</p>
                        </div>
                    ))}
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        🆘 위 케이스 발생 시 <strong>🆘 템플릿</strong>으로 1차 응대 후
                        매니저(<code className="bg-white px-1 rounded">niceverygood@naver.com</code>)에게 즉시 공유해주세요.
                    </div>
                </CardContent>
            </Card>

            {/* 카톡 템플릿 */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        카톡 응대 템플릿
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        복사 버튼을 눌러 카카오톡에 붙여넣으세요. <strong>[이름]</strong>, <strong>____</strong> 부분은 실제 정보로 교체해주세요.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {TEMPLATES.map(t => (
                        <div key={t.id} className="border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-muted/40 border-b flex-wrap">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-sm font-semibold truncate">{t.label}</span>
                                    <Badge variant="outline" className={`text-[10px] shrink-0 ${t.badgeColor}`}>
                                        {t.badge}
                                    </Badge>
                                </div>
                                <Button
                                    size="sm"
                                    variant={copiedId === t.id ? 'default' : 'outline'}
                                    className="text-xs h-7 shrink-0"
                                    onClick={() => copy(t.id, t.body)}
                                >
                                    {copiedId === t.id
                                        ? <><Check className="w-3 h-3 mr-1" /> 복사됨</>
                                        : <><Copy className="w-3 h-3 mr-1" /> 복사</>}
                                </Button>
                            </div>
                            <p className="px-3 sm:px-4 pt-2 pb-1 text-[11px] text-muted-foreground">
                                {t.description}
                            </p>
                            <pre className="px-3 sm:px-4 py-3 text-xs leading-relaxed font-sans whitespace-pre-wrap break-words bg-background">
                                {t.body}
                            </pre>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <p className="text-[11px] text-muted-foreground text-center pt-4 pb-8">
                정책이 바뀌면 매니저가 이 페이지를 업데이트합니다.
                의문 사항은 슬랙 #cs 채널에 문의하세요.
            </p>
        </div>
    );
}
