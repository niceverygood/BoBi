'use client';

// 고객 카드 안의 "상담 메모 (음성)" 섹션.
//
// 기능:
//   - 마이크 녹음 (브라우저 MediaRecorder API)
//   - 파일 업로드 (m4a·mp3·wav·webm)
//   - 메모 직접 입력 (음성 없이도 OK)
//   - AI 자동 요약·다음 액션·태그·감정 표시
//   - 메모 목록 (시간순)
//
// ⚠️ 통화 녹음은 양 당사자 동의 필수 (통신비밀보호법).
//    UI에 안내 1줄 명시.

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Upload, FileText, Loader2, Sparkles, AlertCircle, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface NextAction {
    action: string;
    due_date?: string | null;
    priority?: 'high' | 'medium' | 'low';
}

interface ConsultationMemo {
    id: string;
    summary: string;
    next_actions: NextAction[] | null;
    tags: string[] | null;
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | null;
    transcript: string | null;
    audio_duration_seconds: number | null;
    occurred_at: string;
    created_at: string;
}

interface Props {
    customerId: string;
}

const SENTIMENT_LABEL: Record<string, { label: string; cls: string }> = {
    positive: { label: '긍정', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    neutral:  { label: '중립', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
    negative: { label: '부정', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    mixed:    { label: '복합', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const PRIORITY_CLS: Record<string, string> = {
    high: 'text-rose-600',
    medium: 'text-amber-600',
    low: 'text-gray-500',
};

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDuration(seconds: number | null): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ConsultationMemoCard({ customerId }: Props) {
    const [memos, setMemos] = useState<ConsultationMemo[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showInputOptions, setShowInputOptions] = useState(false);
    const [manualText, setManualText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 녹음 상태
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<BlobPart[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 펼쳐진 메모 (transcript 보기)
    const [expandedMemoId, setExpandedMemoId] = useState<string | null>(null);

    const fetchMemos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/customers/${customerId}/consultation`);
            const data = await res.json();
            if (res.ok) setMemos(data.memos || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMemos(); }, [customerId]);

    // === 녹음 ===
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            recordedChunksRef.current = [];
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            mr.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                setRecordedBlob(blob);
                stream.getTracks().forEach((t) => t.stop());
            };
            mr.start();
            mediaRecorderRef.current = mr;
            setIsRecording(true);
            setRecordingDuration(0);
            setRecordedBlob(null);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
        } catch (err) {
            setError('마이크 접근 권한이 거부되었거나 사용 불가합니다.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        setIsRecording(false);
    };

    // === 업로드 (녹음·파일·텍스트 공통) ===
    const submitMemo = async (params: { audioBlob?: Blob; audioFile?: File; manualTranscript?: string }) => {
        setSubmitting(true);
        setError(null);
        try {
            const fd = new FormData();
            if (params.audioBlob) {
                fd.append('file', params.audioBlob, `recording-${Date.now()}.webm`);
            } else if (params.audioFile) {
                fd.append('file', params.audioFile);
            } else if (params.manualTranscript) {
                fd.append('transcript', params.manualTranscript);
            }
            fd.append('occurred_at', new Date().toISOString());

            const res = await fetch(`/api/customers/${customerId}/consultation`, {
                method: 'POST',
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'AI 분석 실패');
            } else {
                // 새 메모 추가하고 입력 폼 초기화
                setMemos([data.memo, ...memos]);
                setRecordedBlob(null);
                setManualText('');
                setShowInputOptions(false);
                setRecordingDuration(0);
            }
        } catch (err) {
            setError((err as Error).message || '업로드 실패');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) submitMemo({ audioFile: file });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (memoId: string) => {
        if (!confirm('이 메모를 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/customers/${customerId}/consultation?memo_id=${memoId}`, {
                method: 'DELETE',
            });
            if (res.ok) setMemos(memos.filter((m) => m.id !== memoId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    상담 메모
                    <Badge variant="outline" className="text-[10px]">AI 자동 요약</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                    음성 녹음·파일 업로드·텍스트 입력 후 AI가 요약·다음 액션·태그·감정을 자동으로 정리합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* 녹음 중 또는 녹음 완료 후 미리보기 */}
                {isRecording && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">녹음 중...</span>
                            <span className="text-xs text-rose-600 dark:text-rose-400">{fmtDuration(recordingDuration)}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={stopRecording}>
                            <MicOff className="w-3.5 h-3.5 mr-1" /> 녹음 종료
                        </Button>
                    </div>
                )}

                {recordedBlob && !isRecording && (
                    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-violet-900">
                                녹음 완료 ({fmtDuration(recordingDuration)})
                            </span>
                            <audio src={URL.createObjectURL(recordedBlob)} controls className="h-8 max-w-[200px]" />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => submitMemo({ audioBlob: recordedBlob })}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                                AI 분석 시작
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRecordedBlob(null); setRecordingDuration(0); }}>
                                다시 녹음
                            </Button>
                        </div>
                    </div>
                )}

                {/* 입력 옵션 */}
                {!isRecording && !recordedBlob && (
                    <>
                        {!showInputOptions ? (
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => setShowInputOptions(true)}>
                                    <Mic className="w-3.5 h-3.5 mr-1" /> 메모 추가
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" onClick={startRecording} disabled={submitting}>
                                        <Mic className="w-3.5 h-3.5 mr-1" /> 마이크 녹음
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={submitting}
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1" /> 파일 업로드
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowInputOptions(false)}>
                                        취소
                                    </Button>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="audio/*,video/webm"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="space-y-2">
                                    <p className="text-[11px] text-muted-foreground">또는 텍스트로 직접 입력:</p>
                                    <Textarea
                                        rows={4}
                                        placeholder="예: 오늘 박철수님과 30분 통화. 갱신 우려 표현, 추가 가입 의향은 약함. 내일 보장 비교 자료 발송 예정."
                                        value={manualText}
                                        onChange={(e) => setManualText(e.target.value)}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => submitMemo({ manualTranscript: manualText })}
                                        disabled={submitting || manualText.trim().length < 5}
                                    >
                                        {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                                        AI 분석 후 저장
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    통화 녹음은 양 당사자 동의 필수입니다 (통신비밀보호법).
                                </p>
                            </div>
                        )}
                    </>
                )}

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                        {error}
                    </div>
                )}

                {/* 메모 목록 */}
                {loading ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 inline-block animate-spin mr-1" /> 불러오는 중...
                    </div>
                ) : memos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                        아직 작성된 상담 메모가 없습니다. 첫 메모를 추가해보세요.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {memos.map((memo) => (
                            <div key={memo.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                                {/* 헤더: 시각·감정·삭제 */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                        <span className="text-muted-foreground">{fmtDate(memo.occurred_at)}</span>
                                        {memo.audio_duration_seconds && (
                                            <span className="text-muted-foreground">· {fmtDuration(memo.audio_duration_seconds)}</span>
                                        )}
                                        {memo.sentiment && (
                                            <Badge
                                                variant="outline"
                                                className={`${SENTIMENT_LABEL[memo.sentiment]?.cls || ''} text-[10px]`}
                                            >
                                                {SENTIMENT_LABEL[memo.sentiment]?.label}
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(memo.id)}
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* 요약 */}
                                <p className="text-sm text-foreground leading-relaxed">{memo.summary}</p>

                                {/* 태그 */}
                                {memo.tags && memo.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {memo.tags.map((tag, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* 다음 액션 */}
                                {memo.next_actions && memo.next_actions.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-gray-100">
                                        <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> 다음 액션
                                        </p>
                                        <ul className="space-y-1">
                                            {memo.next_actions.map((action, i) => (
                                                <li key={i} className="text-xs flex items-start gap-1.5">
                                                    <span className={action.priority ? PRIORITY_CLS[action.priority] : 'text-gray-500'}>•</span>
                                                    <span className="flex-1">
                                                        {action.action}
                                                        {action.due_date && (
                                                            <span className="text-[10px] text-muted-foreground ml-1">({action.due_date})</span>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 전체 전사 펼치기 */}
                                {memo.transcript && memo.transcript.length > memo.summary.length && (
                                    <details
                                        open={expandedMemoId === memo.id}
                                        className="text-xs"
                                    >
                                        <summary
                                            className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setExpandedMemoId(expandedMemoId === memo.id ? null : memo.id);
                                            }}
                                        >
                                            {expandedMemoId === memo.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            전체 전사 보기
                                        </summary>
                                        {expandedMemoId === memo.id && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded text-[11px] text-gray-700 whitespace-pre-wrap">
                                                <FileText className="w-3 h-3 inline mr-1" />
                                                {memo.transcript}
                                            </div>
                                        )}
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
