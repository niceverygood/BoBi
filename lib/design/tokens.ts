// lib/design/tokens.ts
// BoBi 디자인 시스템 — Toss 스타일 모노크롬 + 의료 도메인 teal 액센트.
//
// 사용 원칙:
// 1. 페이지 배경/카드/표 → neutral 회색 스케일만
// 2. 강조(클릭/액션) → brand (단일 indigo)
// 3. 의료·진료·건강 분석 컴포넌트만 → medical (teal)
// 4. 상태(status) → soft tint 배지 (saturated 색 사용 금지)
// 5. 결제수단(provider)은 카드 색 X, 작은 컬러 점만 (4px)

// ─── 컬러 ────────────────────────────────────────────────

/** 중립 회색 — 페이지·카드·텍스트의 95%를 차지 */
export const neutral = {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
} as const;

/** 브랜드 — 클릭/액션/링크에만 사용 (Indigo) */
export const brand = {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
} as const;

/** 의료 도메인 액센트 — 진료·건강 분석 컴포넌트에만 (Teal) */
export const medical = {
    50: '#F0FDFA',
    100: '#CCFBF1',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
} as const;

/** 상태 컬러 — 모두 soft tint (saturated 사용 금지) */
export const status = {
    success: { bg: '#DCFCE7', text: '#14532D', border: '#BBF7D0' }, // emerald
    warning: { bg: '#FEF3C7', text: '#78350F', border: '#FDE68A' }, // amber
    danger:  { bg: '#FEE2E2', text: '#7F1D1D', border: '#FECACA' }, // red
    info:    { bg: '#DBEAFE', text: '#1E3A8A', border: '#BFDBFE' }, // blue
    neutral: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }, // gray
} as const;

// ─── 결제수단 (Provider) ────────────────────────────────
// 카드 색 X. 작은 컬러 점(4px)으로만 식별. label은 그대로 유지.
export type ProviderKey = 'kakaopay' | 'tosspayments' | 'inicis' | 'apple_iap' | 'google_play' | 'card' | 'all';

export const PROVIDER_DOT_COLOR: Record<ProviderKey, string> = {
    kakaopay:     '#FFCD00', // 카카오 노랑 (점 4px만)
    tosspayments: '#3182F6', // 토스 파랑
    inicis:       '#7C3AED', // 보라
    apple_iap:    '#525252', // 무채색 (검정 → 다른 점들과 톤 일치 위해 회색 6)
    google_play:  '#34A853', // 구글 초록
    card:         '#9CA3AF', // 회색
    all:          '#6B7280',
};

export const PROVIDER_LABEL: Record<ProviderKey, string> = {
    kakaopay:     '카카오페이',
    tosspayments: '토스페이먼츠',
    inicis:       'KG이니시스',
    apple_iap:    'Apple 앱결제',
    google_play:  'Google 앱결제',
    card:         '신용카드',
    all:          '전체',
};

// ─── 헬퍼 ────────────────────────────────────────────────

/** 결제 상태 → soft tint 배지 클래스. 사용처: badge variant="status" 와 함께. */
export function statusBadgeClass(s: 'paid' | 'success' | 'cancelled' | 'refunded' | 'failed' | 'pending' | string) {
    const map: Record<string, string> = {
        paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
        success:   'bg-emerald-50 text-emerald-700 border-emerald-200',
        active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
        cancelled: 'bg-red-50 text-red-700 border-red-200',
        refunded:  'bg-amber-50 text-amber-700 border-amber-200',
        failed:    'bg-red-50 text-red-700 border-red-200',
        pending:   'bg-blue-50 text-blue-700 border-blue-200',
        trialing:  'bg-blue-50 text-blue-700 border-blue-200',
        past_due:  'bg-amber-50 text-amber-700 border-amber-200',
    };
    return map[s] || 'bg-gray-50 text-gray-700 border-gray-200';
}

/** 결제 상태 한국어 라벨 */
export function statusLabel(s: string, cancelledBy?: string | null) {
    if (s === 'paid' || s === 'success') return '결제완료';
    if (s === 'cancelled') return cancelledBy === 'admin' ? '관리자 취소' : '본인 취소';
    if (s === 'refunded') return '환불';
    if (s === 'failed')   return '실패';
    if (s === 'pending')  return '대기';
    if (s === 'active')   return '활성';
    if (s === 'trialing') return '체험중';
    if (s === 'past_due') return '결제실패';
    return s;
}

/** payment_method/provider 문자열을 정규화된 ProviderKey로 매핑 */
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

// ─── 라운드/그림자/타이포 ──────────────────────────────

export const radius = {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    pill: '9999px',
} as const;

/** 그림자는 최소화 — 1단계만 사용 권장 */
export const shadow = {
    none: 'shadow-none',
    sm:   'shadow-sm',
    md:   'shadow',
} as const;

/** 숫자/금액에는 tabular-nums + font-mono. 이걸 className으로 쓰면 됨. */
export const NUMERIC_CLASS = 'font-mono tabular-nums';
