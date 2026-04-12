// lib/privacy/anonymizer.ts
// 개인정보 → 익명화 변환 라이브러리
//
// 원칙:
// 1. 식별 정보 (이름, 주민번호, 연락처, 이메일) 완전 삭제
// 2. user_id / analysis_id는 SHA-256 + salt로 일방향 해시
// 3. 생년월일 → 연령대 (10세 단위), 주소 → 시·도 단위
// 4. k-익명성 확보: 최소 5명 이상 그룹 단위 집계에만 사용

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const ANON_SALT = process.env.ANONYMIZATION_SALT || 'bobi-default-salt-change-me';

// SHA-256 해시 (재식별 불가)
export function hashId(id: string): string {
    return crypto
        .createHash('sha256')
        .update(`${id}:${ANON_SALT}`)
        .digest('hex');
}

// 생년월일 → 연령대
export function toAgeGroup(birthDate?: string | Date | null): string | null {
    if (!birthDate) return null;
    const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 20) return '10대';
    if (age < 30) return '20대';
    if (age < 40) return '30대';
    if (age < 50) return '40대';
    if (age < 60) return '50대';
    if (age < 70) return '60대';
    return '70대+';
}

// 주민번호 앞자리 → 연령대 + 성별
export function parseRRN(identity: string): { ageGroup: string | null; gender: 'M' | 'F' | null } {
    if (!identity) return { ageGroup: null, gender: null };
    const cleaned = identity.replace(/\D/g, '');
    if (cleaned.length < 7) return { ageGroup: null, gender: null };

    const yy = parseInt(cleaned.substring(0, 2), 10);
    const mm = parseInt(cleaned.substring(2, 4), 10);
    const dd = parseInt(cleaned.substring(4, 6), 10);
    const genderDigit = cleaned.charAt(6);

    // 성별
    let gender: 'M' | 'F' | null = null;
    if (['1', '3', '5', '7'].includes(genderDigit)) gender = 'M';
    else if (['2', '4', '6', '8'].includes(genderDigit)) gender = 'F';

    // 세기
    const century = ['1', '2', '5', '6'].includes(genderDigit) ? 1900 : 2000;
    const year = century + yy;

    const birth = new Date(year, mm - 1, dd);
    const ageGroup = toAgeGroup(birth);

    return { ageGroup, gender };
}

// 주소 → 시·도 단위 추출
export function toRegion(address?: string | null): string | null {
    if (!address) return null;
    const match = address.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충[북남]|전[북남]|경[북남]|제주)/);
    return match ? match[1] : null;
}

// 의료 데이터 요약 (KCD 코드만 추출, 이름 매핑은 유지)
interface DiseaseSummaryItem {
    diseaseCode: string;
    diseaseName: string;
    firstDate?: string;
    totalVisits?: number;
}

export function summarizeDiseases(diseaseSummary: DiseaseSummaryItem[] | undefined): Array<{ code: string; name: string; firstYear?: string; visits?: number }> {
    if (!Array.isArray(diseaseSummary)) return [];
    return diseaseSummary.map(d => ({
        code: d.diseaseCode || '',
        name: d.diseaseName || '',
        firstYear: d.firstDate ? d.firstDate.substring(0, 4) : undefined,
        visits: d.totalVisits,
    }));
}

// 익명화된 레코드 타입
export interface AnonymizedRecord {
    subject_hash: string;
    source_hash: string;
    age_group: string | null;
    gender: 'M' | 'F' | null;
    region: string | null;
    disease_codes: Array<{ code: string; name: string; firstYear?: string; visits?: number }>;
    medications: string[];
    treatment_pattern: string | null;
    total_visit_count: number | null;
    total_hospital_count: number | null;
    bmi: number | null;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    fasting_glucose: number | null;
    total_cholesterol: number | null;
    hdl_cholesterol: number | null;
    ldl_cholesterol: number | null;
    triglyceride: number | null;
    ast: number | null;
    alt: number | null;
    gtp: number | null;
    hemoglobin: number | null;
    gfr: number | null;
    risk_items: Array<{ riskDisease: string; relativeRisk: number; riskLevel: string; riskCategory: string }>;
    compound_risks_count: number;
    health_age: number | null;
    chronological_age: number | null;
    stroke_risk_grade: string | null;
    cardio_risk_grade: string | null;
    has_trend_data: boolean;
    worsening_metrics: string[];
    golden_time_alerts: number;
}

