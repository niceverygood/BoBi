import type { HiraBasicTreatRecord, HiraPrescribeDrugRecord, HiraCarBasicTreatRecord, NhisTreatmentRecord } from './client';

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

// 건강보험공단 진료/투약정보 → 텍스트
export function formatNhisRecordsAsText(records: NhisTreatmentRecord[]): string {
    const lines: string[] = [];

    lines.push('=== 건강보험공단 진료 및 투약정보 (NHIS) ===');
    lines.push('');

    if (records.length === 0) {
        lines.push('조회된 진료/투약 기록이 없습니다.');
        return lines.join('\n');
    }

    const sorted = [...records].sort((a, b) =>
        (b.resTreatStartDate || '').localeCompare(a.resTreatStartDate || '')
    );

    lines.push('[진료내역]');
    for (const r of sorted) {
        const parts = [
            formatDate(r.resTreatStartDate),
            r.resHospitalName || '-',
            r.resTreatType || '',
            r.resType || '',
        ];
        if (r.resVisitDays) parts.push(`${r.resVisitDays}일`);
        if (r.resPrescribeCnt) parts.push(`처방${r.resPrescribeCnt}회`);
        if (r.resMedicationCnt) parts.push(`투약${r.resMedicationCnt}회`);
        lines.push(parts.filter(Boolean).join(' | '));

        if (r.resMediDetailList && r.resMediDetailList.length > 0) {
            for (const d of r.resMediDetailList) {
                const drugParts = [
                    `  → ${formatDate(d.resTreatDate)}`,
                    d.resPrescribeDrugName || '-',
                    d.resPrescribeDrugEffect || '',
                ];
                if (d.resPrescribeDays) drugParts.push(`${d.resPrescribeDays}일분`);
                if (d.resTreatTypeDet) drugParts.push(d.resTreatTypeDet);
                lines.push(drugParts.filter(Boolean).join(' | '));
            }
        }
    }

    return lines.join('\n');
}
