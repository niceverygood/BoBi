'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDF_FILE_TYPES } from '@/lib/utils/constants';
import { createClient } from '@/lib/supabase/client';

/**
 * Render PDF pages to base64 PNG images using pdfjs-dist
 * Used as fallback when text extraction fails (image-based PDFs)
 */
async function renderPdfToImages(file: File, maxPages = 30): Promise<string[]> {
    try {
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = Math.min(pdf.numPages, maxPages);
        const images: string[] = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 1.5; // Good quality for OCR
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            await page.render({ canvasContext: ctx, viewport }).promise;
            // Convert to base64 with reduced quality to stay under Vercel 4.5MB limit
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            images.push(dataUrl);
        }

        return images;
    } catch (err) {
        console.error('PDF to image conversion error:', err);
        return [];
    }
}

interface UploadedFile {
    id?: string;
    file: File;
    fileType: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
    textPreview?: string;
    uploadPhase?: string; // 업로드 단계 표시용
}

interface PdfUploaderProps {
    onFilesUploaded: (files: UploadedFile[]) => void;
    customerId?: string;
}

export default function PdfUploader({ onFilesUploaded, customerId }: PdfUploaderProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

    const uploadFile = async (file: File, updatePhase?: (phase: string) => void): Promise<UploadedFile> => {
        try {
            // Step 1: Upload directly to Supabase Storage (bypasses Vercel 4.5MB limit)
            updatePhase?.('파일 저장 중...');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { file, fileType: 'unknown', status: 'error', error: '로그인이 필요합니다.' };
            }

            // Use safe ASCII-only filename (Supabase Storage doesn't support Korean in keys)
            const safeFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
            const filePath = `${user.id}/${safeFileName}`;
            const { error: storageError } = await supabase.storage
                .from('pdfs')
                .upload(filePath, file, {
                    contentType: 'application/pdf',
                    cacheControl: '3600',
                });

            if (storageError) {
                console.error('Direct storage upload error:', storageError);
                return {
                    file,
                    fileType: 'unknown',
                    status: 'error',
                    error: `스토리지 업로드 실패: ${storageError.message}`,
                };
            }

            // Step 2: Call API to extract text and create DB record (only sends file path, not file)
            updatePhase?.('텍스트 추출 중...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath,
                    fileName: file.name,
                    customerId: customerId || null,
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                // Clean up storage on API error
                await supabase.storage.from('pdfs').remove([filePath]);
                return {
                    file,
                    fileType: 'unknown',
                    status: 'error',
                    error: error.error || '텍스트 추출 실패',
                };
            }

            let data;
            try {
                data = await response.json();
            } catch {
                return {
                    file, fileType: 'unknown' as const, status: 'error' as const,
                    error: '서버 응답을 처리할 수 없습니다.',
                };
            }

            // Check if OCR is needed (image-based PDF)
            if (data.ocrNeeded) {
                updatePhase?.('이미지 PDF 감지 — 변환 중...');
                // Render PDF pages to images using pdfjs-dist
                const pageImages = await renderPdfToImages(file);
                if (pageImages.length === 0) {
                    return {
                        file, fileType: 'unknown', status: 'error',
                        error: 'PDF 페이지를 이미지로 변환할 수 없습니다.',
                    };
                }

                // Send images in batches of 5 to stay under Vercel 4.5MB body limit
                const BATCH_SIZE = 5;
                const totalBatches = Math.ceil(pageImages.length / BATCH_SIZE);
                let lastOcrData = null;

                for (let i = 0; i < pageImages.length; i += BATCH_SIZE) {
                    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                    updatePhase?.(`OCR 처리 중... (${batchNum}/${totalBatches})`);

                    const batch = pageImages.slice(i, i + BATCH_SIZE);
                    const isFirstBatch = i === 0;
                    const isLastBatch = i + BATCH_SIZE >= pageImages.length;

                    const ocrResponse = await fetch('/api/upload/ocr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pageImages: batch,
                            filePath: data.filePath,
                            fileName: file.name,
                            customerId: isFirstBatch ? (customerId || null) : null,
                            appendMode: !isFirstBatch,
                            isLastBatch,
                        }),
                    });

                    if (!ocrResponse.ok) {
                        const ocrErr = await ocrResponse.json().catch(() => ({}));
                        console.error(`OCR batch ${batchNum} failed:`, ocrErr);
                        // Continue with other batches
                        continue;
                    }

                    lastOcrData = await ocrResponse.json().catch(() => null);
                }

                if (!lastOcrData) {
                    return {
                        file, fileType: 'unknown', status: 'error',
                        error: 'OCR 처리에 실패했습니다. 다시 시도해주세요.',
                    };
                }

                return {
                    id: lastOcrData.upload.id,
                    file,
                    fileType: lastOcrData.fileType,
                    status: 'success',
                    textPreview: lastOcrData.textPreview,
                };
            }

            return {
                id: data.upload.id,
                file,
                fileType: data.fileType,
                status: 'success',
                textPreview: data.textPreview,
            };
        } catch (err) {
            console.error('Upload error:', err);
            return {
                file,
                fileType: 'unknown',
                status: 'error',
                error: '파일 업로드 중 오류가 발생했습니다.',
            };
        }
    };

    const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
        const pdfFiles = Array.from(newFiles).filter((f) =>
            f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
        );

        if (pdfFiles.length === 0) return;

        // Limit to 3 files total
        const remainingSlots = 3 - files.filter((f) => f.status === 'success').length;
        const filesToUpload = pdfFiles.slice(0, Math.max(0, remainingSlots));

        if (filesToUpload.length === 0) return;

        // Add files as uploading with unique keys
        const uploadingFiles: (UploadedFile & { _key: string })[] = filesToUpload.map((file, i) => ({
            file,
            fileType: 'unknown',
            status: 'uploading' as const,
            _key: `${Date.now()}-${i}-${file.name}`,
        }));

        setFiles((prev) => [...prev, ...uploadingFiles]);

        // Upload all files in parallel
        const allResults: UploadedFile[] = [];

        await Promise.allSettled(
            uploadingFiles.map(async (uf) => {
                // Phase update callback — shows live progress in the file list
                const updatePhase = (phase: string) => {
                    setFiles((prev) =>
                        prev.map((f) =>
                            '_key' in f && (f as any)._key === uf._key
                                ? { ...f, uploadPhase: phase }
                                : f
                        )
                    );
                };

                const result = await uploadFile(uf.file, updatePhase);
                allResults.push(result);

                // Update this specific file's status immediately
                setFiles((prev) =>
                    prev.map((f) =>
                        '_key' in f && (f as any)._key === uf._key ? { ...result, _key: uf._key } as any : f
                    )
                );
            })
        );

        onFilesUploaded(allResults.filter((r) => r.status === 'success'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files, customerId, onFilesUploaded]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleRemove = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const getFileTypeLabel = (type: string) => {
        const found = PDF_FILE_TYPES.find((t) => t.id === type);
        return found?.label || '진료이력 (자동인식)';
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                    'relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer',
                    isDragOver
                        ? 'border-primary bg-primary/5 scale-[1.01]'
                        : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
                )}
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf';
                    input.multiple = true;
                    input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files) handleFiles(target.files);
                    };
                    input.click();
                }}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
                        isDragOver ? 'bg-primary/10' : 'bg-muted'
                    )}>
                        <Upload className={cn('w-8 h-8 transition-colors', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                        <p className="text-lg font-semibold mb-1">
                            심평원 진료이력 PDF를 업로드하세요
                        </p>
                        <p className="text-sm text-muted-foreground">
                            드래그 앤 드롭 또는 클릭하여 파일을 선택하세요 (최대 3개)
                        </p>
                    </div>

                    {/* File type badges */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {PDF_FILE_TYPES.map((type) => (
                            <Badge key={type.id} variant="secondary" className="text-xs">
                                {type.label}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">업로드된 파일</h3>
                    {files.map((f, index) => (
                        <Card key={index} className="p-4 min-h-[80px]">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                                    f.status === 'success' && 'bg-green-500/10',
                                    f.status === 'error' && 'bg-destructive/10',
                                    f.status === 'uploading' && 'bg-primary/10'
                                )}>
                                    {f.status === 'uploading' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                                    {f.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                    {f.status === 'error' && <AlertCircle className="w-5 h-5 text-destructive" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                                    </div>
                                    {f.status === 'success' && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                            {getFileTypeLabel(f.fileType)}
                                        </Badge>
                                    )}
                                    {f.status === 'error' && (
                                        <p className="text-xs text-destructive mt-1">{f.error}</p>
                                    )}
                                    {f.status === 'uploading' && (
                                        <p className="text-xs text-muted-foreground mt-1">{f.uploadPhase || '업로드 중...'}</p>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-8 w-8"
                                    onClick={(e) => { e.stopPropagation(); handleRemove(index); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
