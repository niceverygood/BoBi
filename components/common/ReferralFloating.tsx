'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, X, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ReferralFloating() {
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setMounted(true);
        // 세션에서 이미 닫은 적 있는지 확인
        if (sessionStorage.getItem('referral_dismissed')) setDismissed(true);
    }, []);

    useEffect(() => {
        if (!mounted || dismissed) return;
        // 코드 가져오기
        (async () => {
            try {
                const res = await fetch('/api/referral');
                if (res.ok) {
                    const data = await res.json();
                    setCode(data.code);
                }
            } catch { /* ignore */ }
        })();
    }, [mounted, dismissed]);

    const handleCopy = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDismiss = () => {
        setOpen(false);
        setDismissed(true);
        sessionStorage.setItem('referral_dismissed', 'true');
    };

    if (!mounted || dismissed) return null;

    return (
        <>
            {/* 선물 플로팅 버튼 — amber=주의 semantic 충돌 방지로 회색 회색화.
                노출 조건 자체(ChatBot과 동시 표시) 재검토는 별도 PR. */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-white border border-gray-200 text-gray-700 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 hover:scale-110 transition-all"
                    aria-label="친구 초대"
                >
                    <Gift className="w-6 h-6" />
                    {/* 알림 점 — 회색 베이스 위에 작은 시각 단서 */}
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gray-400 rounded-full" />
                </button>
            )}

            {/* 팝업 카드 */}
            {open && (
                <div className="fixed bottom-24 right-6 z-[60] w-[min(320px,calc(100vw-3rem))] animate-fade-in">
                    <Card className="border border-gray-200 shadow-2xl overflow-hidden">
                        {/* 헤더 — 회색 베이스 */}
                        <div className="bg-gray-50 border-b border-gray-200 p-4 relative">
                            <button onClick={handleDismiss} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 mb-1">
                                <Gift className="w-5 h-5 text-gray-700" />
                                <span className="font-bold text-gray-900">친구 초대 이벤트</span>
                            </div>
                            <p className="text-sm text-gray-700">
                                친구를 초대하면 <strong>나는 7일</strong>, <strong>친구는 3일</strong> 무료!
                            </p>
                        </div>

                        <CardContent className="p-4 space-y-3">
                            {/* 코드 */}
                            {code && (
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-gray-500 mb-1">내 초대 코드</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xl font-black tracking-[0.3em] text-brand-600">{code}</span>
                                        <button onClick={handleCopy} className="text-gray-500 hover:text-gray-700">
                                            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 안내 */}
                            <div className="space-y-2 text-xs text-gray-600">
                                <div className="flex items-start gap-2">
                                    <span className="text-gray-400 font-bold shrink-0 tabular-nums">1.</span>
                                    <span>위 코드를 친구에게 공유하세요</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-gray-400 font-bold shrink-0 tabular-nums">2.</span>
                                    <span>친구가 가입 후 설정에서 코드를 입력하면</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-gray-400 font-bold shrink-0 tabular-nums">3.</span>
                                    <span><strong>나에게 7일</strong>, <strong>친구에게 3일</strong> 베이직 플랜 무료!</span>
                                </div>
                            </div>

                            <p className="text-[10px] text-center text-gray-500">최대 5명 초대 가능 · 최대 35일 무료</p>

                            <Link href="/dashboard/settings" onClick={() => setOpen(false)}>
                                <Button className="w-full text-sm" size="sm">
                                    초대 현황 보기 <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
