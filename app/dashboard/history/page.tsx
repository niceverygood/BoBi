'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSearch, ArrowRight, RefreshCw, Trash2, Eye, Download } from 'lucide-react';
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
    medical_history: Record<string, unknown> | null;
    product_eligibility: Record<string, unknown> | null;
    claim_assessment: Record<string, unknown> | null;
    disclosure_summary: Record<string, unknown> | null;
}

export default function HistoryPage() {
    const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchAnalyses = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('analyses')
                .select('id, customer_id, status, created_at, updated_at, medical_history, product_eligibility, claim_assessment, disclosure_summary')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('History fetch error:', error);
                return;
            }

            setAnalyses(data || []);
        } catch (err) {
            console.error('History error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalyses();
    }, [fetchAnalyses]);

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
        const summary = analysis.disclosure_summary as Record<string, unknown> | null;
        if (summary?.overallSummary) {
            return String(summary.overallSummary).substring(0, 80) + '...';
        }
        const medHistory = analysis.medical_history as Record<string, unknown> | null;
        if (medHistory?.overallSummary) {
            return String(medHistory.overallSummary).substring(0, 80) + '...';
        }
        return '분석 결과 확인하기';
    };

    const getSteps = (analysis: AnalysisRecord) => {
        const steps = [];
        if (analysis.medical_history) steps.push({ label: 'STEP1', color: 'bg-blue-500' });
        if (analysis.product_eligibility) steps.push({ label: 'STEP2', color: 'bg-green-500' });
        if (analysis.claim_assessment) steps.push({ label: 'STEP3', color: 'bg-violet-500' });
        return steps;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">분석 이력</h1>
                    <p className="text-muted-foreground mt-1">
                        이전 분석 결과를 확인하세요 ({analyses.length}건)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAnalyses} disabled={loading}>
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">분석일시</TableHead>
                                        <TableHead className="text-xs">상태</TableHead>
                                        <TableHead className="text-xs">진행단계</TableHead>
                                        <TableHead className="text-xs">요약</TableHead>
                                        <TableHead className="text-xs text-right">작업</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analyses.map((analysis) => (
                                        <TableRow key={analysis.id} className="hover:bg-muted/30">
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(analysis.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(analysis.status)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {getSteps(analysis).map((step) => (
                                                        <Badge key={step.label} className={`text-[10px] ${step.color} text-white`}>
                                                            {step.label}
                                                        </Badge>
                                                    ))}
                                                    {getSteps(analysis).length === 0 && (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                                                {getOverallSummary(analysis)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
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
                                                                <Button variant="ghost" size="sm" title={analysis.product_eligibility ? "STEP 2 결과 보기" : "STEP 2 진행"} className={analysis.product_eligibility ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30" : "text-muted-foreground"}>
                                                                    <span className="text-[10px] font-bold mr-1">S2</span>
                                                                    {analysis.product_eligibility ? <Eye className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </Link>
                                                            {/* STEP 3 */}
                                                            <Link href={`/dashboard/claims?analysisId=${analysis.id}`}>
                                                                <Button variant="ghost" size="sm" title={analysis.claim_assessment ? "STEP 3 결과 보기" : "STEP 3 진행"} className={analysis.claim_assessment ? "text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30" : "text-muted-foreground"}>
                                                                    <span className="text-[10px] font-bold mr-1">S3</span>
                                                                    {analysis.claim_assessment ? <Eye className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
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
        </div>
    );
}
