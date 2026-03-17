// lib/kcd/lookup.ts
// KCD(한국표준질병사인분류) 코드 조회 유틸리티
// 건강보험심사평가원 질병분류 5단계 데이터 기반 (14,283개 코드)

// Full lookup: code -> { name, en, cat, catName, mid, midName, parent, parentName, body }
import fullData from '@/data/kcd-lookup.json';

// Types
export interface KcdInfo {
    code: string;
    name: string;            // 한글 질병명
    englishName: string;     // 영문명
    categoryCode: string;    // 대분류코드 (예: A00-B99)
    categoryName: string;    // 대분류명 (예: 특정 감염성 및 기생충성 질환)
    midCode: string;         // 중분류코드
    midName: string;         // 중분류명
    parentCode: string;      // 소분류(상위)코드
    parentName: string;      // 상위 질병명
    bodyPart: string;        // 신체부위
}

interface RawKcdEntry {
    name: string;
    en: string;
    cat: string;
    catName: string;
    mid: string;
    midName: string;
    parent: string;
    parentName: string;
    body: string;
}

// Cast the imported data
const kcdDB = fullData as Record<string, RawKcdEntry>;

/**
 * KCD 코드로 질병 정보 조회
 * 정확한 코드 매칭 + prefix 매칭(상위코드) 지원
 */
export function lookupKcd(code: string): KcdInfo | null {
    if (!code) return null;

    const normalized = code.toUpperCase().trim();

    // 1. 정확한 매칭
    const exact = kcdDB[normalized];
    if (exact) {
        return toKcdInfo(normalized, exact);
    }

    // 2. 소수점 제거하여 상위 코드로 시도 (예: I10.0 → I10)
    const dotIdx = normalized.indexOf('.');
    if (dotIdx > 0) {
        const parent = normalized.substring(0, dotIdx);
        const parentEntry = kcdDB[parent];
        if (parentEntry) {
            return toKcdInfo(normalized, parentEntry);
        }
    }

    // 3. 앞 3글자로 시도 (예: J301 → J30)
    if (normalized.length >= 3) {
        const prefix = normalized.substring(0, 3);
        const prefixEntry = kcdDB[prefix];
        if (prefixEntry) {
            return toKcdInfo(normalized, prefixEntry);
        }
    }

    return null;
}

/**
 * 여러 KCD 코드를 한번에 조회
 */
export function lookupKcdBatch(codes: string[]): Map<string, KcdInfo> {
    const result = new Map<string, KcdInfo>();
    for (const code of codes) {
        const info = lookupKcd(code);
        if (info) {
            result.set(code, info);
        }
    }
    return result;
}

/**
 * KCD 코드가 특정 대분류에 속하는지 확인
 * 예: isInCategory('C34', 'C00-D48') → true (신생물)
 */
export function isInCategory(code: string, categoryRange: string): boolean {
    const info = lookupKcd(code);
    if (!info) return false;
    return info.categoryCode === categoryRange;
}

/**
 * KCD 코드가 특정 코드 범위에 속하는지 확인
 * 예: isInRange('I10', 'I10-I15') → true
 * 예: isInRange('E11.2', 'E10-E14') → true
 */
export function isInRange(code: string, range: string): boolean {
    if (!code || !range) return false;

    const normalized = code.toUpperCase().trim();

    // 단일 코드인 경우
    if (!range.includes('-')) {
        return normalized === range.toUpperCase().trim() ||
            normalized.startsWith(range.toUpperCase().trim());
    }

    // 범위인 경우 (예: I10-I15, C00-C97)
    const [start, end] = range.toUpperCase().trim().split('-').map(s => s.trim());

    // 알파벳 prefix 추출
    const codePrefix = normalized.match(/^[A-Z]+/)?.[0] || '';
    const startPrefix = start.match(/^[A-Z]+/)?.[0] || '';
    const endPrefix = end.match(/^[A-Z]+/)?.[0] || '';

    // 숫자 부분 추출 (소수점 이전)
    const codeNum = parseFloat(normalized.replace(/^[A-Z]+/, '').split('.')[0]) || 0;
    const startNum = parseFloat(start.replace(/^[A-Z]+/, '')) || 0;
    const endNum = parseFloat(end.replace(/^[A-Z]+/, '')) || 0;

    // 같은 알파벳 prefix인 경우 숫자로 비교
    if (codePrefix === startPrefix && codePrefix === endPrefix) {
        return codeNum >= startNum && codeNum <= endNum;
    }

    // 다른 prefix인 경우 (예: C00-D48)
    if (codePrefix >= startPrefix && codePrefix <= endPrefix) {
        if (codePrefix === startPrefix) return codeNum >= startNum;
        if (codePrefix === endPrefix) return codeNum <= endNum;
        return true; // 중간 알파벳
    }

    return false;
}

