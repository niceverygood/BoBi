// lib/insurance/exception-diseases-loader.ts
// 2026년 기준 생보/손보 예외질환 데이터를 로드하고 검색하는 유틸

import exceptionData from './exception-diseases-2026.json';

export interface ExceptionDisease {
    insurer: string;
    disease: string;
    accidentLimit: string;
    periodCondition: string;
    hospitalization: string;
    restrictions: string;
    note: string;
}

const data = exceptionData as ExceptionDisease[];

/** 보험사 목록 */
export function getInsurers(): string[] {
    return [...new Set(data.map(d => d.insurer))];
}

/** 질병명으로 검색 (부분 매칭) */
export function searchByDisease(query: string): ExceptionDisease[] {
    const q = query.toLowerCase().replace(/\s/g, '');
    return data.filter(d => d.disease.toLowerCase().replace(/\s/g, '').includes(q));
}

/** 보험사 + 질병명으로 검색 */
export function searchByInsurerAndDisease(insurer: string, disease: string): ExceptionDisease[] {
    const q = disease.toLowerCase().replace(/\s/g, '');
    return data.filter(d =>
        d.insurer === insurer &&
        d.disease.toLowerCase().replace(/\s/g, '').includes(q)
    );
}

/** 보험사별 예외질환 목록 */
export function getByInsurer(insurer: string): ExceptionDisease[] {
    return data.filter(d => d.insurer === insurer);
}

/** 전체 데이터 수 */
export function getTotalCount(): number {
    return data.length;
}
