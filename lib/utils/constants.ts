// lib/utils/constants.ts

export type PlanSlug = 'free' | 'basic' | 'pro' | 'team';

// 관리자 이메일 목록
export const ADMIN_EMAILS = ['niceverygood1@gmail.com'] as const;

export interface PlanInfo {
    name: string;
    slug: PlanSlug;
    analysisLimit: number; // -1 = unlimited
    price: string;
    priceMonthly: number;
    priceYearly: number;
    maxFileSizeMb: number;
    maxCustomers: number;  // -1 = unlimited
    historyDays: number;   // -1 = unlimited
    features: string[];
    lockedFeatures: string[];
    recommended?: boolean;
}

export const PLAN_LIMITS: Record<PlanSlug, PlanInfo> = {
    free: {
        name: '무료',
        slug: 'free',
        analysisLimit: 3,
        price: '0원',
        priceMonthly: 0,
        priceYearly: 0,
        maxFileSizeMb: -1,
        maxCustomers: 3,
        historyDays: 7,
        features: ['AI 고지사항 분석', '월 3건 분석', 'PDF 5MB 이하'],
        lockedFeatures: ['가입가능 상품 매칭', '보험금 청구 분석', '결과 PDF 다운로드'],
    },
    basic: {
        name: '베이직',
        slug: 'basic',
        analysisLimit: 30,
        price: '29,900원/월',
        priceMonthly: 29900,
        priceYearly: 298800,
        maxFileSizeMb: -1,
        maxCustomers: 50,
        historyDays: 90,
        recommended: true,
        features: ['AI 고지사항 분석', '가입가능 상품 매칭', '월 30건 분석', 'PDF 20MB 이하', '결과 PDF 다운로드', '분석 이력 90일 보관'],
        lockedFeatures: ['보험금 청구 분석', '맞춤 보험사 상품DB'],
    },
    pro: {
        name: '프로',
        slug: 'pro',
        analysisLimit: 100,
        price: '59,900원/월',
        priceMonthly: 59900,
        priceYearly: 598800,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        features: ['AI 고지사항 분석', '가입가능 상품 매칭', '보험금 청구 분석', '월 100건 분석', 'PDF 50MB 이하', '결과 PDF 다운로드', '분석 이력 무제한 보관', '맞춤 보험사 상품DB (3개사)', '카톡 채널 우선 지원'],
        lockedFeatures: [],
    },
    team: {
        name: '팀',
        slug: 'team',
        analysisLimit: -1,
        price: '별도 협의',
        priceMonthly: 0,
        priceYearly: 0,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        features: ['프로 플랜의 모든 기능', '무제한 분석', '최대 50명 팀원', '관리자 대시보드', '전담 매니저 배정'],
        lockedFeatures: [],
    },
};

export const COLORS = {
    primary: '#1B4F72',
    secondary: '#3498DB',
    success: '#27AE60',
    warning: '#F39C12',
    danger: '#E74C3C',
    info: '#2980B9',
} as const;

export const STEPS = [
    {
        id: 1,
        title: '고지사항 분석',
        description: 'PDF 업로드 후 AI가 고지사항을 자동 정리',
        path: '/dashboard/analyze',
    },
    {
        id: 2,
        title: '상품 판단',
        description: '가입 가능한 보험상품을 자동 판단',
        path: '/dashboard/products',
    },
    {
        id: 3,
        title: '청구 안내',
        description: '약관 기반 보험금 청구 가능여부 안내',
        path: '/dashboard/claims',
    },
] as const;

export const SIDEBAR_ITEMS = [
    { title: '대시보드', href: '/dashboard', icon: 'LayoutDashboard' },
    { title: '새 분석', href: '/dashboard/analyze', icon: 'FileSearch' },
    { title: '분석 이력', href: '/dashboard/history', icon: 'History' },
    { title: '요금제', href: '/pricing', icon: 'CreditCard' },
    { title: '설정', href: '/dashboard/settings', icon: 'Settings' },
] as const;

export const PDF_FILE_TYPES = [
    { id: 'basic_info', label: '기본진료정보', description: '진료시작일, 병의원, 진단과, 입원/외래, 주상병코드 등' },
    { id: 'prescription', label: '처방조제정보', description: '약품명, 성분명, 투약량, 투여횟수, 투약일수' },
    { id: 'detail_treatment', label: '세부진료정보', description: '진료내역, 코드명, 투약량, 투여횟수, 투약일수' },
] as const;
