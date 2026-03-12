// lib/insurance/policy-knowledge.ts
// 보험 약관 지식 베이스 - 4종 약관 기반 (건강체, 유병자, 초경증, 실비)

/**
 * 질병수술비 보상제외 질병코드 (제5조 ②항)
 * 모든 보험사 공통 기준 (표준약관)
 */
export const EXCLUDED_DISEASE_CODES: {
    codeRange: string;
    name: string;
    description: string;
    exception?: string;
}[] = [
        {
            codeRange: 'F04-F99',
            name: '정신 및 행동장애',
            description: '정신 및 행동장애로 인한 질병수술비 보상 제외',
        },
        {
            codeRange: 'N96-N98',
            name: '습관성 유산, 불임 및 인공수정관련 합병증',
            description: '여성생식기의 비염증성 장애로 인한 합병증',
            exception: '보장개시일부터 2년이 지난 후에 발생한 경우에는 보상',
        },
        {
            codeRange: 'O00-O99',
            name: '임신, 출산, 산후기',
            description: '임신, 출산(제왕절개 포함), 산후기로 수술한 경우 보상 제외',
        },
        {
            codeRange: 'Q00-Q99',
            name: '선천기형, 변형 및 염색체이상',
            description: '선천적 기형, 변형, 염색체 이상으로 인한 수술 보상 제외',
        },
        {
            codeRange: 'E66',
            name: '비만',
            description: '비만 수술 보상 제외',
        },
        {
            codeRange: 'N39.3,N39.4,R32',
            name: '요실금',
            description: '요실금 관련 수술 보상 제외',
        },
        {
            codeRange: 'I84,K60-K62,K64',
            name: '치핵 및 직장/항문 관련 질환',
            description: '치핵, 직장, 항문 관련 질환 수술 → 질병수술비에서는 보상 제외. 단, 1~5종수술비 특약에서는 보상 가능',
        },
        {
            codeRange: 'K00-K08',
            name: '치과질환',
            description: '치아우식증, 치아 및 치주질환 등 치과질환 보상 제외',
        },
    ];

/**
 * 질병수술비 보상제외 치료 목적 (제5조 ③항)
 */
export const EXCLUDED_TREATMENT_PURPOSES: string[] = [
    '건강검진',
    '예방접종',
    '인공유산',
    '영양제/비타민제/호르몬 투여 (단, 성조숙증 치료 호르몬은 보상)',
    '보신용 투약',
    '친자 확인 진단',
    '불임검사/불임수술/불임복원술',
    '보조생식술 (체내/체외 인공수정)',
    '성장촉진 관련 수술',
    '단순 피로 또는 권태',
    '피부질환 (주근깨, 다모, 무모, 백모증, 딸기코, 점, 사마귀, 여드름, 노화성 탈모)',
    '발기부전/불감증',
    '단순 코골음 (수면무호흡증 G47.3은 보상)',
    '외모개선 수술 (쌍꺼풀, 코성형, 유방확대/축소, 지방흡입, 주름제거)',
    '시력교정술 (안경/렌즈 대체 목적)',
    '외모개선 다리정맥류 수술',
];

/**
 * 보상하지 않는 손해 (기본 제외 사유)
 */
export const EXCLUDED_BASIC_REASONS: string[] = [
    '계약자/피보험자/법정대리인의 고의',
    '전쟁, 혁명, 내란, 사변, 테러, 폭동',
    '지진, 분화, 홍수, 해일 등 천재지변',
    '핵연료물질/방사성 오염',
    '피보험자의 직무수행 중 사고 (산재보험 대상)',
    '음주운전 사고',
    '무면허 운전 사고',
];

/**
 * 수술 분류 (1종~8종)
 * 수술코드에 따른 보험금 등급
 */
