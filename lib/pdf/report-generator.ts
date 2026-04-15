// lib/pdf/report-generator.ts
// 브라우저 기본 print 기능을 이용한 PDF 생성
// html2canvas + jsPDF 방식은 oklch() 색상 파싱 이슈가 지속적으로 발생하여
// 더 안정적인 window.print() 기반으로 전환

export async function generateReportPDF(
    reportElement: HTMLElement,
    filename: string = 'BoBi_분석리포트'
): Promise<void> {
    // 1. 새 창에 리포트 HTML 복사
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
        return;
    }

    // 2. 현재 페이지의 스타일시트 복사
    const styleSheets = Array.from(document.styleSheets);
    let stylesHtml = '';

    for (const sheet of styleSheets) {
        try {
            // 같은 origin의 스타일시트만 읽을 수 있음
            if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                // 외부 스타일시트는 link로 복사
                stylesHtml += `<link rel="stylesheet" href="${sheet.href}">`;
                continue;
            }
            const rules = Array.from(sheet.cssRules || []);
            stylesHtml += '<style>' + rules.map(r => r.cssText).join('\n') + '</style>';
        } catch {
            // CORS 에러 등은 무시
            if (sheet.href) {
                stylesHtml += `<link rel="stylesheet" href="${sheet.href}">`;
            }
        }
    }

    // 3. 리포트 HTML 추출
    const reportHtml = reportElement.outerHTML;
    const dateStr = new Date().toLocaleDateString('ko-KR');

    // 4. 인쇄용 HTML 조립
    const printHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${filename}_${dateStr}</title>
${stylesHtml}
<style>
    @page {
        size: A4;
        margin: 15mm;
    }
    html, body {
        margin: 0;
        padding: 0;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: 'Pretendard', -apple-system, 'Malgun Gothic', sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    body {
        padding: 20px;
    }
    /* 인쇄 시 페이지 나눔 최적화 */
    .space-y-6 > * + *, .space-y-4 > * + * {
        page-break-inside: avoid;
    }
    [class*="border rounded"], .rounded-lg {
        page-break-inside: avoid;
    }
    /* 버튼, 인터랙티브 요소 숨김 */
    button, .no-print {
        display: none !important;
    }
    /* 그림자 제거 (인쇄 시 번짐 방지) */
    * {
        box-shadow: none !important;
        text-shadow: none !important;
    }
    /* 링크 밑줄 제거 */
    a {
        text-decoration: none !important;
        color: inherit !important;
    }
    /* 기본 색상 강제 */
    .text-muted-foreground { color: #6b7280 !important; }
    .bg-muted\\/30, .bg-muted\\/50, .bg-muted { background-color: #f4f4f5 !important; }
    .bg-primary\\/5, .bg-primary\\/10 { background-color: #eff6ff !important; }
    .border { border-color: #e5e7eb !important; }
    .text-primary { color: #1a56db !important; }
    .bg-primary { background-color: #1a56db !important; color: #ffffff !important; }
    .text-red-500, .text-red-600, .text-red-700 { color: #ef4444 !important; }
    .bg-red-50, .bg-red-50\\/50, .bg-red-50\\/30 { background-color: #fef2f2 !important; }
    .text-amber-600, .text-amber-700, .text-amber-800 { color: #d97706 !important; }
    .bg-amber-50 { background-color: #fffbeb !important; }
    .text-green-500, .text-green-600, .text-green-700 { color: #16a34a !important; }
    .bg-green-50, .bg-green-50\\/50 { background-color: #f0fdf4 !important; }
    .text-blue-500, .text-blue-600, .text-blue-700 { color: #2563eb !important; }
    .bg-blue-50, .bg-blue-50\\/30, .bg-blue-50\\/50 { background-color: #eff6ff !important; }
    .text-violet-600, .text-violet-700, .text-violet-900 { color: #7c3aed !important; }
    .bg-violet-50, .bg-violet-50\\/30 { background-color: #f5f3ff !important; }
    .text-orange-500, .text-orange-600 { color: #ea580c !important; }
    .bg-orange-50, .bg-orange-50\\/50 { background-color: #fff7ed !important; }
    .text-slate-400, .text-slate-500 { color: #64748b !important; }
    .bg-slate-50, .bg-slate-100 { background-color: #f8fafc !important; }
    /* Badge 스타일 */
    .bg-red-500, .bg-red-500\\/80 { background-color: #ef4444 !important; color: #fff !important; }
    .bg-green-500 { background-color: #22c55e !important; color: #fff !important; }
    .bg-amber-500 { background-color: #f59e0b !important; color: #fff !important; }
    .bg-orange-500 { background-color: #f97316 !important; color: #fff !important; }
    .bg-blue-500 { background-color: #3b82f6 !important; color: #fff !important; }
    .bg-slate-400 { background-color: #94a3b8 !important; color: #fff !important; }
</style>
</head>
<body>
<div style="text-align:center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #1a56db;">
    <h1 style="margin: 0; font-size: 24px; color: #1a56db;">보비 BoBi</h1>
    <p style="margin: 5px 0 0; font-size: 12px; color: #666;">AI 보험 분석 리포트 · ${dateStr}</p>
</div>
${reportHtml}
<div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #888;">
    <p>주식회사 바틀 · bobi.co.kr · ${dateStr}</p>
</div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();

    // 5. 폰트/이미지 로딩 대기 후 인쇄 다이얼로그 열기
    await new Promise(resolve => setTimeout(resolve, 800));

    printWindow.focus();
    printWindow.print();

    // 인쇄 다이얼로그 후 창 닫기 (브라우저별 동작 차이)
    setTimeout(() => {
        try {
            printWindow.close();
        } catch { /* ignore */ }
    }, 1000);
}
