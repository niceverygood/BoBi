// lib/pdf/report-generator.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generateReportPDF(
    reportElement: HTMLElement,
    filename: string = 'BoBi_분석리포트'
): Promise<void> {
    // Render HTML to canvas
    const canvas = await html2canvas(reportElement, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageHeight = 297; // A4 height in mm
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Additional pages if content is longer than one page
    while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    pdf.save(`${filename}_${dateStr}.pdf`);
}
