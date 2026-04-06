'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, FileText, Globe, Download, Trash2, Plus,
    Loader2, Search, RefreshCw, ExternalLink, AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import type { InsuranceSource } from '@/lib/insurance/crawl-sources';

interface InsuranceDoc {
    id: string;
    insurer: string;
    product_name: string;
    file_name: string;
    pdf_url: string;
    source_url: string;
    status: string;
    memo: string;
    uploaded_by: string;
    created_at: string;
}

export default function InsuranceDocsPage() {
    const { hasAdminAccess, loading: adminLoading } = useAdmin();
    const [docs, setDocs] = useState<InsuranceDoc[]>([]);
    const [sources, setSources] = useState<InsuranceSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // 크롤링 폼
    const [crawlUrl, setCrawlUrl] = useState('');
    const [crawlInsurer, setCrawlInsurer] = useState('');
    const [crawlName, setCrawlName] = useState('');
    const [crawling, setCrawling] = useState(false);
    const [crawlResult, setCrawlResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 수동 등록
    const [showManual, setShowManual] = useState(false);
    const [manualInsurer, setManualInsurer] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [manualMemo, setManualMemo] = useState('');
    const [adding, setAdding] = useState(false);

    const fetchDocs = useCallback(async () => {
        try {
            const data = await apiFetch<{ docs: InsuranceDoc[]; sources: InsuranceSource[] }>('/api/admin/insurance-docs');
            setDocs(data.docs);
            setSources(data.sources);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (hasAdminAccess) fetchDocs(); }, [hasAdminAccess, fetchDocs]);

    const handleCrawl = async () => {
        if (!crawlUrl) return;
        setCrawling(true);
        setCrawlResult(null);
        try {
            const data = await apiFetch<{ message: string; docs?: InsuranceDoc[] }>('/api/admin/insurance-docs', {
                method: 'POST',
                body: { action: 'crawl_url', url: crawlUrl, insurer: crawlInsurer, productName: crawlName },
            });
            setCrawlResult({ type: 'success', text: data.message });
            setCrawlUrl('');
            fetchDocs();
        } catch (err) {
            setCrawlResult({ type: 'error', text: (err as Error).message });
        } finally { setCrawling(false); }
    };

    const handleManualAdd = async () => {
        if (!manualInsurer || !manualName) return;
        setAdding(true);
        try {
            await apiFetch('/api/admin/insurance-docs', {
                method: 'POST',
                body: { action: 'manual_add', insurer: manualInsurer, productName: manualName, pdfUrl: manualUrl, memo: manualMemo },
            });
            setManualInsurer(''); setManualName(''); setManualUrl(''); setManualMemo('');
            setShowManual(false);
            fetchDocs();
        } catch { /* ignore */ }
        finally { setAdding(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 약관을 삭제하시겠습니까?')) return;
        try {
            await apiFetch(`/api/admin/insurance-docs?id=${id}`, { method: 'DELETE' });
            fetchDocs();
        } catch { /* ignore */ }
    };

    const filtered = docs.filter(d =>
        d.insurer.includes(search) || d.product_name.includes(search) || d.file_name.includes(search)
    );

    // 보험사별 그룹
    const byInsurer = new Map<string, InsuranceDoc[]>();
    for (const d of filtered) {
        if (!byInsurer.has(d.insurer)) byInsurer.set(d.insurer, []);
        byInsurer.get(d.insurer)!.push(d);
    }

    if (adminLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!hasAdminAccess) return <div className="p-8 text-center">관리자 권한이 필요합니다.</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" />보험 약관 관리</h1>
                    <p className="text-sm text-muted-foreground">총 {docs.length}건 등록됨 · {sources.length}개 보험사 소스</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDocs} className="ml-auto"><RefreshCw className="w-3 h-3 mr-1" />새로고침</Button>
            </div>

            {/* URL 크롤링 */}
            <Card className="border-0 shadow-md border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />URL 크롤링</CardTitle>
                    <CardDescription>보험사 공시 페이지 URL을 입력하면 PDF 링크를 자동 추출합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input value={crawlUrl} onChange={e => setCrawlUrl(e.target.value)} placeholder="https://www.samsungfire.com/..." className="flex-1" />
                        <Input value={crawlInsurer} onChange={e => setCrawlInsurer(e.target.value)} placeholder="보험사명" className="w-32" />
                        <Button onClick={handleCrawl} disabled={crawling || !crawlUrl}>
                            {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                            크롤링
                        </Button>
                    </div>
                    {/* 보험사 바로가기 */}
                    <div className="flex flex-wrap gap-1">
                        {sources.map(s => (
                            <button key={s.id} onClick={() => { setCrawlUrl(s.url); setCrawlInsurer(s.name); }}
                                className="text-[10px] px-2 py-1 rounded-full border hover:bg-primary/5 hover:border-primary transition-colors">
                                {s.name}
                            </button>
                        ))}
                    </div>
                    {crawlResult && (
                        <p className={`text-sm ${crawlResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {crawlResult.text}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 수동 등록 */}
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowManual(!showManual)}>
                    <Plus className="w-3 h-3 mr-1" />{showManual ? '취소' : '수동 등록'}
                </Button>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="보험사, 상품명 검색..." className="pl-9" />
                </div>
            </div>

            {showManual && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 grid sm:grid-cols-2 gap-3">
                        <Input value={manualInsurer} onChange={e => setManualInsurer(e.target.value)} placeholder="보험사 *" />
                        <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="상품명 *" />
                        <Input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="PDF URL (선택)" />
                        <Input value={manualMemo} onChange={e => setManualMemo(e.target.value)} placeholder="메모 (선택)" />
                        <Button onClick={handleManualAdd} disabled={adding || !manualInsurer || !manualName} className="sm:col-span-2">
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : '등록'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* 약관 목록 */}
            {loading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
                <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p>{search ? '검색 결과가 없습니다' : '등록된 약관이 없습니다'}</p>
                </CardContent></Card>
            ) : (
                <div className="space-y-4">
                    {[...byInsurer.entries()].map(([insurer, insurerDocs]) => (
                        <Card key={insurer} className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    {insurer}
                                    <Badge variant="secondary" className="text-[10px]">{insurerDocs.length}건</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {insurerDocs.map(d => (
                                    <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group">
                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{d.product_name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{d.file_name}</p>
                                        </div>
                                        <Badge variant="outline" className={`text-[10px] ${d.status === 'active' ? 'border-green-300 text-green-600' : d.status === 'discovered' ? 'border-blue-300 text-blue-600' : 'border-gray-300'}`}>
                                            {d.status === 'active' ? '활성' : d.status === 'discovered' ? '발견' : '대기'}
                                        </Badge>
                                        {d.pdf_url && (
                                            <a href={d.pdf_url} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm" className="h-7 opacity-0 group-hover:opacity-100"><ExternalLink className="w-3 h-3" /></Button>
                                            </a>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}
                                            className="h-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
