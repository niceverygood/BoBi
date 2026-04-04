// lib/receipt/disease-cost-data.ts
// 질환별 평균 진료비 및 투병 기간 데이터
// 출처: 건강보험심사평가원 다빈도질병통계, 비급여진료비정보, 국립암센터 통계

export interface DiseaseCostInfo {
    code: string;
    name: string;
    category: '암' | '심혈관' | '뇌혈관' | '대사' | '근골격' | '소화기' | '호흡기' | '정신' | '기타';
    /** 평균 총 진료비 (만원) — 급여+비급여 포함 */
    avgTotalCost: number;
    /** 건강보험 급여 후 개인부담 비율 (0~1) */
    selfPayRatio: number;
    /** 평균 투병/회복 기간 (개월) */
    avgTreatmentMonths: number;
    /** 데이터 출처 */
    source: string;
    /** 비고 */
    note: string;
}

export const DISEASE_COST_DATA: DiseaseCostInfo[] = [
    // ═══ 암 ═══
    {
        code: 'C34', name: '폐암', category: '암',
        avgTotalCost: 3500, selfPayRatio: 0.05, avgTreatmentMonths: 12,
        source: '국립암센터 2024 암등록통계', note: '산정특례 적용 시 본인부담 5%',
    },
    {
        code: 'C50', name: '유방암', category: '암',
        avgTotalCost: 2500, selfPayRatio: 0.05, avgTreatmentMonths: 8,
        source: '국립암센터 2024 암등록통계', note: '조기 발견 시 예후 양호',
    },
    {
        code: 'C16', name: '위암', category: '암',
        avgTotalCost: 2800, selfPayRatio: 0.05, avgTreatmentMonths: 10,
        source: '국립암센터 2024 암등록통계', note: '수술+항암 기준',
    },
    {
        code: 'C18', name: '대장암', category: '암',
        avgTotalCost: 3000, selfPayRatio: 0.05, avgTreatmentMonths: 10,
        source: '국립암센터 2024 암등록통계', note: '수술+항암 기준',
    },
    {
        code: 'C73', name: '갑상선암', category: '암',
        avgTotalCost: 800, selfPayRatio: 0.05, avgTreatmentMonths: 3,
        source: '심평원 다빈도질병통계 2024', note: '예후 양호, 치료기간 짧음',
    },
    {
        code: 'C22', name: '간암', category: '암',
        avgTotalCost: 4000, selfPayRatio: 0.05, avgTreatmentMonths: 12,
        source: '국립암센터 2024 암등록통계', note: '간절제/색전술/항암 포함',
    },
    {
        code: 'C61', name: '전립선암', category: '암',
        avgTotalCost: 2000, selfPayRatio: 0.05, avgTreatmentMonths: 6,
        source: '국립암센터 2024 암등록통계', note: '수술 또는 방사선 치료',
    },
    {
        code: 'C25', name: '췌장암', category: '암',
        avgTotalCost: 5000, selfPayRatio: 0.05, avgTreatmentMonths: 12,
        source: '국립암센터 2024 암등록통계', note: '치료비 높고 예후 불량',
    },

    // ═══ 심혈관 ═══
    {
        code: 'I21', name: '급성심근경색', category: '심혈관',
        avgTotalCost: 2500, selfPayRatio: 0.10, avgTreatmentMonths: 6,
        source: '심평원 다빈도질병통계 2024', note: 'PCI(스텐트) 시술 기준',
    },
    {
        code: 'I25', name: '만성허혈성심장질환', category: '심혈관',
        avgTotalCost: 1500, selfPayRatio: 0.15, avgTreatmentMonths: 12,
        source: '심평원 다빈도질병통계 2024', note: '약물치료+정기검진 기준',
    },
    {
        code: 'I50', name: '심부전', category: '심혈관',
        avgTotalCost: 2000, selfPayRatio: 0.15, avgTreatmentMonths: 12,
        source: '심평원 다빈도질병통계 2024', note: '입원+약물 치료',
    },

    // ═══ 뇌혈관 ═══
    {
        code: 'I63', name: '뇌경색(뇌졸중)', category: '뇌혈관',
        avgTotalCost: 3000, selfPayRatio: 0.10, avgTreatmentMonths: 12,
        source: '심평원 다빈도질병통계 2024', note: '급성기+재활 포함',
    },
    {
        code: 'I61', name: '뇌출혈', category: '뇌혈관',
        avgTotalCost: 4000, selfPayRatio: 0.10, avgTreatmentMonths: 12,
        source: '심평원 다빈도질병통계 2024', note: '수술+ICU+재활 포함',
    },

    // ═══ 대사 ═══
    {
        code: 'E11', name: '제2형 당뇨 합병증', category: '대사',
        avgTotalCost: 1200, selfPayRatio: 0.20, avgTreatmentMonths: 12,
        source: '심평원 다빈도질병통계 2024', note: '투석/절단 등 합병증 기준',
    },
    {
        code: 'N18', name: '만성콩팥병(투석)', category: '대사',
        avgTotalCost: 3600, selfPayRatio: 0.10, avgTreatmentMonths: 12,
        source: '심평원 다빈도질병통계 2024', note: '연간 투석비 기준, 산정특례',
    },

    // ═══ 근골격 ═══
    {
        code: 'M17', name: '무릎 인공관절 수술', category: '근골격',
        avgTotalCost: 1000, selfPayRatio: 0.20, avgTreatmentMonths: 3,
        source: '심평원 비급여진료비 2024', note: '양측 기준, 재활 포함',
    },
    {
        code: 'M51', name: '추간판탈출증(디스크) 수술', category: '근골격',
        avgTotalCost: 800, selfPayRatio: 0.20, avgTreatmentMonths: 3,
        source: '심평원 비급여진료비 2024', note: '미세현미경 수술 기준',
    },
    {
        code: 'S72', name: '고관절 골절 수술', category: '근골격',
        avgTotalCost: 1500, selfPayRatio: 0.20, avgTreatmentMonths: 6,
        source: '심평원 다빈도질병통계 2024', note: '수술+재활 포함, 고령자 다발',
    },

    // ═══ 기타 ═══
    {
        code: 'K80', name: '담석증 수술', category: '소화기',
        avgTotalCost: 500, selfPayRatio: 0.20, avgTreatmentMonths: 1,
        source: '심평원 비급여진료비 2024', note: '복강경 담낭절제술 기준',
    },
    {
        code: 'J18', name: '폐렴 (중증)', category: '호흡기',
        avgTotalCost: 800, selfPayRatio: 0.20, avgTreatmentMonths: 1,
        source: '심평원 다빈도질병통계 2024', note: '입원 치료 기준',
    },
];

/** 카테고리별 그룹핑 */
export function getDiseaseCostByCategory(): Record<string, DiseaseCostInfo[]> {
    const map: Record<string, DiseaseCostInfo[]> = {};
    for (const d of DISEASE_COST_DATA) {
        if (!map[d.category]) map[d.category] = [];
        map[d.category].push(d);
    }
    return map;
}

/** 코드로 질환 조회 */
export function findDiseaseCost(code: string): DiseaseCostInfo | undefined {
    return DISEASE_COST_DATA.find(d => d.code === code);
}

/** 이름으로 질환 조회 (부분 매칭) */
export function searchDiseaseCost(query: string): DiseaseCostInfo[] {
    const q = query.toLowerCase();
    return DISEASE_COST_DATA.filter(d =>
        d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
}
