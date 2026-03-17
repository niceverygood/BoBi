// lib/pdf/report-generator.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generateReportPDF(
    reportElement: HTMLElement,
    filename: string = 'BoBi_분석리포트'
): Promise<void> {
    // Clone the element and append to body for accurate rendering
    const clone = reportElement.cloneNode(true) as HTMLElement;

    // Ensure the clone is rendered at exact A4 width with all text visible
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

    // Force word-break and overflow-wrap on all child elements
    const allElements = clone.querySelectorAll('*');
    allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.wordBreak = 'break-word';
        htmlEl.style.overflowWrap = 'break-word';
        // Ensure table cells don't clip
        if (htmlEl.tagName === 'TD' || htmlEl.tagName === 'TH') {
            htmlEl.style.whiteSpace = 'normal';
            htmlEl.style.maxWidth = 'none';
        }
    });

    document.body.appendChild(clone);

    // Wait for fonts and layout to settle
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        // Render HTML to canvas with high quality settings
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794,
            scrollX: 0,
            scrollY: 0,
            removeContainer: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // Split across pages properly
        let remainingHeight = imgHeight;
        let sourceY = 0;
        let pageIndex = 0;

        while (remainingHeight > 0) {
            if (pageIndex > 0) {
                pdf.addPage();
            }

            const sliceHeight = Math.min(remainingHeight, pageHeight);
            // Calculate source coordinates in canvas pixels
            const sourceYPx = (sourceY / imgHeight) * canvas.height;
            const sliceHeightPx = (sliceHeight / imgHeight) * canvas.height;

            // Create a temp canvas for this page slice
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeightPx;
            const ctx = pageCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(
                    canvas,
                    0, sourceYPx, canvas.width, sliceHeightPx,
                    0, 0, pageCanvas.width, sliceHeightPx
                );
            }

            const pageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, sliceHeight);

            sourceY += sliceHeight;
            remainingHeight -= pageHeight;
            pageIndex++;
        }

        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        pdf.save(`${filename}_${dateStr}.pdf`);
    } finally {
        // Clean up
        document.body.removeChild(clone);
    }
}
