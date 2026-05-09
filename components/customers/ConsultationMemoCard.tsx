'use client';

// 고객 카드 안의 "상담 메모 (음성)" 섹션.
//
// 두 가지 입력 방식:
//   1. 🎙️ 실시간 녹음 (현장 상담) — 마이크 권한 후 즉시 녹음
//      - 일시 정지/재개 지원
//      - 사이즈 실시간 표시 (Whisper API 25MB 제한 대응)
//      - 23MB 도달 시 자동 정지 + 안내
//      - Opus codec (WebM) 최적화 — 1분에 약 0.5MB → 50분 녹음 가능
//   2. 📁 파일 업로드 — 외부 녹음 앱에서 녹음한 파일 업로드 (m4a·mp3·wav·webm·ogg)
//
// 추가:
//   3. 📝 텍스트 직접 입력 (음성 없이도 OK)
//
// AI 자동 처리:
//   - Whisper STT (한국어)
//   - Claude → 요약·다음 액션·태그·감정
//
// ⚠️ 통화 녹음은 양 당사자 동의 필수 (통신비밀보호법).

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Pause, Play, Upload, FileText, Loader2, Sparkles, AlertCircle, Trash2, Calendar, ChevronDown, ChevronUp, X, Edit3, Crown, Lock } from 'lucide-react';
import Link from 'next/link';

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

// Whisper API 25MB 제한. 안전 마진으로 23MB까지만.
const MAX_AUDIO_BYTES = 23 * 1024 * 1024;

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDuration(seconds: number | null): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// MediaRecorder가 지원하는 best codec 자동 선택
function pickMimeType(): string {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
    ];
    if (typeof MediaRecorder === 'undefined') return '';
    for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
}

interface Usage {
    limit: number;     // -1 = 무제한, 0 = 사용 불가, N = 평생 N번
    used: number;
    remaining: number;
    canUse: boolean;
}

