// lib/insurance/disclosure-rules.ts
import type { DisclosureRuleSet } from '@/types/insurance';

export const SIMPLE_INSURANCE_RULES: DisclosureRuleSet = {
    rules: [
        {
            ruleId: 'simple_1',
            question: '최근 3개월 이내 의사로부터 입원필요소견, 수술필요소견, 추가검사(재검사), 질병의심소견, 질병확정진단을 받은 사실이 있습니까?',
            periodMonths: 3,
            conditions: ['medical_opinion'],
        },
        {
            ruleId: 'simple_2',
            question: '최근 1년 이내 질병이나 상해사고로 인하여 입원 또는 수술(제왕절개 포함)을 받은 사실이 있습니까?',
            periodMonths: 12,
            conditions: ['hospitalization', 'surgery'],
        },
        {
            ruleId: 'simple_3',
            question: '최근 1년 이내 6대질병(암,뇌졸중,급성심근경색,협심증,심장판막증,간경화) 진단/입원/수술 여부',
            periodMonths: 12,
            conditions: ['diagnosis'],
            targetDiseases: ['암', '뇌졸중', '급성심근경색', '협심증', '심장판막증', '간경화'],
        },
    ],
};

export const MILD_INSURANCE_RULES: DisclosureRuleSet = {
    rules: [
        {
            ruleId: 'mild_1',
            question: '최근 3개월 이내 의사로부터 입원필요소견, 수술필요소견, 추가검사(재검사), 질병의심소견, 질병확정진단을 받은 사실이 있습니까?',
            periodMonths: 3,
            conditions: ['medical_opinion'],
        },
        {
            ruleId: 'mild_2',
            question: '최근 5년~10년 이내 질병이나 상해사고로 인하여 입원 또는 수술(제왕절개 포함)을 받은 사실이 있습니까?',
            periodMonths: 60,
            conditions: ['hospitalization', 'surgery'],
        },
        {
            ruleId: 'mild_3',
            question: '최근 5년 이내 6대질병 관련 의료행위를 받은 사실이 있습니까?',
            periodMonths: 60,
            conditions: ['diagnosis', 'treatment', 'hospitalization', 'surgery'],
            targetDiseases: ['암', '협심증', '심근경색', '뇌졸중', '뇌출혈', '뇌경색', '간경화', '심장판막증'],
        },
    ],
};

export const STANDARD_INSURANCE_RULES: DisclosureRuleSet = {
    rules: [
        {
            ruleId: 'std_1',
            question: '최근 3개월 이내 의사로부터 진찰 또는 검사(건강검진 포함)를 통하여 의료행위를 받은 사실이 있습니까?',
            periodMonths: 3,
            conditions: ['any_treatment'],
        },
        {
            ruleId: 'std_2',
            question: '최근 3개월 이내 혈압강하제, 신경안정제, 수면제, 각성제, 진통제 등 약물을 상시 복용한 사실이 있습니까?',
            periodMonths: 3,
            conditions: ['chronic_medication'],
            targetMedications: ['혈압강하제', '신경안정제', '수면제', '각성제', '진통제'],
        },
        {
            ruleId: 'std_3',
            question: '최근 1년 이내 추가검사(재검사)를 받은 사실이 있습니까?',
            periodMonths: 12,
            conditions: ['additional_test'],
        },
        {
            ruleId: 'std_4',
            question: '최근 5년 이내 입원, 수술, 7일이상 치료, 30일이상 투약을 받은 사실이 있습니까?',
            periodMonths: 60,
            conditions: ['hospitalization', 'surgery', 'treatment_7days', 'medication_30days'],
        },
        {
            ruleId: 'std_5',
            question: '최근 5년 이내 10대 질병 관련 의료행위를 받은 사실이 있습니까?',
            periodMonths: 60,
            conditions: ['diagnosis', 'treatment', 'hospitalization', 'surgery', 'medication'],
            targetDiseases: ['암', '백혈병', '고혈압', '협심증', '심근경색', '심장판막증', '간경화증', '뇌졸중', '뇌출혈', '뇌경색', '당뇨병', '에이즈'],
        },
        {
            ruleId: 'std_6',
            question: '건강고지형 할인 상품: 최근 N년 이내 입원/수술 여부',
            periodMonths: 120,
            conditions: ['hospitalization', 'surgery'],
        },
    ],
};

export const ALL_RULES = {
    simple: SIMPLE_INSURANCE_RULES,
    mild: MILD_INSURANCE_RULES,
    standard: STANDARD_INSURANCE_RULES,
};