/**
 * 특정 KCD 코드의 모든 하위 코드 찾기
 * 예: getChildCodes('I10') → ['I10', 'I10.0', 'I10.1', ...]
 */
export function getChildCodes(parentCode: string): string[] {
    if (!parentCode) return [];
    const normalized = parentCode.toUpperCase().trim();
    const children: string[] = [];

    for (const code of Object.keys(kcdDB)) {
        if (code === normalized || code.startsWith(normalized + '.') || code.startsWith(normalized)) {
            children.push(code);
        }
    }

    return children;
}

/**
 * KCD 코드의 질병명을 반환 (코드 없으면 원래 값 반환)
 * UI 표시용 간단 함수
 */
export function getDiseaseName(code: string, fallback?: string): string {
    const info = lookupKcd(code);
    return info?.name || fallback || code;
}

/**
 * KCD 코드 + 질병명을 "코드 (질병명)" 형태로 포맷
 */
export function formatKcdCode(code: string): string {
    const info = lookupKcd(code);
    if (!info) return code;
    return `${code} (${info.name})`;
}

/**
 * 신체부위 반환
 */
export function getBodyPart(code: string): string {
    const info = lookupKcd(code);
    return info?.bodyPart || '';
}

/**
 * 6대 질병 여부를 KCD DB 기반으로 정확하게 판별
 */
export function isMajor6Disease(code: string): { isMajor: boolean; diseaseName: string } {
    if (!code) return { isMajor: false, diseaseName: '' };

    // 암 (C00-C97, D00-D09)
    if (isInRange(code, 'C00-C97') || isInRange(code, 'D00-D09')) {
        return { isMajor: true, diseaseName: '암(악성신생물)' };
    }

    // 뇌졸중 (I60-I69)
    if (isInRange(code, 'I60-I69')) {
        return { isMajor: true, diseaseName: '뇌졸중(뇌혈관질환)' };
    }

    // 심근경색 (I21-I23)
    if (isInRange(code, 'I21-I23')) {
        return { isMajor: true, diseaseName: '심근경색' };
    }

    // 협심증 (I20)
    if (isInRange(code, 'I20-I20')) {
        return { isMajor: true, diseaseName: '협심증' };
    }

    // 심장판막증 (I05-I08, I34-I37)
    if (isInRange(code, 'I05-I08') || isInRange(code, 'I34-I37')) {
        return { isMajor: true, diseaseName: '심장판막증' };
    }

    // 간경화 (K70.3, K74)
    const normalized = code.toUpperCase().trim();
    if (normalized === 'K70.3' || normalized.startsWith('K70.3') || normalized.startsWith('K74')) {
        return { isMajor: true, diseaseName: '간경화' };
    }

    return { isMajor: false, diseaseName: '' };
}

/**
 * 보상제외 질병코드 여부 확인 (약관 제5조 ②항)
 */
export function isExcludedDisease(code: string): { excluded: boolean; reason: string } {
    if (!code) return { excluded: false, reason: '' };

    if (isInRange(code, 'F04-F99')) return { excluded: true, reason: '정신 및 행동장애 (제5조②항)' };
    if (isInRange(code, 'N96-N98')) return { excluded: true, reason: '습관성 유산/불임/인공수정 합병증 (보장개시 2년 후 보상)' };
    if (isInRange(code, 'O00-O99')) return { excluded: true, reason: '임신/출산/산후기' };
    if (isInRange(code, 'Q00-Q99')) return { excluded: true, reason: '선천기형/변형/염색체이상' };

    const normalized = code.toUpperCase().trim();
    if (normalized.startsWith('E66')) return { excluded: true, reason: '비만' };
    if (['N39.3', 'N39.4', 'R32'].some(c => normalized.startsWith(c))) return { excluded: true, reason: '요실금' };
    if (isInRange(code, 'I84-I84') || isInRange(code, 'K60-K62') || isInRange(code, 'K64-K64')) {
        return { excluded: true, reason: '치핵/직장/항문 질환 (질병수술비 제외, 1~5종수술비 보상 가능)' };
    }
    if (isInRange(code, 'K00-K08')) return { excluded: true, reason: '치과질환' };

    return { excluded: false, reason: '' };
}

// ─── Private ────────────────────────────────────────────────────

function toKcdInfo(code: string, raw: RawKcdEntry): KcdInfo {
    return {
        code,
        name: raw.name,
        englishName: raw.en,
        categoryCode: raw.cat,
        categoryName: raw.catName,
        midCode: raw.mid,
        midName: raw.midName,
        parentCode: raw.parent,
        parentName: raw.parentName,
        bodyPart: raw.body,
    };
}
