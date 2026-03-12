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
        // Check if PDF is encrypted by looking at raw bytes
        const header = buffer.toString('utf-8', 0, Math.min(buffer.length, 4096));
        if (header.includes('/Encrypt')) {
            throw new Error('PASSWORD_PROTECTED');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = (await import('pdf-parse' as any)).default;
        const data = await pdfParse(buffer);

        // If text is empty or too short, PDF might be encrypted or image-only
        if (!data.text || data.text.trim().length < 10) {
            throw new Error('NO_TEXT_EXTRACTED');
        }

        const text = data.text;
        const fileType = detectFileType(text);

        return {
            text,
            fileType,
            pageCount: data.numpages,
        };
    } catch (error) {
        const msg = (error as Error).message || '';

        // Password-protected PDF detection
        if (
            msg === 'PASSWORD_PROTECTED' ||
            msg.includes('password') ||
            msg.includes('Password') ||
            msg.includes('encrypt') ||
            msg.includes('Encrypt') ||
            msg.includes('encrypted')
        ) {
            throw new Error('비밀번호가 설정된 PDF 파일입니다. 비밀번호를 해제한 후 다시 업로드해주세요.');
        }

        // No text extracted (image-only PDF)
        if (msg === 'NO_TEXT_EXTRACTED') {
            throw new Error('PDF에서 텍스트를 추출할 수 없습니다. 이미지로만 구성된 PDF이거나 비밀번호가 설정되어 있을 수 있습니다. 비밀번호를 해제하거나 텍스트가 포함된 PDF를 업로드해주세요.');
        }

        console.error('PDF parse error:', error);
        throw new Error(`PDF 파싱 실패: ${msg}`);
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
