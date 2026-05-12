import type { HiraBasicTreatRecord, HiraPrescribeDrugRecord, HiraCarBasicTreatRecord, MyMedicineRecord } from './client';

function formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
    }
    return dateStr;
}

function formatAmount(amountStr?: string): string {
    if (!amountStr) return '';
    const num = parseInt(amountStr.replace(/\D/g, ''), 10);
    return isNaN(num) ? '' : `${num.toLocaleString()}원`;
}

export function formatCodefRecordsAsText(
    treatRecords: HiraBasicTreatRecord[],
    drugRecords: HiraPrescribeDrugRecord[],
    carRecords?: HiraCarBasicTreatRecord[],
): string {
    const lines: string[] = [];

    lines.push('=== 건강보험심사평가원 내진료정보 (HIRA) ===');
    lines.push('');

    if (treatRecords.length > 0) {
        lines.push('[기본진료내역]');
        const sorted = [...treatRecords].sort((a, b) =>
            (b.resTreatStartDate || '').localeCompare(a.resTreatStartDate || '')
        );
        for (const r of sorted) {
            const parts = [
                formatDate(r.resTreatStartDate),
                r.resHospitalName || '-',
                r.resDepartment || '',
                r.resTreatType || '',
            ];
            if (r.resDiseaseName) {
                parts.push(`${r.resDiseaseName}${r.resDiseaseCode ? `(${r.resDiseaseCode})` : ''}`);
            }
            if (r.resVisitDays) parts.push(`${r.resVisitDays}일`);
            if (r.resTotalAmount) parts.push(`총진료비 ${formatAmount(r.resTotalAmount)}`);
            if (r.resDeductibleAmt) parts.push(`본인부담 ${formatAmount(r.resDeductibleAmt)}`);
            lines.push(parts.filter(Boolean).join(' | '));
        }
        lines.push('');
    }

    if (drugRecords.length > 0) {
        lines.push('[처방조제내역]');
        const sorted = [...drugRecords].sort((a, b) =>
            (b.resTreatStartDate || '').localeCompare(a.resTreatStartDate || '')
        );
        for (const r of sorted) {
            const parts = [
                formatDate(r.resTreatStartDate),
                r.resHospitalName || '-',
                r.resDrugName || r.resIngredients || '-',
            ];
            const dosage: string[] = [];
            if (r.resOneDose) dosage.push(`1회 ${r.resOneDose}`);
            if (r.resDailyDosesNumber) dosage.push(`1일 ${r.resDailyDosesNumber}회`);
            if (r.resTotalDosingdays) dosage.push(`${r.resTotalDosingdays}일분`);
            if (dosage.length > 0) parts.push(dosage.join(' '));
            lines.push(parts.filter(Boolean).join(' | '));
        }
        lines.push('');
    }

    if (carRecords && carRecords.length > 0) {
        lines.push('[자동차보험 진료내역]');
        const sorted = [...carRecords].sort((a, b) =>
            (b.resTreatStartDate || '').localeCompare(a.resTreatStartDate || '')
        );
        for (const r of sorted) {
            const parts = [
                formatDate(r.resTreatStartDate),
                r.resHospitalName || '-',
                r.resDepartment || '',
                r.resTreatType || '',
            ];
            if (r.resDiseaseName) {
                parts.push(`${r.resDiseaseName}${r.resDiseaseCode ? `(${r.resDiseaseCode})` : ''}`);
            }
            if (r.resTreatDate) parts.push(`${r.resTreatDate}일`);
            if (r.resTotalAmount) parts.push(`청구진료비 ${formatAmount(r.resTotalAmount)}`);
            if (r.resMedicalFee) parts.push(`자보진료비 ${formatAmount(r.resMedicalFee)}`);
            lines.push(parts.filter(Boolean).join(' | '));
        }
        lines.push('');
    }

    if (treatRecords.length === 0 && drugRecords.length === 0 && (!carRecords || carRecords.length === 0)) {
        lines.push('조회된 진료 기록이 없습니다.');
    }

    return lines.join('\n');
}

