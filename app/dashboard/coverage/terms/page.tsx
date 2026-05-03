// app/dashboard/coverage/terms/page.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowLeft, FileText, Search, Loader2, X, AlertCircle, Shield
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import ProductTermsView from '@/components/coverage/ProductTermsView';
import type { ProductTermsInfo } from '@/lib/codef/client';
import { toast } from 'sonner';

export default function ProductTermsPage() {
    const [products, setProducts] = useState<ProductTermsInfo[] | null>(null);
    const [byInsurer, setByInsurer] = useState<Record<string, ProductTermsInfo[]>>({});
    const [loading, setLoading] = useState(false);

    // 모달
    const [showModal, setShowModal] = useState(false);
    const [loginId, setLoginId] = useState('');
    const [loginPw, setLoginPw] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerBirth, setCustomerBirth] = useState('');
    const [customerGender, setCustomerGender] = useState<'M' | 'F'>('M');

    // 1단계: 내보험다보여 연동 → connectedId 획득
    // 2단계: 약관 조회
    const [connectedId, setConnectedId] = useState<string | null>(null);

    const handleFetch = useCallback(async () => {
        if (!customerName || !customerBirth) {
            toast.error('고객 이름과 생년월일을 입력해주세요.');
            return;
        }
        if (!loginId || !loginPw) {
            toast.error('내보험다보여 아이디와 비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        setShowModal(false);

        try {
            // Step 1: 내보험다보여 조회 + connectedId 획득
            toast.info('보험 정보 조회 중... (약 15~30초 소요)');

            const connectData = await apiFetch<{ requires2Way?: boolean; connectedId: string }>('/api/codef/fetch-insurance', {
                method: 'POST',
                body: {
                    loginId, loginPassword: loginPw,
                    customerName, customerBirth, customerGender,
                },
            });

            if (connectData.requires2Way) {
                toast.error('추가 인증이 필요합니다. 내보험다보여 앱에서 인증을 완료해주세요.');
                setLoading(false);
                return;
            }

            const cid = connectData.connectedId;
            setConnectedId(cid);

            // Step 2: 약관/보장 상세 조회
            toast.info('약관/보장 상세 정보 조회 중...');

            const termsData = await apiFetch<{ products: ProductTermsInfo[]; byInsurer: Record<string, ProductTermsInfo[]>; summary: { insurers: { length: number }; totalProducts: number; totalRiders: number } }>('/api/codef/product-terms', {
                method: 'POST',
                body: { connectedId: cid },
            });

            setProducts(termsData.products);
            setByInsurer(termsData.byInsurer);
            setLoginId('');
            setLoginPw('');
            toast.success(
                `${termsData.summary.insurers.length}개 보험사, ${termsData.summary.totalProducts}건 상품, ${termsData.summary.totalRiders}건 특약 조회 완료!`
            );
        } catch (err) {
            toast.error((err as Error).message || '보험상품 약관 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [customerName, customerBirth, customerGender, loginId, loginPw]);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/coverage">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary" />
                            보험상품 약관 조회
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            내보험다보여 연동으로 가입 보험의 주계약/특약/보장 상세를 조회합니다
                        </p>
                    </div>
                </div>
                {products && (
                    <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                        다시 조회
                    </Button>
                )}
            </div>

            {/* Empty state */}
            {!products && !loading && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-16 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">보험상품 약관 조회</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                내보험다보여 계정으로 로그인하면, 가입한 모든 보험의<br />
                                <strong>주계약, 특약, 보장금액, 보험료</strong>를 한눈에 확인할 수 있습니다.
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowModal(true)}
                            className="gap-2 mt-2"
                        >
                            <Search className="w-4 h-4" />
                            보험상품 조회하기
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-sm font-medium">보험상품 약관 조회 중...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            전 보험사의 상품 정보와 특약을 불러오고 있습니다
                        </p>
                    </div>
                </div>
            )}

            {/* Results */}
            {products && !loading && (
                <ProductTermsView products={products} byInsurer={byInsurer} />
            )}

            {/* Login modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">보험상품 약관 조회</h3>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    주계약 · 특약 · 보장금액 · 보험료 상세 조회
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Customer info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">이름</label>
                                    <input
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        placeholder="고객 이름"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">생년월일</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        value={customerBirth}
                                        onChange={e => setCustomerBirth(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">성별</label>
                                    <select
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                                        value={customerGender}
                                        onChange={e => setCustomerGender(e.target.value as 'M' | 'F')}
                                    >
                                        <option value="M">남성</option>
                                        <option value="F">여성</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs text-muted-foreground mb-3">내보험다보여 로그인</p>
                                <div className="space-y-3">
                                    <input
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        placeholder="아이디"
                                        value={loginId}
                                        onChange={e => setLoginId(e.target.value)}
                                    />
                                    <input
                                        type="password"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        placeholder="비밀번호"
                                        value={loginPw}
                                        onChange={e => setLoginPw(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                                🔒 입력하신 개인정보는 보험 조회 목적으로만 사용되며, 인증 정보는 서버에 저장되지 않습니다.
                            </div>

                            <Button className="w-full gap-2" onClick={handleFetch}>
                                <Search className="w-4 h-4" />
                                조회하기
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
