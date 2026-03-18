// components/coverage/CoverageReportPrint.tsx
// PDF 생성용 보장 분석표 (인쇄 전용 레이아웃)
'use client';

import { forwardRef } from 'react';
import type { CoverageAnalysisResult } from '@/types/coverage';

function formatAmount(amount: number): string {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 === 0 ? 0 : 1)}억원`;
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}만원`;
    return `${amount.toLocaleString()}원`;
}

interface Props {
    result: CoverageAnalysisResult;
}

const CoverageReportPrint = forwardRef<HTMLDivElement, Props>(({ result }, ref) => {
    const { customer_summary, coverage_analysis, risk_alerts, overall_score } = result;

    return (
        <div ref={ref} style={{
            width: '794px', fontFamily: 'Pretendard, sans-serif', color: '#1a1a2e',
            backgroundColor: '#fff', padding: '40px 48px', fontSize: '13px', lineHeight: '1.6',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '3px solid #3b82f6', paddingBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#1e3a5f' }}>
                        📋 보장 분석표
                    </h1>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                        AI 자동 분석 리포트 · 보비(BoBi)
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                        생성일: {new Date().toLocaleDateString('ko-KR')}
                    </p>
                </div>
            </div>

            {/* Customer + Score */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: '0 0 8px 0' }}>고객 정보</h3>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                        <tbody>
                            <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>이름</td><td style={{ fontWeight: 600 }}>{customer_summary.name}</td></tr>
                            <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>나이/성별</td><td>{customer_summary.age}세 · {customer_summary.gender}</td></tr>
                            <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>보험 건수</td><td>{customer_summary.active_policies}건 유지</td></tr>
                            <tr><td style={{ color: '#94a3b8', padding: '2px 0' }}>월 보험료</td><td style={{ fontWeight: 600 }}>{(customer_summary.total_monthly_premium / 10000).toLocaleString()}만원</td></tr>
                        </tbody>
                    </table>
                </div>
                <div style={{
                    width: '160px', textAlign: 'center', borderRadius: '12px', padding: '16px',
                    background: overall_score.grade === 'A' ? '#ecfdf5' : overall_score.grade === 'B' ? '#eff6ff' : overall_score.grade === 'C' ? '#fffbeb' : '#fef2f2',
                    border: `1px solid ${overall_score.grade === 'A' ? '#a7f3d0' : overall_score.grade === 'B' ? '#bfdbfe' : overall_score.grade === 'C' ? '#fde68a' : '#fecaca'}`,
                }}>
                    <div style={{
                        fontSize: '36px', fontWeight: 800, margin: '0 0 4px 0',
                        color: overall_score.grade === 'A' ? '#059669' : overall_score.grade === 'B' ? '#2563eb' : overall_score.grade === 'C' ? '#d97706' : '#dc2626',
                    }}>
                        {overall_score.score}
                    </div>
                    <div style={{
                        display: 'inline-block', padding: '2px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#fff',
                        background: overall_score.grade === 'A' ? '#059669' : overall_score.grade === 'B' ? '#2563eb' : overall_score.grade === 'C' ? '#d97706' : '#dc2626',
                    }}>
                        {overall_score.grade}등급
                    </div>
                    <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px' }}>/ 100점</p>
                </div>
            </div>

            {/* Summary */}
            <div style={{ background: '#f0f4ff', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', border: '1px solid #dbeafe' }}>
                <p style={{ fontSize: '12px', color: '#1e40af', margin: 0, fontWeight: 500 }}>
                    💡 {overall_score.summary}
                </p>
            </div>

            {/* Risk Alerts */}
            {risk_alerts.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>⚠️ 위험 알림</h3>
                    {risk_alerts.map((alert, i) => (
                        <div key={i} style={{
                            padding: '8px 12px', borderRadius: '6px', marginBottom: '4px', fontSize: '11px',
                            background: alert.severity === 'high' ? '#fef2f2' : alert.severity === 'medium' ? '#fffbeb' : '#eff6ff',
                            borderLeft: `3px solid ${alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6'}`,
                        }}>
                            <span style={{ fontWeight: 600 }}>{alert.message}</span>
                            <span style={{ color: '#6b7280', marginLeft: '8px' }}>→ {alert.recommendation}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Coverage Table */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📊 보장 분석 상세</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>보장 항목</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>합산 금액</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>적정 기준</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>상태</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569' }}>출처</th>
                    </tr>
                </thead>
                <tbody>
                    {coverage_analysis.map((cat, ci) =>
                        cat.subcategories.map((sub, si) => (
                            <tr key={`${ci}-${si}`} style={{
                                borderBottom: '1px solid #e2e8f0',
                                background: si === 0 ? '#fafbfc' : 'transparent',
                            }}>
                                <td style={{ padding: '6px 10px' }}>
                                    {si === 0 && <span style={{ fontSize: '12px', marginRight: '4px' }}>{cat.icon}</span>}
                                    {si === 0 ? <strong>{cat.category}</strong> : null}
                                    {si === 0 ? ' · ' : '    '}
                                    {sub.name}
                                </td>
                                <td style={{
                                    textAlign: 'right', padding: '6px 10px', fontWeight: 600,
                                    color: sub.status === '부족' ? '#dc2626' : sub.status === '과다' ? '#d97706' : '#059669',
                                }}>
                                    {formatAmount(sub.total_amount)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '6px 10px', color: '#6b7280' }}>
                                    {sub.recommended_amount > 0 ? formatAmount(sub.recommended_amount) : '-'}
                                </td>
                                <td style={{
                                    textAlign: 'center', padding: '6px 10px', fontWeight: 600, fontSize: '10px',
                                    color: sub.status === '부족' ? '#dc2626' : sub.status === '과다' ? '#d97706' : '#059669',
                                }}>
                                    {sub.status === '부족' ? '🔴 부족' : sub.status === '과다' ? '🟡 과다' : '✅ 적정'}
                                </td>
                                <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: '10px' }}>
                                    {sub.sources.map(s => `${s.insurer}(${formatAmount(s.amount)})`).join(', ')}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Footer */}
            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                본 보장 분석표는 AI 자동 분석 결과이며, 실제 보험 계약 조건과 다를 수 있습니다. 정확한 내용은 보험 증권을 확인해주세요.
                <br />보비(BoBi) · bo-bi.vercel.app
            </div>
        </div>
    );
});

CoverageReportPrint.displayName = 'CoverageReportPrint';

export default CoverageReportPrint;
