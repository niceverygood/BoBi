// lib/risk/disease-risk-map.ts
// 의학 통계/가이드라인 기반 질환 연관 매핑 테이블
// AI가 생성하는 것이 아닌, 사전 검증된 데이터만 사용

import type { RiskCategory, EvidenceLevel } from '@/types/risk-report';

export interface DiseaseRiskEntry {
    sourceCode: string;       // KCD 코드 (prefix match: 'I10' → I10.*)
    sourceName: string;
    riskDisease: string;
    riskCategory: RiskCategory;
    relativeRisk: number;     // 일반인 대비 배수 (2.0 = 2배)
    evidence: string;
    evidenceLevel: EvidenceLevel;
    timeframeYears: number;
}

/**
 * 의학 통계 기반 질환 연관 매핑
 *
 * 근거 수준:
 *  A = 대규모 메타분석/국내외 학회 공식 가이드라인
 *  B = 코호트 연구/체계적 문헌고찰
 *  C = 관찰 연구/전문가 합의
 */
export const DISEASE_RISK_MAP: DiseaseRiskEntry[] = [
    // ══════════════════════════════════════════════
    // 고혈압 (I10-I15)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'I10', sourceName: '본태성 고혈압',
        riskDisease: '뇌졸중(뇌경색/뇌출혈)',
        riskCategory: '심혈관', relativeRisk: 2.5,
        evidence: '대한고혈압학회 2023 진료지침: 고혈압 환자 뇌졸중 위험 2~4배 증가',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'I10', sourceName: '본태성 고혈압',
        riskDisease: '관상동맥질환(심근경색)',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: '대한고혈압학회 2023 진료지침: 수축기 혈압 20mmHg 상승 시 심혈관 사망 2배',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'I10', sourceName: '본태성 고혈압',
        riskDisease: '심부전',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: 'Framingham Heart Study: 고혈압은 심부전 발생의 독립적 위험인자',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'I10', sourceName: '본태성 고혈압',
        riskDisease: '만성콩팥병',
        riskCategory: '신장', relativeRisk: 1.8,
        evidence: '대한신장학회: 고혈압은 만성콩팥병의 2대 원인 (당뇨 다음)',
        evidenceLevel: 'A', timeframeYears: 15,
    },

    // ══════════════════════════════════════════════
    // 제2형 당뇨병 (E11)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'E11', sourceName: '제2형 당뇨병',
        riskDisease: '관상동맥질환(심근경색)',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: '대한당뇨병학회 2023 진료지침: 당뇨 환자 심혈관질환 위험 2~4배',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'E11', sourceName: '제2형 당뇨병',
        riskDisease: '뇌졸중',
        riskCategory: '심혈관', relativeRisk: 1.8,
        evidence: 'UKPDS 연구: 당뇨 환자 뇌졸중 위험 약 2배 증가',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'E11', sourceName: '제2형 당뇨병',
        riskDisease: '당뇨병성 신증(만성콩팥병)',
        riskCategory: '신장', relativeRisk: 3.0,
        evidence: '대한신장학회: 당뇨는 말기신부전의 최대 원인 (약 50%)',
        evidenceLevel: 'A', timeframeYears: 15,
    },
    {
        sourceCode: 'E11', sourceName: '제2형 당뇨병',
        riskDisease: '당뇨병성 망막병증(실명 위험)',
        riskCategory: '기타', relativeRisk: 2.5,
        evidence: '대한당뇨병학회: 당뇨 유병기간 20년 시 망막병증 60% 이상',
        evidenceLevel: 'A', timeframeYears: 20,
    },
    {
        sourceCode: 'E11', sourceName: '제2형 당뇨병',
        riskDisease: '당뇨병성 말초신경병증',
        riskCategory: '신경', relativeRisk: 2.0,
        evidence: '대한당뇨병학회: 당뇨 환자 50% 이상에서 말초신경병증 동반',
        evidenceLevel: 'A', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 이상지질혈증 (E78)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'E78', sourceName: '이상지질혈증',
        riskDisease: '관상동맥질환(심근경색)',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: '한국지질동맥경화학회 2022: LDL 1mmol/L 감소 시 심혈관 사건 22% 감소',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'E78', sourceName: '이상지질혈증',
        riskDisease: '뇌졸중(뇌경색)',
        riskCategory: '심혈관', relativeRisk: 1.5,
        evidence: 'CTT Collaboration 메타분석: 스타틴 치료로 뇌졸중 위험 17% 감소',
        evidenceLevel: 'A', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 비만 (E66)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'E66', sourceName: '비만',
        riskDisease: '제2형 당뇨병',
        riskCategory: '대사', relativeRisk: 3.0,
        evidence: '대한비만학회: BMI 30 이상 시 당뇨 위험 약 3~7배 증가',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'E66', sourceName: '비만',
        riskDisease: '고혈압',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: '대한비만학회: 비만 환자 고혈압 유병률 일반인 대비 2배 이상',
        evidenceLevel: 'A', timeframeYears: 5,
    },
    {
        sourceCode: 'E66', sourceName: '비만',
        riskDisease: '수면무호흡증',
        riskCategory: '호흡기', relativeRisk: 4.0,
        evidence: 'AASM: 비만은 폐쇄성 수면무호흡의 최대 위험인자 (OR 4~6)',
        evidenceLevel: 'A', timeframeYears: 5,
    },

    // ══════════════════════════════════════════════
    // 우울증 (F32, F33)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'F32', sourceName: '우울증 에피소드',
        riskDisease: '관상동맥질환',
        riskCategory: '심혈관', relativeRisk: 1.6,
        evidence: 'Nicholson et al. 2006 메타분석: 우울증 환자 관상동맥질환 위험 1.6배',
        evidenceLevel: 'B', timeframeYears: 10,
    },
    {
        sourceCode: 'F33', sourceName: '반복성 우울장애',
        riskDisease: '관상동맥질환',
        riskCategory: '심혈관', relativeRisk: 1.8,
        evidence: 'Nicholson et al. 2006 메타분석: 반복성 우울증 시 심혈관 위험 더 증가',
        evidenceLevel: 'B', timeframeYears: 10,
    },
    {
        sourceCode: 'F32', sourceName: '우울증 에피소드',
        riskDisease: '치매(알츠하이머)',
        riskCategory: '신경', relativeRisk: 1.6,
        evidence: 'Ownby et al. 2006 메타분석: 우울증 병력 시 치매 위험 1.5~2배',
        evidenceLevel: 'B', timeframeYears: 15,
    },

    // ══════════════════════════════════════════════
    // 심방세동 (I48)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'I48', sourceName: '심방세동',
        riskDisease: '뇌졸중(뇌경색)',
        riskCategory: '심혈관', relativeRisk: 5.0,
        evidence: '대한부정맥학회: 심방세동 환자 뇌졸중 위험 약 5배 증가',
        evidenceLevel: 'A', timeframeYears: 5,
    },
    {
        sourceCode: 'I48', sourceName: '심방세동',
        riskDisease: '심부전',
        riskCategory: '심혈관', relativeRisk: 3.0,
        evidence: 'Framingham Heart Study: 심방세동은 심부전 위험 3배 증가',
        evidenceLevel: 'A', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 만성폐쇄성폐질환 COPD (J44)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'J44', sourceName: '만성폐쇄성폐질환(COPD)',
        riskDisease: '폐암',
        riskCategory: '암', relativeRisk: 2.5,
        evidence: 'Young et al. 2009: COPD 환자 폐암 위험 2~5배 (기류 제한 독립적 위험인자)',
        evidenceLevel: 'B', timeframeYears: 10,
    },
    {
        sourceCode: 'J44', sourceName: '만성폐쇄성폐질환(COPD)',
        riskDisease: '관상동맥질환',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: 'Sin & Man 2003: COPD 환자 심혈관 사망 위험 약 2배',
        evidenceLevel: 'B', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 지방간 (K76.0, K75.8)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'K76', sourceName: '지방간질환',
        riskDisease: '간경변',
        riskCategory: '소화기', relativeRisk: 2.5,
        evidence: '대한간학회 2023: 비알코올지방간 환자 10~20%에서 간섬유화 진행',
        evidenceLevel: 'B', timeframeYears: 15,
    },
    {
        sourceCode: 'K76', sourceName: '지방간질환',
        riskDisease: '제2형 당뇨병',
        riskCategory: '대사', relativeRisk: 2.0,
        evidence: 'Mantovani et al. 2018 메타분석: NAFLD 환자 당뇨 발생 위험 약 2배',
        evidenceLevel: 'B', timeframeYears: 10,
    },
    {
        sourceCode: 'K76', sourceName: '지방간질환',
        riskDisease: '심혈관질환',
        riskCategory: '심혈관', relativeRisk: 1.6,
        evidence: 'Targher et al. 2021: NAFLD는 심혈관질환의 독립적 위험인자',
        evidenceLevel: 'B', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 통풍 (M10)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'M10', sourceName: '통풍',
        riskDisease: '만성콩팥병',
        riskCategory: '신장', relativeRisk: 2.0,
        evidence: '대한류마티스학회: 통풍 환자 만성콩팥병 위험 약 2배',
        evidenceLevel: 'B', timeframeYears: 10,
    },
    {
        sourceCode: 'M10', sourceName: '통풍',
        riskDisease: '관상동맥질환',
        riskCategory: '심혈관', relativeRisk: 1.6,
        evidence: 'Choi et al. 2007: 통풍 남성 심근경색 위험 1.6배 증가',
        evidenceLevel: 'B', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 위식도역류질환 GERD (K21)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'K21', sourceName: '위식도역류질환(GERD)',
        riskDisease: '바렛식도',
        riskCategory: '소화기', relativeRisk: 3.0,
        evidence: '대한소화기학회: 만성 GERD 환자 바렛식도 발생률 5~15%',
        evidenceLevel: 'B', timeframeYears: 10,
    },
    {
        sourceCode: 'K21', sourceName: '위식도역류질환(GERD)',
        riskDisease: '식도암(식도선암)',
        riskCategory: '암', relativeRisk: 2.0,
        evidence: 'Lagergren et al. 1999: 만성 역류 시 식도선암 위험 약 2~8배',
        evidenceLevel: 'B', timeframeYears: 20,
    },

    // ══════════════════════════════════════════════
    // 갑상선기능저하증 (E03)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'E03', sourceName: '갑상선기능저하증',
        riskDisease: '이상지질혈증',
        riskCategory: '대사', relativeRisk: 2.0,
        evidence: '대한갑상선학회: 갑상선기능저하 시 LDL 콜레스테롤 상승 흔함',
        evidenceLevel: 'B', timeframeYears: 5,
    },
    {
        sourceCode: 'E03', sourceName: '갑상선기능저하증',
        riskDisease: '심부전',
        riskCategory: '심혈관', relativeRisk: 1.5,
        evidence: 'Rodondi et al. 2010: 현성 갑상선기능저하 시 심부전 위험 증가',
        evidenceLevel: 'B', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 골다공증 (M81)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'M81', sourceName: '골다공증',
        riskDisease: '골절(고관절/척추)',
        riskCategory: '근골격', relativeRisk: 3.0,
        evidence: '대한골대사학회: 골다공증 환자 골절 위험 2~4배 증가',
        evidenceLevel: 'A', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 천식 (J45)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'J45', sourceName: '천식',
        riskDisease: 'COPD(만성폐쇄성폐질환)',
        riskCategory: '호흡기', relativeRisk: 2.0,
        evidence: '대한천식알레르기학회: 만성 천식은 COPD 발생의 독립적 위험인자',
        evidenceLevel: 'B', timeframeYears: 15,
    },

    // ══════════════════════════════════════════════
    // 만성 B형간염 (B18.1)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'B18', sourceName: '만성 바이러스간염',
        riskDisease: '간경변',
        riskCategory: '소화기', relativeRisk: 5.0,
        evidence: '대한간학회 2022: 만성 B형간염 환자 연간 간경변 진행률 2~5%',
        evidenceLevel: 'A', timeframeYears: 20,
    },
    {
        sourceCode: 'B18', sourceName: '만성 바이러스간염',
        riskDisease: '간세포암',
        riskCategory: '암', relativeRisk: 4.0,
        evidence: '대한간학회 2022: 만성 B형간염은 간세포암 최대 원인 (한국)',
        evidenceLevel: 'A', timeframeYears: 20,
    },

    // ══════════════════════════════════════════════
    // 수면무호흡 (G47.3)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'G47', sourceName: '수면장애',
        riskDisease: '고혈압',
        riskCategory: '심혈관', relativeRisk: 2.0,
        evidence: 'AASM: 중등도 이상 수면무호흡 환자 고혈압 위험 약 2~3배',
        evidenceLevel: 'A', timeframeYears: 5,
    },
    {
        sourceCode: 'G47', sourceName: '수면장애',
        riskDisease: '심방세동',
        riskCategory: '심혈관', relativeRisk: 2.5,
        evidence: 'Gami et al. 2007: 수면무호흡 환자 심방세동 위험 약 2~4배',
        evidenceLevel: 'B', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 류마티스관절염 (M05, M06)
    // ══════════════════════════════════════════════
    {
        sourceCode: 'M05', sourceName: '류마티스관절염',
        riskDisease: '심혈관질환',
        riskCategory: '심혈관', relativeRisk: 1.5,
        evidence: '대한류마티스학회: RA 환자 심혈관 사망 위험 1.5~2배',
        evidenceLevel: 'A', timeframeYears: 10,
    },
    {
        sourceCode: 'M06', sourceName: '류마티스관절염',
        riskDisease: '심혈관질환',
        riskCategory: '심혈관', relativeRisk: 1.5,
        evidence: '대한류마티스학회: RA 환자 심혈관 사망 위험 1.5~2배',
        evidenceLevel: 'A', timeframeYears: 10,
    },

    // ══════════════════════════════════════════════
    // 약물 기반 연관 (메트포르민 → 당뇨, 스타틴 → 이상지질혈증 등은 matcher에서 처리)
    // ══════════════════════════════════════════════
];

