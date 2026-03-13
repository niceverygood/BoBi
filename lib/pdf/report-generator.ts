// lib/pdf/report-generator.ts
// 분석 결과 PDF 리포트 생성기

import type { AnalysisResult } from '@/types/analysis';

const CATEGORY_LABELS: Record<string, string> = {
    '3months_visit': '최근 3개월 이내 7일 이상 통원',
    '3months_medication': '최근 3개월 이내 투약',
    '1year_hospitalization': '최근 1년 이내 입원 또는 수술',
    '2year_hospitalization': '최근 2년 이내 입원 또는 수술',
    '5year_major_disease': '최근 5년 이내 주요 질병',
    'ongoing_medication': '현재 상시 복용 중인 약물',
};

function getSeverityLabel(severity: string): string {
    switch (severity) {
        case 'high': return '🔴 높음';
        case 'medium': return '🟡 중간';
        case 'low': return '🟢 낮음';
        default: return severity;
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function generateReportHtml(result: AnalysisResult, customerName?: string): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>BoBi 고지사항 분석 리포트</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Noto Sans KR', -apple-system, sans-serif;
            color: #1a1a2e;
            background: #fff;
            font-size: 11px;
            line-height: 1.6;
        }

        .page { 
            max-width: 210mm; 
            margin: 0 auto; 
            padding: 15mm 20mm; 
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1B4F72;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .header-left h1 {
            font-size: 22px;
            font-weight: 700;
            color: #1B4F72;
        }
        .header-left p {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
        }
        .header-right {
            text-align: right;
            font-size: 10px;
            color: #888;
        }
        .header-right .date { font-size: 12px; color: #333; font-weight: 500; }
        
        /* Info Box */
        .info-box {
            background: #f0f4f8;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            gap: 24px;
        }
        .info-box .label { color: #666; font-size: 10px; }
        .info-box .value { font-weight: 600; font-size: 12px; }
        
        /* Summary */
        .summary-box {
            background: linear-gradient(135deg, #1B4F72 0%, #2980B9 100%);
            color: white;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 20px;
        }
        .summary-box h3 { font-size: 13px; font-weight: 600; margin-bottom: 6px; opacity: 0.9; }
        .summary-box p { font-size: 12px; line-height: 1.7; }
        
        /* Section */
        .section { margin-bottom: 16px; }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #1B4F72;
            border-left: 4px solid #1B4F72;
            padding-left: 10px;
            margin-bottom: 10px;
        }
        
        /* Item Card */
        .item-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 8px;
            overflow: hidden;
        }
        .item-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        .badge-yes { background: #fee2e2; color: #dc2626; }
        .badge-no { background: #dcfce7; color: #16a34a; }
        .item-question { font-size: 11px; font-weight: 500; }
        .item-summary { padding: 8px 12px; font-size: 11px; color: #475569; }
        
        /* Detail Table */
        .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin: 0;
        }
        .detail-table th {
            background: #f1f5f9;
            padding: 5px 8px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-table td {
            padding: 4px 8px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }
        .detail-table tr:last-child td { border-bottom: none; }
        
        /* Risk Flags */
        .risk-card {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 6px;
        }
        .risk-severity { font-size: 10px; white-space: nowrap; }
        .risk-flag { font-size: 11px; font-weight: 500; }
        .risk-rec { font-size: 10px; color: #64748b; margin-top: 2px; }
        
        /* Footer */
        .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { padding: 10mm 15mm; }
            .item-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
<div class="page">

    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <h1>🤖 BoBi 고지사항 분석 리포트</h1>
            <p>AI 보험 분석 어시스턴트</p>
        </div>
        <div class="header-right">
            <div class="date">${dateStr}</div>
            <div>Report ID: ${Date.now().toString(36).toUpperCase()}</div>
        </div>
    </div>

    <!-- Info Box -->
    <div class="info-box">
        ${customerName ? `<div><div class="label">고객명</div><div class="value">${escapeHtml(customerName)}</div></div>` : ''}
        <div><div class="label">분석 기준일</div><div class="value">${result.analysisDate || dateStr}</div></div>
        <div><div class="label">데이터 기간</div><div class="value">${escapeHtml(result.dataRange || '-')}</div></div>
        <div><div class="label">분석 항목</div><div class="value">${result.items.length}건</div></div>
    </div>

    <!-- Overall Summary -->
    <div class="summary-box">
        <h3>📋 전체 요약</h3>
        <p>${escapeHtml(result.overallSummary || '')}</p>
    </div>
`;

    // Risk Flags
    if (result.riskFlags && result.riskFlags.length > 0) {
        html += `
    <div class="section">
        <div class="section-title">⚠️ 주의사항</div>
`;
        for (const flag of result.riskFlags) {
            html += `
        <div class="risk-card">
            <div class="risk-severity">${getSeverityLabel(flag.severity)}</div>
            <div>
                <div class="risk-flag">${escapeHtml(flag.flag)}</div>
                <div class="risk-rec">${escapeHtml(flag.recommendation)}</div>
            </div>
        </div>
`;
        }
        html += `    </div>\n`;
    }

    // Analysis Items
    html += `
    <div class="section">
        <div class="section-title">📊 고지사항 상세 분석</div>
`;

    for (const item of result.items) {
        const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
        const badgeClass = item.applicable ? 'badge-yes' : 'badge-no';
        const badgeText = item.applicable ? '해당' : '미해당';

        html += `
        <div class="item-card">
            <div class="item-header">
                <span class="badge ${badgeClass}">${badgeText}</span>
                <span class="item-question">${escapeHtml(categoryLabel)}</span>
            </div>
            <div class="item-summary">${escapeHtml(item.summary)}</div>
`;

        if (item.applicable && item.details && item.details.length > 0) {
            html += `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>날짜</th>
                        <th>병원</th>
                        <th>진단명</th>
                        <th>구분</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
`;
            for (const d of item.details) {
                html += `
                    <tr>
                        <td>${escapeHtml(d.date || '-')}</td>
                        <td>${escapeHtml(d.hospital || '-')}</td>
                        <td>${escapeHtml(d.diagnosisName || d.diagnosisCode || '-')}</td>
                        <td>${escapeHtml(d.type || '-')}</td>
                        <td>${escapeHtml(d.medication || d.note || '-')}</td>
                    </tr>
`;
            }
            html += `
                </tbody>
            </table>
`;
        }

        html += `        </div>\n`;
    }

    html += `    </div>\n`;

    // Footer
    html += `
    <div class="footer">
        이 리포트는 BoBi AI 보험 분석 어시스턴트에 의해 자동 생성되었습니다.<br>
        분석 결과는 참고용이며, 최종 판단은 보험사 심사 기준에 따릅니다.<br>
        © ${now.getFullYear()} BoBi — bobi.co.kr
    </div>

</div>
</body>
</html>`;

    return html;
}

/**
 * 새 창에서 PDF로 인쇄 (한글 완벽 지원)
 */
export function downloadReportPdf(result: AnalysisResult, customerName?: string): void {
    const html = generateReportHtml(result, customerName);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for fonts to load, then trigger print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
}
