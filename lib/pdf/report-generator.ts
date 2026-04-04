// lib/pdf/report-generator.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * CSS 변수의 oklch 값을 rgb로 변환하여 clone에 주입
 * html2canvas가 oklch()를 파싱 못 하는 문제 해결
 */
function injectRgbOverrides(clone: HTMLElement) {
    // 1. 루트의 CSS 변수에서 사용하는 oklch 값을 rgb로 변환
    const tempEl = document.createElement('div');
    document.body.appendChild(tempEl);

    // 주요 CSS 변수들을 읽어서 rgb로 변환
    const cssVarMap: Record<string, string> = {};
    const rootStyle = getComputedStyle(document.documentElement);
    const varsToConvert = [
        '--primary', '--primary-foreground',
        '--secondary', '--secondary-foreground',
        '--muted', '--muted-foreground',
        '--accent', '--accent-foreground',
        '--destructive', '--destructive-foreground',
        '--border', '--input', '--ring',
        '--background', '--foreground',
        '--card', '--card-foreground',
        '--popover', '--popover-foreground',
    ];

    for (const varName of varsToConvert) {
        const value = rootStyle.getPropertyValue(varName).trim();
        if (value) {
            tempEl.style.color = `var(${varName})`;
            const computed = getComputedStyle(tempEl).color;
            if (computed) {
                cssVarMap[varName] = computed;
            }
        }
    }
    document.body.removeChild(tempEl);

    // 2. clone의 :root에 rgb 값으로 오버라이드
    const styleOverride = document.createElement('style');
    let cssText = ':root, * {\n';
    for (const [varName, rgbValue] of Object.entries(cssVarMap)) {
        // oklch를 직접 쓰는 color-* 변수도 오버라이드
        cssText += `  ${varName}: ${rgbValue} !important;\n`;
        cssText += `  --color${varName.replace('--', '-')}: ${rgbValue} !important;\n`;
    }
    cssText += '}\n';
    styleOverride.textContent = cssText;
    clone.prepend(styleOverride);

    // 3. 모든 요소의 computed style을 인라인으로 적용
    const allEls = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
    for (const el of allEls) {
        try {
            el.style.overflowX = 'visible';
            el.style.overflowY = 'visible';
            el.style.wordBreak = 'break-word';
            el.style.overflowWrap = 'break-word';
            el.style.boxShadow = 'none';
            el.style.backdropFilter = 'none';
            el.style.transition = 'none';
            el.style.animation = 'none';

            if (el.tagName === 'TD' || el.tagName === 'TH') {
                el.style.whiteSpace = 'normal';
                el.style.maxWidth = 'none';
            }
        } catch { /* ignore */ }
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
        color: '#000000',
    });

    document.body.appendChild(clone);
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 300));

    // oklch → rgb 변환
    injectRgbOverrides(clone);

    // 한 번 더 대기 (스타일 적용)
    await new Promise(resolve => setTimeout(resolve, 200));

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
            onclone: (doc) => {
                // onclone에서도 oklch CSS 변수를 rgb로 강제 오버라이드
                const root = doc.documentElement;
                const style = doc.createElement('style');
                let css = ':root, :host, * {\n';
                for (const [varName, rgbValue] of Object.entries(
                    (() => {
                        const map: Record<string, string> = {};
                        const temp = document.createElement('div');
                        document.body.appendChild(temp);
                        const vars = ['--primary', '--primary-foreground', '--secondary', '--muted', '--muted-foreground',
                            '--accent', '--border', '--background', '--foreground', '--card', '--card-foreground',
                            '--destructive', '--ring', '--input'];
                        for (const v of vars) {
                            temp.style.color = `var(${v})`;
                            const c = getComputedStyle(temp).color;
                            if (c) map[v] = c;
                        }
                        document.body.removeChild(temp);
                        return map;
                    })()
                )) {
                    css += `  ${varName}: ${rgbValue} !important;\n`;
                }
                css += '}\n';
                style.textContent = css;
                root.querySelector('head')?.appendChild(style);
            },
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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
