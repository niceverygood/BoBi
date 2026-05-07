'use client';

// 진료정보·위험도리포트·가상영수증 공용 알림톡 발송 다이얼로그.
// future-me는 자체 데이터 모델이 너무 특화돼 별도(components/future-me/SendKakaoDialog) 유지.

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
import { Loader2, Send, Link2, FileText, Check, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

export type AlimtalkReportKind = 'medical' | 'risk-report' | 'accident-receipt';
export type AlimtalkTemplate = 'LINK' | 'SUMMARY';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    kind: AlimtalkReportKind;
    resourceId: string | null;
    defaultPhone?: string;
    defaultCustomerName?: string;
    /** 링크형 미리보기 본문 (변수 치환된 최종 텍스트) */
    previewLink: string;
    /** 요약형 미리보기 본문 (변수 치환된 최종 텍스트) */
    previewSummary: string;
}

interface SendResult {
    ok: boolean;
    template: AlimtalkTemplate;
    shareUrl?: string;
    /** 검수 미통과 등 사유로 발송 거절된 경우 */
    pending?: boolean;
    pendingMessage?: string;
}

const PHONE_RE = /^01[016789]\d{7,8}$/;

const ENDPOINT_BY_KIND: Record<AlimtalkReportKind, string> = {
    medical: '/api/medical/send-kakao',
    'risk-report': '/api/risk-report/send-kakao',
    'accident-receipt': '/api/accident-receipt/send-kakao',
};

const LABEL_BY_KIND: Record<AlimtalkReportKind, { title: string; linkLabel: string }> = {
    medical: { title: '진료정보 리포트 보내기', linkLabel: '리포트 보기' },
    'risk-report': { title: '위험도 리포트 보내기', linkLabel: '리포트 보기' },
    'accident-receipt': { title: '가상영수증 보내기', linkLabel: '영수증 보기' },
};

export default function SendAlimtalkDialog({
    open,
    onOpenChange,
    kind,
    resourceId,
    defaultPhone = '',
    defaultCustomerName = '',
    previewLink,
    previewSummary,
}: Props) {
    const [template, setTemplate] = useState<AlimtalkTemplate>('LINK');
    const [phone, setPhone] = useState(defaultPhone);
    const [customerName, setCustomerName] = useState(defaultCustomerName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendResult, setSendResult] = useState<SendResult | null>(null);

    const phoneDigits = phone.replace(/\D/g, '');
    const phoneValid = PHONE_RE.test(phoneDigits);
    const resourceReady = !!resourceId;
    const labels = LABEL_BY_KIND[kind];

    const handleSend = async () => {
        if (!resourceId) {
            setError('리포트 ID가 없어 발송할 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const data = await apiFetch<SendResult>(ENDPOINT_BY_KIND[kind], {
                method: 'POST',
                body: {
                    resourceId,
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-yellow-600" />
                        {labels.title}
                    </DialogTitle>
                    <DialogDescription>
                        고객 휴대폰으로 알림톡 발송 (실패 시 SMS 자동 대체)
                    </DialogDescription>
                </DialogHeader>

                {sendResult?.pending ? (
                    <div className="space-y-3 py-2">
                        <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold mb-1">알림톡 검수 진행 중</p>
                                <p className="text-xs leading-relaxed">
                                    {sendResult.pendingMessage || '카카오 측 템플릿 검수가 완료되면 자동으로 발송이 활성화됩니다. 검수 소요는 영업일 기준 3~5일입니다.'}
                                </p>
                            </div>
                        </div>
                        <Button onClick={() => handleClose(false)} className="w-full">
                            닫기
                        </Button>
                    </div>
                ) : sendResult?.ok ? (
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
                                    onClick={() => setTemplate('LINK')}
                                    className={`text-left p-3 rounded-lg border-2 transition-all ${template === 'LINK'
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-muted hover:border-muted-foreground/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-sm font-bold">링크 전송</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        도착 알림 + {labels.linkLabel}
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTemplate('SUMMARY')}
                                    className={`text-left p-3 rounded-lg border-2 transition-all ${template === 'SUMMARY'
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-muted hover:border-muted-foreground/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-sm font-bold">요약 전송</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-snug">
                                        주요 수치 본문 포함
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* 미리보기 */}
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs">
                            <p className="font-semibold text-yellow-900 mb-1">📨 미리보기</p>
                            <pre className="whitespace-pre-wrap font-sans text-yellow-900 leading-relaxed">
                                {template === 'LINK' ? previewLink : previewSummary}
                            </pre>
                        </div>

                        {/* 고객명 */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground">고객명</label>
                            <input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="홍길동"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                            />
                        </div>

                        {/* 휴대폰 */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground">고객 휴대폰</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="010-1234-5678"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                            />
                            {phone && !phoneValid && (
                                <p className="text-[10px] text-red-600 mt-1">올바른 휴대폰 번호를 입력해주세요</p>
                            )}
                        </div>

                        {!resourceReady && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                ⚠ 리포트 ID가 없습니다. 페이지를 새로고침해주세요.
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
                                disabled={loading || !phoneValid || !resourceReady}
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
