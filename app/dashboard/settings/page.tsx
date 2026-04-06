'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Building, Crown, CheckCircle2, X, Zap, Loader2, Sparkles, LogOut, Gift, Copy, Users } from 'lucide-react';
import { PLAN_LIMITS, type PlanSlug } from '@/lib/utils/constants';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const PLAN_BADGE_COLORS: Record<PlanSlug, string> = {
    free: 'bg-slate-100 text-slate-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-violet-100 text-violet-700',
    team_basic: 'bg-teal-100 text-teal-700',
    team_pro: 'bg-amber-100 text-amber-700',
};

// 국내 주요 GA 및 보험사 목록
const COMPANY_LIST = [
    // GA
    'GA코리아', '리치플래닛', '피플라이프', 'GA스타', '인카금융서비스', '글로벌금융판매',
    '에이플러스에셋', '유퍼스트금융', '한국보험금융', '보맵', 'KGA',
    '더케이금융그룹', '메가금융서비스', '프라임에셋', '위너스금융서비스', '다봄금융서비스',
    // 생명보험
    '삼성생명', '한화생명', '교보생명', 'NH농협생명', '신한라이프', 'KB생명',
    '미래에셋생명', '동양생명', 'ABL생명', 'DB생명', '하나생명', 'AIA생명', '라이나생명',
    // 손해보험
    '삼성화재', '현대해상', 'DB손해보험', 'KB손해보험', '메리츠화재',
    '한화손해보험', '롯데손해보험', '흥국화재', '농협손해보험', 'MG손해보험',
    '카카오페이손해보험', '토스손해보험', '하나손해보험',
    // 기타
    '기타 (직접 입력)',
];

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [customCompany, setCustomCompany] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const { plan, usage, loading, remainingAnalyses } = useSubscription();
    const currentSlug = (plan.slug || 'free') as PlanSlug;
    const planLimits = PLAN_LIMITS[currentSlug];

    const usagePercent = plan.max_analyses === -1
        ? 0
        : Math.min(100, Math.round((usage.analyses_used / usage.analyses_limit) * 100));

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: 'global' });
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    };

    const handleCompanySelect = (value: string) => {
        if (value === '기타 (직접 입력)') {
            setIsCustom(true);
            setCompany('');
        } else {
            setIsCustom(false);
            setCompany(value);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">설정</h1>
                <p className="text-muted-foreground mt-1">프로필 및 플랜 관리</p>
            </div>

            {/* Profile */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        프로필 정보
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="이름을 입력하세요"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">
                                <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    소속 GA / 보험사
                                </div>
                            </Label>
                            <select
                                value={isCustom ? '기타 (직접 입력)' : company}
                                onChange={(e) => handleCompanySelect(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">소속을 선택하세요</option>
                                <optgroup label="GA (법인대리점)">
                                    {COMPANY_LIST.filter((_, i) => i < 16).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="생명보험사">
                                    {COMPANY_LIST.filter((_, i) => i >= 16 && i < 29).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="손해보험사">
                                    {COMPANY_LIST.filter((_, i) => i >= 29 && i < 42).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                                <option value="기타 (직접 입력)">기타 (직접 입력)</option>
                            </select>
                            {isCustom && (
                                <Input
                                    value={customCompany}
                                    onChange={(e) => { setCustomCompany(e.target.value); setCompany(e.target.value); }}
                                    placeholder="소속 회사명을 입력하세요"
                                    className="mt-2"
                                />
                            )}
                        </div>
                    </div>
                    <Button className="bg-gradient-primary hover:opacity-90">
                        저장
                    </Button>
                </CardContent>
            </Card>

            {/* Current Plan & Usage — PLAN_LIMITS 기준 가격 표시 */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-primary" />
                        현재 플랜
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Badge className={cn('text-xs', PLAN_BADGE_COLORS[currentSlug])}>
                                    {planLimits?.name || plan.display_name}
                                </Badge>
                                <span className="text-sm">
                                    {planLimits?.price || '무료'}
                                </span>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">이번 달 사용량</span>
                            <span className="font-medium">
                                {usage.analyses_used}건 / {plan.max_analyses === -1 ? '무제한' : `${usage.analyses_limit}건`}
                            </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    usagePercent >= 90 ? 'bg-red-500' :
                                        usagePercent >= 70 ? 'bg-amber-500' :
                                            'bg-gradient-to-r from-blue-500 to-primary'
                                )}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        {remainingAnalyses !== -1 && remainingAnalyses <= 5 && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                남은 분석 {remainingAnalyses}건 — 업그레이드하면 더 많이 분석할 수 있어요
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Plan Cards */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(Object.entries(PLAN_LIMITS) as [PlanSlug, typeof PLAN_LIMITS[PlanSlug]][]).map(([key, planInfo]) => (
                            <div
                                key={key}
                                className={cn(
                                    'rounded-xl border p-4 transition-all flex flex-col',
                                    key === currentSlug
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'hover:border-primary/30'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-sm">{planInfo.name}</h3>
                                    {key === currentSlug && (
                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">현재</Badge>
                                    )}
                                </div>
                                <p className="text-lg font-bold mb-0.5">{planInfo.price}</p>
                                <p className="text-[11px] text-muted-foreground mb-3">
                                    월 {planInfo.analysisLimit === -1 ? '무제한' : `${planInfo.analysisLimit}건`}
                                </p>
                                <ul className="space-y-1 mb-3 flex-1">
                                    {planInfo.features.slice(0, 3).map((f) => (
                                        <li key={f} className="text-[11px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                    {planInfo.lockedFeatures.slice(0, 1).map((f) => (
                                        <li key={f} className="text-[11px] flex items-center gap-1 text-muted-foreground/50">
                                            <X className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                {key !== currentSlug && key !== 'free' ? (
                                    <Link href={`/dashboard/subscribe?plan=${key}`}>
                                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                            구독하기
                                        </Button>
                                    </Link>
                                ) : key === currentSlug ? (
                                    <Button variant="outline" size="sm" className="w-full text-xs h-8" disabled>
                                        현재 플랜
                                    </Button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* 플랜 업그레이드 안내 */}
            {(currentSlug === 'free' || currentSlug === 'basic') && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold">플랜 업그레이드</p>
                                    <p className="text-sm text-muted-foreground">할인코드가 있으시면 구독 페이지에서 사용해주세요.</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => window.location.href = '/dashboard/subscribe'}
                                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white"
                            >
                                구독하기
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 기기 관리 */}
            <DeviceManagement />

            {/* 친구 초대 */}
            <ReferralSection />

            {/* 로그아웃 */}
            <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-sm">로그아웃</p>
                            <p className="text-xs text-muted-foreground">현재 계정에서 로그아웃합니다.</p>
                        </div>
                        <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                            <LogOut className="w-4 h-4 mr-2" />
                            로그아웃
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── 친구 초대 섹션 ──
function ReferralSection() {
    const [data, setData] = useState<{
        code: string;
        usedCount: number;
        rewardMonths: number;
        remainingSlots: number;
        maxReferrals: number;
        invitees: Array<{ invitee_email: string; created_at: string }>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [applying, setApplying] = useState(false);
    const [applyMsg, setApplyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/referral');
                if (res.ok) setData(await res.json());
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, []);

    const handleCopy = () => {
        if (!data) return;
        navigator.clipboard.writeText(data.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApply = async () => {
        if (!inputCode.trim()) return;
        setApplying(true);
        setApplyMsg(null);
        try {
            const res = await fetch('/api/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: inputCode.trim() }),
            });
            const result = await res.json();
            if (res.ok) {
                setApplyMsg({ type: 'success', text: result.message });
                setInputCode('');
            } else {
                setApplyMsg({ type: 'error', text: result.error });
            }
        } catch {
            setApplyMsg({ type: 'error', text: '코드 적용에 실패했습니다.' });
        } finally {
            setApplying(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    친구 초대
                </CardTitle>
                <CardDescription>
                    친구를 초대하면 <strong>베이직 플랜 1주일 무료!</strong> 최대 10명 초대로 10주 무료
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <Skeleton className="h-20 w-full" />
                ) : data ? (
                    <>
                        {/* 내 초대 코드 */}
                        <div className="bg-amber-50 rounded-xl p-4">
                            <p className="text-xs text-amber-700 font-medium mb-2">내 초대 코드</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-amber-800 tracking-wider flex-1">{data.code}</span>
                                <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                                    {copied ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                                    {copied ? '복사됨' : '복사'}
                                </Button>
                            </div>
                            <p className="text-xs text-amber-600 mt-2">이 코드를 친구에게 공유하세요. 친구가 가입 후 코드를 입력하면 베이직 1주일이 무료로 제공됩니다.</p>
                        </div>

                        {/* 진행 현황 */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-black text-primary">{data.usedCount}</p>
                                <p className="text-[10px] text-muted-foreground">초대 완료</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-black text-amber-600">{data.rewardMonths}</p>
                                <p className="text-[10px] text-muted-foreground">무료 개월</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-black text-muted-foreground">{data.remainingSlots}</p>
                                <p className="text-[10px] text-muted-foreground">남은 초대</p>
                            </div>
                        </div>

                        {/* 초대한 친구 목록 */}
                        {data.invitees.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" /> 초대한 친구
                                </p>
                                {data.invitees.map((inv, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-muted/30">
                                        <span>{inv.invitee_email}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('ko-KR')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : null}

                <Separator />

                {/* 초대 코드 입력 (받은 코드 사용) */}
                <div>
                    <p className="text-sm font-medium mb-2">초대 코드 입력</p>
                    <p className="text-xs text-muted-foreground mb-2">친구에게 받은 초대 코드가 있나요?</p>
                    <div className="flex gap-2">
                        <Input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} placeholder="예: A3K7B2N" className="flex-1 font-mono uppercase" />
                        <Button onClick={handleApply} disabled={applying || !inputCode.trim()} size="sm">
                            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : '적용'}
                        </Button>
                    </div>
                    {applyMsg && (
                        <p className={`text-xs mt-2 ${applyMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {applyMsg.text}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ── 기기 관리 섹션 ──
function DeviceManagement() {
    const [devices, setDevices] = useState<Array<{
        id: string; device_id: string; device_name: string;
        device_type: string; last_active: string;
    }>>([]);
    const [maxDevices, setMaxDevices] = useState(2);
    const [canChange, setCanChange] = useState(true);
    const [nextChangeDate, setNextChangeDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [removeMsg, setRemoveMsg] = useState<string | null>(null);

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/auth/device');
            if (res.ok) {
                const data = await res.json();
                setDevices(data.devices || []);
                setMaxDevices(data.maxDevices || 2);
                setCanChange(data.canChange !== false);
                setNextChangeDate(data.nextChangeDate || null);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDevices(); }, []);

    const removeDevice = async (deviceId: string) => {
        if (!canChange) {
            setRemoveMsg(`기기 변경은 월 1회만 가능합니다. ${nextChangeDate ? new Date(nextChangeDate).toLocaleDateString('ko-KR') + ' 이후' : '30일 후'} 변경 가능합니다.`);
            return;
        }
        if (!confirm('이 기기를 제거하시겠습니까?\n\n⚠️ 기기 변경은 한 달에 1번만 가능합니다.')) return;
        setRemoveMsg(null);
        try {
            const res = await fetch(`/api/auth/device?deviceId=${deviceId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setRemoveMsg(data.message);
                fetchDevices();
            } else {
                setRemoveMsg(data.error);
            }
        } catch { setRemoveMsg('기기 제거에 실패했습니다.'); }
    };

    const getDeviceIcon = (type: string) => {
        if (type === 'mobile') return '📱';
        if (type === 'tablet') return '📋';
        return '💻';
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    기기 관리
                </CardTitle>
                <CardDescription>
                    최대 {maxDevices}대의 기기에서 동시 로그인 가능. 기기 변경은 <strong>월 1회</strong>만 가능합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {loading ? (
                    <Skeleton className="h-16 w-full" />
                ) : devices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">등록된 기기가 없습니다.</p>
                ) : (
                    devices.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{getDeviceIcon(d.device_type)}</span>
                                <div>
                                    <p className="text-sm font-medium">{d.device_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        마지막 활동: {new Date(d.last_active).toLocaleString('ko-KR')}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeDevice(d.device_id)}
                                disabled={!canChange}
                                className={`text-xs ${canChange ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-muted-foreground'}`}>
                                {canChange ? '제거' : '변경 불가'}
                            </Button>
                        </div>
                    ))
                )}
                {removeMsg && (
                    <p className={`text-xs ${removeMsg.includes('실패') || removeMsg.includes('불가') || removeMsg.includes('월 1회') ? 'text-red-500' : 'text-green-600'}`}>
                        {removeMsg}
                    </p>
                )}
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>{devices.length}/{maxDevices}대 사용 중</p>
                    {!canChange && nextChangeDate && (
                        <p>🔒 다음 변경 가능일: {new Date(nextChangeDate).toLocaleDateString('ko-KR')}</p>
                    )}
                    <p>3번째 기기에서 로그인하면 차단됩니다. 기존 기기를 먼저 제거해주세요.</p>
                </div>
            </CardContent>
        </Card>
    );
}
