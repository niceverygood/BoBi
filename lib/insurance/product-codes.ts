// lib/insurance/product-codes.ts
// 상품 코드 매핑 테이블
// 보험사별 상품 코드 체계를 외부 설정으로 분리하여 쉽게 수정 가능하도록 함
// 추후 DB 테이블로 이관 예정 (보험사별 상품 크롤링 결과와 병합)

export interface ProductCodeMapping {
    code: string;                  // 상품 코드 (예: "305", "삼태노")
    name: string;                  // 상품명 (예: "3대질병 간편보험")
    description: string;           // 상품 설명
    productType: 'simple' | 'mild' | 'standard'; // 상품 유형
    insurers: string[];            // 취급 보험사 목록
    nYears?: number;               // 간편보험의 N값 (3.N.5)
    nYearsForHospSurg?: number;    // 입원/수술 확인 기준 년수
    tags?: string[];               // 검색용 태그
}

/**
 * 상품 코드 매핑 테이블
 *
 * 코드 매칭 규칙:
 * - 정확한 코드(exact match) 기반 매칭
 * - "31"과 "311"은 별도 상품으로 구분
 * - "305"와 "325"는 별도 상품으로 구분
 * - 코드 계층 관계가 있는 경우 parent 필드로 명시 (추후 확장)
 */
export const PRODUCT_CODE_MAP: ProductCodeMapping[] = [
    // ── 간편보험 ──
    {
        code: '305',
        name: '3대질병 간편보험',
        description: '암, 뇌졸중, 심장질환 3대질병 보장 간편보험',
        productType: 'simple',
        insurers: ['삼성화재', 'DB손해보험', '현대해상', 'KB손해보험'],
        nYears: 10,
        nYearsForHospSurg: 10,
        tags: ['3대질병', '간편', '3.10.5'],
    },
    {
        code: '325',
        name: '3대질병+2대 간편보험',
        description: '3대질병에 고혈압/당뇨 보장 추가 간편보험',
        productType: 'simple',
        insurers: ['한화손해보험', 'KB손해보험'],
        nYears: 10,
        nYearsForHospSurg: 10,
        tags: ['3대질병', '고혈압', '당뇨', '간편'],
    },
    {
        code: '삼태노',
        name: '3대질병+태아+노후 간편보험',
        description: '3대질병, 태아보장, 노후보장 통합 간편보험',
        productType: 'simple',
        insurers: ['흥국화재', '한화손해보험', '메리츠화재'],
        nYears: 10,
        nYearsForHospSurg: 10,
        tags: ['삼태노', '3대질병', '태아', '노후', '간편'],
    },
    {
        code: '31',
        name: '3대+1 간편보험',
        description: '3대질병 + 치매 보장 간편보험',
        productType: 'simple',
        insurers: ['삼성화재', '현대해상'],
        nYears: 5,
        nYearsForHospSurg: 5,
        tags: ['3대+1', '치매', '간편', '3.5.5'],
    },
    {
        code: '311',
        name: '3대+1+1 간편보험',
        description: '3대질병 + 치매 + 당뇨 보장 간편보험',
        productType: 'simple',
        insurers: ['DB손해보험'],
        nYears: 5,
        nYearsForHospSurg: 5,
        tags: ['3대+1+1', '치매', '당뇨', '간편', '3.5.5'],
    },

    // ── 초경증 보험 ──
    {
        code: '초경증',
        name: '초경증 간편보험',
        description: '고혈압/당뇨 등 경증 질환자를 위한 간편보험',
        productType: 'mild',
        insurers: ['한화생명', '삼성생명'],
        nYears: 10,
        nYearsForHospSurg: 10,
        tags: ['초경증', '고혈압', '당뇨', '경증'],
    },

    // ── 일반 표준체 ──
    {
        code: '표준체',
        name: '일반 표준체 건강체 보험',
        description: '건강한 사람을 위한 일반 보험 (가장 엄격한 심사)',
        productType: 'standard',
        insurers: ['전사'],
        nYearsForHospSurg: 5,
        tags: ['표준체', '건강체', '일반'],
    },
];

/**
 * 상품 코드로 정확히 조회 (exact match only)
 * "31" 검색 시 "311"이 매칭되지 않음
 */
export function findProductByCode(code: string): ProductCodeMapping | undefined {
    const normalized = code.trim();
    return PRODUCT_CODE_MAP.find(p => p.code === normalized);
}

/**
 * 상품 유형으로 조회
 */
export function findProductsByType(type: 'simple' | 'mild' | 'standard'): ProductCodeMapping[] {
    return PRODUCT_CODE_MAP.filter(p => p.productType === type);
}

/**
 * 보험사로 취급 상품 조회
 */
export function findProductsByInsurer(insurer: string): ProductCodeMapping[] {
    return PRODUCT_CODE_MAP.filter(p =>
        p.insurers.some(i => i === insurer || i === '전사')
    );
}

/**
 * 키워드 검색 (태그 + 코드 + 이름 기반)
 */
export function searchProducts(keyword: string): ProductCodeMapping[] {
    const normalized = keyword.toLowerCase().trim();
    return PRODUCT_CODE_MAP.filter(p =>
        p.code.toLowerCase().includes(normalized) ||
        p.name.toLowerCase().includes(normalized) ||
        p.tags?.some(t => t.toLowerCase().includes(normalized))
    );
}
