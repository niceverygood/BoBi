// lib/utils/constants.ts

// ── Feature Flags ──
// 마이데이터 사업자 등록 완료 시 true로 변경
export const FEATURE_FLAGS = {
    coverage_analysis: false,  // 보장분석 (외부 연동 비용 이슈로 잠정 중단, 마이데이터 등록 후 활성화)
    hira_api: true,            // 심평원 데이터 연동 (PDF 기반 — 활성)
    mydata_api: false,         // 마이데이터 API (미등록 — 비활성)
    remodeling_proposal: false, // 리모델링 제안서 (추후 활성화)
} as const;

export type PlanSlug = 'free' | 'basic' | 'pro' | 'team_basic' | 'team_pro';

// 개인 플랜 (pricing 페이지 카드에 표시)
export type IndividualPlanSlug = 'free' | 'basic' | 'pro';
// 팀/조직 플랜 (팀 구독 섹션에 표시)
export type TeamPlanSlug = 'team_basic' | 'team_pro';

// 관리자 이메일 목록
export const ADMIN_EMAILS = ['niceverygood@naver.com', 'dev@bottlecorp.kr'] as const;

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
        analysisLimit: 3,
        price: '0원',
        priceMonthly: 0,
        priceYearly: 0,
        maxFileSizeMb: -1,
        maxCustomers: 3,
        historyDays: 7,
        features: [
            'AI 고지사항 분석 체험',
            '분석 3건 (체험판)',
            '분석 이력 7일 보관',
        ],
        lockedFeatures: [
            '보장 분석 리포트',
            '질병 위험도 리포트',
            '미래의 나 시뮬레이션',
            '가상 영수증',
            '리모델링 제안서',
            '결과 PDF 다운로드',
            '결과 공유 링크',
            '보험 자동 조회 (CODEF)',
        ],
    },
    basic: {
        name: '베이직',
        slug: 'basic',
        analysisLimit: 50,
        price: '19,900원/월',
        priceMonthly: 19900,
        priceYearly: 190000,
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
            '질병 위험도 리포트',
            '미래의 나 시뮬레이션',
            '가상 영수증',
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
        priceYearly: 380000,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        features: [
            'AI 고지사항 분석',
            '보장 분석 리포트',
            '질병 위험도 리포트',
            '미래의 나 시뮬레이션',
            '가상 영수증',
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
    team_basic: {
        name: '팀 베이직',
        slug: 'team_basic',
        analysisLimit: 50,
        price: '79,000원/월',
        priceMonthly: 79000,
        priceYearly: 758400,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: 180,
        includedSeats: 5,
        extraSeatPrice: 12000,
        maxSeats: 20,
        perSeatPrice: 15800,
        features: [
            '베이직 플랜의 모든 기능',
            '팀원당 월 50건 분석',
            '5명 포함 (최대 20명)',
            '추가 1인당 월 12,000원',
            '팀 관리 대시보드',
            '팀원별 실적 리포트',
            '분석 이력 6개월 보관',
        ],
        lockedFeatures: [
            '질병 위험도 리포트',
            '미래의 나 시뮬레이션',
            '가상 영수증',
            '리모델링 제안서',
            '전담 매니저',
            '맞춤 API 연동',
        ],
    },
    team_pro: {
        name: '팀 프로',
        slug: 'team_pro',
        analysisLimit: -1,
        price: '149,000원/월',
        priceMonthly: 149000,
        priceYearly: 1430400,
        maxFileSizeMb: -1,
        maxCustomers: -1,
        historyDays: -1,
        includedSeats: 5,
        extraSeatPrice: 25000,
        maxSeats: -1,
        perSeatPrice: 29800,
        recommended: true,
        features: [
            '프로 플랜의 모든 기능',
            '무제한 분석 (팀원 전체)',
            '5명 포함 (인원 무제한)',
            '추가 1인당 월 25,000원',
            '팀 관리 대시보드',
            '팀원별 실적 리포트',
            '질병 위험도 리포트',
            '미래의 나 시뮬레이션',
            '가상 영수증',
            '리모델링 제안서',
            '전담 매니저 배정',
            '맞춤 보험사 상품DB',
            '분석 이력 무제한 보관',
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
