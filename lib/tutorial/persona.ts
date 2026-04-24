/**
 * 튜토리얼용 고객 페르소나 + 5개 기능 각각의 더미 결과 데이터.
 * 하나의 고객이 전체 여정을 체험하듯 일관된 스토리라인으로 구성.
 *
 * 페르소나: 김민수 (45세 남성, IT 회사원, 당뇨·고혈압 병력)
 */

export const TUTORIAL_PERSONA = {
    name: '김민수',
    age: 45,
    gender: '남성',
    occupation: 'IT 회사원',
    annualIncome: '7,000만원',
    monthlyIncome: 500,
    monthlyExpense: 350,
    dependents: 2,
    smoker: '과거 흡연 (5년 전 금연)',
    exercise: '주 1회',
    familyHistory: '아버지 65세 심근경색, 어머니 고혈압',
    currentInsurance: '종신보험 + 암보험 3,000만원',
    medicalHistory: ['2021년 당뇨병 진단', '2022년 고혈압 진단'],
} as const;

// 1. 새 분석 (고지사항)
export const TUTORIAL_ANALYZE = {
    overallSummary:
        '최근 5년간 당뇨병·고혈압 등 만성질환으로 지속 치료 중입니다. 현재 투약 중인 약물이 있어 일반 심사 보험 가입 시 부담보·거절 가능성이 있고, 유병자 전용 상품 또는 간편심사 상품 제안이 적합합니다.',
    riskFlags: [
        {
            severity: 'high' as const,
            flag: '3개월 이내 투약 이력',
            recommendation: '고지 대상 — 현재 당뇨약·혈압약 복용 중',
        },
        {
            severity: 'medium' as const,
            flag: '5년 내 만성질환 연속 치료',
            recommendation: '당뇨·고혈압 병력 고지 필수',
        },
        {
            severity: 'low' as const,
            flag: '경미한 급성질환 이력',
            recommendation: '위염(K29) — 완치 6개월 경과',
        },
    ],
    diseases: [
        {
            name: '제2형 당뇨병',
            code: 'E11',
            firstDate: '2021-03-15',
            lastDate: '2024-01-20',
            totalVisits: 12,
            status: '진행 중',
            hospitals: ['서울대병원 내분비내과', '강남세브란스병원'],
        },
        {
            name: '본태성 고혈압',
            code: 'I10',
            firstDate: '2022-07-10',
            lastDate: '2024-02-15',
            totalVisits: 8,
            status: '진행 중',
            hospitals: ['강남세브란스병원 심장내과'],
        },
        {
            name: '위염',
            code: 'K29',
            firstDate: '2023-05-20',
            lastDate: '2023-06-10',
            totalVisits: 3,
            status: '완치',
            hospitals: ['한림대 성심병원'],
        },
    ],
} as const;

// 2. 진료정보 (CODEF 자동 수집)
export const TUTORIAL_MEDICAL = {
    totalVisits: 23,
    totalCost: 3_200_000,
    carTreatments: 1,
    treatments: [
        {
            date: '2024-02-15',
            hospital: '강남세브란스병원',
            department: '심장내과',
            disease: '본태성 고혈압 (I10)',
            visitDays: 1,
            cost: 85_000,
            drugs: ['암로디핀 5mg', '엔라프릴 10mg'],
        },
        {
            date: '2024-01-20',
            hospital: '서울대병원',
            department: '내분비내과',
            disease: '제2형 당뇨병 (E11)',
            visitDays: 1,
            cost: 120_000,
            drugs: ['메트포르민 1000mg', '글리메피리드 2mg'],
        },
        {
            date: '2023-11-08',
            hospital: '서울대병원',
            department: '내분비내과',
            disease: '제2형 당뇨병 (E11)',
            visitDays: 1,
            cost: 95_000,
            drugs: ['메트포르민 1000mg'],
        },
        {
            date: '2023-06-10',
            hospital: '한림대 성심병원',
            department: '소화기내과',
            disease: '위염 (K29)',
            visitDays: 2,
            cost: 180_000,
            drugs: ['파모티딘 20mg'],
        },
        {
            date: '2023-05-20',
            hospital: '한림대 성심병원',
            department: '소화기내과',
            disease: '급성 위염 (K29)',
            visitDays: 1,
            cost: 150_000,
            drugs: ['에스오메프라졸 40mg'],
        },
    ],
} as const;

