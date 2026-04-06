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
            {/* 선물 플로팅 버튼 — 딸랑이 애니메이션 */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-bounce"
                    style={{ animationDuration: '2s', animationIterationCount: 'infinite' }}
                    aria-label="친구 초대"
                >
                    <Gift className="w-6 h-6" />
                    {/* 빨간 알림 뱃지 */}
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white">!</span>
                </button>
            )}

            {/* 팝업 카드 */}
            {open && (
                <div className="fixed bottom-24 right-6 z-40 w-[320px] animate-fade-in">
                    <Card className="border-0 shadow-2xl overflow-hidden">
                        {/* 헤더 */}
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white relative">
                            <button onClick={handleDismiss} className="absolute top-2 right-2 text-white/70 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 mb-1">
                                <Gift className="w-5 h-5" />
                                <span className="font-bold">친구 초대 이벤트</span>
                            </div>
                            <p className="text-sm text-white/90">
                                친구를 초대하면 <strong>나는 7일</strong>, <strong>친구는 3일</strong> 무료!
                            </p>
                        </div>

                        <CardContent className="p-4 space-y-3">
                            {/* 코드 */}
                            {code && (
                                <div className="bg-slate-50 rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-muted-foreground mb-1">내 초대 코드</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xl font-black tracking-[0.3em] text-[#1a56db]">{code}</span>
                                        <button onClick={handleCopy} className="text-muted-foreground hover:text-primary">
                                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 안내 */}
                            <div className="space-y-2 text-xs text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <span className="text-amber-500 font-bold shrink-0">1.</span>
                                    <span>위 코드를 친구에게 공유하세요</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-amber-500 font-bold shrink-0">2.</span>
                                    <span>친구가 가입 후 설정에서 코드를 입력하면</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-amber-500 font-bold shrink-0">3.</span>
                                    <span><strong>나에게 7일</strong>, <strong>친구에게 3일</strong> 베이직 플랜 무료!</span>
                                </div>
                            </div>

                            <p className="text-[10px] text-center text-muted-foreground">최대 5명 초대 가능 · 최대 35일 무료</p>

                            <Link href="/dashboard/settings" onClick={() => setOpen(false)}>
                                <Button className="w-full bg-[#1a56db] hover:bg-[#1a56db]/90 text-sm" size="sm">
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