// 심평원 내가먹는약 한눈에 → 텍스트
//
// ⚠️ 이종인 5/11 보고:
//   - HIRA 기본 진료내역(resBasicTreatList)에서 정신과 같은 일부 진료는 제외되어
//     "3개월 이내 통원" 항목이 누락되는 경우가 발생.
//   - 그러나 "내가먹는약 한눈에"의 처방기관(resPrescribeOrg)에는 그 통원 기록이
//     남아 있음 (처방을 받으려면 의료기관 방문이 전제이므로).
//   - 따라서 처방조제 데이터를 단순 "투약내역"으로만 표시하면 AI가 통원으로 카운트
//     못함 → STEP 1 결과에서 통원 누락.
// 해결: 처방기관(병원/의원/한의원) 방문은 [통원 이력(처방조제 기반)] 섹션을 자동
//      생성해 별도로 노출. 약국은 통원으로 안 잡힘 (prompts.ts 규칙과 일치).
export function formatMyMedicineAsText(records: MyMedicineRecord[]): string {
    const lines: string[] = [];

    lines.push('=== 심평원 내가먹는약 한눈에 ===');
    lines.push('');

    if (records.length === 0) {
        lines.push('조회된 투약 기록이 없습니다.');
        return lines.join('\n');
    }

    const sorted = [...records].sort((a, b) =>
        (b.resManufactureDate || '').localeCompare(a.resManufactureDate || '')
    );

    // ── [통원 이력(처방조제 기반)] 자동 생성 ──────────────────────────────
    // resPrescribeOrg 가 의료기관(병원/의원/한의원/치과)이면 그 날 통원 1회로 간주.
    // 약국 명칭(○○약국 등)은 통원에서 제외 (prompts.ts 의 약국 규칙과 일치).
    const visitMap = new Map<string, { date: string; org: string; drugs: string[] }>();
    for (const r of sorted) {
        const date = r.resManufactureDate;
        const org = r.resPrescribeOrg?.trim();
        if (!date || !org) continue;
        // 약국 휴리스틱 — 보통 처방기관은 약국이 아니지만 안전망
        if (/약국|pharmacy/i.test(org)) continue;
        const key = `${date}|${org}`;
        if (!visitMap.has(key)) {
            visitMap.set(key, { date, org, drugs: [] });
        }
        const v = visitMap.get(key)!;
        (r.resDrugList || []).forEach((d) => {
            const name = d.resDrugName?.trim();
            if (name) v.drugs.push(name);
        });
    }
    if (visitMap.size > 0) {
        lines.push('[통원 이력(처방조제 기반)]');
        lines.push('* 처방조제 기록은 의료기관 방문이 전제이므로 통원 1회로 간주.');
        lines.push('* HIRA 기본 진료내역에서 일부 진료과(예: 정신과)가 누락되어도 여기서 보강됨.');
        lines.push('* 약국 방문은 제외 (의료기관 = 병원/의원/한의원/치과만 카운트).');
        const visits = Array.from(visitMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        for (const v of visits) {
            const drugSummary = v.drugs.length > 0
                ? ` | 처방약: ${Array.from(new Set(v.drugs)).slice(0, 3).join(', ')}${v.drugs.length > 3 ? ' 외' : ''}`
                : '';
            lines.push(`${formatDate(v.date)} | ${v.org} | 외래(처방조제 기반 통원 추정)${drugSummary}`);
        }
        lines.push('');
    }
    // ───────────────────────────────────────────────────────────────────

    lines.push('[투약내역]');
    for (const r of sorted) {
        const header = [
            formatDate(r.resManufactureDate),
            r.resPrescribeOrg || '-',
            r.commBrandName ? `조제: ${r.commBrandName}` : '',
        ].filter(Boolean).join(' | ');
        lines.push(header);

        if (r.resDrugList && r.resDrugList.length > 0) {
            for (const d of r.resDrugList) {
                const drugParts = [
                    `  → ${d.resDrugName || '-'}`,
                    d.resIngredients || '',
                    d.resPrescribeDrugEffect || '',
                ];
                const dosage: string[] = [];
                if (d.resOneDose) dosage.push(`1회 ${d.resOneDose}`);
                if (d.resDailyDosesNumber) dosage.push(`1일 ${d.resDailyDosesNumber}회`);
                if (d.resTotalDosingdays) dosage.push(`${d.resTotalDosingdays}일분`);
                if (dosage.length > 0) drugParts.push(dosage.join(' '));
                lines.push(drugParts.filter(Boolean).join(' | '));
            }
        }
    }

    return lines.join('\n');
}