export const SURGERY_CLASSIFICATION: {
    grade: string;
    description: string;
    examples: string[];
}[] = [
        {
            grade: '1종',
            description: '경미한 수술 (통원 가능)',
            examples: ['치핵수술(G272)', '위내시경 생검(G505)', '피부 양성종양 제거'],
        },
        {
            grade: '2종',
            description: '간단한 수술',
            examples: ['편도선 절제술', '서혜부 탈장 수술', '제왕절개'],
        },
        {
            grade: '3종',
            description: '중간 수술',
            examples: ['충수절제술(맹장)', '담낭절제술', '자궁근종 제거'],
        },
        {
            grade: '4종',
            description: '주요 수술',
            examples: ['간수술(H052)', '위절제술', '대장절제술'],
        },
        {
            grade: '5종',
            description: '대수술',
            examples: ['관상동맥우회술', '척추고정술', '인공관절치환술'],
        },
        {
            grade: '6종',
            description: '고난도 수술',
            examples: ['뇌종양 제거술', '심장판막 수술'],
        },
        {
            grade: '7종',
            description: '최고난도 수술',
            examples: ['심장이식', '폐이식'],
        },
        {
            grade: '8종',
            description: '특수 대수술',
            examples: ['간이식(A010)', '골수이식'],
        },
    ];

/**
 * 고지의무 판단 기준 질병코드
 * 이 질병코드가 진료 이력에 있으면 고지 필요
 */
export const DISCLOSURE_REQUIRED_CODES: {
    codeRange: string;
    name: string;
    severity: 'high' | 'medium' | 'low';
    guidance: string;
}[] = [
        { codeRange: 'C00-C97', name: '악성종양(암)', severity: 'high', guidance: '암 진단 이력은 반드시 고지 필요. 완치 후 5년 경과 시 일반 가입 가능한 상품 있음' },
        { codeRange: 'I10-I15', name: '고혈압', severity: 'high', guidance: '고혈압 진단 및 약물 복용 이력 고지 필요. 유병자보험 또는 간편심사보험 추천' },
        { codeRange: 'E10-E14', name: '당뇨병', severity: 'high', guidance: '당뇨병 진단 및 약물 복용 이력 고지 필요. HbA1c 수치에 따라 가입 여부 결정' },
        { codeRange: 'I20-I25', name: '허혈성심장질환(협심증/심근경색)', severity: 'high', guidance: '심장질환 이력 반드시 고지. 유병자/간편심사 상품 권유' },
        { codeRange: 'I60-I69', name: '뇌혈관질환(뇌졸중)', severity: 'high', guidance: '뇌혈관질환 이력 반드시 고지. 유병자/간편심사 상품 권유' },
        { codeRange: 'K70-K77', name: '간질환(간경화 등)', severity: 'high', guidance: '간질환 이력 고지 필요. 간경화는 대부분 가입 제한' },
        { codeRange: 'J40-J47', name: '만성하기도질환(천식/COPD)', severity: 'medium', guidance: '천식/COPD 진단 이력 고지 필요. 경증은 조건부 가입 가능' },
        { codeRange: 'M50-M54', name: '추간판장애/요통', severity: 'medium', guidance: '디스크/요통 이력 고지 필요. 완치 후 가입 가능 (완치증명서 필요)' },
        { codeRange: 'E78', name: '고지혈증', severity: 'medium', guidance: '고지혈증 약물 복용 이력 고지 필요. 대부분 조건부 가입 가능' },
        { codeRange: 'K25-K28', name: '위/십이지장 궤양', severity: 'low', guidance: '궤양 이력 고지 필요. 완치 후 일반 가입 가능' },
        { codeRange: 'N40', name: '전립선비대증', severity: 'low', guidance: '전립선비대증 진단/치료 이력 고지 필요' },
        { codeRange: 'E03-E07', name: '갑상선질환', severity: 'medium', guidance: '갑상선 질환 이력 고지 필요. 갑상선암은 high severity' },
        { codeRange: 'F04-F99', name: '정신 및 행동장애', severity: 'high', guidance: '정신건강의학과 진료 이력 고지 필요. 질병수술비 보상 제외 대상' },
    ];

/**
 * 실손의료보험 보상 구조
 */
