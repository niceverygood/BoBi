'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Activity, HeartPulse, Pill, AlertTriangle,
    FileSearch, Brain, Loader2, MessageSquare,
    Calendar, TrendingUp, Stethoscope, Link2, Trash2, Sparkles,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PolicyCard from '@/components/customers/PolicyCard';
import ConsultationMemoCard from '@/components/customers/ConsultationMemoCard';
import { apiFetch } from '@/lib/api/client';
import { getRiskBadgeClassByMultiplier } from '@/lib/risk/risk-color';

interface CustomerCard {
    customer: {
        id: string;
        name: string;
        birth_date: string | null;
        gender: string | null;
        phone: string | null;
        memo: string | null;
        insurer?: string | null;
        product_name?: string | null;
        enrollment_date?: string | null;
        exemption_end_date?: string | null;
        reduction_end_date?: string | null;
        renewal_date?: string | null;
        policy_memo?: string | null;
    };
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

// ─── 디자인 시스템 v2.1 helpers ─────────────────────────
// 건강 점수 단계: 0~39 고위험 / 40~69 주의 / 70~100 양호
function getHealthScoreStyle(score: number) {
    if (score >= 70) {
        return { stroke: '#059669', label: '양호', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (score >= 40) {
        return { stroke: '#D97706', label: '주의', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { stroke: '#DC2626', label: '고위험', badgeClass: 'bg-red-50 text-red-700 border-red-200' };
}

// 위험 배율 색은 lib/risk/risk-color.ts의 공용 헬퍼로 일원화 (PR #35).
// 같은 배율 = 같은 색을 보장 — AI riskLevel string에 의존하지 않는다.
const getRiskMultiplierBadgeClass = getRiskBadgeClassByMultiplier;

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
    const scoreStyle = getHealthScoreStyle(s.healthScore);

    return (
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            {/* 헤더 — 삭제는 ghost danger로 톤다운 (페이지 첫인상은 위험 액션이 아님) */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/customers">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">{c.name}</h1>
                        {c.gender && <Badge variant="outline" className="text-xs">{c.gender === 'male' ? '남' : '여'}</Badge>}
                    </div>
                    <p className="text-sm text-gray-500">
                        {c.phone && `${c.phone} · `}
                        {c.birth_date && `${c.birth_date} · `}
                        분석 {s.totalAnalyses}건
                    </p>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-colors disabled:opacity-50"
                >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    삭제
                </button>
            </div>

            {/* 건강 점수 카드 — 흰 배경 + 단계별 단일 색 도넛 + soft tint 등급 배지 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#E4E4E7" strokeWidth="8" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke={scoreStyle.stroke} strokeWidth="8"
                                strokeDasharray={`${s.healthScore * 2.51} ${251 - s.healthScore * 2.51}`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-gray-900 tabular-nums">{s.healthScore}</span>
                            <span className="text-[10px] text-gray-500">/ 100</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h2 className="text-base font-semibold text-gray-900">건강 점수</h2>
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${scoreStyle.badgeClass}`}>
                                {s.healthGrade || scoreStyle.label}
                            </span>
                        </div>
                        {s.scoreFactors.length > 0 && (
                            <ul className="space-y-0.5">
                                {s.scoreFactors.map((f, i) => (
                                    <li key={i} className="text-xs text-gray-600">· {f}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* 주요 지표 — 4개 모두 회색 단색 아이콘. 숫자 0이면 회색으로 약화 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: '진단 질환', value: s.medicalHistory?.diseaseCount || 0, Icon: Activity },
                    { label: '복용 약물', value: s.medicalHistory?.medications.length || 0, Icon: Pill },
                    { label: '가입가능 상품', value: s.productEligibility?.oCount || 0, Icon: TrendingUp },
                    { label: '위험 질환', value: s.riskReport?.riskItems.length || 0, Icon: AlertTriangle },
                ].map(({ label, value, Icon }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center text-center">
                        <Icon className="w-5 h-5 text-gray-400 mb-1.5" strokeWidth={1.5} />
                        <p className={`text-2xl font-bold tabular-nums ${value === 0 ? 'text-gray-400' : 'text-gray-900'}`}>{value}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* 보험 가입 정보 + CRM 알림 (Basic+ 갱신만, Pro+ 전체) */}
            <PolicyCard customerId={c.id} customer={c} />

            {/* 상담 메모 (음성·텍스트 + AI 자동 요약) */}
            <ConsultationMemoCard customerId={c.id} />

            {/* 현재 질환 — 회색 베이스 행 + amber dot + amber soft tint 상태 배지 */}
            {s.medicalHistory?.activeDiseases && s.medicalHistory.activeDiseases.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                        <HeartPulse className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                        현재 치료중 질환
                    </h3>
                    <div className="space-y-2">
                        {s.medicalHistory.activeDiseases.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 py-2.5 px-3 rounded-md bg-gray-50">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden />
                                <span className="text-sm text-gray-900 truncate flex-1 min-w-0">{d.diseaseName}</span>
                                <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{d.diseaseCode}</span>
                                <span className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                                    {d.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 위험 질환 예측 — 카테고리는 회색 통일, 배율은 relativeRisk 임계값으로만 결정 (Option D) */}
            {s.riskReport && s.riskReport.riskItems.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                        위험 질환 예측
                    </h3>
                    <ul className="divide-y divide-gray-100">
                        {s.riskReport.riskItems.slice(0, 5).map((r, i) => (
                            <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                <span className="text-xs text-gray-400 font-mono w-5 shrink-0 tabular-nums">{i + 1}.</span>
                                <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{r.riskDisease}</span>
                                <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                    {r.riskCategory}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border tabular-nums shrink-0 ${getRiskMultiplierBadgeClass(r.relativeRisk)}`}>
                                    {r.relativeRisk}배
                                </span>
                                <Link
                                    href={`/dashboard/accident-receipt?disease=${encodeURIComponent(r.riskDisease)}&from=customer`}
                                    className="text-xs text-brand-600 hover:text-brand-700 hover:underline shrink-0"
                                >
                                    영수증
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 상담 스크립트 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                        AI 상담 스크립트
                    </h3>
                    <Button onClick={generateScript} disabled={scriptLoading} size="sm" variant="outline">
                        {scriptLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Brain className="w-3 h-3 mr-1" />}
                        {script ? '재생성' : '생성하기'}
                    </Button>
                </div>
                {script ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                        {script}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                        &quot;생성하기&quot; 버튼을 누르면 이 고객 맞춤 상담 스크립트를 AI가 작성합니다.
                    </p>
                )}
            </div>

            {/* 분석 이력 */}
            {data.analyses.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                        상담 이력
                    </h3>
                    <div className="space-y-1">
                        {data.analyses.slice(0, 5).map(a => (
                            <Link key={a.id} href={`/dashboard/analyze?analysisId=${a.id}`}>
                                <div className="flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 text-sm transition-colors">
                                    <span className="text-gray-600">{new Date(a.created_at).toLocaleDateString('ko-KR')}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                        {a.status === 'completed' ? '완료' : a.status}
                                    </Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* 바로가기 — 4개 모두 outline 단색으로 통일 (그라디언트·임의 색상 ❌) */}
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
                        <Button variant="outline" size="sm"><Sparkles className="w-3.5 h-3.5 mr-1" />미래의 나</Button>
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <button
                onClick={() => { setShowLink(!showLink); if (!showLink) fetchUnlinked(); }}
                className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline w-full"
            >
                <Link2 className="w-4 h-4" />
                기존 분석을 이 고객에 연결하기
            </button>

            {showLink && (
                <div className="mt-3 space-y-2">
                    {loadingList ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> 미연결 분석 목록 로딩...
                        </div>
                    ) : unlinked.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">연결 가능한 분석이 없습니다.</p>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500">고객에 연결되지 않은 분석 목록입니다. 클릭하면 {customerName} 고객에 연결됩니다.</p>
                            {unlinked.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => linkAnalysis(a.id)}
                                    disabled={linking === a.id}
                                    className="w-full flex items-center justify-between p-3 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-900 truncate">{a.overallSummary}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                                    </div>
                                    {linking === a.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-500 shrink-0" />
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] shrink-0">연결</Badge>
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
