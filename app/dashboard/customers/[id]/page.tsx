'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Activity, HeartPulse, Pill, AlertTriangle,
    FileSearch, Receipt, Brain, Loader2, MessageSquare,
    CheckCircle2, XCircle, Calendar, TrendingUp, Stethoscope, Link2, Trash2, Sparkles,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { apiFetch } from '@/lib/api/client';

interface CustomerCard {
    customer: { id: string; name: string; birth_date: string | null; gender: string | null; phone: string | null; memo: string | null };
    analyses: Array<{ id: string; created_at: string; status: string }>;
    summary: {
        healthScore: number;
        healthGrade: string;
        scoreFactors: string[];
        totalAnalyses: number;
        latestAnalysisDate: string | null;
        medicalHistory: {
            overallSummary: string;
            diseaseCount: number;
            activeDiseases: Array<{ diseaseName: string; diseaseCode: string; status: string }>;
            riskFlags: Array<{ flag: string; severity: string }>;
            medications: string[];
        } | null;
        productEligibility: {
            products: Array<{ productName: string; eligible: string; productCode: string }>;
            oCount: number;
            tCount: number;
            xCount: number;
        } | null;
        riskReport: {
            riskItems: Array<{ riskDisease: string; relativeRisk: number; riskLevel: string; riskCategory: string }>;
            overallAssessment: string;
        } | null;
    };
}