// 3. 건강검진 (2024년 결과)
export const TUTORIAL_HEALTH_CHECKUP = {
    year: 2024,
    metrics: [
        { label: 'BMI', value: '26.5', unit: 'kg/m²', status: 'warning' as const, normalRange: '18.5~24.9' },
        { label: '혈압', value: '142/92', unit: 'mmHg', status: 'danger' as const, normalRange: '<120/80' },
        { label: '공복혈당', value: '135', unit: 'mg/dL', status: 'danger' as const, normalRange: '70~99' },
        { label: '총 콜레스테롤', value: '235', unit: 'mg/dL', status: 'warning' as const, normalRange: '<200' },
        { label: 'LDL', value: '160', unit: 'mg/dL', status: 'danger' as const, normalRange: '<130' },
        { label: 'HDL', value: '42', unit: 'mg/dL', status: 'warning' as const, normalRange: '>40' },
        { label: '중성지방', value: '190', unit: 'mg/dL', status: 'warning' as const, normalRange: '<150' },
        { label: 'AST', value: '28', unit: 'U/L', status: 'normal' as const, normalRange: '<40' },
        { label: 'ALT', value: '32', unit: 'U/L', status: 'normal' as const, normalRange: '<40' },
        { label: 'γ-GTP', value: '45', unit: 'U/L', status: 'normal' as const, normalRange: '<63' },
        { label: '혈색소', value: '14.8', unit: 'g/dL', status: 'normal' as const, normalRange: '13~17' },
        { label: 'GFR', value: '87', unit: 'mL/min', status: 'normal' as const, normalRange: '>60' },
    ],
    strokeRisk: {
        grade: '주의',
        percentage: 3.2,
        factors: [
            { type: '혈압', state: '고혈압 1단계' },
            { type: '당뇨', state: '당뇨 확진' },
            { type: '흡연', state: '과거 흡연' },
            { type: '가족력', state: '부: 심근경색' },
        ],
    },
    cardioRisk: {
        grade: '높음',
        percentage: 8.5,
        factors: [
            { type: 'LDL', state: '160 mg/dL (위험)' },
            { type: '혈압', state: '142/92 (주의)' },
            { type: '당뇨', state: '공복혈당 135' },
            { type: 'BMI', state: '26.5 (과체중)' },
        ],
    },
} as const;

// 4. 가상 사고 영수증 (뇌경색 시나리오)
export const TUTORIAL_ACCIDENT_RECEIPT = {
    diseaseName: '뇌경색',
    diseaseCode: 'I63',
    category: '뇌혈관 질환',
    totalMedicalCost: 42_000_000,
    coveredCost: 25_000_000,
    uncoveredCost: 17_000_000,
    selfPayAmount: 16_800_000,
    insurancePayout: 8_000_000,
    treatmentMonths: 6,
    monthlyLivingCost: 3_500_000,
    totalLivingCost: 21_000_000,
    finalShortage: 29_800_000,
    monthlyScenario: [
        { month: 1, medical: 18_000_000, living: 3_500_000, insurance: 5_000_000 },
        { month: 2, medical: 9_500_000, living: 3_500_000, insurance: 2_000_000 },
        { month: 3, medical: 5_200_000, living: 3_500_000, insurance: 1_000_000 },
        { month: 4, medical: 4_100_000, living: 3_500_000, insurance: 0 },
        { month: 5, medical: 2_800_000, living: 3_500_000, insurance: 0 },
        { month: 6, medical: 2_400_000, living: 3_500_000, insurance: 0 },
    ],
    aiConsulting: [
        '현재 종신보험의 뇌혈관 진단금은 800만원으로, 실제 비급여 치료비(1,700만원)의 절반에도 못 미칩니다.',
        '재활치료 6개월 + 가사도우미·간병비 등 비급여 항목이 총 의료비의 40%를 차지합니다.',
        '소득 상실에 따른 월 생활비 350만원 × 6개월 = 2,100만원의 공백이 발생합니다.',
        '뇌혈관 진단비 특약을 최소 3,000만원까지 증액하거나, 간병보험 추가 가입을 권고합니다.',
        '부친 심근경색 가족력이 있어 심·뇌혈관 통합 특약이 가격 대비 효율적입니다.',
    ],
} as const;

// 5. 미래의 나 (10년 후 예측)
export const TUTORIAL_FUTURE_ME = {
    timeHorizon: '10년 후 (55세)',
    estimatedTotalCost: 65_000_000,
    estimatedByCategory: {
        cardio: 38_000_000,
        brain: 18_000_000,
        cancer: 9_000_000,
    },
    currentCoverage: 35_000_000,
    coverageGap: 30_000_000,
    riskItems: [
        { category: '심혈관 질환', percentage: 72, level: 'high' as const },
        { category: '뇌혈관 질환', percentage: 45, level: 'high' as const },
        { category: '당뇨 합병증', percentage: 58, level: 'medium' as const },
        { category: '만성 신장질환', percentage: 28, level: 'medium' as const },
        { category: '암', percentage: 19, level: 'low' as const },
    ],
    scenarios: [
        {
            type: 'complement' as const,
            label: '지금 보완',
            monthlyPremium: 135_000,
            totalGap: 4_500_000,
            rejectionRisk: '낮음 (유병자 간편심사)',
            highlight: '월 13.5만원 추가로 공백 85% 해소',
        },
        {
            type: 'delay' as const,
            label: '5년 후 가입',
            monthlyPremium: 245_000,
            totalGap: 14_800_000,
            rejectionRisk: '높음 (합병증 발생 시 거절)',
            highlight: '보험료 81% 인상 + 가입 가능성 하락',
        },
        {
            type: 'nothing' as const,
            label: '현 상태 유지',
            monthlyPremium: 0,
            totalGap: 30_000_000,
            rejectionRisk: '—',
            highlight: '10년 내 자산의 43% 의료비로 소진',
        },
    ],
    aiSummary:
        '김민수 고객님은 당뇨·고혈압이 이미 진행 중이고 부친 심근경색 가족력까지 있어, 10년 내 심·뇌혈관 질환 발병 확률이 평균 대비 2.3배 높습니다. 현재 보장으로는 예상 의료비의 54%만 커버되며, 소득 상실 리스크까지 고려하면 실질 공백은 3,000만원에 달합니다. 지금 유병자 간편심사 상품으로 뇌혈관·심장 특약을 보완하는 것이 가장 합리적입니다.',
} as const;
