// 날짜 검증 로직 테스트 스크립트
// Usage: npx tsx scripts/test-date-validator.ts

import type { AnalysisResult, AnalysisItem, MedicalDetail } from '../types/analysis';

// validateAndCorrectDates 로직을 인라인으로 구현 (import 없이 테스트)

function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(/[.\/]/g, '-').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
}

function isWithinMonths(targetDate: Date, referenceDate: Date, months: number): boolean {
    const cutoffDate = new Date(referenceDate);
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return targetDate >= cutoffDate && targetDate <= referenceDate;
}

function monthsBetween(from: Date, to: Date): number {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// ─── 테스트 케이스 ─────────────────────────────────────────

const TODAY = '2026-03-28';
const TODAY_DATE = parseDate(TODAY)!;

console.log('═══════════════════════════════════════════');
console.log('  날짜 검증 로직 테스트');
console.log(`  기준일: ${TODAY}`);
console.log('═══════════════════════════════════════════\n');

// 테스트 1: 3개월 이내 검증
console.log('┌─ 테스트 1: "최근 3개월 이내" 검증');
const cases3m = [
    { date: '2026-03-15', expected: true,  desc: '13일 전 → 기간 내' },
    { date: '2026-02-01', expected: true,  desc: '약 2개월 전 → 기간 내' },
    { date: '2025-12-29', expected: true,  desc: '약 3개월 전 → 기간 내 (경계)' },
    { date: '2025-12-27', expected: false, desc: '약 3개월 1일 전 → 기간 밖' },
    { date: '2025-03-12', expected: false, desc: '약 12개월 전 → 기간 밖 ❌ (AI 실수 포인트)' },
    { date: '2024-07-31', expected: false, desc: '약 20개월 전 → 기간 밖' },
];

let pass3m = 0;
for (const c of cases3m) {
    const date = parseDate(c.date)!;
    const result = isWithinMonths(date, TODAY_DATE, 3);
    const ok = result === c.expected;
    console.log(`│ ${ok ? '✅' : '❌'} ${c.date}: ${c.desc} → ${result ? '기간내' : '기간밖'} (예상: ${c.expected ? '기간내' : '기간밖'})`);
    if (ok) pass3m++;
}
console.log(`└─ 결과: ${pass3m}/${cases3m.length} 통과\n`);

// 테스트 2: 1년(12개월) 이내 검증
console.log('┌─ 테스트 2: "최근 1년 이내" 검증');
const cases1y = [
    { date: '2026-03-15', expected: true,  desc: '13일 전 → 기간 내' },
    { date: '2025-10-01', expected: true,  desc: '약 6개월 전 → 기간 내' },
    { date: '2025-03-29', expected: true,  desc: '약 12개월 전 → 기간 내 (경계)' },
    { date: '2025-03-12', expected: false, desc: '약 12개월 16일 전 → 기간 밖 (cutoff=2025-03-28)' },
    { date: '2025-02-28', expected: false, desc: '약 13개월 전 → 기간 밖' },
    { date: '2024-07-31', expected: false, desc: '약 20개월 전 → 기간 밖 ❌ (AI 실수 포인트)' },
];

let pass1y = 0;
for (const c of cases1y) {
    const date = parseDate(c.date)!;
    const result = isWithinMonths(date, TODAY_DATE, 12);
    const ok = result === c.expected;
    console.log(`│ ${ok ? '✅' : '❌'} ${c.date}: ${c.desc} → ${result ? '기간내' : '기간밖'} (예상: ${c.expected ? '기간내' : '기간밖'})`);
    if (ok) pass1y++;
}
console.log(`└─ 결과: ${pass1y}/${cases1y.length} 통과\n`);

// 테스트 3: 2년(24개월) 이내 검증
console.log('┌─ 테스트 3: "최근 2년 이내" 검증');
const cases2y = [
    { date: '2025-03-12', expected: true,  desc: '약 12개월 전 → 기간 내' },
    { date: '2024-07-31', expected: true,  desc: '약 20개월 전 → 기간 내' },
    { date: '2024-03-29', expected: true,  desc: '약 24개월 전 → 기간 내 (경계)' },
    { date: '2024-02-28', expected: false, desc: '약 25개월 전 → 기간 밖' },
    { date: '2023-01-01', expected: false, desc: '약 39개월 전 → 기간 밖' },
];

let pass2y = 0;
for (const c of cases2y) {
    const date = parseDate(c.date)!;
    const result = isWithinMonths(date, TODAY_DATE, 24);
    const ok = result === c.expected;
    console.log(`│ ${ok ? '✅' : '❌'} ${c.date}: ${c.desc} → ${result ? '기간내' : '기간밖'} (예상: ${c.expected ? '기간내' : '기간밖'})`);
    if (ok) pass2y++;
}
console.log(`└─ 결과: ${pass2y}/${cases2y.length} 통과\n`);

// 테스트 4: 5년(60개월) 이내 검증
console.log('┌─ 테스트 4: "최근 5년 이내" 검증');
const cases5y = [
    { date: '2024-07-31', expected: true,  desc: '약 20개월 전 → 기간 내' },
    { date: '2022-01-01', expected: true,  desc: '약 51개월 전 → 기간 내' },
    { date: '2021-03-29', expected: true,  desc: '약 60개월 전 → 기간 내 (경계)' },
    { date: '2021-02-28', expected: false, desc: '약 61개월 전 → 기간 밖' },
    { date: '2020-01-01', expected: false, desc: '약 75개월 전 → 기간 밖' },
];

let pass5y = 0;
for (const c of cases5y) {
    const date = parseDate(c.date)!;
    const result = isWithinMonths(date, TODAY_DATE, 60);
    const ok = result === c.expected;
    console.log(`│ ${ok ? '✅' : '❌'} ${c.date}: ${c.desc} → ${result ? '기간내' : '기간밖'} (예상: ${c.expected ? '기간내' : '기간밖'})`);
    if (ok) pass5y++;
}
console.log(`└─ 결과: ${pass5y}/${cases5y.length} 통과\n`);

// 테스트 5: monthsBetween 정확성
console.log('┌─ 테스트 5: monthsBetween 정확성');
const monthCases = [
    { from: '2025-03-12', expected: 12, desc: '2025-03-12 → 12개월 전' },
    { from: '2024-07-31', expected: 20, desc: '2024-07-31 → 20개월 전' },
    { from: '2026-01-15', expected: 2,  desc: '2026-01-15 → 2개월 전' },
    { from: '2026-03-01', expected: 0,  desc: '2026-03-01 → 0개월 전 (같은 달)' },
];

let passM = 0;
for (const c of monthCases) {
    const from = parseDate(c.from)!;
    const result = monthsBetween(from, TODAY_DATE);
    const ok = result === c.expected;
    console.log(`│ ${ok ? '✅' : '❌'} ${c.from}: ${c.desc} → 실제: ${result}개월 (예상: ${c.expected}개월)`);
    if (ok) passM++;
}
console.log(`└─ 결과: ${passM}/${monthCases.length} 통과\n`);

// 총 결과
const total = pass3m + pass1y + pass2y + pass5y + passM;
const totalMax = cases3m.length + cases1y.length + cases2y.length + cases5y.length + monthCases.length;
console.log('═══════════════════════════════════════════');
console.log(`  전체 결과: ${total}/${totalMax} 통과 ${total === totalMax ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
console.log('═══════════════════════════════════════════');

if (total !== totalMax) {
    process.exit(1);
}
