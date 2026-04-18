'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Link2, FileText, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import type { FutureMeResult } from '@/types/future-me';

type Template = 'A_LINK' | 'D_SUMMARY';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportId: string | null;
    result: FutureMeResult;
    defaultPhone?: string;
    defaultCustomerName?: string;
}

interface SendResult {
    ok: boolean;
    template: Template;
    shareUrl?: string;
}

const PHONE_RE = /^01[016789]\d{7,8}$/;

function fmtMan(v: number): string {
    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}억`;
    return `${v.toLocaleString()}만`;
}

export default function SendKakaoDialog({
    open,
    onOpenChange,
    reportId,
    result,
    defaultPhone = '',
    defaultCustomerName = '',
}: Props) {
    const [template, setTemplate] = useState<Template>('A_LINK');
    const [phone, setPhone] = useState(defaultPhone);
    const [customerName, setCustomerName] = useState(defaultCustomerName || result.customerName || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendResult, setSendResult] = useState<SendResult | null>(null);

    const phoneDigits = phone.replace(/\D/g, '');
    const phoneValid = PHONE_RE.test(phoneDigits);
    const reportSaved = !!reportId;

    const handleSend = async () => {
        if (!reportId) {
            setError('리포트가 저장되지 않아 발송할 수 없습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const data = await apiFetch<SendResult>('/api/future-me/send-kakao', {
                method: 'POST',
                body: {
                    reportId,
                    template,
                    receiverPhone: phoneDigits,
                    receiverName: customerName || undefined,
                    ttlDays: 7,
                },
                timeout: 30000,
            });
            setSendResult(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            setSendResult(null);
            setError(null);
        }
        onOpenChange(next);
    };

    // D_SUMMARY 미리보기 데이터
    const scenarioMap = new Map(result.scenarios.map(s => [s.type, s]));
    const a = scenarioMap.get('complement');
    const b = scenarioMap.get('delay');
    const c = scenarioMap.get('nothing');
    const top = result.riskSummary.slice(0, 3).map(r => r.category).join(', ') || '없음';
    const highCount = result.riskSummary.filter(r => r.level === '고위험').length;
    const outcome = highCount >= 2 ? '인수거절 가능성 높음' : highCount >= 1 ? '조건부 인수' : '인수 가능성 높음';
    const premiumMul = highCount >= 2 ? '1.6' : highCount >= 1 ? '1.3' : '1.1';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-yellow-600" />
                        카톡으로 리포트 보내기
                    </DialogTitle>
                    <DialogDescription>
                        고객 휴대폰으로 알림톡 발송 (실패 시 SMS 자동 대체)
                    </DialogDescription>
                </DialogHeader>

                {sendResult?.ok ? (
                    <div className="space-y-3 py-2">
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <Check className="w-4 h-4" />
                            <p className="text-sm font-semibold">알림톡이 발송되었습니다.</p>
                        </div>
                        {sendResult.shareUrl && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">공유 링크 (7일간 유효)</p>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={sendResult.shareUrl}
                                        className="flex-1 text-xs px-2 py-1.5 rounded border bg-muted/30 font-mono"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => navigator.clipboard.writeText(sendResult.shareUrl!)}
                                    >
                                        복사
                                    </Button>
                                </div>
                            </div>
                        )}
                        <Button onClick={() => handleClose(false)} className="w-full mt-2">
                            닫기
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {/* 템플릿 선택 */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground">발송 유형</label>
                            <div className="grid grid-cols-2 gap-2 mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => setTemplate('A_LINK')}
                                    className={`text-left p-3 rounded-lg border-2 transition-all ${template === 'A_LINK'
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-muted hover:border-muted-foreground/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-sm font-bold">링크 전송</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        리포트 도착 알림 + 모바일 웹 링크
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTemplate('D_SUMMARY')}
                                    className={`text-left p-3 rounded-lg border-2 transition-all ${template === 'D_SUMMARY'
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-muted hover:border-muted-foreground/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-sm font-bold">요약 전송</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        시나리오별 자기부담 본문 포함
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* 미리보기 */}
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs">
                            <p className="font-semibold text-yellow-900 mb-1">📨 미리보기</p>
                            {template === 'A_LINK' ? (
                                <pre className="whitespace-pre-wrap font-sans text-yellow-900 leading-relaxed">
{`[보비] ${customerName || '○○○'}님의 '미래의 나' 리포트가 도착했습니다.
설계사: (자동)

아래 버튼을 눌러 리포트를 확인해주세요.
링크 유효: 발송일로부터 7일

[리포트 보기 ▶]`}
                                </pre>
                            ) : (
                                <pre className="whitespace-pre-wrap font-sans text-yellow-900 leading-relaxed">
{`[보비] ${customerName || '○○○'}님 미래의 나 리포트 요약
────────────────
상위 위험 질환: ${top}
5년 후 가입 추정: ${outcome}
예상 보험료 배율: ${premiumMul}배
────────────────
시나리오별 자기부담
A 지금 보완: ${fmtMan(a?.selfPayAmount ?? 0)}원
B 5년 후: ${fmtMan(b?.selfPayAmount ?? 0)}원
C 안 함: ${fmtMan(c?.selfPayAmount ?? 0)}원`}
                                </pre>
                            )}
                        </div>

                        {/* 고객명 */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground">고객명</label>
                            <input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="홍길동"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 휴대폰 */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground">고객 휴대폰</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="010-1234-5678"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            {phone && !phoneValid && (
                                <p className="text-[10px] text-red-600 mt-1">올바른 휴대폰 번호를 입력해주세요</p>
                            )}
                        </div>

                        {!reportSaved && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                ⚠ 리포트가 DB에 저장되지 않은 상태입니다. 페이지를 새로고침하면 저장됩니다.
                            </p>
                        )}

                        {error && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                                {error}
                            </p>
                        )}

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={loading || !phoneValid || !reportSaved}
                                className="bg-yellow-400 hover:bg-yellow-500 text-black"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                발송
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
