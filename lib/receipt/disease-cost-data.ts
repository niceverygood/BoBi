// lib/receipt/disease-cost-data.ts
// 질환별 평균 진료비 및 투병 기간 데이터
// 출처: 건강보험심사평가원 다빈도질병통계, 비급여진료비정보, 국립암센터 통계

export interface DiseaseCostInfo {
    code: string;
    name: string;
    category: '암' | '심혈관' | '뇌혈관' | '대사' | '근골격' | '소화기' | '호흡기' | '정신' | '기타';
    /** 급여 진료비 (만원) */
    avgCoveredCost: number;
    /** 비급여 진료비 (만원) */
    avgUncoveredCost: number;
    /** 급여 본인부담 비율 (0~1) */
    coveredSelfPayRatio: number;
    /** 평균 투병/회복 기간 (개월) */
    avgTreatmentMonths: number;
    /** 데이터 출처 */
    source: string;
    /** 비고 */
    note: string;
}

export const DISEASE_COST_DATA: DiseaseCostInfo[] = [
    // ═══ 암 (산정특례 5%) ═══
    { code: 'C34', name: '폐암', category: '암', avgCoveredCost: 2800, avgUncoveredCost: 700, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '항암제 비급여 포함' },
    { code: 'C50', name: '유방암', category: '암', avgCoveredCost: 1800, avgUncoveredCost: 700, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 8, source: '국립암센터 2024', note: '표적항암제 비급여' },
    { code: 'C16', name: '위암', category: '암', avgCoveredCost: 2000, avgUncoveredCost: 800, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 10, source: '국립암센터 2024', note: '수술+항암' },
    { code: 'C18', name: '대장암', category: '암', avgCoveredCost: 2200, avgUncoveredCost: 800, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 10, source: '국립암센터 2024', note: '수술+항암' },
    { code: 'C73', name: '갑상선암', category: '암', avgCoveredCost: 500, avgUncoveredCost: 300, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 3, source: '심평원 2024', note: '예후 양호' },
    { code: 'C22', name: '간암', category: '암', avgCoveredCost: 3000, avgUncoveredCost: 1000, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '간절제/색전술/항암' },
    { code: 'C61', name: '전립선암', category: '암', avgCoveredCost: 1400, avgUncoveredCost: 600, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 6, source: '국립암센터 2024', note: '로봇수술 비급여' },
    { code: 'C25', name: '췌장암', category: '암', avgCoveredCost: 3500, avgUncoveredCost: 1500, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '비급여 항암 비중 높음' },
    { code: 'C56', name: '난소암', category: '암', avgCoveredCost: 2500, avgUncoveredCost: 800, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '수술+항암 병행' },
    { code: 'C53', name: '자궁경부암', category: '암', avgCoveredCost: 1500, avgUncoveredCost: 500, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 6, source: '국립암센터 2024', note: '수술/방사선' },
    { code: 'C67', name: '방광암', category: '암', avgCoveredCost: 1800, avgUncoveredCost: 600, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 8, source: '국립암센터 2024', note: '재발률 높아 추적검사' },
    { code: 'C64', name: '신장암', category: '암', avgCoveredCost: 2000, avgUncoveredCost: 700, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 6, source: '국립암센터 2024', note: '부분절제/로봇수술' },
    { code: 'C15', name: '식도암', category: '암', avgCoveredCost: 3000, avgUncoveredCost: 1000, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '수술 난이도 높음' },
    { code: 'C71', name: '뇌종양(악성)', category: '암', avgCoveredCost: 4000, avgUncoveredCost: 1500, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '수술+방사선+항암' },
    { code: 'C90', name: '다발성골수종', category: '암', avgCoveredCost: 3000, avgUncoveredCost: 1200, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 24, source: '국립암센터 2024', note: '장기 항암' },
    { code: 'C91', name: '백혈병', category: '암', avgCoveredCost: 5000, avgUncoveredCost: 2000, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 24, source: '국립암센터 2024', note: '골수이식 시 비용 급증' },
    { code: 'C81', name: '림프종', category: '암', avgCoveredCost: 2500, avgUncoveredCost: 800, coveredSelfPayRatio: 0.05, avgTreatmentMonths: 12, source: '국립암센터 2024', note: '항암+방사선' },

    // ═══ 심혈관 ═══
    { code: 'I21', name: '급성심근경색', category: '심혈관', avgCoveredCost: 1800, avgUncoveredCost: 700, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 6, source: '심평원 2024', note: '스텐트 비급여' },
    { code: 'I25', name: '만성허혈성심장질환', category: '심혈관', avgCoveredCost: 1000, avgUncoveredCost: 500, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 12, source: '심평원 2024', note: '약물+검사' },
    { code: 'I50', name: '심부전', category: '심혈관', avgCoveredCost: 1400, avgUncoveredCost: 600, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 12, source: '심평원 2024', note: '입원+약물' },
    { code: 'I48', name: '심방세동', category: '심혈관', avgCoveredCost: 1200, avgUncoveredCost: 400, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 12, source: '심평원 2024', note: '항응고제 장기 복용' },
    { code: 'I71', name: '대동맥류/박리', category: '심혈관', avgCoveredCost: 3000, avgUncoveredCost: 1000, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 6, source: '심평원 2024', note: '응급수술' },
    { code: 'I35', name: '심장판막질환', category: '심혈관', avgCoveredCost: 2500, avgUncoveredCost: 800, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 6, source: '심평원 2024', note: '판막치환/TAVI' },
    { code: 'I20', name: '협심증', category: '심혈관', avgCoveredCost: 800, avgUncoveredCost: 300, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 6, source: '심평원 2024', note: '약물+스텐트' },

    // ═══ 뇌혈관 ═══
    { code: 'I63', name: '뇌경색(뇌졸중)', category: '뇌혈관', avgCoveredCost: 2000, avgUncoveredCost: 1000, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '재활 비급여 비중 높음' },
    { code: 'I61', name: '뇌출혈', category: '뇌혈관', avgCoveredCost: 2800, avgUncoveredCost: 1200, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '수술+ICU+재활' },
    { code: 'I60', name: '지주막하출혈', category: '뇌혈관', avgCoveredCost: 3000, avgUncoveredCost: 1500, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '코일링/클리핑' },
    { code: 'I67', name: '뇌동맥류(미파열)', category: '뇌혈관', avgCoveredCost: 1500, avgUncoveredCost: 500, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 3, source: '심평원 2024', note: '예방적 시술' },

    // ═══ 대사/내분비 ═══
    { code: 'E11', name: '제2형 당뇨 합병증', category: '대사', avgCoveredCost: 800, avgUncoveredCost: 400, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 12, source: '심평원 2024', note: '투석/절단 등 합병증' },
    { code: 'N18', name: '만성콩팥병(투석)', category: '대사', avgCoveredCost: 3000, avgUncoveredCost: 600, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 연간' },
    { code: 'E03', name: '갑상선기능저하증', category: '대사', avgCoveredCost: 200, avgUncoveredCost: 100, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 12, source: '심평원 2024', note: '약물 장기 복용' },
    { code: 'E05', name: '갑상선기능항진증', category: '대사', avgCoveredCost: 300, avgUncoveredCost: 150, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 12, source: '심평원 2024', note: '약물/방사성요오드/수술' },
    { code: 'E66', name: '고도비만 수술', category: '대사', avgCoveredCost: 600, avgUncoveredCost: 800, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '위소매절제 비급여' },

    // ═══ 근골격 ═══
    { code: 'M17', name: '무릎 인공관절 수술', category: '근골격', avgCoveredCost: 500, avgUncoveredCost: 500, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '재료비 비급여' },
    { code: 'M51', name: '디스크 수술', category: '근골격', avgCoveredCost: 400, avgUncoveredCost: 400, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '내시경 수술 비급여' },
    { code: 'S72', name: '고관절 골절 수술', category: '근골격', avgCoveredCost: 900, avgUncoveredCost: 600, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 6, source: '심평원 2024', note: '재활+간병비' },
    { code: 'M48', name: '척추관협착증 수술', category: '근골격', avgCoveredCost: 500, avgUncoveredCost: 500, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '감압술/유합술' },
    { code: 'M75', name: '회전근개파열 수술', category: '근골격', avgCoveredCost: 400, avgUncoveredCost: 350, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 4, source: '심평원 2024', note: '관절경 비급여' },
    { code: 'M23', name: '반월판연골 수술', category: '근골격', avgCoveredCost: 300, avgUncoveredCost: 300, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '관절경 수술' },
    { code: 'M16', name: '고관절 인공관절 수술', category: '근골격', avgCoveredCost: 600, avgUncoveredCost: 600, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 4, source: '심평원 2024', note: '인공관절+재활' },
    { code: 'S82', name: '발목골절 수술', category: '근골격', avgCoveredCost: 300, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '내고정술' },
    { code: 'M54', name: '요통(만성)', category: '근골격', avgCoveredCost: 200, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 6, source: '심평원 2024', note: '도수치료/주사 비급여' },

    // ═══ 소화기 ═══
    { code: 'K80', name: '담석증 수술', category: '소화기', avgCoveredCost: 300, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '복강경 담낭절제' },
    { code: 'K35', name: '맹장(충수돌기) 수술', category: '소화기', avgCoveredCost: 250, avgUncoveredCost: 150, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '복강경 수술' },
    { code: 'K40', name: '서혜부 탈장 수술', category: '소화기', avgCoveredCost: 250, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '메쉬 비급여' },
    { code: 'K25', name: '위궤양(출혈)', category: '소화기', avgCoveredCost: 400, avgUncoveredCost: 150, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 2, source: '심평원 2024', note: '내시경지혈+입원' },
    { code: 'K74', name: '간경변(간경화)', category: '소화기', avgCoveredCost: 1500, avgUncoveredCost: 500, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 12, source: '심평원 2024', note: '장기 약물+합병증' },
    { code: 'K85', name: '급성 췌장염', category: '소화기', avgCoveredCost: 600, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 2, source: '심평원 2024', note: '중증 시 ICU' },
    { code: 'K50', name: '크론병', category: '소화기', avgCoveredCost: 1200, avgUncoveredCost: 400, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 생물학적제제' },
    { code: 'K51', name: '궤양성 대장염', category: '소화기', avgCoveredCost: 1000, avgUncoveredCost: 400, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 장기 치료' },

    // ═══ 호흡기 ═══
    { code: 'J18', name: '폐렴(중증)', category: '호흡기', avgCoveredCost: 600, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '입원 치료' },
    { code: 'J44', name: 'COPD 악화', category: '호흡기', avgCoveredCost: 500, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '입원+산소치료' },
    { code: 'J45', name: '중증 천식', category: '호흡기', avgCoveredCost: 400, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 6, source: '심평원 2024', note: '생물학적제제 비급여' },
    { code: 'J93', name: '기흉 수술', category: '호흡기', avgCoveredCost: 400, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '흉강경 수술' },
    { code: 'J84', name: '폐섬유증', category: '호흡기', avgCoveredCost: 2000, avgUncoveredCost: 800, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 항섬유화제' },

    // ═══ 정신건강 ═══
    { code: 'F32', name: '주요우울장애(입원)', category: '정신', avgCoveredCost: 500, avgUncoveredCost: 300, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 6, source: '심평원 2024', note: '입원+약물+심리치료' },
    { code: 'F20', name: '조현병', category: '정신', avgCoveredCost: 1500, avgUncoveredCost: 400, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 장기 입원' },
    { code: 'F31', name: '양극성장애(조울증)', category: '정신', avgCoveredCost: 800, avgUncoveredCost: 300, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 12, source: '심평원 2024', note: '장기 약물+입원' },

    // ═══ 기타 ═══
    { code: 'N20', name: '신장/요관결석 수술', category: '기타', avgCoveredCost: 300, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '체외충격파/내시경' },
    { code: 'N40', name: '전립선비대증 수술', category: '기타', avgCoveredCost: 400, avgUncoveredCost: 300, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 2, source: '심평원 2024', note: '레이저 수술 비급여' },
    { code: 'D25', name: '자궁근종 수술', category: '기타', avgCoveredCost: 400, avgUncoveredCost: 300, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 2, source: '심평원 2024', note: '복강경/로봇수술' },
    { code: 'N80', name: '자궁내막증 수술', category: '기타', avgCoveredCost: 350, avgUncoveredCost: 250, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 2, source: '심평원 2024', note: '복강경 수술' },
    { code: 'H25', name: '백내장 수술', category: '기타', avgCoveredCost: 150, avgUncoveredCost: 250, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '다초점렌즈 비급여' },
    { code: 'H40', name: '녹내장 수술', category: '기타', avgCoveredCost: 300, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '섬유주절제술' },
    { code: 'H33', name: '망막박리 수술', category: '기타', avgCoveredCost: 500, avgUncoveredCost: 300, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 3, source: '심평원 2024', note: '유리체절제술' },
    { code: 'J35', name: '편도/아데노이드 수술', category: '기타', avgCoveredCost: 200, avgUncoveredCost: 150, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '소아 다빈도' },
    { code: 'A41', name: '패혈증', category: '기타', avgCoveredCost: 2000, avgUncoveredCost: 800, coveredSelfPayRatio: 0.15, avgTreatmentMonths: 2, source: '심평원 2024', note: 'ICU 장기 입원' },
    { code: 'B18', name: '만성 B형간염', category: '기타', avgCoveredCost: 600, avgUncoveredCost: 200, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 항바이러스제' },
    { code: 'M10', name: '통풍(급성발작)', category: '기타', avgCoveredCost: 200, avgUncoveredCost: 100, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 1, source: '심평원 2024', note: '입원+약물' },
    { code: 'L40', name: '건선(중증)', category: '기타', avgCoveredCost: 800, avgUncoveredCost: 500, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 12, source: '심평원 2024', note: '생물학적제제 비급여' },
    { code: 'M05', name: '류마티스관절염', category: '기타', avgCoveredCost: 1000, avgUncoveredCost: 400, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 생물학적제제' },
    { code: 'G35', name: '다발성경화증', category: '기타', avgCoveredCost: 2000, avgUncoveredCost: 600, coveredSelfPayRatio: 0.10, avgTreatmentMonths: 12, source: '심평원 2024', note: '산정특례, 고가 약물' },
    { code: 'G40', name: '뇌전증(간질)', category: '기타', avgCoveredCost: 500, avgUncoveredCost: 200, coveredSelfPayRatio: 0.20, avgTreatmentMonths: 12, source: '심평원 2024', note: '장기 약물 복용' },
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
