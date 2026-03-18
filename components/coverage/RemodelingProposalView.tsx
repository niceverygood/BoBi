// components/coverage/RemodelingProposalView.tsx
// 리모델링 제안서 표시 컴포넌트
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FileText, CheckCircle2, XCircle, AlertTriangle, ArrowRightLeft,
    TrendingUp, TrendingDown, Sparkles, ChevronDown, ChevronUp,
    ListChecks, AlertCircle, Plus, DollarSign
} from 'lucide-react';
import type { RemodelingProposal, PolicyAction, NewPolicyRecommendation } from '@/types/coverage';

interface Props {
    proposal: RemodelingProposal;
    onDownloadPdf?: () => void;
}

function formatAmount(amount: number): string {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 === 0 ? 0 : 1)}억원`;
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만원`;
    return `${amount.toLocaleString()}원`;
}

function getActionColor(action: string) {
    switch (action) {
        case '유지': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
        case '해지 권장': return 'bg-red-500/10 text-red-700 border-red-200';
        case '변경 검토': return 'bg-amber-500/10 text-amber-700 border-amber-200';
        case '감액 검토': return 'bg-orange-500/10 text-orange-700 border-orange-200';
        default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
}

function getActionIcon(action: string) {
    switch (action) {
        case '유지': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
        case '해지 권장': return <XCircle className="w-4 h-4 text-red-600" />;
        case '변경 검토': return <ArrowRightLeft className="w-4 h-4 text-amber-600" />;
        case '감액 검토': return <TrendingDown className="w-4 h-4 text-orange-600" />;
        default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
}

function getPriorityBadge(priority: string) {
    switch (priority) {
        case 'high': return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px]">긴급</Badge>;
        case 'medium': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">권장</Badge>;
        case 'low': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">참고</Badge>;
        default: return null;
    }
}

export default function RemodelingProposalView({ proposal, onDownloadPdf }: Props) {
    const [expandedPolicies, setExpandedPolicies] = useState<Set<number>>(new Set());

    const togglePolicy = (i: number) => {
        setExpandedPolicies(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
        });
    };

    const keepCount = proposal.policy_actions.filter(p => p.action === '유지').length;
    const cancelCount = proposal.policy_actions.filter(p => p.action === '해지 권장').length;
    const changeCount = proposal.policy_actions.filter(p => ['변경 검토', '감액 검토'].includes(p.action)).length;

    return (
        <div className="space-y-6">
            {/* Score Improvement Card */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                {/* Current score */}
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">현재 점수</p>
                                    <div className="w-16 h-16 rounded-full border-4 border-amber-400 flex items-center justify-center bg-background">
                                        <span className="text-lg font-bold">{proposal.current_score}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                                    <span className="text-xs text-muted-foreground">리모델링</span>
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                </div>

                                {/* Expected score */}
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">예상 점수</p>
                                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-background">
                                        <span className="text-lg font-bold text-emerald-600">{proposal.expected_score}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center px-4 py-2 rounded-xl bg-emerald-500/10">
                                <p className="text-xs text-emerald-600 font-medium">점수 향상</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    +{proposal.expected_score - proposal.current_score}점
                                </p>
                            </div>
                        </div>

                        {/* Premium change */}
                        <div className="text-right">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-xs text-muted-foreground">현재 보험료</p>
                                    <p className="text-lg font-semibold">{formatAmount(proposal.total_current_premium)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">리모델링 후</p>
                                    <p className="text-lg font-semibold text-primary">{formatAmount(proposal.total_after_premium)}</p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-lg ${proposal.premium_change >= 0 ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
                                    <p className="text-xs text-muted-foreground">변동</p>
                                    <p className={`text-sm font-bold ${proposal.premium_change >= 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {proposal.premium_change >= 0 ? '+' : ''}{formatAmount(proposal.premium_change)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Executive Summary */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        종합 의견
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                            {proposal.executive_summary}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Policy Actions */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ListChecks className="w-4 h-4 text-primary" />
                            기존 보험 판정
                        </CardTitle>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />유지 {keepCount}
                            </Badge>
                            {cancelCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                    <XCircle className="w-3 h-3 mr-1 text-red-500" />해지 권장 {cancelCount}
                                </Badge>
                            )}
                            {changeCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                    <ArrowRightLeft className="w-3 h-3 mr-1 text-amber-500" />변경/감액 {changeCount}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {proposal.policy_actions.map((pa, i) => (
                        <PolicyActionCard
                            key={i}
                            action={pa}
                            expanded={expandedPolicies.has(i)}
                            onToggle={() => togglePolicy(i)}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* New Recommendations */}
            {proposal.new_recommendations.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Plus className="w-4 h-4 text-primary" />
                            신규 가입 추천
                            <Badge variant="secondary" className="text-xs">
                                {proposal.new_recommendations.length}건
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {proposal.new_recommendations
                            .sort((a, b) => {
                                const order = { high: 0, medium: 1, low: 2 };
                                return (order[a.priority] || 2) - (order[b.priority] || 2);
                            })
                            .map((rec, i) => (
                                <NewRecommendationCard key={i} rec={rec} />
                            ))}

                        {/* Total estimated premium */}
                        <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">추가 예상 보험료 합계</span>
                            </div>
                            <span className="text-sm font-bold text-primary">
                                월 {formatAmount(
                                    proposal.new_recommendations.reduce((sum, r) => sum + r.estimated_premium, 0)
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Steps */}
            {proposal.action_steps.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            실행 단계
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {proposal.action_steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-primary">{i + 1}</span>
                                    </div>
                                    <p className="text-sm pt-1">{step}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Important Notes */}
            {proposal.important_notes.length > 0 && (
                <Card className="border-0 shadow-sm border-amber-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            주의사항
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {proposal.important_notes.map((note, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                                    <span className="text-amber-500 mt-0.5">⚠️</span>
                                    <p className="text-xs text-amber-800 dark:text-amber-200">{note}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Download button */}
            {onDownloadPdf && (
                <div className="flex justify-center">
                    <Button onClick={onDownloadPdf} className="gap-2">
                        <FileText className="w-4 h-4" />
                        리모델링 제안서 PDF 다운로드
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─── Sub components ────────────────────────────────

function PolicyActionCard({ action, expanded, onToggle }: {
    action: PolicyAction;
    expanded: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={`rounded-lg border overflow-hidden ${action.action === '해지 권장' ? 'border-red-200' :
                action.action === '변경 검토' || action.action === '감액 검토' ? 'border-amber-200' :
                    'border-border'
            }`}>
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getActionIcon(action.action)}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{action.insurer}</span>
                            <span className="text-xs text-muted-foreground truncate">{action.product_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            월 {formatAmount(action.monthly_premium)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getPriorityBadge(action.priority)}
                    <Badge className={`text-xs ${getActionColor(action.action)}`}>
                        {action.action}
                    </Badge>
                    {action.savings_if_cancelled && (
                        <span className="text-xs text-red-600 font-medium">
                            -{formatAmount(action.savings_if_cancelled)}
                        </span>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-3 pt-1 border-t bg-muted/20 space-y-2">
                    {/* Key coverages */}
                    {action.key_coverages.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">주요 보장</p>
                            <div className="flex flex-wrap gap-1">
                                {action.key_coverages.map((cov, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{cov}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="p-2 rounded bg-background text-xs leading-relaxed">
                        💡 {action.reason}
                    </div>

                    {/* Dates */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>가입: {action.contract_date}</span>
                        <span>만기: {action.expiry_date}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function NewRecommendationCard({ rec }: { rec: NewPolicyRecommendation }) {
    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        {getPriorityBadge(rec.priority)}
                        <span className="text-xs text-muted-foreground">{rec.category}</span>
                    </div>
                    <h4 className="text-sm font-semibold">{rec.coverage_name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{formatAmount(rec.recommended_amount)}</p>
                    <p className="text-[10px] text-muted-foreground">
                        부족: {formatAmount(rec.current_gap)}
                    </p>
                    <p className="text-xs font-medium mt-1">
                        월 ~{formatAmount(rec.estimated_premium)}
                    </p>
                </div>
            </div>
            {(rec.suggested_insurer || rec.suggested_product) && (
                <div className="mt-2 pt-2 border-t border-primary/10 text-xs text-muted-foreground">
                    추천: {rec.suggested_insurer} {rec.suggested_product}
                </div>
            )}
        </div>
    );
}