// 원본 analysis 레코드 → 익명화 레코드 변환
export function anonymizeAnalysis(params: {
    analysisId: string;
    userId: string;
    customerIdentity?: string;
    customerBirthDate?: string;
    customerGender?: string;
    customerAddress?: string;
    medicalHistory: unknown;
    riskReport: unknown;
    healthCheckupData?: unknown;
}): AnonymizedRecord {
    const mh = (params.medicalHistory || {}) as Record<string, unknown>;
    const rr = (params.riskReport || {}) as Record<string, unknown>;
    const hc = (params.healthCheckupData || {}) as Record<string, unknown>;

    // 인구통계 일반화
    let ageGroup: string | null = null;
    let gender: 'M' | 'F' | null = null;
    if (params.customerIdentity) {
        const parsed = parseRRN(params.customerIdentity);
        ageGroup = parsed.ageGroup;
        gender = parsed.gender;
    } else if (params.customerBirthDate) {
        ageGroup = toAgeGroup(params.customerBirthDate);
        if (params.customerGender === 'M' || params.customerGender === 'F') {
            gender = params.customerGender;
        }
    }

    // 검진 수치 추출
    const checkupPreview = (hc.checkup as { resPreviewList?: Array<Record<string, unknown>> } | undefined)?.resPreviewList?.[0];
    const toNum = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
        return isNaN(n) ? null : n;
    };

    const bp = String(checkupPreview?.resBloodPressure || '');
    const bpMatch = bp.match(/(\d+)[\/ ](\d+)/);

    // 의료 데이터 요약
    const diseaseCodes = summarizeDiseases((mh.diseaseSummary as DiseaseSummaryItem[]) || []);
    const items = (mh.items as Array<Record<string, unknown>>) || [];
    const medicationSet = new Set<string>();
    for (const item of items) {
        const meds = (item.medications as string[]) || [];
        for (const m of meds) medicationSet.add(m);
    }

    // 리스크 아이템 요약
    const riskItemsRaw = (rr.riskItems as Array<Record<string, unknown>>) || [];
    const riskItems = riskItemsRaw.map(r => ({
        riskDisease: String(r.riskDisease || ''),
        relativeRisk: Number(r.relativeRisk || 0),
        riskLevel: String(r.riskLevel || ''),
        riskCategory: String(r.riskCategory || ''),
    }));

    const compoundRisks = (rr.compoundRisks as unknown[]) || [];

    // 건강나이
    const healthAgeRaw = (hc.healthAge as { resAge?: string; resChronologicalAge?: string }) || {};
    const stroke = (hc.stroke as { resRiskGrade?: string }) || {};
    const cardio = (hc.cardio as { resRiskGrade?: string }) || {};

    return {
        subject_hash: hashId(params.userId),
        source_hash: hashId(params.analysisId),
        age_group: ageGroup,
        gender,
        region: toRegion(params.customerAddress),
        disease_codes: diseaseCodes,
        medications: [...medicationSet],
        treatment_pattern: (mh.overallSummary as string || '').substring(0, 200) || null,
        total_visit_count: null,
        total_hospital_count: null,
        bmi: toNum(checkupPreview?.resBMI),
        blood_pressure_systolic: bpMatch ? Number(bpMatch[1]) : null,
        blood_pressure_diastolic: bpMatch ? Number(bpMatch[2]) : null,
        fasting_glucose: toNum(checkupPreview?.resFastingBloodSuger),
        total_cholesterol: toNum(checkupPreview?.resTotalCholesterol),
        hdl_cholesterol: toNum(checkupPreview?.resHDLCholesterol),
        ldl_cholesterol: toNum(checkupPreview?.resLDLCholesterol),
        triglyceride: toNum(checkupPreview?.resTriglyceride),
        ast: toNum(checkupPreview?.resAST),
        alt: toNum(checkupPreview?.resALT),
        gtp: toNum(checkupPreview?.resyGPT || checkupPreview?.resGTP),
        hemoglobin: toNum(checkupPreview?.resHemoglobin),
        gfr: toNum(checkupPreview?.resGFR),
        risk_items: riskItems,
        compound_risks_count: compoundRisks.length,
        health_age: toNum(healthAgeRaw.resAge),
        chronological_age: toNum(healthAgeRaw.resChronologicalAge),
        stroke_risk_grade: stroke.resRiskGrade || null,
        cardio_risk_grade: cardio.resRiskGrade || null,
        has_trend_data: false,
        worsening_metrics: [],
        golden_time_alerts: 0,
    };
}

// 이용자가 opt-out 했는지 확인
export async function isOptedOut(svc: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await svc
        .from('statistics_opt_out')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
    return !!data;
}

// 익명화 레코드 저장 (이미 있으면 무시 — source_hash UNIQUE 제약)
export async function saveAnonymizedRecord(
    svc: SupabaseClient,
    record: AnonymizedRecord,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await svc
            .from('anonymized_analyses')
            .upsert(record, { onConflict: 'source_hash' });
        if (error) {
            console.error('[Anonymizer] 저장 실패:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}
