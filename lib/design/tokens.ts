// lib/design/tokens.ts
// BoBi 디자인 시스템 v2 — Pure Monochrome.
//
// 원칙:
// 1. 컬러는 0개 (UI 크롬에 의미 없는 색 사용 금지)
// 2. 강조/식별은 텍스트 + 아이콘 + 굵기·크기·간격으로
// 3. 단 하나 예외: 위험 액션(환불/취소 버튼)은 red-600 한 가지만
// 4. 의료 도메인 액센트(teal)도 일단 보류 — 1차 안정화 후 별도 PR 검토
//
// 색이 정말 필요한 경우:
// - 진단·차트 시각화 (결과 화면)
// - 위험 행동 경고 (모달, 토스트의 destructive)
// → 그 경우에만 직접 className으로 색 지정

import {
    Check,
    X,
    RotateCcw,
    AlertCircle,
    Clock,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';

// ─── 결제수단 (Provider) ────────────────────────────────
// 색 식별 폐기 — 라벨로만 구분. 점은 시각 리듬용 회색 단일색.
export type ProviderKey = 'kakaopay' | 'tosspayments' | 'inicis' | 'apple_iap' | 'google_play' | 'card' | 'all';

export const PROVIDER_LABEL: Record<ProviderKey, string> = {
    kakaopay:     '카카오페이',
    tosspayments: '토스페이먼츠',
    inicis:       'KG이니시스',
    apple_iap:    'Apple 앱결제',
    google_play:  'Google 앱결제',
    card:         '신용카드',
    all:          '전체',
};

/**
 * Provider 점 색상 — 모두 회색 (#9CA3AF, gray-400).
 * 사용처에서 단일 색으로 표시. 식별은 라벨 텍스트가 담당.
 */
export const PROVIDER_DOT_COLOR_NEUTRAL = '#9CA3AF';

// ─── 상태 (Status) ──────────────────────────────────────
// 색 식별 폐기 — 아이콘 + 텍스트로 구분. 배지 배경은 모두 회색 50.
type StatusKey = 'paid' | 'success' | 'active' | 'cancelled' | 'refunded' | 'failed' | 'pending' | 'trialing' | 'past_due';

const STATUS_META: Record<string, { label: string; icon: LucideIcon }> = {
    paid:      { label: '결제완료', icon: Check },
    success:   { label: '완료',     icon: Check },
    active:    { label: '활성',     icon: Check },
    cancelled: { label: '취소',     icon: X },
    refunded:  { label: '환불',     icon: RotateCcw },
    failed:    { label: '실패',     icon: AlertCircle },
    pending:   { label: '대기',     icon: Clock },
    trialing:  { label: '체험중',   icon: Sparkles },
    past_due:  { label: '결제실패', icon: AlertCircle },
};

/** 상태 → 회색 통일 배지 클래스 */
export function statusBadgeClass(_s: string) {
    return 'bg-gray-50 text-gray-700 border-gray-200';
}

/** 상태 한국어 라벨 (cancelledBy 분기 포함) */
export function statusLabel(s: string, cancelledBy?: string | null) {
    if (s === 'cancelled') return cancelledBy === 'admin' ? '관리자 취소' : '취소';
    return STATUS_META[s]?.label || s;
}

/** 상태에 해당하는 아이콘 — 없으면 null */
export function statusIcon(s: string): LucideIcon | null {
    return STATUS_META[s]?.icon || null;
}

// ─── Provider helper ───────────────────────────────────

export function inferProvider(value: unknown): ProviderKey {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('kakao')) return 'kakaopay';
    if (raw.includes('toss'))  return 'tosspayments';
    if (raw.includes('inicis')) return 'inicis';
    if (raw.includes('apple') || raw === 'ios' || raw === 'app_store')   return 'apple_iap';
    if (raw.includes('google') || raw === 'android' || raw === 'play_store') return 'google_play';
    if (raw.includes('card'))  return 'card';
    return 'card';
}

// ─── 라운드/타이포 ─────────────────────────────────────

export const radius = {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    pill: '9999px',
} as const;

/** 숫자/금액에는 tabular-nums + font-mono. */
export const NUMERIC_CLASS = 'font-mono tabular-nums';

// ─── Deprecated (PR #19/#20에서 import. v2에서 단일 회색으로 수렴) ────
/** @deprecated v2: 모든 provider가 단일 회색. PROVIDER_DOT_COLOR_NEUTRAL 직접 사용 권장. */
export const PROVIDER_DOT_COLOR: Record<ProviderKey, string> = {
    kakaopay: PROVIDER_DOT_COLOR_NEUTRAL,
    tosspayments: PROVIDER_DOT_COLOR_NEUTRAL,
    inicis: PROVIDER_DOT_COLOR_NEUTRAL,
    apple_iap: PROVIDER_DOT_COLOR_NEUTRAL,
    google_play: PROVIDER_DOT_COLOR_NEUTRAL,
    card: PROVIDER_DOT_COLOR_NEUTRAL,
    all: PROVIDER_DOT_COLOR_NEUTRAL,
};
