'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search, ArrowRight, HeartPulse, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';

interface CustomerItem {
    id: string;
    name: string;
    birth_date: string | null;
    gender: 'male' | 'female' | null;
    phone: string | null;
    memo: string | null;
    created_at: string;
    analysisCount: number;
    lastAnalysisDate: string | null;
    hasStep2: boolean;
    hasRiskReport: boolean;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<CustomerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [adding, setAdding] = useState(false);

    const fetchCustomers = useCallback(async () => {
        try {
            const data = await apiFetch<{ customers: CustomerItem[] }>('/api/customers');
            setCustomers(data.customers);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        try {
            await apiFetch('/api/customers', {
                method: 'POST',
                body: { name: newName.trim(), phone: newPhone.trim() || null },
            });
            setNewName('');
            setNewPhone('');
            setShowAdd(false);
            fetchCustomers();
        } catch { /* ignore */ }
        finally { setAdding(false); }
    };

    const filtered = customers.filter(c =>
        c.name.includes(search) || c.phone?.includes(search) || c.memo?.includes(search)
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                        <Users className="w-6 h-6 text-gray-500" />
                        고객 카드
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">고객별 보험 데이터를 한눈에 관리하세요</p>
                </div>
                <Button onClick={() => setShowAdd(!showAdd)} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> 고객 추가
                </Button>
            </div>

            {/* 고객 추가 — 폼 카드 좌측 강조선은 회색 (브랜드 액센트 자리 차지하지 않도록) */}
            {showAdd && (
                <Card className="border-0 shadow-md border-l-4 border-l-gray-300">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="고객 이름" className="flex-1" />
                            <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="전화번호 (선택)" className="flex-1" />
                            <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : '추가'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 검색 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객 이름, 전화번호 검색..." className="pl-9" />
            </div>

            {/* 고객 목록 */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="p-4 min-h-[88px]">
                                <div className="flex gap-3 items-center">
                                    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2.5 min-w-0">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="w-16 h-6 shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p>{search ? '검색 결과가 없습니다' : '등록된 고객이 없습니다'}</p>
                        <p className="text-xs mt-1">고객을 추가하고 분석 시 연결하면 고객 카드가 자동으로 생성됩니다.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(c => (
                        <Link key={c.id} href={`/dashboard/customers/${c.id}`}>
                            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* 아바타 — 회색 단색 */}
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <span className="text-lg font-bold text-gray-600">{c.name.charAt(0)}</span>
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900">{c.name}</p>
                                                {c.gender && <Badge variant="outline" className="text-[10px]">{c.gender === 'male' ? '남' : '여'}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                                {c.phone && <span>{c.phone}</span>}
                                                {c.birth_date && <span>{c.birth_date}</span>}
                                            </div>
                                        </div>

                                        {/* 분석 현황 — 분석건수 텍스트와 중복되는 파랑 배지는 제거. S2/위험분석 완료는 회색 outline */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {(c.hasStep2 || c.hasRiskReport) && (
                                                <div className="flex gap-1">
                                                    {c.hasStep2 && (
                                                        <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-600">S2</Badge>
                                                    )}
                                                    {c.hasRiskReport && (
                                                        <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-600 px-1.5" title="위험도 분석 완료">
                                                            <HeartPulse className="w-2.5 h-2.5" />
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                            <span className="text-xs text-gray-500 tabular-nums">{c.analysisCount}건</span>
                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