/**
 * 약물 → 질환코드 매핑 (복용약으로 기저질환 추정)
 * 심평원 데이터에서 진단코드 없이 약물만 있는 경우 활용
 */
export const MEDICATION_DISEASE_MAP: { keyword: string; impliedCode: string; impliedName: string }[] = [
    { keyword: '메트포르민', impliedCode: 'E11', impliedName: '제2형 당뇨병' },
    { keyword: '글리메피리드', impliedCode: 'E11', impliedName: '제2형 당뇨병' },
    { keyword: '인슐린', impliedCode: 'E11', impliedName: '당뇨병' },
    { keyword: '아토르바스타틴', impliedCode: 'E78', impliedName: '이상지질혈증' },
    { keyword: '로수바스타틴', impliedCode: 'E78', impliedName: '이상지질혈증' },
    { keyword: '심바스타틴', impliedCode: 'E78', impliedName: '이상지질혈증' },
    { keyword: '암로디핀', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '로사르탄', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '발사르탄', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '텔미사르탄', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '올메사르탄', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '에날라프릴', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '라미프릴', impliedCode: 'I10', impliedName: '고혈압' },
    { keyword: '오메프라졸', impliedCode: 'K21', impliedName: '위식도역류질환' },
    { keyword: '란소프라졸', impliedCode: 'K21', impliedName: '위식도역류질환' },
    { keyword: '에스오메프라졸', impliedCode: 'K21', impliedName: '위식도역류질환' },
    { keyword: '레보티록신', impliedCode: 'E03', impliedName: '갑상선기능저하증' },
    { keyword: '알로퓨리놀', impliedCode: 'M10', impliedName: '통풍' },
    { keyword: '페북소스타트', impliedCode: 'M10', impliedName: '통풍' },
    { keyword: '세르트랄린', impliedCode: 'F32', impliedName: '우울증' },
    { keyword: '에스시탈로프람', impliedCode: 'F32', impliedName: '우울증' },
    { keyword: '플루옥세틴', impliedCode: 'F32', impliedName: '우울증' },
];
