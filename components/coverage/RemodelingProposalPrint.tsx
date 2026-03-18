// components/coverage/RemodelingProposalPrint.tsx
// 리모델링 제안서 PDF 생성용 (인쇄 전용 레이아웃)
'use client';

import { forwardRef } from 'react';
import type { RemodelingProposal } from '@/types/coverage';

function formatAmount(amount: number): string {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 === 0 ? 0 : 1)}억원`;
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만원`;
    return `${amount.toLocaleString()}원`;
}

interface Props {
    proposal: RemodelingProposal;
}

const RemodelingProposalPrint = forwardRef<HTMLDivElement, Props>(({ proposal }, ref) => {
    const keepPolicies = proposal.policy_actions.filter(p => p.action === '유지');
    const cancelPolicies = proposal.policy_actions.filter(p => p.action === '해지 권장');
    const changePolicies = proposal.policy_actions.filter(p => ['변경 검토', '감액 검토'].includes(p.action));

    return (
        <div ref={ref} style={{
            width: '794px', fontFamily: 'Pretendard, sans-serif', color: '#1a1a2e',
            backgroundColor: '#fff', padding: '40px 48px', fontSize: '13px', lineHeight: '1.6',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '3px solid #8b5cf6', paddingBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#4c1d95' }}>
                        📋 보험 리모델링 제안서
                    </h1>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                        AI 자동 분석 · 보비(BoBi)
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                        생성일: {new Date().toLocaleDateString('ko-KR')}
                    </p>
                </div>
            </div>

            {/* Customer & Score Summary */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: '0 0 8px 0' }}>고객 정보</h3>
                    <p style={{ fontSize: '12px', margin: '2px 0' }}>{proposal.customer_name} · {proposal.customer_age}세 · {proposal.customer_gender}</p>
                    <p style={{ fontSize: '12px', margin: '2px 0' }}>현재 보험료: <strong>{formatAmount(proposal.total_current_premium)}/월</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f0fdf4', borderRadius: '12px', padding: '16px', border: '1px solid #bbf7d0' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>현재</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#d97706' }}>{proposal.current_score}</p>
                    </div>
                    <div style={{ fontSize: '20px' }}>→</div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>리모델링 후</p>
                        <p style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#059669' }}>{proposal.expected_score}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '4px 12px', borderRadius: '8px', background: '#059669', color: '#fff' }}>
                        <p style={{ fontSize: '10px', margin: 0 }}>향상</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>+{proposal.expected_score - proposal.current_score}</p>
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <div style={{ background: '#faf5ff', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', border: '1px solid #e9d5ff' }}>
                <p style={{ fontSize: '12px', color: '#6d28d9', margin: 0, fontWeight: 500, whiteSpace: 'pre-line' }}>
                    💡 {proposal.executive_summary}
                </p>
            </div>

            {/* Policy Actions Table */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>📊 기존 보험 판정</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>보험사 / 상품</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>월보험료</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>판정</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>사유</th>
                    </tr>
                </thead>
                <tbody>
                    {proposal.policy_actions.map((pa, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '6px 10px' }}>
                                <strong>{pa.insurer}</strong>
                                <br />
                                <span style={{ color: '#6b7280', fontSize: '10px' }}>{pa.product_name}</span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600 }}>
                                {formatAmount(pa.monthly_premium)}
                            </td>
                            <td style={{
                                textAlign: 'center', padding: '6px 10px', fontWeight: 700, fontSize: '10px',
                                color: pa.action === '유지' ? '#059669' : pa.action === '해지 권장' ? '#dc2626' : '#d97706'
                            }}>
                                {pa.action === '유지' ? '✅ 유지' : pa.action === '해지 권장' ? '❌ 해지 권장' : '⚠️ ' + pa.action}
                            </td>
                            <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: '10px' }}>
                                {pa.reason}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* New Recommendations */}
            {proposal.new_recommendations.length > 0 && (
                <>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>🆕 신규 가입 추천</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                        <thead>
                            <tr style={{ background: '#eff6ff', borderBottom: '2px solid #bfdbfe' }}>
                                <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#1e40af' }}>보장 항목</th>
                                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#1e40af' }}>추천 금액</th>
                                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#1e40af' }}>부족 금액</th>
                                <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#1e40af' }}>예상 보험료</th>
                                <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, color: '#1e40af' }}>우선순위</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proposal.new_recommendations.map((rec, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '6px 10px' }}>
                                        <strong>{rec.coverage_name}</strong>
                                        <br />
                                        <span style={{ color: '#6b7280', fontSize: '10px' }}>{rec.category}</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: '#2563eb' }}>
                                        {formatAmount(rec.recommended_amount)}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#dc2626' }}>
                                        {formatAmount(rec.current_gap)}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '6px 10px' }}>
                                        월 ~{formatAmount(rec.estimated_premium)}
                                    </td>
                                    <td style={{
                                        textAlign: 'center', padding: '6px 10px', fontWeight: 600, fontSize: '10px',
                                        color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#2563eb'
                                    }}>
                                        {rec.priority === 'high' ? '🔴 긴급' : rec.priority === 'medium' ? '🟡 권장' : '🔵 참고'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Premium Summary */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>현재 총 보험료</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{formatAmount(proposal.total_current_premium)}</p>
                </div>
                <div style={{ flex: 1, background: '#eff6ff', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>리모델링 후</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#2563eb' }}>{formatAmount(proposal.total_after_premium)}</p>
                </div>
                <div style={{
                    flex: 1, borderRadius: '8px', padding: '12px', textAlign: 'center',
                    background: proposal.premium_change >= 0 ? '#eff6ff' : '#f0fdf4',
                    border: `1px solid ${proposal.premium_change >= 0 ? '#bfdbfe' : '#bbf7d0'}`,
                }}>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px 0' }}>보험료 변동</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: proposal.premium_change >= 0 ? '#2563eb' : '#059669' }}>
                        {proposal.premium_change >= 0 ? '+' : ''}{formatAmount(proposal.premium_change)}
                    </p>
                </div>
            </div>

            {/* Action Steps */}
            {proposal.action_steps.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>📝 실행 단계</h3>
                    {proposal.action_steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%', background: '#8b5cf6', color: '#fff',
                                fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                {i + 1}
                            </div>
                            <p style={{ fontSize: '11px', margin: '2px 0 0 0' }}>{step}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Important Notes */}
            {proposal.important_notes.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>⚠️ 주의사항</h3>
                    {proposal.important_notes.map((note, i) => (
                        <div key={i} style={{ padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', fontSize: '10px', background: '#fffbeb', borderLeft: '3px solid #f59e0b' }}>
                            {note}
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                본 리모델링 제안서는 AI 자동 분석 결과이며, 실제 보험 계약 조건과 다를 수 있습니다. 정확한 내용은 담당 설계사와 상담해주세요.
                <br />보비(BoBi) · bo-bi.vercel.app
            </div>
        </div>
    );
});

RemodelingProposalPrint.displayName = 'RemodelingProposalPrint';

export default RemodelingProposalPrint;
