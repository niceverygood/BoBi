// lib/pdf/report-generator.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * oklch/lab 등 html2canvas 미지원 CSS 색상을 rgb로 변환
 * getComputedStyle로 브라우저가 계산한 실제 색상값(rgb)을 가져와 인라인 적용
 */
function convertColorsToRgb(element: HTMLElement) {
    const allElements = element.querySelectorAll('*');
    const elementsToProcess = [element, ...Array.from(allElements)] as HTMLElement[];

    for (const el of elementsToProcess) {
        try {
            const computed = window.getComputedStyle(el);

            // 배경색
            const bgColor = computed.backgroundColor;
            if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
                el.style.backgroundColor = bgColor;
            }

            // 텍스트 색상
            const color = computed.color;
            if (color) {
                el.style.color = color;
            }

            // 테두리 색상
            const borderColor = computed.borderColor;
            if (borderColor) {
                el.style.borderColor = borderColor;
            }

            // 배경 이미지 (gradient) — oklch gradient를 단색으로 대체
            const bgImage = computed.backgroundImage;
            if (bgImage && bgImage !== 'none' && (bgImage.includes('oklch') || bgImage.includes('lab('))) {
                el.style.backgroundImage = 'none';
                // gradient가 있으면 배경색 유지
            }

            // backdrop-filter 제거 (미지원)
            if (computed.backdropFilter && computed.backdropFilter !== 'none') {
                el.style.backdropFilter = 'none';
            }

            // box-shadow의 oklch 제거
            if (computed.boxShadow && computed.boxShadow !== 'none') {
                el.style.boxShadow = 'none';
            }

            // overflow 처리
            el.style.overflowX = 'visible';
            el.style.overflowY = 'visible';
            el.style.wordBreak = 'break-word';
            el.style.overflowWrap = 'break-word';

            if (el.tagName === 'TD' || el.tagName === 'TH') {
                el.style.whiteSpace = 'normal';
                el.style.maxWidth = 'none';
            }
        } catch {
            // computed style 접근 실패 시 무시
        }
    }
}

export async function generateReportPDF(
    reportElement: HTMLElement,
    filename: string = 'BoBi_분석리포트'
): Promise<void> {
    const clone = reportElement.cloneNode(true) as HTMLElement;

    Object.assign(clone.style, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '794px',
        zIndex: '-9999',
        opacity: '1',
        overflow: 'visible',
        pointerEvents: 'none',
        background: '#ffffff',
    });

    document.body.appendChild(clone);

    // 브라우저가 레이아웃 계산할 시간
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 300));

    // oklch → rgb 변환 (html2canvas 에러 방지)
    convertColorsToRgb(clone);

    try {
        const contentHeight = clone.scrollHeight || clone.offsetHeight;
        const maxCanvasHeight = 16000;
        const scale = contentHeight * 2 > maxCanvasHeight ? 1 : 2;

        const canvas = await html2canvas(clone, {
            scale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794,
            scrollX: 0,
            scrollY: 0,
            removeContainer: false,
            height: contentHeight,
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        let remainingHeight = imgHeight;
        let sourceY = 0;
        let pageIndex = 0;

        while (remainingHeight > 0) {
            if (pageIndex > 0) pdf.addPage();

            const sliceHeight = Math.min(remainingHeight, pageHeight);
            const sourceYPx = (sourceY / imgHeight) * canvas.height;
            const sliceHeightPx = (sliceHeight / imgHeight) * canvas.height;

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeightPx;
            const ctx = pageCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(canvas, 0, sourceYPx, canvas.width, sliceHeightPx, 0, 0, pageCanvas.width, sliceHeightPx);
            }

            pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, sliceHeight);
            sourceY += sliceHeight;
            remainingHeight -= pageHeight;
            pageIndex++;
        }

        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        pdf.save(`${filename}_${dateStr}.pdf`);
    } finally {
        document.body.removeChild(clone);
    }
}
