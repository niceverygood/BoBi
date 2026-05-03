// components/coverage/CoverageReport.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    User, AlertTriangle, ChevronDown, ChevronUp, Download,
    TrendingUp, TrendingDown, Minus, Shield, Star
} from 'lucide-react';
import type { CoverageAnalysisResult, CategoryAnalysis, SubcategoryAnalysis, RiskAlert } from '@/types/coverage';

interface CoverageReportProps {
    result: CoverageAnalysisResult;
    onDownloadPdf?: () => void;
}

function formatAmount(amount: number): string {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 === 0 ? 0 : 1)}억원`;
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만원`;
    return `${amount.toLocaleString()}원`;
}

function getStatusColor(status: string) {
    switch (status) {
        case '부족': return 'text-red-500';
        case '과다': return 'text-amber-500';
        case '적정': return 'text-emerald-500';
        default: return 'text-muted-foreground';
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case '부족': return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">🔴 부족</Badge>;
        case '과다': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">🟡 과다</Badge>;
        case '적정': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">✅ 적정</Badge>;
        default: return null;
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case '부족': return <TrendingDown className="w-4 h-4 text-red-500" />;
        case '과다': return <TrendingUp className="w-4 h-4 text-amber-500" />;
        case '적정': return <Minus className="w-4 h-4 text-emerald-500" />;
        default: return null;
    }
}

function getGradeColor(grade: string) {
    switch (grade) {
        case 'A': return 'bg-emerald-600';
        case 'B': return 'bg-blue-600';
        case 'C': return 'bg-amber-600';
        case 'D': return 'bg-orange-600';
        case 'F': return 'bg-red-600';
        default: return 'bg-gray-600';
    }
}

function getSeverityStyle(severity: string) {
    switch (severity) {
        case 'high': return 'border-red-200 bg-red-50 dark:bg-red-950/20';
        case 'medium': return 'border-amber-200 bg-amber-50 dark:bg-amber-950/20';
        case 'low': return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
        default: return '';
    }
}

function getSeverityIcon(severity: string) {
    switch (severity) {
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🔵';
        default: return '⚪';
    }
}

