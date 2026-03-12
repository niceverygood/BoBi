// lib/pdf/extractor.ts

export type PdfFileType = 'basic_info' | 'prescription' | 'detail_treatment' | 'unknown';

interface ExtractedPdfData {
    text: string;
    fileType: PdfFileType;
    pageCount: number;
}

/**
 * Extract text from a PDF buffer and detect the file type
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdfData> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = (await import('pdf-parse' as any)).default;
        const data = await pdfParse(buffer);
        const text = data.text;
        const fileType = detectFileType(text);

        return {
            text,
            fileType,
            pageCount: data.numpages,
        };
    } catch (error) {
        console.error('PDF parse error:', error);
        throw new Error(`PDF 파싱 실패: ${(error as Error).message}`);
    }
}

/**
 * Detect the type of 심평원 (HIRA) PDF based on content
 */
function detectFileType(text: string): PdfFileType {
    const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();

    if (normalizedText.includes('주상병코드') || normalizedText.includes('기본진료정보') || normalizedText.includes('진료구분')) {
        return 'basic_info';
    }

    if (normalizedText.includes('약품명') || normalizedText.includes('성분명') || normalizedText.includes('처방조제')) {
        return 'prescription';
    }

    if (normalizedText.includes('진료내역') || normalizedText.includes('세부진료') || normalizedText.includes('코드명')) {
        return 'detail_treatment';
    }

    return 'unknown';
}

/**
 * Clean and structure the extracted text for AI processing
 * Handles column misalignment common in table-based PDFs
 */
export function structureExtractedText(text: string, fileType: PdfFileType): string {
    // Split by date pattern to separate records
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    let structured = '';

    switch (fileType) {
        case 'basic_info':
            structured = `[기본진료정보]\n`;
            structured += `컬럼: 진료시작일 | 병의원 | 진단과 | 입원/외래 | 주상병코드 | 주상병명 | 진료비\n`;
            structured += `---\n`;
            break;
        case 'prescription':
            structured = `[처방조제정보]\n`;
            structured += `컬럼: 진료시작일 | 병의원 | 약품명 | 성분명 | 투약량 | 투여횟수 | 투약일수\n`;
            structured += `---\n`;
            break;
        case 'detail_treatment':
            structured = `[세부진료정보]\n`;
            structured += `컬럼: 진료시작일 | 병의원 | 진료내역 | 코드명 | 투약량 | 투여횟수 | 투약일수\n`;
            structured += `---\n`;
            break;
        default:
            structured = `[알 수 없는 형식]\n`;
    }

    // Process lines - use date patterns to separate records
    const datePattern = /\d{4}[-./]\d{2}[-./]\d{2}/;
    let currentRecord = '';

    for (const line of lines) {
        if (datePattern.test(line) && currentRecord) {
            structured += currentRecord.trim() + '\n';
            currentRecord = line;
        } else {
            currentRecord += ' ' + line;
        }
    }

    if (currentRecord) {
        structured += currentRecord.trim() + '\n';
    }

    return structured;
}
