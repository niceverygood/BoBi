'use client';

import { forwardRef } from 'react';
import type { AnalysisResult, ProductResult, ClaimResult } from '@/types/analysis';

interface ReportProps {
    analysisResult: AnalysisResult | null;
    productResult: ProductResult | null;
    claimResult: ClaimResult | null;
    customerId?: string | null;
}

const AnalysisReport = forwardRef<HTMLDivElement, ReportProps>(
    ({ analysisResult, productResult, claimResult, customerId }, ref) => {
        const today = new Date().toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
        });

        return (
            <div
                ref={ref}
                style={{
                    width: '794px',
                    background: '#ffffff',
                    color: '#1a1a2e',
                    fontFamily: '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
                    padding: '48px 40px',
                    fontSize: '12px',
                    lineHeight: '1.7',
                    boxSizing: 'border-box',
                    overflow: 'visible',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                }}
            >
                {/* Header */}
                <div style={{ borderBottom: '3px solid #1e3a5f', paddingBottom: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e3a5f', margin: 0 }}>
                                보비 BoBi 종합 분석 리포트
                            </h1>
                            <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
                                AI 보험비서 분석 결과
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px', color: '#888' }}>
                            <div>리포트 생성일: {today}</div>
                            {customerId && <div>고객 ID: {customerId}</div>}
                            {analysisResult?.analysisDate && <div>분석 기준일: {analysisResult.analysisDate}</div>}
                            {analysisResult?.dataRange && <div>데이터 범위: {analysisResult.dataRange}</div>}
                        </div>
                    </div>
                </div>

                {/* STEP 1 */}
                {analysisResult && (
                    <section style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
                        <SectionHeader number={1} title="고지사항 분석" color="#3b82f6" />

                        {/* Overall Summary */}
                        <div style={{ background: '#f0f4ff', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #dbeafe', overflow: 'visible' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#1e3a5f', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                                <strong>종합 의견:</strong> {analysisResult.overallSummary}
                            </p>
                        </div>

                        {/* Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px', tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ ...thStyle, width: '35%' }}>고지 항목</th>
                                    <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>해당여부</th>
                                    <th style={{ ...thStyle, width: '55%' }}>요약</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysisResult.items.map((item, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{item.question}</td>
                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: item.applicable ? '#dc2626' : '#16a34a' }}>
                                            {item.applicable ? '예' : '아니오'}
                                        </td>
                                        <td style={tdStyle}>{item.summary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Risk Flags */}
                        {analysisResult.riskFlags && analysisResult.riskFlags.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <p style={{ fontWeight: '700', fontSize: '11px', margin: '0 0 4px', color: '#dc2626' }}>⚠️ 위험 플래그</p>
                                {analysisResult.riskFlags.map((flag, i) => (
                                    <div key={i} style={{ fontSize: '11px', marginBottom: '4px', padding: '6px 10px', background: '#fef2f2', borderRadius: '4px', border: '1px solid #fecaca', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                        <span style={{ fontWeight: '600' }}>[{flag.severity}] {flag.flag}</span>
                                        <span style={{ color: '#666' }}> → {flag.recommendation}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Disease Summary */}
                        {analysisResult.diseaseSummary && analysisResult.diseaseSummary.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <p style={{ fontWeight: '700', fontSize: '11px', margin: '0 0 6px' }}>📋 질병 요약</p>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ ...thSmallStyle, width: '25%' }}>질병명</th>
                                            <th style={{ ...thSmallStyle, width: '12%' }}>코드</th>
                                            <th style={{ ...thSmallStyle, width: '28%' }}>기간</th>
                                            <th style={{ ...thSmallStyle, width: '10%', textAlign: 'center' }}>총방문</th>
                                            <th style={{ ...thSmallStyle, width: '25%' }}>상태</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysisResult.diseaseSummary.map((d, i) => (
                                            <tr key={i}>
                                                <td style={tdSmallStyle}>{d.diseaseName}</td>
                                                <td style={tdSmallStyle}>{d.diseaseCode}</td>
                                                <td style={tdSmallStyle}>{d.firstDate} ~ {d.lastDate}</td>
                                                <td style={{ ...tdSmallStyle, textAlign: 'center' }}>{d.totalVisits}</td>
                                                <td style={tdSmallStyle}>{d.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 2 */}
                {productResult && (
                    <section style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
                        <SectionHeader number={2} title="가입가능 상품 판단" color="#22c55e" />

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px', tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ ...thStyle, width: '30%' }}>상품</th>
                                    <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>가입가능</th>
                                    <th style={{ ...thStyle, width: '60%' }}>추천사항</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productResult.products.map((product, i) => (
                                    <tr key={i}>
                                        <td style={{ ...tdStyle, fontWeight: '600' }}>{product.productName}</td>
                                        <td style={{
                                            ...tdStyle,
                                            textAlign: 'center',
                                            fontWeight: '700',
                                            fontSize: '14px',
                                            color: product.eligible === 'O' ? '#16a34a' : product.eligible === 'X' ? '#dc2626' : '#d97706',
                                        }}>
                                            {product.eligible}
                                        </td>
                                        <td style={tdStyle}>{product.recommendation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Best Option */}
                        <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', overflow: 'visible' }}>
                            <p style={{ margin: 0, fontSize: '12px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                <strong>✅ 추천:</strong> {productResult.bestOption}
                            </p>
                            {productResult.tips && (
                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                    💡 {productResult.tips}
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {/* STEP 3 */}
                {claimResult && (
                    <section style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
                        <SectionHeader number={3} title="보험금 청구 안내" color="#8b5cf6" />

                        {/* Summary */}
                        {claimResult.claimSummary && (
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <StatBox label="전체" value={claimResult.claimSummary.totalItems} bg="#f0f4ff" color="#3b82f6" />
                                <StatBox label="청구가능" value={claimResult.claimSummary.claimableCount} bg="#f0fdf4" color="#16a34a" />
                                <StatBox label="청구불가" value={claimResult.claimSummary.notClaimableCount} bg="#fef2f2" color="#dc2626" />
                                <StatBox label="확인필요" value={claimResult.claimSummary.needCheckCount} bg="#fffbeb" color="#d97706" />
                            </div>
                        )}

                        {/* Claim Items */}
                        {claimResult.claimableItems && claimResult.claimableItems.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '12px', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ ...thSmallStyle, width: '12%' }}>진료일</th>
                                        <th style={{ ...thSmallStyle, width: '18%' }}>병원</th>
                                        <th style={{ ...thSmallStyle, width: '25%' }}>진단</th>
                                        <th style={{ ...thSmallStyle, width: '10%', textAlign: 'center' }}>유형</th>
                                        <th style={{ ...thSmallStyle, width: '35%' }}>청구결과</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claimResult.claimableItems.slice(0, 20).map((item, i) => (
                                        <tr key={i}>
                                            <td style={tdSmallStyle}>{item.treatmentDate}</td>
                                            <td style={tdSmallStyle}>{item.hospital}</td>
                                            <td style={tdSmallStyle}>{item.diagnosis}</td>
                                            <td style={{ ...tdSmallStyle, textAlign: 'center' }}>{item.treatmentType}</td>
                                            <td style={tdSmallStyle}>
                                                {item.claimResults?.map((cr, j) => (
                                                    <div key={j} style={{ marginBottom: '2px', wordBreak: 'break-word' }}>
                                                        <span style={{ fontWeight: '600', color: cr.claimable === 'O' ? '#16a34a' : cr.claimable === 'X' ? '#dc2626' : '#d97706' }}>
                                                            [{cr.claimable}]
                                                        </span>
                                                        {' '}{cr.clauseType}
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Summary + Notes */}
                        <div style={{ background: '#f5f3ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd6fe', overflow: 'visible' }}>
                            <p style={{ margin: 0, fontSize: '12px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                <strong>종합:</strong> {claimResult.summary}
                            </p>
                        </div>

                        {claimResult.importantNotes && claimResult.importantNotes.length > 0 && (
                            <div style={{ marginTop: '8px', fontSize: '11px' }}>
                                <p style={{ fontWeight: '700', margin: '0 0 4px', color: '#d97706' }}>⚠️ 주의사항</p>
                                {claimResult.importantNotes.map((note, i) => (
                                    <div key={i} style={{ padding: '2px 0', color: '#666', wordBreak: 'break-word', overflowWrap: 'break-word' }}>• {note}</div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Footer */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '24px', textAlign: 'center', fontSize: '10px', color: '#999' }}>
                    <p style={{ margin: 0 }}>본 리포트는 AI(Claude Sonnet 4.5)가 생성한 참고 자료이며, 최종 판단은 보험전문가의 검토가 필요합니다.</p>
                    <p style={{ margin: '4px 0 0' }}>보비 BoBi - AI 보험비서 | bobi.co.kr | {today}</p>
                </div>
            </div>
        );
    }
);

AnalysisReport.displayName = 'AnalysisReport';

// Shared styles - all with word-break support
const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '11px',
    color: '#374151',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
};

const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
    lineHeight: '1.6',
};

const thSmallStyle: React.CSSProperties = {
    padding: '6px 8px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '10px',
    color: '#6b7280',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
};

const tdSmallStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    overflow: 'visible',
    lineHeight: '1.5',
};

function SectionHeader({ number, title, color }: { number: number; title: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${color}20` }}>
            <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: color, color: '#fff', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: '800', fontSize: '14px',
                flexShrink: 0,
            }}>
                {number}
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color }}>
                STEP {number}: {title}
            </h2>
        </div>
    );
}

function StatBox({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
    return (
        <div style={{ flex: 1, background: bg, borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color }}>{value}건</div>
        </div>
    );
}

export default AnalysisReport;
