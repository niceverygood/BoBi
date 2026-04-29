'use client';

// 총괄관리자 전용 AI 인사이트 페이지
// - 일/주 탭, "지금 분석" 버튼, 캐시된 결과 표시
// - 메트릭 그리드 + AI 4개 섹션(요약/주요 변화/원인 가설/개선안)

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Sparkles, ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus,
    AlertTriangle, Lightbulb, CheckCircle2, Clock, Copy, Check, Code2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { apiFetch } from '@/lib/api/client';

type PeriodType = 'daily' | 'weekly';

interface Finding {
    title: string;
    detail: string;
    severity: 'high' | 'medium' | 'low';
}
interface Cause {
    title: string;
    hypothesis: string;
    evidence: string;
}
interface Action {
    title: string;
    description: string;
    expected_impact: string;
    effort: 'low' | 'medium' | 'high';
    priority: number;
    implementable?: boolean;
    claude_code_prompt?: string;
}
interface Insights {
    summary: string;
    key_findings: Finding[];
    suspected_causes: Cause[];
    recommended_actions: Action[];
}
interface Metrics {
    period_type: PeriodType;
    current: any;
    previous: any;
    deltas: Record<string, { current: number; previous: number; delta_pct: number | null }>;
}
interface InsightRow {
    id?: string;
    period_type: PeriodType;
    period_start: string;
    period_end: string;
    metrics: Metrics;
    insights: Insights;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    generated_at: string;
}

const DELTA_LABELS: Record<string, string> = {
    new_signups: '신규 가입',
    users_with_first_analysis: '첫 분석 도달',
    active_users: '활성 유저',
    analyses_count: '분석 건수',
    trials_started: '체험 시작',
    paid_total: '결제 건수',
    gross_krw: '매출 (원)',
    cancellations: '해지',
    churned_mrr_krw: '이탈 MRR (원)',
    error_count: '에러 발생',
    payment_failures: '결제 실패',
};

// delta 부정/긍정 방향 — 늘면 좋은 지표 vs 줄면 좋은 지표
const POSITIVE_WHEN_UP: Record<string, boolean> = {
    new_signups: true, users_with_first_analysis: true, active_users: true,
    analyses_count: true, trials_started: true, paid_total: true, gross_krw: true,
    cancellations: false, churned_mrr_krw: false, error_count: false, payment_failures: false,
};