export const REAL_LOSS_INSURANCE = {
    injury_covered: {
        inpatient: '입원의료비: 급여 본인부담금의 80% + 비급여 본인부담금의 80% (연간 5천만원 한도)',
        outpatient: '통원의료비: 급여 본인부담금에서 1~2만원 공제 (1회 20만원 한도)',
    },
    disease_covered: {
        inpatient: '입원의료비: 급여 본인부담금의 80% + 비급여 본인부담금의 80% (연간 5천만원 한도)',
        outpatient: '통원의료비: 급여 본인부담금에서 1~2만원 공제 (1회 20만원 한도)',
    },
    non_covered_items: [
        '비급여 의료비 (4세대 실비 기준)',
        '자동차보험/산재보험에서 발생한 본인부담의료비',
        '도수치료: 연 350만원/50회 한도',
        '비급여 주사료: 연 250만원/50회 한도',
        '비급여 MRI/MRA: 연 300만원 한도',
    ],
};

/**
 * 보험 유형별 특성
 */
export const INSURANCE_TYPES = {
    standard: {
        name: '건강체 (일반심사)',
        description: '표준 건강상태 기준. 알릴의무 항목 모두 고지 필요',
        example: '(무)letsmile4060 종합보험',
    },
    simplified: {
        name: '유병자 (간편심사)',
        description: '3가지 질문만으로 가입. 기존 병력이 있어도 가입 가능',
        questions: [
            '3개월 이내 입원/수술/추가검사 필요소견이 있었는가?',
            'N년 이내 상해/질병으로 입원/수술한 적이 있는가?',
            '5년 이내 암/협심증/심근경색/간경화/뇌졸중/심장판막증 진단을 받은 적이 있는가?',
        ],
        example: '흥Good 든든한 3N5 간편종합보험',
    },
    mild_disease: {
        name: '초경증',
        description: '경미한 질환(고혈압, 당뇨 등)이 있는 사람을 위한 상품',
        example: '프로미라이프 초경증간편건강보험',
    },
    real_loss: {
        name: '실손의료보험 (실비)',
        description: '실제 지출한 의료비를 보상. 급여/비급여 구분',
        example: '흥Good 실손의료보험',
    },
};

/**
 * AI 분석 시 사용할 약관 기반 프롬프트 컨텍스트 생성
 */
export function generatePolicyContext(): string {
    let context = `\n## 보험 약관 지식 베이스\n\n`;

    context += `### 1. 질병수술비 보상 제외 질병코드 (제5조 ②항 - 전 보험사 공통)\n`;
    for (const code of EXCLUDED_DISEASE_CODES) {
        context += `- ${code.codeRange}: ${code.name} - ${code.description}`;
        if (code.exception) context += ` (예외: ${code.exception})`;
        context += `\n`;
    }

    context += `\n### 2. 보상 제외 치료 목적 (제5조 ③항)\n`;
    for (const purpose of EXCLUDED_TREATMENT_PURPOSES) {
        context += `- ${purpose}\n`;
    }

    context += `\n### 3. 고지의무 판단 기준\n`;
    for (const code of DISCLOSURE_REQUIRED_CODES) {
        context += `- ${code.codeRange} (${code.name}) [${code.severity}]: ${code.guidance}\n`;
    }

    context += `\n### 4. 수술 분류 (1종~8종)\n`;
    for (const grade of SURGERY_CLASSIFICATION) {
        context += `- ${grade.grade}: ${grade.description} (예: ${grade.examples.join(', ')})\n`;
    }

    context += `\n### 5. 청구가능 여부 판단 규칙\n`;
    context += `- 진료/수술 내역의 질병코드가 보상제외 코드에 해당하는지 확인\n`;
    context += `- 보상제외 코드에 해당하더라도, 다른 특약(예: 1~5종수술비)에서 보상 가능한 경우 있음\n`;
    context += `- 치핵수술: 질병수술비 ❌, 1~5종수술비 ✅\n`;
    context += `- 대장용종제거: 올가미술(내시경) vs 겸자제거 → 수술 분류가 다름\n`;
    context += `- 실손의료보험: 급여/비급여 구분하여 보상, 비급여는 공제금액 후 80% 보상\n`;

    context += `\n### 6. 보험 유형별 가입 가이드\n`;
    context += `- 건강체: 일반심사, 모든 알릴의무 고지\n`;
    context += `- 유병자(간편심사): 3가지 질문만, 기존 병력 있어도 가입 가능\n`;
    context += `- 초경증: 경미 질환(고혈압/당뇨) 있는 사람용\n`;
    context += `- 실비: 실제 의료비 보상, 급여/비급여 구분\n`;

    return context;
}
