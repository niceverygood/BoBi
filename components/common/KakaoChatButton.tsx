'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { openExternal } from '@/lib/open-external';

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xezBuX/chat';

export default function KakaoChatButton() {
    const [mounted, setMounted] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // hydration 불일치 방지: 클라이언트 마운트 후에만 렌더링
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {showTooltip && (
                <div className="bg-white rounded-xl shadow-lg border px-4 py-3 max-w-[200px] animate-fade-in">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">상담 문의</p>
                        <button onClick={() => setShowTooltip(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">카카오톡으로 편하게 문의하세요</p>
                </div>
            )}
            <button
                onClick={() => openExternal(KAKAO_CHANNEL_URL)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-14 h-14 bg-[#FEE500] hover:bg-[#FADA0A] rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                aria-label="카카오톡 상담"
            >
                <MessageCircle className="w-7 h-7 text-[#3C1E1E]" />
            </button>
        </div>
    );
}