export default function InsightsPage() {
    // hasAdminAccess: super + sub admin 모두 허용 (다른 /admin/* 페이지와 일관).
    // 이전엔 isAdmin (super only)이라 sub-admin은 빈 화면을 봤음 + 사이드바에선 메뉴가 보이는 모순.
    const { hasAdminAccess, loading: adminLoading, email } = useAdmin();
    const router = useRouter();

    const [period, setPeriod] = useState<PeriodType>('daily');
    const [insight, setInsight] = useState<InsightRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tableMissing, setTableMissing] = useState(false);

    const fetchLatest = useCallback(async (p: PeriodType) => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<{ insight: InsightRow | null; tableMissing?: boolean }>(`/api/admin/insights?period=${p}`);
            setInsight(data.insight);
            setTableMissing(!!data.tableMissing);
        } catch (e) {
            setError((e as Error).message);
        }
        setLoading(false);
    }, []);

    const generate = async (force: boolean) => {
        setGenerating(true);
        setError(null);
        try {
            const data = await apiFetch<{ insight: InsightRow; cached?: boolean; saveError?: string }>(`/api/admin/insights`, {
                method: 'POST',
                body: { period_type: period, force },
            });
            setInsight(data.insight);
            if (data.saveError) setError('저장 실패: ' + data.saveError);
        } catch (e) {
            setError((e as Error).message);
        }
        setGenerating(false);
    };

    useEffect(() => {
        if (!adminLoading && !hasAdminAccess) {
            router.replace('/dashboard');
            return;
        }
        if (hasAdminAccess) fetchLatest(period);
    }, [hasAdminAccess, adminLoading, period, router, fetchLatest]);

    // 권한 확인 중에도 layout(헤더·사이드바)을 그려서 빈 화면이 안 보이게 함.
    // 이전엔 `return null`로 인해 sub-admin 또는 useAdmin race condition 시 완전 빈 화면이 떴음.
    if (adminLoading) {
        return (
            <div className="min-h-screen bg-muted/30">
                <Header />
                <Sidebar />
                <MobileNav />
                <main className="md:pl-64 pt-16 pb-24">
                    <div className="max-w-6xl mx-auto px-4 py-16 text-center text-sm text-muted-foreground">
                        권한 확인 중...
                    </div>
                </main>
            </div>
        );
    }

    if (!hasAdminAccess) {
        return (
            <div className="min-h-screen bg-muted/30">
                <Header />
                <Sidebar />
                <MobileNav />
                <main className="md:pl-64 pt-16 pb-24">
                    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                        <h3 className="font-semibold mb-1">접근 권한이 없습니다</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            AI 인사이트는 관리자 전용입니다. {email ? `(현재 로그인: ${email})` : ''}
                        </p>
                        <Button variant="outline" size="sm" onClick={() => router.replace('/dashboard')}>
                            대시보드로 이동
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <Header />
            <Sidebar />
            <MobileNav />
            <main className="md:pl-64 pt-16 pb-24">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-violet-600" />
                                AI 인사이트
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                결제 전환·잔존율 관점에서 보비의 핵심 지표를 분석합니다 (총괄관리자 전용)
                            </p>
                        </div>
                    </div>

                    {/* 기간 탭 + 액션 */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="flex gap-1 p-1 bg-background border rounded-lg">
                            {(['daily', 'weekly'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-1.5 rounded text-sm transition ${
                                        period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                    }`}
                                >
                                    {p === 'daily' ? '일간' : '주간'}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchLatest(period)}
                                disabled={loading || generating}
                            >
                                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                                새로고침
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => generate(true)}
                                disabled={generating}
                                className="bg-violet-600 hover:bg-violet-700"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                {generating ? '분석 중... (10~30초)' : '지금 분석'}
                            </Button>
                        </div>
                    </div>

                    {tableMissing && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                            ⚠️ <code>ai_insights</code> 테이블이 없습니다. <code>scripts/create_ai_insights_table.sql</code>을 Supabase에 실행해주세요. (분석 결과는 즉시 반환되지만 캐시되지 않습니다)
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-16 text-muted-foreground text-sm">로딩 중...</div>
                    ) : !insight ? (
                        <Card>
                            <CardContent className="py-16 text-center">
                                <Sparkles className="w-12 h-12 mx-auto text-violet-300 mb-3" />
                                <h3 className="font-semibold mb-1">아직 생성된 인사이트가 없습니다</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    "지금 분석" 버튼을 눌러 첫 {period === 'daily' ? '일간' : '주간'} 인사이트를 생성하세요.
                                </p>
                                <Button onClick={() => generate(true)} disabled={generating} className="bg-violet-600 hover:bg-violet-700">
                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                    {generating ? '분석 중...' : '지금 분석'}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <InsightContent insight={insight} />
                    )}
                </div>
            </main>
        </div>
    );
}

function InsightContent({ insight }: { insight: InsightRow }) {
    const fmtDate = (iso: string) => new Date(iso).toLocaleString('ko-KR');
    const fmtKrw = (n: number) => `${n.toLocaleString()}원`;

    return (
        <div className="space-y-4">
            {/* 메타 정보 */}
            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 분석 시각: {fmtDate(insight.generated_at)}
                </span>
                <span>·</span>
                <span>대상 기간: {insight.metrics.current?.range?.label || `${insight.period_start} ~ ${insight.period_end}`}</span>
                {insight.model && <><span>·</span><span>모델: {insight.model}</span></>}
                {insight.input_tokens != null && (
                    <><span>·</span><span>토큰: in {insight.input_tokens} / out {insight.output_tokens}</span></>
                )}
            </div>

            {/* AI 요약 */}
            <Card className="border-violet-200 bg-violet-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-violet-900">
                        <Sparkles className="w-4 h-4" /> AI 요약
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm leading-relaxed text-violet-950">{insight.insights?.summary || '-'}</p>
                </CardContent>
            </Card>

            {/* 메트릭 카드 그리드 */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">핵심 지표 (현재 vs 직전 동일 기간)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(insight.metrics?.deltas || {}).map(([key, d]) => (
                            <DeltaCard key={key} label={DELTA_LABELS[key] || key} metricKey={key} delta={d} />
                        ))}
                    </div>

                    {/* 결제수단별 매출 */}
                    {insight.metrics?.current?.revenue?.by_provider && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">결제수단별 매출 (현재 기간)</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {Object.entries(insight.metrics.current.revenue.by_provider).map(([k, v]: [string, any]) => (
                                    <div key={k} className="border rounded p-2 bg-muted/30">
                                        <div className="text-[10px] text-muted-foreground">{providerLabel(k)}</div>
                                        <div className="text-sm font-semibold">{fmtKrw(v.krw || 0)}</div>
                                        <div className="text-[10px] text-muted-foreground">{v.count || 0}건</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 주요 변화 */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> 주요 변화
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {(insight.insights?.key_findings || []).map((f, i) => (
                        <div key={i} className="border-l-4 pl-3 py-1.5" style={{ borderColor: severityColor(f.severity) }}>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{f.title}</span>
                                <Badge variant="outline" className="text-[10px]" style={{ borderColor: severityColor(f.severity), color: severityColor(f.severity) }}>
                                    {f.severity === 'high' ? '높음' : f.severity === 'medium' ? '중간' : '낮음'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
                        </div>
                    ))}
                    {(insight.insights?.key_findings || []).length === 0 && (
                        <p className="text-xs text-muted-foreground">변화 사항이 없습니다.</p>
                    )}
                </CardContent>
            </Card>

            {/* 원인 가설 */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> 원인 가설
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(insight.insights?.suspected_causes || []).map((c, i) => (
                        <div key={i} className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-amber-900">{c.title}</p>
                            <p className="text-xs text-amber-800 mt-1"><span className="font-medium">가설:</span> {c.hypothesis}</p>
                            <p className="text-xs text-amber-800 mt-0.5"><span className="font-medium">근거:</span> {c.evidence}</p>
                        </div>
                    ))}
                    {(insight.insights?.suspected_causes || []).length === 0 && (
                        <p className="text-xs text-muted-foreground">제시된 가설이 없습니다.</p>
                    )}
                </CardContent>
            </Card>

            {/* 개선안 */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> 개선안 (우선순위 순)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        <Code2 className="inline w-3 h-3 mr-0.5" /> 표시는 코드 변경으로 구현 가능한 항목 — 펼쳐서 Claude Code 프롬프트를 복사해 사용하세요
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...(insight.insights?.recommended_actions || [])]
                        .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                        .map((a, i) => (
                            <ActionCard key={i} action={a} />
                        ))}
                    {(insight.insights?.recommended_actions || []).length === 0 && (
                        <p className="text-xs text-muted-foreground">제시된 개선안이 없습니다.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ActionCard({ action }: { action: Action }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const a = action;
    const hasPrompt = !!(a.implementable && a.claude_code_prompt);

    const copy = async () => {
        if (!a.claude_code_prompt) return;
        try {
            await navigator.clipboard.writeText(a.claude_code_prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = a.claude_code_prompt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="border rounded-lg p-3 bg-emerald-50/30">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-700">P{a.priority || '-'}</span>
                        <span className="text-sm font-semibold">{a.title}</span>
                        {hasPrompt && (
                            <Badge className="bg-violet-600 text-white text-[10px] flex items-center gap-1">
                                <Code2 className="w-2.5 h-2.5" /> 코드 구현 가능
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className="text-[10px]">
                        {a.effort === 'low' ? '🟢 쉬움' : a.effort === 'medium' ? '🟡 보통' : '🔴 어려움'}
                    </Badge>
                </div>
            </div>
            <div className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                예상 임팩트: {a.expected_impact}
            </div>

            {hasPrompt && (
                <div className="mt-3 border-t border-emerald-200/60 pt-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className="text-[11px] font-medium text-violet-700 hover:text-violet-900 flex items-center gap-1"
                        >
                            <Code2 className="w-3 h-3" />
                            Claude Code 프롬프트 {expanded ? '접기' : '펼치기'}
                        </button>
                        <button
                            onClick={copy}
                            className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded border transition ${
                                copied
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-violet-700 border-violet-300 hover:bg-violet-50'
                            }`}
                        >
                            {copied ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 복사</>}
                        </button>
                    </div>
                    {expanded && (
                        <pre className="text-[11px] font-mono whitespace-pre-wrap bg-slate-900 text-slate-100 p-3 rounded leading-relaxed max-h-80 overflow-y-auto">
                            {a.claude_code_prompt}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

function DeltaCard({ label, metricKey, delta }: {
    label: string;
    metricKey: string;
    delta: { current: number; previous: number; delta_pct: number | null };
}) {
    const positiveWhenUp = POSITIVE_WHEN_UP[metricKey] !== false;
    const isUp = delta.current > delta.previous;
    const isFlat = delta.current === delta.previous;
    const good = isFlat ? null : (isUp === positiveWhenUp);

    const fmt = metricKey.includes('krw')
        ? (n: number) => `${n.toLocaleString()}원`
        : (n: number) => n.toLocaleString();

    return (
        <div className={`border rounded-lg p-2.5 ${good === false ? 'bg-red-50/40 border-red-200' : good === true ? 'bg-emerald-50/40 border-emerald-200' : 'bg-background'}`}>
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="text-base font-bold">{fmt(delta.current)}</div>
            <div className="flex items-center gap-1 text-[10px]">
                {isFlat ? <Minus className="w-3 h-3 text-muted-foreground" /> :
                 isUp ? <TrendingUp className={`w-3 h-3 ${good ? 'text-emerald-600' : 'text-red-600'}`} /> :
                        <TrendingDown className={`w-3 h-3 ${good ? 'text-emerald-600' : 'text-red-600'}`} />}
                <span className={good === false ? 'text-red-600' : good === true ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {delta.delta_pct == null ? 'NEW' : `${delta.delta_pct > 0 ? '+' : ''}${delta.delta_pct}%`}
                </span>
                <span className="text-muted-foreground">vs {fmt(delta.previous)}</span>
            </div>
        </div>
    );
}

function severityColor(s: string): string {
    if (s === 'high') return '#dc2626';
    if (s === 'medium') return '#d97706';
    return '#64748b';
}

function providerLabel(key: string): string {
    const map: Record<string, string> = {
        kakaopay: '카카오페이', tosspayments: '토스', inicis: 'INICIS',
        apple_iap: 'Apple', google_play: 'Google', card: '신용카드',
    };
    return map[key] || key;
}
