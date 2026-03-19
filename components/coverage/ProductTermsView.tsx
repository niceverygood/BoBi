// components/coverage/ProductTermsView.tsx
// 보험상품 약관/보장 상세 조회 컴포넌트
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ChevronDown, ChevronUp, Shield, FileText, Banknote,
    Calendar, Building2, Star, Tag, Layers
} from 'lucide-react';
import type { ProductTermsInfo } from '@/lib/codef/client';

interface Props {
    products: ProductTermsInfo[];
    byInsurer: Record<string, ProductTermsInfo[]>;
}

function formatAmount(amount: number): string {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 === 0 ? 0 : 1)}억원`;
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만원`;
    return `${amount.toLocaleString()}원`;
}

export default function ProductTermsView({ products, byInsurer }: Props) {
    const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<'all' | 'byInsurer'>('all');

    const toggle = (i: number) => {
        setExpandedProducts(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
        });
    };

    const expandAll = () => setExpandedProducts(new Set(products.map((_, i) => i)));
    const collapseAll = () => setExpandedProducts(new Set());

    // Stats
    const totalPremium = products.reduce((s, p) => s + p.monthly_premium, 0);
    const totalRiders = products.reduce((s, p) => s + p.riders.length, 0);
    const activeProducts = products.filter(p => /유지|정상/.test(p.status));

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">보험사</span>
                        </div>
                        <p className="text-xl font-bold">{Object.keys(byInsurer).length}개</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">유지 보험</span>
                        </div>
                        <p className="text-xl font-bold">{activeProducts.length}건</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Layers className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">총 특약</span>
                        </div>
                        <p className="text-xl font-bold">{totalRiders}건</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Banknote className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">월 보험료 합계</span>
                        </div>
                        <p className="text-xl font-bold">{formatAmount(totalPremium)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                    <Button
                        variant={viewMode === 'all' ? 'default' : 'ghost'}
                        size="sm" className="text-xs"
                        onClick={() => setViewMode('all')}
                    >
                        전체 보기
                    </Button>
                    <Button
                        variant={viewMode === 'byInsurer' ? 'default' : 'ghost'}
                        size="sm" className="text-xs"
                        onClick={() => setViewMode('byInsurer')}
                    >
                        보험사별
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={expandAll}>전체 펼치기</Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={collapseAll}>전체 접기</Button>
                </div>
            </div>

            {/* Products List */}
            {viewMode === 'all' ? (
                <div className="space-y-3">
                    {products.map((product, i) => (
                        <ProductTermsCard
                            key={i}
                            product={product}
                            index={i}
                            expanded={expandedProducts.has(i)}
                            onToggle={() => toggle(i)}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(byInsurer).map(([insurer, insurerProducts]) => (
                        <div key={insurer}>
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-semibold">{insurer}</h3>
                                <Badge variant="secondary" className="text-xs">{insurerProducts.length}건</Badge>
                                <span className="text-xs text-muted-foreground">
                                    월 {formatAmount(insurerProducts.reduce((s, p) => s + p.monthly_premium, 0))}
                                </span>
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                                {insurerProducts.map((product, i) => {
                                    const globalIdx = products.indexOf(product);
                                    return (
                                        <ProductTermsCard
                                            key={i}
                                            product={product}
                                            index={globalIdx}
                                            expanded={expandedProducts.has(globalIdx)}
                                            onToggle={() => toggle(globalIdx)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── 개별 상품 카드 ─────────────────────────────────

function ProductTermsCard({ product, index, expanded, onToggle }: {
    product: ProductTermsInfo;
    index: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const isActive = /유지|정상/.test(product.status);

    return (
        <Card className={`border-0 shadow-sm overflow-hidden ${!isActive ? 'opacity-60' : ''}`}>
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">{product.insurer}</span>
                            <Badge
                                className={`text-[10px] ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                    : 'bg-gray-500/10 text-gray-500 border-gray-200'
                                    }`}
                            >
                                {product.status || '유지'}
                            </Badge>
                        </div>
                        <p className="text-sm font-semibold truncate">{product.product_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>월 {formatAmount(product.monthly_premium)}</span>
                            <span>·</span>
                            <span>{product.contract_date} ~ {product.expiry_date}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">특약</p>
                        <p className="text-sm font-semibold">{product.riders.length}건</p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <CardContent className="pt-0 pb-5 space-y-4">
                    {/* Product info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30">
                        {product.product_type && (
                            <div>
                                <p className="text-[10px] text-muted-foreground">상품유형</p>
                                <p className="text-xs font-medium">{product.product_type}</p>
                            </div>
                        )}
                        {product.payment_period && (
                            <div>
                                <p className="text-[10px] text-muted-foreground">납입기간</p>
                                <p className="text-xs font-medium">{product.payment_period}</p>
                            </div>
                        )}
                        {product.surrender_value !== undefined && product.surrender_value > 0 && (
                            <div>
                                <p className="text-[10px] text-muted-foreground">해약환급금</p>
                                <p className="text-xs font-medium">{formatAmount(product.surrender_value)}</p>
                            </div>
                        )}
                        {product.loan_amount !== undefined && product.loan_amount > 0 && (
                            <div>
                                <p className="text-[10px] text-muted-foreground">대출금액</p>
                                <p className="text-xs font-medium text-red-600">{formatAmount(product.loan_amount)}</p>
                            </div>
                        )}
                    </div>

                    {/* Main coverage */}
                    {product.main_coverage.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-semibold">주계약</span>
                            </div>
                            <div className="space-y-1">
                                {product.main_coverage.map((mc, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm">
                                        <span className="font-medium">{mc.name}</span>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="font-semibold">{formatAmount(mc.amount)}</span>
                                            {mc.premium !== undefined && mc.premium > 0 && (
                                                <span className="text-muted-foreground">월 {formatAmount(mc.premium)}</span>
                                            )}
                                            {mc.period && <span className="text-muted-foreground">{mc.period}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Riders */}
                    {product.riders.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold">특약 ({product.riders.length}건)</span>
                            </div>
                            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                                {product.riders.map((rider, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <span className="text-xs flex-1 min-w-0 truncate">{rider.name}</span>
                                        <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                                            <span className="font-medium">{formatAmount(rider.amount)}</span>
                                            {rider.premium !== undefined && rider.premium > 0 && (
                                                <span className="text-muted-foreground">월{formatAmount(rider.premium)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All coverages (if no riders/main breakdown) */}
                    {product.main_coverage.length === 0 && product.riders.length === 0 && product.all_coverages.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold">보장내역 ({product.all_coverages.length}건)</span>
                            </div>
                            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                                {product.all_coverages.map((cov, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xs truncate">{cov.name}</span>
                                            {cov.status && (
                                                <Badge variant="outline" className="text-[10px] shrink-0">{cov.status}</Badge>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium ml-2 shrink-0">{formatAmount(cov.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