export default function CoverageReport({ result, onDownloadPdf }: CoverageReportProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
    const { customer_summary, coverage_analysis, risk_alerts, overall_score } = result;

    const toggleCategory = (index: number) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedCategories(new Set(coverage_analysis.map((_, i) => i)));
    };

    return (
        <div className="space-y-6">
            {/* Customer Summary + Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Info */}
                <Card className="border-0 shadow-sm md:col-span-1">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{customer_summary.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {customer_summary.gender} · {customer_summary.age}세
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground text-xs">보험 건수</p>
                                <p className="font-semibold text-lg">{customer_summary.active_policies}건</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground text-xs">월 보험료</p>
                                <p className="font-semibold text-lg">
                                    {(customer_summary.total_monthly_premium / 10000).toLocaleString()}만원
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Overall Score */}
                <Card className="border-0 shadow-sm md:col-span-2">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                            {/* Score Circle */}
                            <div className="relative w-28 h-28 shrink-0">
                                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                                        className="text-muted/20" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="42" fill="none"
                                        className={`text-${overall_score.grade === 'A' ? 'emerald' : overall_score.grade === 'B' ? 'blue' : overall_score.grade === 'C' ? 'amber' : 'red'}-500`}
                                        stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={`${overall_score.score * 2.64} 264`} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold">{overall_score.score}</span>
                                    <span className="text-xs text-muted-foreground">/ 100</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`px-3 py-1 rounded-full text-white font-bold text-sm ${getGradeColor(overall_score.grade)}`}>
                                        {overall_score.grade}등급
                                    </div>
                                    <Star className="w-4 h-4 text-amber-400" />
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {overall_score.summary}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Alerts */}
            {risk_alerts.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            위험 알림
                            <Badge variant="secondary" className="text-xs">{risk_alerts.length}건</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {risk_alerts
                            .sort((a, b) => {
                                const order = { high: 0, medium: 1, low: 2 };
                                return (order[a.severity] || 2) - (order[b.severity] || 2);
                            })
                            .map((alert, i) => (
                                <div key={i} className={`p-3 rounded-lg border ${getSeverityStyle(alert.severity)}`}>
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm mt-0.5">{getSeverityIcon(alert.severity)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium">{alert.message}</span>
                                                <Badge variant="outline" className="text-xs shrink-0">{alert.type}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{alert.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </CardContent>
                </Card>
            )}

            {/* Coverage Analysis Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            보장 분석 상세
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-xs" onClick={expandAll}>
                                전체 펼치기
                            </Button>
                            {onDownloadPdf && (
                                <Button variant="outline" size="sm" className="text-xs" onClick={onDownloadPdf}>
                                    <Download className="w-3 h-3 mr-1" /> PDF
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Header */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b mb-1">
                        <div className="col-span-4">보장 항목</div>
                        <div className="col-span-3 text-right">합산 금액</div>
                        <div className="col-span-3 text-right">적정 기준</div>
                        <div className="col-span-2 text-center">상태</div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-1">
                        {coverage_analysis.map((cat, ci) => (
                            <CategoryRow
                                key={ci}
                                category={cat}
                                expanded={expandedCategories.has(ci)}
                                onToggle={() => toggleCategory(ci)}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Sub components ────────────────────────────────

function CategoryRow({ category, expanded, onToggle }: {
    category: CategoryAnalysis; expanded: boolean; onToggle: () => void;
}) {
    // Calculate category total
    const totalAmount = category.subcategories.reduce((sum, s) => sum + s.total_amount, 0);
    const hasIssues = category.subcategories.some(s => s.status === '부족');

    return (
        <div className="rounded-lg overflow-hidden">
            {/* Category header */}
            <div
                className="grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors items-center"
                onClick={onToggle}
            >
                <div className="col-span-8 sm:col-span-4 flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium text-sm">{category.category}</span>
                    {hasIssues && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <div className="hidden sm:block col-span-3 text-right text-sm font-medium">
                    {totalAmount > 0 ? formatAmount(totalAmount) : '-'}
                </div>
                <div className="hidden sm:block col-span-3 text-right text-sm text-muted-foreground">
                    {category.subcategories[0]?.recommended_amount > 0
                        ? formatAmount(category.subcategories[0].recommended_amount)
                        : '-'}
                </div>
                <div className="col-span-4 sm:col-span-2 flex items-center justify-end sm:justify-center gap-1">
                    {category.subcategories.length > 0 && getStatusBadge(
                        category.subcategories.every(s => s.status === '적정') ? '적정' :
                            category.subcategories.some(s => s.status === '부족') ? '부족' : '과다'
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </div>
            </div>

            {/* Subcategories expanded */}
            {expanded && category.subcategories.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                    {category.subcategories.map((sub, si) => (
                        <SubcategoryRow key={si} sub={sub} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SubcategoryRow({ sub }: { sub: SubcategoryAnalysis }) {
    const [showSources, setShowSources] = useState(false);

    return (
        <div className="ml-8 rounded-lg bg-muted/30 overflow-hidden">
            <div
                className="grid grid-cols-12 gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors items-center"
                onClick={() => setShowSources(!showSources)}
            >
                <div className="col-span-6 sm:col-span-4">
                    <span className="text-sm">{sub.name}</span>
                </div>
                <div className="hidden sm:block col-span-3 text-right">
                    <span className={`text-sm font-medium ${getStatusColor(sub.status)}`}>
                        {formatAmount(sub.total_amount)}
                    </span>
                </div>
                <div className="hidden sm:block col-span-3 text-right text-sm text-muted-foreground">
                    {sub.recommended_amount > 0 ? formatAmount(sub.recommended_amount) : '-'}
                </div>
                <div className="col-span-6 sm:col-span-2 flex items-center justify-end sm:justify-center gap-1">
                    {getStatusIcon(sub.status)}
                    <span className={`text-xs font-medium ${getStatusColor(sub.status)}`}>
                        {sub.gap !== 0 && sub.gap < 0 ? formatAmount(Math.abs(sub.gap)) + ' 부족' :
                            sub.gap > 0 ? formatAmount(sub.gap) + ' 초과' : '적정'}
                    </span>
                </div>
            </div>

            {/* Sources */}
            {showSources && sub.sources.length > 0 && (
                <div className="px-3 pb-3 space-y-1">
                    {sub.sources.map((src, si) => (
                        <div key={si} className="flex items-center justify-between text-xs px-3 py-2 rounded bg-background">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{src.insurer}</span>
                                <span>{src.product}</span>
                                {src.renewal_type && (
                                    <Badge variant="outline" className="text-xs">{src.renewal_type}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{formatAmount(src.amount)}</span>
                                {src.expiry && (
                                    <span className="text-muted-foreground">~{src.expiry.slice(0, 7)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
