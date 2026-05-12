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

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, Save, Crown, BellRing, Calendar, Sparkles, Upload, FileText, AlertCircle, Check, X } from 'lucide-react';
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

    // PDF AI 추출 상태
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<{
        insurer: string;
        product_name: string;
        enrollment_date: string;
        exemption_end_date: string;
        reduction_end_date: string;
        renewal_date: string;
        policy_memo: string;
        confidence?: 'high' | 'medium' | 'low';
        notes?: string | null;
    } | null>(null);

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

    // PDF 업로드 → AI 추출
    //
    // ⚠️ 회귀 노트 (이종인 5/11): Vercel 서버리스 함수는 요청 body 4.5MB 한도가 있어
    //    그 초과 시 우리 라우트가 실행되기 전에 인프라가 "Request Entity Too Large" HTML 응답.
    //    그러면 res.json() 실패 → "Unexpected token 'R'..." 에러가 사용자에게 그대로 노출됨.
    //    해결: ① 클라이언트에서 사전 사이즈 검증 (4MB 권장 한도) ② JSON 파싱 안전화.
    //    근본 해결: Supabase Storage 우회 업로드 (후속 PR).
    const PDF_SOFT_LIMIT_BYTES = 4 * 1024 * 1024;   // Vercel body 한도 안쪽 안전 마진
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ① 사전 사이즈 검증 — Vercel 4.5MB 한도 도달 전에 친절히 차단
        if (file.size > PDF_SOFT_LIMIT_BYTES) {
            const mb = (file.size / 1024 / 1024).toFixed(1);
            setAiError(
                `PDF 크기가 ${mb}MB로 한도(4MB)를 초과했습니다. ` +
                `가입 제안서 PDF를 압축하시거나, 직접 입력 버튼으로 보험 정보를 입력해주세요. ` +
                `(더 큰 파일을 지원하는 업로드 기능은 곧 추가됩니다.)`,
            );
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setAiLoading(true);
        setAiError(null);
        setAiResult(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`/api/customers/${customerId}/extract-policy-from-pdf`, {
                method: 'POST',
                body: fd,
            });

            // ② JSON 파싱 안전화 — 응답이 JSON 아니면(인프라 에러 응답 등) 친절한 메시지로 변환
            let data: { error?: string; extracted?: Record<string, unknown> } = {};
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try { data = await res.json(); } catch { /* fallthrough */ }
            } else {
                const text = await res.text();
                // Vercel 인프라 에러 응답 매핑
                if (res.status === 413 || /entity too large/i.test(text)) {
                    setAiError('PDF가 너무 큽니다. 4MB 이하 PDF로 다시 시도해주세요.');
                    return;
                }
                if (res.status === 504 || /timeout/i.test(text)) {
                    setAiError('AI 분석이 시간 내에 끝나지 않았습니다. 페이지 수가 많은 PDF는 일부만 잘라 업로드해보세요.');
                    return;
                }
                setAiError(`서버 오류 (${res.status}): 잠시 후 다시 시도해주세요.`);
                return;
            }

            if (!res.ok) {
                setAiError(data.error || 'AI 분석 실패');
            } else if (data.extracted) {
                const ex = data.extracted as Record<string, unknown>;
                setAiResult({
                    insurer: (ex.insurer as string) || '',
                    product_name: (ex.product_name as string) || '',
                    enrollment_date: (ex.enrollment_date as string) || '',
                    exemption_end_date: (ex.exemption_end_date as string) || '',
                    reduction_end_date: (ex.reduction_end_date as string) || '',
                    renewal_date: (ex.renewal_date as string) || '',
                    policy_memo: (ex.policy_memo as string) || '',
                    confidence: ex.confidence as 'high' | 'medium' | 'low' | undefined,
                    notes: ex.notes as string | undefined,
                });
                // 편집 모드로 들어가서 사용자가 검수 가능하도록
                setEditing(true);
            } else {
                setAiError('AI 분석 결과가 비어 있습니다.');
            }
        } catch (err) {
            // 네트워크 단계 실패 (서버 도달 전)
            setAiError(
                /unexpected token/i.test((err as Error).message)
                    ? 'PDF 업로드에 실패했습니다. 파일 크기가 너무 크거나 형식이 올바르지 않을 수 있습니다.'
                    : ((err as Error).message || 'AI 분석 실패'),
            );
        } finally {
            setAiLoading(false);
            // 같은 파일 재업로드 가능하도록 초기화
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // AI 추출 결과를 form에 적용 (사용자 클릭 시)
    const applyAiResult = () => {
        if (!aiResult) return;
        if (aiResult.insurer) setInsurer(aiResult.insurer);
        if (aiResult.product_name) setProductName(aiResult.product_name);
        if (aiResult.enrollment_date) setEnrollmentDate(aiResult.enrollment_date);
        if (aiResult.exemption_end_date) setExemptionEnd(aiResult.exemption_end_date);
        if (aiResult.reduction_end_date) setReductionEnd(aiResult.reduction_end_date);
        if (aiResult.renewal_date) setRenewalDate(aiResult.renewal_date);
        if (aiResult.policy_memo) setMemo(aiResult.policy_memo);
        setMsg({ type: 'ok', text: 'AI 추출 결과가 입력란에 채워졌습니다. 확인하고 저장해주세요.' });
        setAiResult(null);
    };

    const hasAnyDate = enrollmentDate || renewalDate || exemptionEnd || reductionEnd;

    // 공통 PDF 업로드 input + 검수 알림 (모든 상태에서 렌더)
    const pdfInput = (
        <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            onChange={handlePdfUpload}
            className="hidden"
        />
    );

    const aiAlert = aiResult ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 dark:bg-violet-950/30 dark:border-violet-900/50 p-3 space-y-2">
            <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs space-y-1">
                    <p className="font-semibold text-violet-900 dark:text-violet-200">
                        AI가 PDF에서 추출했습니다
                        {aiResult.confidence === 'high' && <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">신뢰도 높음</span>}
                        {aiResult.confidence === 'medium' && <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">일부 추정</span>}
                        {aiResult.confidence === 'low' && <span className="ml-2 text-[10px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded">검수 필요</span>}
                    </p>
                    <ul className="text-violet-800 dark:text-violet-300 space-y-0.5">
                        {aiResult.insurer && <li>· 보험사: <strong>{aiResult.insurer}</strong></li>}
                        {aiResult.product_name && <li>· 상품: <strong>{aiResult.product_name}</strong></li>}
                        {aiResult.enrollment_date && <li>· 가입일: <strong>{aiResult.enrollment_date}</strong></li>}
                        {aiResult.exemption_end_date && <li>· 면책 종료: <strong>{aiResult.exemption_end_date}</strong></li>}
                        {aiResult.reduction_end_date && <li>· 감액 종료: <strong>{aiResult.reduction_end_date}</strong></li>}
                        {aiResult.renewal_date && <li>· 갱신일: <strong>{aiResult.renewal_date}</strong></li>}
                        {aiResult.policy_memo && <li>· 보장: <span className="text-[11px]">{aiResult.policy_memo}</span></li>}
                    </ul>
                    {aiResult.notes && (
                        <p className="text-[11px] text-violet-700 dark:text-violet-400 mt-1 italic flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            {aiResult.notes}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" onClick={applyAiResult} className="h-7 text-xs">
                    <Check className="w-3 h-3 mr-1" /> 입력란에 적용
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAiResult(null)} className="h-7 text-xs">
                    <X className="w-3 h-3 mr-1" /> 취소
                </Button>
            </div>
        </div>
    ) : null;

    const aiErrorAlert = aiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50/60 dark:bg-red-950/30 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
                <p className="font-semibold text-red-900 dark:text-red-200">AI 분석 실패</p>
                <p className="text-red-700 dark:text-red-300">{aiError}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAiError(null)} className="h-6 px-2">
                <X className="w-3 h-3" />
            </Button>
        </div>
    ) : null;

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
                <CardContent className="space-y-3">
                    {pdfInput}
                    {aiErrorAlert}
                    {aiAlert}
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setEditing(true)}>
                            <Calendar className="w-3.5 h-3.5 mr-1" /> 직접 입력
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={aiLoading}
                            className="bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200"
                        >
                            {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                            가입 제안서 PDF로 자동 채우기
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> PDF 업로드 시 AI가 보험사·가입일·면책·감액·보장 자동 추출 · 4MB 이하
                    </p>
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
                    <div className="flex flex-col gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                            편집
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={aiLoading}
                            className="bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200"
                        >
                            {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                            PDF 자동 채우기
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {pdfInput}
                {aiErrorAlert}
                {aiAlert}
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
