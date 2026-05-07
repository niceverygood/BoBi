// app/share/accident-receipt/[token]/page.tsx
// 공개 가상영수증 (로그인 불필요).

import { createServiceClient } from '@/lib/supabase/server';
import { verifyShareToken } from '@/lib/share/token';
import { Receipt, AlertTriangle } from 'lucide-react';
import type { AccidentReceipt } from '@/types/accident-receipt';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ token: string }>;
}

function fmtMan(manValue: number): string {
    if (Math.abs(manValue) >= 10000) return `${(manValue / 10000).toFixed(1)}억원`;
    return `${Math.round(manValue).toLocaleString()}만원`;
}

export default async function ShareReceiptPage({ params }: PageProps) {
    const { token } = await params;

    let verified;
    try {
        verified = verifyShareToken(token, 'accident-receipt');
    } catch (err) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                    <h1 className="text-lg font-bold text-gray-900 mb-2">링크가 유효하지 않습니다</h1>
                    <p className="text-sm text-gray-600">
                        {(err as Error).message === '토큰이 만료되었습니다'
                            ? '링크가 만료되었습니다 (발송 후 7일 경과).'
                            : '링크가 잘못되었거나 손상되었습니다.'}
                    </p>
                </div>
            </div>
        );
    }

    const svc = await createServiceClient();
    const { data: row } = await svc
        .from('virtual_receipts')
        .select('id, created_at, payload, disease_name')
        .eq('id', verified.resourceId)
        .maybeSingle();

    if (!row) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
                    <h1 className="text-lg font-bold text-gray-900 mb-2">영수증을 찾을 수 없습니다</h1>
                    <p className="text-sm text-gray-600">설계사에게 다시 발송을 요청해주세요.</p>
                </div>
            </div>
        );
    }

    const receipt = row.payload as unknown as AccidentReceipt;

    const rows: Array<{ label: string; value: string; tone?: 'normal' | 'good' | 'bad' }> = [
        { label: '시뮬레이션 질환', value: receipt.diseaseName },
        { label: '예상 총 의료비', value: fmtMan(receipt.totalMedicalCost), tone: 'normal' },
        { label: '· 급여 진료비', value: fmtMan(receipt.coveredCost) },
        { label: '· 비급여 진료비', value: fmtMan(receipt.uncoveredCost) },
        { label: '건강보험 적용', value: `-${fmtMan(receipt.insuranceCoverage)}`, tone: 'good' },
        { label: '본인부담 합계', value: fmtMan(receipt.selfPayAmount), tone: 'bad' },
        { label: '치료 기간 생활비', value: fmtMan(receipt.totalLivingCost), tone: 'bad' },
        { label: '현재 보험 수령 추정', value: `-${fmtMan(receipt.insurancePayout)}`, tone: 'good' },
        { label: '최종 자기부담 예상', value: fmtMan(receipt.finalAmount), tone: 'bad' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">가상 사고영수증</h1>
                            <p className="text-xs text-gray-500">
                                {row.disease_name} · 생성일 {new Date(row.created_at).toLocaleDateString('ko-KR')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <ul className="divide-y divide-gray-100">
                        {rows.map((r, i) => (
                            <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                                <span className={`${r.label.startsWith('·') ? 'text-gray-500 pl-3' : 'text-gray-700'}`}>{r.label}</span>
                                <span className={`font-semibold tabular-nums ${
                                    r.tone === 'good' ? 'text-emerald-700'
                                        : r.tone === 'bad' ? 'text-rose-700'
                                            : 'text-gray-900'
                                }`}>
                                    {r.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {receipt.aiAnalysis && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-2">상세 분석</h2>
                        {receipt.aiAnalysis.diseaseOverview && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{receipt.aiAnalysis.diseaseOverview}</p>
                        )}
                        {Array.isArray(receipt.aiAnalysis.consultingPoints) && receipt.aiAnalysis.consultingPoints.length > 0 && (
                            <ul className="space-y-1.5 text-xs text-gray-700 list-disc pl-4">
                                {receipt.aiAnalysis.consultingPoints.map((f: string, i: number) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {receipt.disclaimer && (
                    <p className="text-[11px] text-gray-500 leading-relaxed">{receipt.disclaimer}</p>
                )}

                <p className="text-[11px] text-gray-500 text-center pt-2">
                    본 영수증은 보비(BoBi)에서 발급된 가상 시뮬레이션 결과이며, 발송일로부터 7일간 유효합니다.
                </p>
            </div>
        </div>
    );
}
