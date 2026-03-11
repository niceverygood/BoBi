'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDF_FILE_TYPES } from '@/lib/utils/constants';

interface UploadedFile {
    id?: string;
    file: File;
    fileType: string;
    status: 'uploading' | 'success' | 'error';
    error?: string;
    textPreview?: string;
}

interface PdfUploaderProps {
    onFilesUploaded: (files: UploadedFile[]) => void;
    customerId?: string;
}

export default function PdfUploader({ onFilesUploaded, customerId }: PdfUploaderProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

    const uploadFile = async (file: File): Promise<UploadedFile> => {
        const formData = new FormData();
        formData.append('file', file);
        if (customerId) {
            formData.append('customerId', customerId);
        }

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    file,
                    fileType: 'unknown',
                    status: 'error',
                    error: error.error || '업로드 실패',
                };
            }

            const data = await response.json();
            return {
                id: data.upload.id,
                file,
                fileType: data.fileType,
                status: 'success',
                textPreview: data.textPreview,
            };
        } catch {
            return {
                file,
                fileType: 'unknown',
                status: 'error',
                error: '네트워크 오류가 발생했습니다.',
            };
        }
    };

    const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
        const pdfFiles = Array.from(newFiles).filter((f) => f.type === 'application/pdf');

        if (pdfFiles.length === 0) return;

        // Add files as uploading
        const uploadingFiles: UploadedFile[] = pdfFiles.map((file) => ({
            file,
            fileType: 'unknown',
            status: 'uploading' as const,
        }));

        setFiles((prev) => [...prev, ...uploadingFiles]);

        // Upload each file
        const results = await Promise.all(pdfFiles.map(uploadFile));

        setFiles((prev) => {
            const updated = prev.filter((f) => f.status !== 'uploading');
            return [...updated, ...results];
        });

        onFilesUploaded(results.filter((r) => r.status === 'success'));
    }, [customerId, onFilesUploaded]);

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
        return found?.label || '알 수 없음';
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
                        <Card key={index} className="p-4">
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
