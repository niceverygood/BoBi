// lib/utils/constants.ts

export type PlanSlug = 'free' | 'basic' | 'pro' | 'team' | 'business' | 'enterprise';

// 개인 플랜 (pricing 페이지 카드에 표시)
export type IndividualPlanSlug = 'free' | 'basic' | 'pro';
// 팀/조직 플랜 (팀 구독 섹션에 표시)
export type TeamPlanSlug = 'team' | 'business' | 'enterprise';

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
    // 팀 플랜 전용 필드
    includedSeats?: number;         // 포함 인원수
    extraSeatPrice?: number;        // 추가 1인당 월 가격
    maxSeats?: number;              // 최대 인원수 (-1 = 무제한)
    perSeatPrice?: number;          // 인당 환산 단가
}

export const PLAN_LIMITS: Record<PlanSlug, PlanInfo> = {
    // ── 개인 플랜 ──
    free: {
        name: '무료 체험',
        slug: 'free',
        analysisLimit: 5,
        price: '0원',
        priceMonthly: 0,
        priceYearly: 0,
        maxFileSizeMb: -1,
        maxCustomers: 5,
        historyDays: 7,
        features: [
            'AI 고지사항 분석',
            '월 5건 분석',
            'PDF 업로드 무제한 용량',
            '분석 이력 7일 보관',
        ],
        lockedFeatures: [
            '보장 분석 리포트',
            '리모델링 제안서',
            '결과 PDF 다운로드',
            '보험 자동 조회 (CODEF)',
        ],
    },
    basic: {
        name: '베이직',
        slug: 'basic',
        analysisLimit: 50,
        price: '19,900원/월',
        priceMonthly: 19900,
        priceYearly: 190800,
        maxFileSizeMb: -1,
        maxCustomers: 50,
        historyDays: 180,
        recommended: true,
        features: [
            'AI 고지사항 분석',
            '보장 분석 리포트',
            '월 50건 분석',
            'PDF 업로드 무제한 용량',
            '결과 PDF 다운로드',
            '분석 이력 6개월 보관',
            '보험 자동 조회 (CODEF)',
            '초과 시 크레딧 구매 가능',
        ],
        lockedFeatures: [
            '리모델링 제안서',
            '맞춤 보험사 상품DB',
            '우선 지원',
        ],
    },
    pro: {
        name: '프로',
        slug: 'pro',
        analysisLimit: -1,
        price: '39,900원/월',
        priceMonthly: 39900,
        priceYearly: 382800,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        features: [
            'AI 고지사항 분석',
            '보장 분석 리포트',
            '리모델링 제안서',
            '무제한 분석',
            'PDF 업로드 무제한 용량',
            '결과 PDF 다운로드',
            '분석 이력 무제한 보관',
            '보험 자동 조회 (CODEF)',
            '맞춤 보험사 상품DB',
            '카카오톡 채널 우선 지원',
        ],
        lockedFeatures: [],
    },

    // ── 팀/조직 플랜 ──
    team: {
        name: '팀',
        slug: 'team',
        analysisLimit: -1,
        price: '99,000원/월',
        priceMonthly: 99000,
        priceYearly: 950400,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        includedSeats: 5,
        extraSeatPrice: 15000,
        maxSeats: 20,
        perSeatPrice: 19800,
        features: [
            '프로 플랜의 모든 기능',
            '무제한 분석 (팀원 전체)',
            '5명 포함 (최대 20명)',
            '추가 1인당 월 15,000원',
            '팀 관리 대시보드',
            '팀원별 실적 리포트',
        ],
        lockedFeatures: [
            '전담 매니저',
            'API 연동',
        ],
    },
    business: {
        name: '비즈니스',
        slug: 'business',
        analysisLimit: -1,
        price: '590,000원/월',
        priceMonthly: 590000,
        priceYearly: 5664000,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        includedSeats: 30,
        extraSeatPrice: 17000,
        maxSeats: 100,
        perSeatPrice: 19667,
        recommended: true,
        features: [
            '프로 플랜의 모든 기능',
            '무제한 분석 (팀원 전체)',
            '30명 포함 (최대 100명)',
            '추가 1인당 월 17,000원',
            '팀 관리 대시보드',
            '팀원별 실적 리포트',
            '전담 매니저 배정',
            '온보딩 교육 지원',
        ],
        lockedFeatures: [],
    },
    enterprise: {
        name: '엔터프라이즈',
        slug: 'enterprise',
        analysisLimit: -1,
        price: '1,490,000원/월',
        priceMonthly: 1490000,
        priceYearly: 14304000,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        includedSeats: 100,
        extraSeatPrice: 12900,
        maxSeats: -1,
        perSeatPrice: 14900,
        features: [
            '프로 플랜의 모든 기능',
            '무제한 분석 (팀원 전체)',
            '100명 포함 (인원 무제한)',
            '추가 1인당 월 7,900원',
            '팀 관리 대시보드',
            '팀원별 실적 리포트',
            '전담 매니저 배정',
            '온보딩 교육 지원',
            '맞춤 API 연동',
            'SLA 99.9% 보장',
            '보험사별 커스텀 분석 룰',
        ],
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

// 분석 크레딧 팩 (구독 한도 초과 시 추가 구매용)
export interface CreditPack {
    id: string;
    name: string;
    credits: number;
    price: number;
    pricePerCredit: number;
    discount?: string;
    popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
    {
        id: 'credit_1',
        name: '1건',
        credits: 1,
        price: 990,
        pricePerCredit: 990,
    },
    {
        id: 'credit_10',
        name: '10건 팩',
        credits: 10,
        price: 7900,
        pricePerCredit: 790,
        discount: '20% 할인',
        popular: true,
    },
    {
        id: 'credit_30',
        name: '30건 팩',
        credits: 30,
        price: 19900,
        pricePerCredit: 663,
        discount: '33% 할인',
    },
];
