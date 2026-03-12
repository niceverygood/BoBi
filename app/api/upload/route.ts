// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractPdfText, structureExtractedText } from '@/lib/pdf/extractor';

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
        }

        const contentType = request.headers.get('content-type') || '';

        // Method 1: JSON body (client already uploaded to Storage)
        if (contentType.includes('application/json')) {
            const { filePath, fileName, customerId } = await request.json();

            if (!filePath || !fileName) {
                return NextResponse.json({ error: '파일 경로가 없습니다.' }, { status: 400 });
            }

            // Download from Supabase Storage to extract text
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('pdfs')
                .download(filePath);

            if (downloadError || !fileData) {
                console.error('Storage download error:', downloadError);
                return NextResponse.json({ error: '파일 다운로드에 실패했습니다.' }, { status: 500 });
            }

            const buffer = Buffer.from(await fileData.arrayBuffer());
            const { text, fileType, pageCount } = await extractPdfText(buffer);
            const structuredText = structureExtractedText(text, fileType);

            // Save upload record
            const { data: upload, error: dbError } = await supabase
                .from('uploads')
                .insert({
                    user_id: user.id,
                    customer_id: customerId || null,
                    file_name: fileName,
                    file_path: filePath,
                    file_type: fileType === 'unknown' ? 'basic_info' : fileType,
                    raw_text: structuredText,
                })
                .select()
                .single();

            if (dbError) {
                console.error('DB insert error:', dbError);
                return NextResponse.json({ error: '업로드 기록 저장에 실패했습니다.' }, { status: 500 });
            }

            return NextResponse.json({
                upload,
                fileType,
                pageCount,
                textPreview: structuredText.substring(0, 500),
            });
        }

        // Method 2: FormData (legacy, for small files < 4.5MB)
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const customerId = formData.get('customerId') as string | null;

        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        if (!file.name.endsWith('.pdf')) {
            return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const { text, fileType, pageCount } = await extractPdfText(buffer);
        const structuredText = structureExtractedText(text, fileType);

        const safeFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
        const filePath = `${user.id}/${safeFileName}`;
        const { error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(filePath, buffer, {
                contentType: 'application/pdf',
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({ error: '파일 업로드에 실패했습니다.' }, { status: 500 });
        }

        const { data: upload, error: dbError } = await supabase
            .from('uploads')
            .insert({
                user_id: user.id,
                customer_id: customerId || null,
                file_name: file.name,
                file_path: filePath,
                file_type: fileType === 'unknown' ? 'basic_info' : fileType,
                raw_text: structuredText,
            })
            .select()
            .single();

        if (dbError) {
            console.error('DB insert error:', dbError);
            return NextResponse.json({ error: '업로드 기록 저장에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            upload,
            fileType,
            pageCount,
            textPreview: structuredText.substring(0, 500),
        });
    } catch (error) {
        console.error('Upload error:', error);
        const message = error instanceof Error ? error.message : '알 수 없는 오류';
        return NextResponse.json({ error: `파일 처리 중 오류가 발생했습니다: ${message}` }, { status: 500 });
    }
}
