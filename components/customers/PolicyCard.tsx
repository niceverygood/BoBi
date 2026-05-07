'use client';

// 고객 카드 안의 "보험 가입 정보" + CRM 알림 일정 카드.
//
// 입력값:
//   가입일 / 보험사 / 상품명 / 면책 종료일 / 감액 종료일 / 갱신일 / 메모
//
// 면책 (90일) / 감액 (1년)은 enrollment_date 기준 자동 계산하지만 상품마다 다르므로
// 사용자가 덮어쓸 수 있다.
//
// Plan gate:
//   Free          : 입력만 가능 (UI 노출), 알림 발송 없음
//   Basic+        : 갱신일 알림 활성 (D-30 / D-7 / D-Day)
//   Pro+          : + 면책 / 감액 / 생일 알림

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Save, Crown, BellRing, Calendar, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';

interface CustomerPolicyFields {
    name?: string;
    phone?: string | null;
    birth_date?: string | null;
    insurer?: string | null;
    product_name?: string | null;
    enrollment_date?: string | null;
    exemption_end_date?: string | null;
    reduction_end_date?: string | null;
    renewal_date?: string | null;
    policy_memo?: string | null;
}

interface Props {
    customerId: string;
    customer: CustomerPolicyFields;
}

// enrollment_date + N일 → ISO date (YYYY-MM-DD)
function addDays(iso: string, days: number): string {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function daysUntil(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const target = new Date(iso + 'T00:00:00Z').getTime();
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export default function PolicyCard({ customerId, customer }: Props) {
    const { isFeatureEnabled, plan } = useSubscription();
    const renewalEnabled = isFeatureEnabled('crm_renewal_notify');
    const fullEnabled = isFeatureEnabled('crm_full');

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // form state
    const [insurer, setInsurer] = useState(customer.insurer || '');
    const [productName, setProductName] = useState(customer.product_name || '');
    const [enrollmentDate, setEnrollmentDate] = useState(customer.enrollment_date || '');
    const [exemptionEnd, setExemptionEnd] = useState(customer.exemption_end_date || '');
    const [reductionEnd, setReductionEnd] = useState(customer.reduction_end_date || '');
    const [renewalDate, setRenewalDate] = useState(customer.renewal_date || '');
    const [memo, setMemo] = useState(customer.policy_memo || '');
    const [phone, setPhone] = useState(customer.phone || '');
    const [birthDate, setBirthDate] = useState(customer.birth_date || '');

    // 가입일 변경 시 면책/감액 비어 있으면 자동 추정
    useEffect(() => {
        if (!enrollmentDate) return;
        if (!exemptionEnd) setExemptionEnd(addDays(enrollmentDate, 90));
        if (!reductionEnd) setReductionEnd(addDays(enrollmentDate, 365));
    }, [enrollmentDate]);

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`/api/customers/${customerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurer, product_name: productName,
                    enrollment_date: enrollmentDate || null,
                    exemption_end_date: exemptionEnd || null,
                    reduction_end_date: reductionEnd || null,
                    renewal_date: renewalDate || null,
                    policy_memo: memo,
                    phone, birth_date: birthDate || null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMsg({ type: 'ok', text: '저장됐어요. 다음 알림 일정에 반영됩니다.' });
                setEditing(false);
            } else {
                setMsg({ type: 'err', text: data.error || '저장 실패' });
            }
        } catch (err) {
            setMsg({ type: 'err', text: (err as Error).message || '저장 실패' });
        } finally {
            setSaving(false);
        }
    };

    const hasAnyDate = enrollmentDate || renewalDate || exemptionEnd || reductionEnd;

    if (!editing && !hasAnyDate) {
        // 빈 상태 — 입력 유도
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        보험 가입 정보
                        {plan.slug === 'free' && (
                            <Badge variant="outline" className="text-[10px]">Basic+ 알림</Badge>
                        )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                        가입일·갱신일을 입력하면 보비가 적절한 시점에 고객에게 자동으로 알림톡을 보냅니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button size="sm" onClick={() => setEditing(true)}>
                        보험 정보 입력하기
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        보험 가입 정보
                    </CardTitle>
                    <CardDescription className="text-xs">
                        가입일을 기준으로 면책 종료일은 90일, 감액 종료일은 1년이 자동 입력됩니다. 상품에 따라 직접 수정 가능.
                    </CardDescription>
                </div>
                {!editing && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        편집
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {editing ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <Label className="text-xs">보험사</Label>
                                <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="예: 삼성화재" />
                            </div>
                            <div>
                                <Label className="text-xs">상품명</Label>
                                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="예: 다이렉트 통합보험" />
                            </div>
                            <div>
                                <Label className="text-xs">가입일</Label>
                                <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">갱신일</Label>
                                <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">면책 종료일 (기본 +90일)</Label>
                                <Input type="date" value={exemptionEnd} onChange={(e) => setExemptionEnd(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">감액 종료일 (기본 +1년)</Label>
                                <Input type="date" value={reductionEnd} onChange={(e) => setReductionEnd(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">고객 휴대폰</Label>
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" />
                            </div>
                            <div>
                                <Label className="text-xs">생년월일 (생일 알림)</Label>
                                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">메모</Label>
                            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="특약·연락 노트 등" />
                        </div>
                        {msg && (
                            <p className={`text-xs px-3 py-2 rounded ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {msg.text}
                            </p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                                취소
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                저장
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <PolicyRow label="보험사" value={insurer} />
                            <PolicyRow label="상품명" value={productName} />
                            <PolicyRow label="가입일" value={enrollmentDate} />
                            <PolicyRow label="갱신일" value={renewalDate} dDay={daysUntil(renewalDate)} />
                            <PolicyRow label="면책 종료일" value={exemptionEnd} dDay={daysUntil(exemptionEnd)} />
                            <PolicyRow label="감액 종료일" value={reductionEnd} dDay={daysUntil(reductionEnd)} />
                        </div>
                        {memo && (
                            <p className="text-xs text-gray-700 bg-gray-50 rounded p-2 leading-relaxed">{memo}</p>
                        )}

                        {/* 알림 안내 */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-3 text-xs space-y-1.5">
                            <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                                <BellRing className="w-3.5 h-3.5" /> 자동 알림 일정
                            </p>
                            <NotifyLine
                                ok={renewalEnabled && !!renewalDate}
                                lockMsg={!renewalEnabled ? 'Basic 이상 플랜' : !renewalDate ? '갱신일 미입력' : null}
                                label="갱신 알림"
                                detail="D-30 / D-7 / D-Day"
                            />
                            <NotifyLine
                                ok={fullEnabled && !!exemptionEnd}
                                lockMsg={!fullEnabled ? 'Pro 이상 플랜' : !exemptionEnd ? '면책 종료일 미입력' : null}
                                label="면책 종료 알림"
                                detail="D-3 / D-Day"
                            />
                            <NotifyLine
                                ok={fullEnabled && !!reductionEnd}
                                lockMsg={!fullEnabled ? 'Pro 이상 플랜' : !reductionEnd ? '감액 종료일 미입력' : null}
                                label="감액 종료 알림"
                                detail="D-7 / D-Day"
                            />
                            <NotifyLine
                                ok={fullEnabled && !!birthDate}
                                lockMsg={!fullEnabled ? 'Pro 이상 플랜' : !birthDate ? '생년월일 미입력' : null}
                                label="생일 알림"
                                detail="당일 오전"
                            />
                        </div>

                        {!fullEnabled && (
                            <Link
                                href="/dashboard/subscribe?plan=pro"
                                className="block rounded-md border border-brand-200 bg-brand-50 p-3 text-xs hover:bg-brand-100 transition"
                            >
                                <p className="font-semibold text-brand-700 flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> Pro로 업그레이드
                                </p>
                                <p className="text-gray-600 mt-0.5">
                                    면책·감액·생일 + 가입제안서 PDF 자동 파싱이 활성화됩니다.
                                </p>
                            </Link>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function PolicyRow({ label, value, dDay }: { label: string; value: string; dDay?: number | null }) {
    return (
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded">
            <span className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {label}
            </span>
            <span className="text-xs text-gray-900 font-medium tabular-nums">
                {value || <span className="text-gray-400">-</span>}
                {dDay != null && dDay >= 0 && dDay <= 60 && (
                    <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1">
                        D-{dDay}
                    </span>
                )}
            </span>
        </div>
    );
}

function NotifyLine({
    ok,
    lockMsg,
    label,
    detail,
}: {
    ok: boolean;
    lockMsg: string | null;
    label: string;
    detail: string;
}) {
    return (
        <p className="flex items-center gap-1.5 text-[11px]">
            {ok ? <Sparkles className="w-3 h-3 text-emerald-600" /> : <Crown className="w-3 h-3 text-gray-400" />}
            <span className={ok ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
            <span className="text-gray-400">— {detail}</span>
            {lockMsg && <span className="ml-auto text-gray-400">({lockMsg})</span>}
        </p>
    );
}
