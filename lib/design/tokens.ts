// lib/design/tokens.ts
// BoBi 디자인 시스템 v2.1 — Monochrome + Brand Accent.
//
// 원칙:
// 1. 회색 99% + BoBi 블루 1% + semantic 1% 미만
// 2. 강조/식별은 텍스트 + 아이콘 + 굵기·크기·간격이 1차, 색은 보조
// 3. 위험 액션(환불/취소)은 red-600 단일 톤
// 4. 브랜드 블루(brand-600 = #1a56db)는 한 페이지에 5~7곳만 — 규칙은 BRAND_BLUE_USAGE 참고
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

// ─── BoBi 브랜드 블루 ──────────────────────────────────
// CSS 토큰은 app/globals.css의 @theme 블록에 동기화되어 있음.
// Tailwind 유틸리티: bg-brand-{50,100,500,600,700,800}, text-brand-*, ring-brand-*
export const BRAND_BLUE = {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#1a56db', // ★ 메인 — 로고, 활성 nav, primary CTA
    700: '#1E40AF', // hover, active press
    800: '#1E3A8A',
} as const;

/**
 * 브랜드 블루 사용 위치 화이트리스트 (참조용).
 * "이 자리에 블루를 쓰면 사용자가 무엇을 더 잘하게 되는가?" 답이 안 나오면 회색.
 *
 * 허용:
 * 1. 로고 마크 (BobiLogo)
 * 2. 활성 nav 메뉴 (bg-brand-600 text-white)
 * 3. Primary CTA 버튼 (bg-brand-600 hover:bg-brand-700)
 * 4. 인라인 링크 (text-brand-600 hover:text-brand-700 hover:underline)
 * 5. Focus ring (focus:ring-2 focus:ring-brand-600)
 * 6. (선택) 체크박스/토글 활성
 * 7. (선택) 차트 메인 시리즈 (#1a56db)
 *
 * 금지:
 * - 통계 숫자, 헤딩 텍스트, 카드 테두리/배경
 * - 본문 강조 (굵기·크기로 처리)
 * - 아이콘 배경 박스
 * - semantic 상태 (성공/경고/실패) 대체
 */
export const BRAND_BLUE_USAGE = 'see comment above' as const;

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
