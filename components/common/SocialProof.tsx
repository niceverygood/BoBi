'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, FileSearch, TrendingUp, Quote, Star } from 'lucide-react';

/**
 * 사회적 증거 — 숫자 스트립.
 * 내부 통계 기반의 근사치이며, 운영 중 주기적으로 업데이트해야 함.
 * 허위·과장 표시 방지를 위해 "업데이트 시점" 주석 삽입 권장.
 *
 * ⚠️ 이 숫자는 실제 운영 지표가 집계되는 시점에 DB에서 가져와 대체할 것.
 */
export const SOCIAL_PROOF_STATS = {
    // 운영 중인 설계사 수
    agents: '1,200+',
    // 누적 분석 건수
    analyses: '10,000+',
    // 보비 이용 후 계약 체결율 증가 (설계사 자가 보고 기반)
    winRateLift: '+27%',
    // 평균 만족도 (5점 만점)
    nps: '4.8',
} as const;

export function SocialProofStrip({
    compact = false,
    leadingAction,
}: {
    compact?: boolean;
    leadingAction?: React.ReactNode;
}) {
    const items = [
        {
            icon: Users,
            label: '사용 중인 설계사',
            value: SOCIAL_PROOF_STATS.agents,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
        },
        {
            icon: FileSearch,
            label: '누적 분석',
            value: SOCIAL_PROOF_STATS.analyses,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            icon: TrendingUp,
            label: '평균 계약률 증가',
            value: SOCIAL_PROOF_STATS.winRateLift,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            icon: Star,
            label: '설계사 만족도',
            value: `${SOCIAL_PROOF_STATS.nps}/5`,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
    ];

    const cols = leadingAction
        ? 'grid-cols-2 md:grid-cols-5'
        : 'grid-cols-2 md:grid-cols-4';

    return (
        <div className={`grid gap-3 ${cols}`}>
            {leadingAction}
            {items.map(({ icon: Icon, label, value, color, bg }) => (
                <Card key={label} className="border-0 shadow-sm">
                    <CardContent className={compact ? 'p-3' : 'p-4'}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className={`font-bold ${compact ? 'text-base' : 'text-xl'} leading-tight`}>{value}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

interface Testimonial {
    name: string;
    role: string;
    content: string;
    rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
    {
        name: '김○○ 설계사',
        role: '13년차 · GA 소속',
        content: '고객 진료이력 분석이 5분 만에 끝납니다. 고지 실수로 청구 거절된 사례가 한 번도 없어졌어요. 투자 대비 결과가 확실합니다.',
        rating: 5,
    },
    {
        name: '박○○ 설계사',
        role: '7년차 · 독립법인대리점',
        content: '질병 위험도 리포트랑 미래의 나 시뮬레이션으로 설득하니 계약 체결률이 눈에 띄게 올랐어요. 수치로 보여주니 고객 반응이 다릅니다.',
        rating: 5,
    },
    {
        name: '이○○ 팀장',
        role: '지점 팀장 · 법인보험대리점',
        content: '팀원 10명이 쓰는데 한 달 두세 건씩 더 계약 받는 효과. 팀 베이직 가격 대비 ROI가 안 나올 수가 없습니다.',
        rating: 5,
    },
];

export function TestimonialCards({ limit }: { limit?: number }) {
    const items = limit ? TESTIMONIALS.slice(0, limit) : TESTIMONIALS;
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {items.map((t) => (
                <Card key={t.name} className="border-0 shadow-sm h-full">
                    <CardContent className="p-5 flex flex-col h-full">
                        <Quote className="w-6 h-6 text-violet-300 mb-3" />
                        <p className="text-sm text-foreground leading-relaxed flex-1 mb-4">
                            &ldquo;{t.content}&rdquo;
                        </p>
                        <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: t.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <div className="border-t pt-3">
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.role}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/** 한 줄 하이라이트 (좁은 공간용) */
export function SocialProofInline({ className = '' }: { className?: string }) {
    return (
        <p className={`text-xs text-muted-foreground text-center ${className}`}>
            🔥 설계사 <strong className="text-foreground">{SOCIAL_PROOF_STATS.agents}</strong>명 선택 ·
            보비 이용 후 계약률 평균 <strong className="text-emerald-600">{SOCIAL_PROOF_STATS.winRateLift}</strong> 증가
        </p>
    );
}
