'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSearch, ArrowRight, RefreshCw, Trash2, Eye, Download, HeartPulse } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DownloadReportButton from '@/components/report/DownloadReportButton';

interface AnalysisRecord {
    id: string;
    customer_id: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    overall_summary: string | null;
    source: string | null;
    has_medical_history: boolean;
    has_product_eligibility: boolean;
    has_claim_assessment: boolean;
    has_risk_report: boolean;
}

const PAGE_SIZE = 20;

export default function HistoryPage() {
    const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const fetchAnalyses = useCallback(async (targetPage = 0) => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc('get_analyses_list', {
                p_user_id: user.id,
                p_limit: PAGE_SIZE,
                p_offset: targetPage * PAGE_SIZE,
            });

            if (!error && data && (data as unknown[]).length > 0) {
                const rows = data as (AnalysisRecord & { total_count: number })[];
                setAnalyses(rows);
                setTotalCount(rows[0]?.total_count ?? 0);
                setPage(targetPage);
                return;
            }

            // RPC 미배포·빈 결과 폴백 — analyses 테이블을 직접 조회
            if (error) {
                console.warn('get_analyses_list RPC 미사용, 폴백 조회:', error.message);
            }

            const [listResult, countResult] = await Promise.all([
                supabase
                    .from('analyses')
                    .select('id, customer_id, status, created_at, updated_at, medical_history, product_eligibility, claim_assessment, risk_report, disclosure_summary')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1),
                supabase
                    .from('analyses')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
            ]);

            if (listResult.error) {
                console.error('History fallback error:', listResult.error);
                return;
            }

            type AnalysisRow = {
                id: string;
                customer_id: string | null;
                status: string;
                created_at: string;
                updated_at: string;
                medical_history: { overallSummary?: string; source?: string } | null;
                product_eligibility: unknown;
                claim_assessment: unknown;
                risk_report: unknown;
                disclosure_summary: { overallSummary?: string; source?: string } | null;
            };

            const rows: AnalysisRecord[] = (listResult.data as AnalysisRow[] ?? []).map((r) => ({
                id: r.id,
                customer_id: r.customer_id,
                status: r.status,
                created_at: r.created_at,
                updated_at: r.updated_at,
                overall_summary:
                    r.disclosure_summary?.overallSummary
                    ?? r.medical_history?.overallSummary
                    ?? null,
                source:
                    r.medical_history?.source
                    ?? r.disclosure_summary?.source
                    ?? null,
                has_medical_history: r.medical_history !== null,
                has_product_eligibility: r.product_eligibility !== null,
                has_claim_assessment: r.claim_assessment !== null,
                has_risk_report: r.risk_report !== null,
            }));

            setAnalyses(rows);
            setTotalCount(countResult.count ?? rows.length);
            setPage(targetPage);
        } catch (err) {
            console.error('History error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalyses(0);
    }, [fetchAnalyses]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const canPrev = page > 0;
    const canNext = page + 1 < totalPages;

    const handleDelete = async (id: string) => {
        if (!confirm('이 분석 이력을 삭제하시겠습니까?')) return;
        setDeleting(id);
        try {
            const supabase = createClient();
            await supabase.from('analyses').delete().eq('id', id);
            setAnalyses((prev) => prev.filter((a) => a.id !== id));
        } catch {
            alert('삭제에 실패했습니다.');
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-500 text-white text-xs">완료</Badge>;
            case 'processing':
                return <Badge className="bg-amber-500 text-white text-xs">처리중</Badge>;
            case 'error':
                return <Badge className="bg-red-500 text-white text-xs">오류</Badge>;
            default:
                return <Badge variant="secondary" className="text-xs">대기</Badge>;
        }
    };

    const getOverallSummary = (analysis: AnalysisRecord): string => {
        if (analysis.overall_summary) return analysis.overall_summary.substring(0, 80) + '...';
        return '분석 결과 확인하기';
    };

    const getSteps = (analysis: AnalysisRecord) => {
        const steps = [];
        if (analysis.has_medical_history) steps.push({ label: 'S1', color: 'bg-blue-500' });
        if (analysis.has_product_eligibility) steps.push({ label: 'S2', color: 'bg-green-500' });
        if (analysis.has_claim_assessment) steps.push({ label: 'S3', color: 'bg-violet-500' });
        if (analysis.has_risk_report) steps.push({ label: '위험도', color: 'bg-red-500' });
        return steps;
    };

    const getSourceBadge = (analysis: AnalysisRecord) => {
        if (analysis.source === 'codef') {
            return <Badge variant="outline" className="text-[10px] border-teal-500 text-teal-600">심평원</Badge>;
        }
        if (analysis.source === 'nhis') {
            return <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">건보공단</Badge>;
        }
        return <Badge variant="outline" className="text-[10px]">PDF</Badge>;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">분석 이력</h1>
                    <p className="text-muted-foreground mt-1">
                        이전 분석 결과를 확인하세요 (총 {totalCount}건)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchAnalyses(page)} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                    <Link href="/dashboard/analyze">
                        <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                            <FileSearch className="w-4 h-4 mr-2" />
                            새 분석
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-12">
                            <LoadingSpinner text="분석 이력을 불러오는 중..." />
                        </div>
                    ) : analyses.length === 0 ? (
                        <EmptyState
                            title="분석 이력이 없습니다"
                            description="PDF를 업로드하고 첫 번째 보험 분석을 시작해보세요."
                            action={
                                <Link href="/dashboard/analyze">
                                    <Button variant="outline" size="sm">
                                        새 분석 시작
                                    </Button>
                                </Link>
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[900px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs whitespace-nowrap min-w-[140px]">분석일시</TableHead>
                                        <TableHead className="text-xs whitespace-nowrap min-w-[80px]">소스</TableHead>
                                        <TableHead className="text-xs whitespace-nowrap min-w-[80px]">상태</TableHead>
                                        <TableHead className="text-xs whitespace-nowrap min-w-[140px]">진행단계</TableHead>
                                        <TableHead className="text-xs min-w-[200px]">요약</TableHead>
                                        <TableHead className="text-xs text-right whitespace-nowrap min-w-[260px]">작업</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analyses.map((analysis) => (
                                        <TableRow key={analysis.id} className="hover:bg-muted/30">
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(analysis.created_at)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {getSourceBadge(analysis)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {getStatusBadge(analysis.status)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {getSteps(analysis).map((step) => (
                                                        <Badge key={step.label} className={`text-[10px] ${step.color} text-white whitespace-nowrap`}>
                                                            {step.label}
                                                        </Badge>
                                                    ))}
                                                    {getSteps(analysis).length === 0 && (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                                                <span className="line-clamp-2 break-keep">{getOverallSummary(analysis)}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1.5 justify-end flex-nowrap">
                                                    {analysis.status === 'completed' && (
                                                        <>
                                                            {/* STEP 1 결과 보기 */}
                                                            <Link href={`/dashboard/analyze?analysisId=${analysis.id}`}>
                                                                <Button variant="ghost" size="sm" title="STEP 1 보기" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                                                                    <span className="text-[10px] font-bold mr-1">S1</span>
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </Link>
                                                            {/* STEP 2 */}
                                                            <Link href={`/dashboard/products?analysisId=${analysis.id}`}>
                                                                <Button variant="ghost" size="sm" title={analysis.has_product_eligibility ? "STEP 2 결과 보기" : "STEP 2 진행"} className={analysis.has_product_eligibility ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30" : "text-muted-foreground"}>
                                                                    <span className="text-[10px] font-bold mr-1">S2</span>
                                                                    {analysis.has_product_eligibility ? <Eye className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </Link>
                                                            {/* STEP 3 */}
                                                            <Link href={`/dashboard/claims?analysisId=${analysis.id}`}>
                                                                <Button variant="ghost" size="sm" title={analysis.has_claim_assessment ? "STEP 3 결과 보기" : "STEP 3 진행"} className={analysis.has_claim_assessment ? "text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30" : "text-muted-foreground"}>
                                                                    <span className="text-[10px] font-bold mr-1">S3</span>
                                                                    {analysis.has_claim_assessment ? <Eye className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </Link>
                                                            {/* 위험도 리포트 */}
                                                            <Link href={`/dashboard/risk-report?analysisId=${analysis.id}`}>
                                                                <Button variant="ghost" size="sm" title={analysis.has_risk_report ? "위험도 리포트 보기" : "위험도 리포트 생성"} className={analysis.has_risk_report ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" : "text-muted-foreground"}>
                                                                    <HeartPulse className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </Link>
                                                        </>
                                                    )}
                                                    {analysis.status === 'completed' && (
                                                        <DownloadReportButton
                                                            analysisId={analysis.id}
                                                            variant="ghost"
                                                            size="sm"
                                                        />
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(analysis.id)}
                                                        disabled={deleting === analysis.id}
                                                        title="삭제"
                                                    >
                                                        <Trash2 className={`w-4 h-4 text-muted-foreground hover:text-destructive ${deleting === analysis.id ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 페이지네이션 */}
            {!loading && totalCount > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canPrev}
                        onClick={() => fetchAnalyses(page - 1)}
                    >
                        이전
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                        {page + 1} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!canNext}
                        onClick={() => fetchAnalyses(page + 1)}
                    >
                        다음
                    </Button>
                </div>
            )}
        </div>
    );
}