function CustomerCardContent() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<CustomerCard | null>(null);
    const [loading, setLoading] = useState(true);
    const [script, setScript] = useState<string | null>(null);
    const [scriptLoading, setScriptLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!data?.customer.name) return;
        const confirmText = `정말 ${data.customer.name} 고객을 삭제하시겠습니까?\n\n관련 분석 이력 ${data.summary.totalAnalyses}건도 함께 삭제되며, 복구할 수 없습니다.`;
        if (!confirm(confirmText)) return;

        setDeleting(true);
        try {
            await apiFetch(`/api/customers/${params.id}`, { method: 'DELETE' });
            router.push('/dashboard/customers');
        } catch (err) {
            alert('삭제 실패: ' + (err as Error).message);
            setDeleting(false);
        }
    };

    useEffect(() => {
        if (!params.id) return;
        (async () => {
            try {
                const result = await apiFetch<CustomerCard>(`/api/customers/${params.id}`);
                setData(result);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, [params.id]);

    const generateScript = async () => {
        if (!params.id) return;
        setScriptLoading(true);
        try {
            const result = await apiFetch<{ script: string }>(`/api/customers/${params.id}`, { method: 'POST' });
            setScript(result.script);
        } catch { /* ignore */ }
        finally { setScriptLoading(false); }
    };

    if (loading) return <div className="max-w-4xl mx-auto py-12"><LoadingSpinner text="고객 카드 로딩 중..." size="lg" /></div>;
    if (!data) return <div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground">고객을 찾을 수 없습니다.</div>;

    const { customer: c, summary: s } = data;
    const scoreColor = s.healthScore >= 80 ? 'text-green-600' : s.healthScore >= 60 ? 'text-amber-600' : 'text-red-600';
    const scoreBg = s.healthScore >= 80 ? 'from-green-50 to-emerald-50' : s.healthScore >= 60 ? 'from-amber-50 to-yellow-50' : 'from-red-50 to-rose-50';
    const scoreStroke = s.healthScore >= 80 ? '#22c55e' : s.healthScore >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/customers">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">{c.name}</h1>
                        {c.gender && <Badge variant="outline" className="text-xs">{c.gender === 'male' ? '남' : '여'}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {c.phone && `${c.phone} · `}
                        {c.birth_date && `${c.birth_date} · `}
                        분석 {s.totalAnalyses}건
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1"
                >
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    삭제
                </Button>
            </div>

            {/* 건강 점수 카드 */}
            <Card className={`border-0 shadow-md bg-gradient-to-br ${scoreBg}`}>
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                <circle cx="50" cy="50" r="40" fill="none" stroke={scoreStroke} strokeWidth="8"
                                    strokeDasharray={`${s.healthScore * 2.51} ${251 - s.healthScore * 2.51}`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-black ${scoreColor}`}>{s.healthScore}</span>
                                <span className="text-[10px] text-muted-foreground">/ 100</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold">건강 점수</h2>
                            <Badge className={`text-xs mt-1 ${s.healthScore >= 80 ? 'bg-green-500' : s.healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}>
                                {s.healthGrade}
                            </Badge>
                            {s.scoreFactors.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                    {s.scoreFactors.map((f, i) => (
                                        <li key={i} className="text-xs text-muted-foreground">· {f}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 주요 지표 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                    <Activity className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-black">{s.medicalHistory?.diseaseCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground">진단 질환</p>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                    <Pill className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-2xl font-black">{s.medicalHistory?.medications.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground">복용 약물</p>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-black">{s.productEligibility?.oCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground">가입가능 상품</p>
                </CardContent></Card>
                <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
                    <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${(s.riskReport?.riskItems.length || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
                    <p className="text-2xl font-black">{s.riskReport?.riskItems.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground">위험 질환</p>
                </CardContent></Card>
            </div>

            {/* 현재 질환 */}
            {s.medicalHistory?.activeDiseases && s.medicalHistory.activeDiseases.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-500" />현재 치료중 질환</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {s.medicalHistory.activeDiseases.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
                                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="text-sm font-medium">{d.diseaseName}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">{d.diseaseCode}</Badge>
                                <Badge variant="destructive" className="text-[10px] ml-auto">{d.status}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 위험 질환 TOP */}
            {s.riskReport && s.riskReport.riskItems.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" />위험 질환 예측</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {s.riskReport.riskItems.slice(0, 5).map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-muted-foreground">{i + 1}.</span>
                                    <span className="text-sm font-medium">{r.riskDisease}</span>
                                    <Badge variant="outline" className="text-[10px]">{r.riskCategory}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={`text-xs ${r.riskLevel === 'high' ? 'bg-red-500' : r.riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                                        {r.relativeRisk}배
                                    </Badge>
                                    <Link href={`/dashboard/accident-receipt?disease=${encodeURIComponent(r.riskDisease)}&from=customer`}>
                                        <Button variant="ghost" size="sm" className="text-xs h-7"><Receipt className="w-3 h-3 mr-1" />영수증</Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 상담 스크립트 */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />AI 상담 스크립트</CardTitle>
                        <Button onClick={generateScript} disabled={scriptLoading} size="sm" variant="outline">
                            {scriptLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Brain className="w-3 h-3 mr-1" />}
                            {script ? '재생성' : '생성하기'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {script ? (
                        <div className="bg-primary/5 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">{script}</div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            "생성하기" 버튼을 누르면 이 고객 맞춤 상담 스크립트를 AI가 작성합니다.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 분석 이력 */}
            {data.analyses.length > 0 && (
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" />상담 이력</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {data.analyses.slice(0, 5).map(a => (
                            <Link key={a.id} href={`/dashboard/analyze?analysisId=${a.id}`}>
                                <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 text-sm">
                                    <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString('ko-KR')}</span>
                                    <Badge variant={a.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px]">{a.status === 'completed' ? '완료' : a.status}</Badge>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 바로가기 */}
            <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/analyze?customerId=${c.id}`}><Button variant="outline" size="sm"><FileSearch className="w-3.5 h-3.5 mr-1" />PDF 분석</Button></Link>
                <Link href={`/dashboard/medical?customerId=${c.id}&customerName=${encodeURIComponent(c.name)}`}>
                    <Button variant="outline" size="sm"><Stethoscope className="w-3.5 h-3.5 mr-1" />심평원 조회</Button>
                </Link>
                {s.latestAnalysisDate && (
                    <Link href={`/dashboard/risk-report?analysisId=${data.analyses[0]?.id}`}>
                        <Button variant="outline" size="sm"><HeartPulse className="w-3.5 h-3.5 mr-1" />위험도 리포트</Button>
                    </Link>
                )}
                {s.riskReport && s.riskReport.riskItems.length > 0 && (
                    <Link href={`/dashboard/future-me?customerId=${c.id}`}>
                        <Button size="sm" className="bg-gradient-to-r from-violet-500 to-violet-600 hover:opacity-90">
                            <Sparkles className="w-3.5 h-3.5 mr-1" />미래의 나
                        </Button>
                    </Link>
                )}
            </div>

            {/* 기존 분석 연결 */}
            <LinkAnalysisSection customerId={c.id} customerName={c.name} onLinked={() => window.location.reload()} />
        </div>
    );
}

export default function CustomerCardPage() {
    return <Suspense fallback={<div className="max-w-4xl mx-auto py-12"><LoadingSpinner text="로딩 중..." size="lg" /></div>}><CustomerCardContent /></Suspense>;
}

// ── 기존 분석 연결 섹션 ──
function LinkAnalysisSection({ customerId, customerName, onLinked }: { customerId: string; customerName: string; onLinked: () => void }) {
    const [showLink, setShowLink] = useState(false);
    const [unlinked, setUnlinked] = useState<Array<{ id: string; created_at: string; overallSummary: string }>>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [linking, setLinking] = useState<string | null>(null);

    const fetchUnlinked = async () => {
        setLoadingList(true);
        try {
            const supabase = (await import('@/lib/supabase/client')).createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('analyses')
                .select('id, created_at, medical_history, status')
                .eq('user_id', user.id)
                .is('customer_id', null)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(20);

            setUnlinked((data || []).map(a => ({
                id: a.id,
                created_at: a.created_at,
                overallSummary: (a.medical_history as any)?.overallSummary?.substring(0, 60) || '분석 결과',
            })));
        } catch { /* ignore */ }
        finally { setLoadingList(false); }
    };

    const linkAnalysis = async (analysisId: string) => {
        setLinking(analysisId);
        try {
            const supabase = (await import('@/lib/supabase/client')).createClient();
            await supabase
                .from('analyses')
                .update({ customer_id: customerId })
                .eq('id', analysisId);
            onLinked();
        } catch { /* ignore */ }
        finally { setLinking(null); }
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
                <button
                    onClick={() => { setShowLink(!showLink); if (!showLink) fetchUnlinked(); }}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline w-full"
                >
                    <Link2 className="w-4 h-4" />
                    기존 분석을 이 고객에 연결하기
                </button>

                {showLink && (
                    <div className="mt-3 space-y-2">
                        {loadingList ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> 미연결 분석 목록 로딩...
                            </div>
                        ) : unlinked.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">연결 가능한 분석이 없습니다.</p>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">고객에 연결되지 않은 분석 목록입니다. 클릭하면 {customerName} 고객에 연결됩니다.</p>
                                {unlinked.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => linkAnalysis(a.id)}
                                        disabled={linking === a.id}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm truncate">{a.overallSummary}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                                        </div>
                                        {linking === a.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] shrink-0">연결</Badge>
                                        )}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