export default function ConsultationMemoCard({ customerId }: Props) {
    const [memos, setMemos] = useState<ConsultationMemo[]>([]);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [planSlug, setPlanSlug] = useState<string>('free');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 입력 모드: idle | recording | recorded | uploading_text
    const [inputMode, setInputMode] = useState<'idle' | 'record' | 'text'>('idle');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [manualText, setManualText] = useState('');

    // 녹음 상태
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0); // 초
    const [recordingBytes, setRecordingBytes] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<BlobPart[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // 펼쳐진 메모
    const [expandedMemoId, setExpandedMemoId] = useState<string | null>(null);

    const fetchMemos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/customers/${customerId}/consultation`);
            const data = await res.json();
            if (res.ok) {
                setMemos(data.memos || []);
                if (data.usage) setUsage(data.usage);
                if (data.planSlug) setPlanSlug(data.planSlug);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMemos(); }, [customerId]);

    // 컴포넌트 unmount 시 녹음 중이면 정리
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    // === 녹음 시작 ===
    const startRecording = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,  // Whisper 권장
                },
            });
            streamRef.current = stream;
            const mimeType = pickMimeType();
            const mr = mimeType
                ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
                : new MediaRecorder(stream);
            recordedChunksRef.current = [];

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                    const total = recordedChunksRef.current.reduce(
                        (s, c) => s + (c instanceof Blob ? c.size : (c as ArrayBuffer).byteLength),
                        0,
                    );
                    setRecordingBytes(total);
                    // 23MB 도달 자동 정지
                    if (total >= MAX_AUDIO_BYTES) {
                        if (mr.state !== 'inactive') mr.stop();
                        setError('녹음 용량 한도(23MB)에 도달해 자동 정지됐습니다. 지금 분석을 시작하거나 새 녹음을 시작하세요.');
                    }
                }
            };
            mr.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' });
                setRecordedBlob(blob);
                setRecordingBytes(blob.size);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }
            };

            // 1초마다 chunk 발생시켜 사이즈 추적 가능하게
            mr.start(1000);
            mediaRecorderRef.current = mr;
            setIsRecording(true);
            setIsPaused(false);
            setRecordingDuration(0);
            setRecordingBytes(0);
            setRecordedBlob(null);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
        } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes('Permission denied') || msg.includes('NotAllowedError')) {
                setError('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 허용 후 다시 시도하세요.');
            } else {
                setError('녹음을 시작할 수 없습니다: ' + msg);
            }
            console.error(err);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
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
        setIsPaused(false);
    };

    const cancelRecording = () => {
        stopRecording();
        setRecordedBlob(null);
        setRecordingDuration(0);
        setRecordingBytes(0);
        setInputMode('idle');
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
                setMemos([data.memo, ...memos]);
                // 사용량 즉시 차감 반영 (Basic 한도 사용자에게 잔여 갱신)
                if (usage && usage.limit > 0) {
                    const newUsed = usage.used + 1;
                    setUsage({
                        ...usage,
                        used: newUsed,
                        remaining: Math.max(0, usage.limit - newUsed),
                        canUse: usage.limit - newUsed > 0,
                    });
                }
                setRecordedBlob(null);
                setManualText('');
                setRecordingDuration(0);
                setRecordingBytes(0);
                setInputMode('idle');
            }
        } catch (err) {
            setError((err as Error).message || '업로드 실패');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 25 * 1024 * 1024) {
                setError('파일 크기는 25MB 이하여야 합니다.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            submitMemo({ audioFile: file });
        }
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

    const sizePercent = (recordingBytes / MAX_AUDIO_BYTES) * 100;
    const sizeWarning = sizePercent > 80;

    // 플랜별 안내 라벨
    const planBadge = usage && (
        usage.limit === -1 ? (
            <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">
                <Crown className="w-2.5 h-2.5 mr-0.5" /> 프로 · 무제한
            </Badge>
        ) : usage.limit > 0 ? (
            <Badge variant="outline" className={`text-[10px] ${usage.remaining === 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                베이직 · {usage.used}/{usage.limit} 사용
            </Badge>
        ) : (
            <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 border-gray-200">
                <Lock className="w-2.5 h-2.5 mr-0.5" /> 베이직+ 필요
            </Badge>
        )
    );

    // Free 사용자 — 잠금 화면
    const isLocked = usage?.limit === 0;
    // Basic 한도 도달
    const isExhausted = usage && usage.limit > 0 && usage.remaining === 0;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <Mic className="w-4 h-4 text-primary" />
                    상담 메모
                    <Badge variant="outline" className="text-[10px]">AI 자동 요약</Badge>
                    {planBadge}
                </CardTitle>
                <CardDescription className="text-xs">
                    실시간 녹음 또는 파일 업로드 후 AI가 요약·다음 액션·태그·감정을 자동으로 정리합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* === Free 사용자 — 잠금 화면 === */}
                {!loading && isLocked && (
                    <div className="rounded-xl border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-blue-50 p-5 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                            <Lock className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-1">상담 메모는 베이직 플랜 이상에서 이용 가능합니다</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                AI가 음성을 자동으로 전사·요약하고 다음 액션·태그·감정까지 정리합니다.
                                <br />
                                베이직은 평생 3번 체험, 프로는 무제한.
                            </p>
                        </div>
                        <div className="flex gap-2 justify-center flex-wrap">
                            <Link href="/dashboard/billing">
                                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                                    <Crown className="w-3.5 h-3.5 mr-1" /> 플랜 업그레이드
                                </Button>
                            </Link>
                            <Link href="/pricing">
                                <Button size="sm" variant="outline">
                                    플랜 비교
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* === Basic 한도 도달 — 프로 업그레이드 안내 === */}
                {!loading && isExhausted && (
                    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                            <Crown className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-1">
                                베이직 평생 한도 {usage?.limit}회를 모두 사용했어요
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                지금까지 작성한 메모는 그대로 열람·삭제 가능합니다.
                                <br />
                                프로 플랜으로 업그레이드하면 상담 메모를 무제한으로 작성할 수 있어요.
                            </p>
                        </div>
                        <div className="flex gap-2 justify-center flex-wrap">
                            <Link href="/dashboard/billing">
                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                                    <Crown className="w-3.5 h-3.5 mr-1" /> 프로로 업그레이드
                                </Button>
                            </Link>
                            <Link href="/pricing">
                                <Button size="sm" variant="outline">
                                    플랜 비교
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* === 녹음 중 패널 === */}
                {!isLocked && !isExhausted && isRecording && (
                    <div className={`rounded-lg border-2 p-4 ${isPaused ? 'border-amber-300 bg-amber-50' : 'border-rose-300 bg-rose-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {isPaused ? (
                                    <Pause className="w-4 h-4 text-amber-600" />
                                ) : (
                                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                                )}
                                <span className={`text-sm font-bold ${isPaused ? 'text-amber-800' : 'text-rose-700'}`}>
                                    {isPaused ? '녹음 일시정지' : '녹음 중'}
                                </span>
                                <span className="text-2xl font-bold tabular-nums text-foreground">
                                    {fmtDuration(recordingDuration)}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {isPaused ? (
                                    <Button size="sm" onClick={resumeRecording}>
                                        <Play className="w-3.5 h-3.5 mr-1" /> 재개
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={pauseRecording}>
                                        <Pause className="w-3.5 h-3.5 mr-1" /> 일시정지
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={stopRecording}>
                                    <MicOff className="w-3.5 h-3.5 mr-1" /> 종료
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelRecording} className="text-muted-foreground">
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                        {/* 사이즈 게이지 */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>용량</span>
                                <span className={sizeWarning ? 'text-amber-700 font-semibold' : ''}>
                                    {fmtBytes(recordingBytes)} / 23MB
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        sizePercent > 90 ? 'bg-rose-500' :
                                        sizePercent > 70 ? 'bg-amber-500' :
                                        'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, sizePercent)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* === 녹음 완료 — 미리듣기 + 분석 시작 === */}
                {!isLocked && !isExhausted && recordedBlob && !isRecording && (
                    <div className="rounded-lg border-2 border-violet-300 bg-violet-50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-violet-900">녹음 완료</div>
                                <div className="text-xs text-violet-700 mt-0.5">
                                    {fmtDuration(recordingDuration)} · {fmtBytes(recordingBytes)}
                                </div>
                            </div>
                            <audio src={URL.createObjectURL(recordedBlob)} controls className="h-9 max-w-[260px]" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => submitMemo({ audioBlob: recordedBlob })} disabled={submitting}>
                                {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                                AI 분석 시작
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRecordedBlob(null); setRecordingDuration(0); setRecordingBytes(0); }}>
                                다시 녹음
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelRecording} className="text-muted-foreground">
                                취소
                            </Button>
                        </div>
                    </div>
                )}

                {/* === 텍스트 입력 모드 === */}
                {!isLocked && !isExhausted && inputMode === 'text' && !isRecording && !recordedBlob && (
                    <div className="rounded-lg border-2 border-gray-300 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold flex items-center gap-1.5">
                                <Edit3 className="w-4 h-4" /> 텍스트 직접 입력
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => setInputMode('idle')} className="h-7">
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <Textarea
                            rows={5}
                            placeholder="예: 오늘 박철수님과 30분 통화. 갱신 우려 표현, 추가 가입 의향 약함. 내일 보장 비교 자료 발송 예정."
                            value={manualText}
                            onChange={(e) => setManualText(e.target.value)}
                            className="text-sm"
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
                )}

                {/* === 메인 입력 옵션 (idle 상태) — 두 개 큰 버튼 + 텍스트 옵션 === */}
                {!isLocked && !isExhausted && inputMode === 'idle' && !isRecording && !recordedBlob && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* 실시간 녹음 — 가장 강조 */}
                            <button
                                onClick={startRecording}
                                disabled={submitting}
                                className="group rounded-xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 hover:border-rose-400 hover:shadow-md transition-all p-4 text-left disabled:opacity-50"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center group-hover:scale-110 transition">
                                        <Mic className="w-4 h-4" />
                                    </span>
                                    <span className="text-sm font-bold text-foreground">실시간 녹음</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    상담 현장에서 즉시 녹음 시작. 일시 정지·재개 가능.
                                </p>
                            </button>

                            {/* 파일 업로드 */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitting}
                                className="group rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 hover:border-violet-400 hover:shadow-md transition-all p-4 text-left disabled:opacity-50"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-9 h-9 rounded-full bg-violet-500 text-white flex items-center justify-center group-hover:scale-110 transition">
                                        <Upload className="w-4 h-4" />
                                    </span>
                                    <span className="text-sm font-bold text-foreground">파일 업로드</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    외부 녹음 앱 파일 (m4a·mp3·wav·webm). 최대 25MB.
                                </p>
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="audio/*,video/webm"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {/* 보조: 텍스트 직접 입력 */}
                        <button
                            onClick={() => setInputMode('text')}
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                            <Edit3 className="w-3 h-3" />
                            또는 텍스트로 직접 입력
                        </button>

                        {/* 안내 */}
                        <p className="text-[10px] text-muted-foreground flex items-start gap-1 pt-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            통화·미팅 녹음은 양 당사자 동의 필수입니다 (통신비밀보호법).
                        </p>
                    </div>
                )}

                {/* 처리 중 안내 */}
                {submitting && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-blue-900">
                            AI가 음성을 전사·분석하는 중입니다 (예상 1~3분)...
                        </span>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* === 메모 목록 === */}
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

                                <p className="text-sm text-foreground leading-relaxed">{memo.summary}</p>

                                {memo.tags && memo.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {memo.tags.map((tag, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

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
