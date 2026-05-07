// app/share/risk-report/[token]/page.tsx
// 공개 위험도 리포트 (로그인 불필요).

import { createServiceClient } from '@/lib/supabase/server';
import { verifyShareToken } from '@/lib/share/token';
import { HeartPulse, AlertTriangle } from 'lucide-react';

// 위험배율 → 배지 색. PR #35 가이드(2배 단일 컷오프)와 동일 임계값. PR #35의 lib/risk/risk-color.ts가
// main에 머지되면 그쪽 헬퍼로 일원화 예정.
function getRiskBadgeClassByMultiplier(rr: number): string {
    return rr >= 2.0
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
}

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ token: string }>;
}

interface RiskReportShape {
    riskItems?: Array<{
        riskDisease?: string;
        relativeRisk?: number;
        evidenceLevel?: string;
        riskCategory?: string;
        riskLevel?: string;
        explanation?: string;
        evidence?: string;
    }>;
    overallAssessment?: string;
    disclaimer?: string;
}

export default async function ShareRiskReportPage({ params }: PageProps) {
    const { token } = await params;

    let verified;
    try {
        verified = verifyShareToken(token, 'risk-report');
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
    const { data: analysis } = await svc
        .from('analyses')
        .select('id, created_at, risk_report')
        .eq('id', verified.resourceId)
        .maybeSingle();

    if (!analysis || !analysis.risk_report) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
                    <h1 className="text-lg font-bold text-gray-900 mb-2">리포트를 찾을 수 없습니다</h1>
                    <p className="text-sm text-gray-600">설계사에게 다시 발송을 요청해주세요.</p>
                </div>
            </div>
        );
    }

    const report = analysis.risk_report as RiskReportShape;
    const items = (report.riskItems || []).slice().sort((a, b) => (b.relativeRisk || 0) - (a.relativeRisk || 0));

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <HeartPulse className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">질병 위험도 리포트</h1>
                            <p className="text-xs text-gray-500">
                                생성일: {new Date(analysis.created_at).toLocaleDateString('ko-KR')}
                            </p>
                        </div>
                    </div>
                    {report.overallAssessment && (
                        <p className="text-sm text-gray-700 leading-relaxed mt-3 pt-3 border-t border-gray-100">
                            {report.overallAssessment}
                        </p>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            예상 위험 질환 ({items.length}건)
                        </h2>
                        <ul className="space-y-3">
                            {items.map((r, i) => (
                                <li key={i} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="font-medium text-sm text-gray-900">{r.riskDisease || '-'}</p>
                                        {r.relativeRisk != null && (
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border tabular-nums shrink-0 ${getRiskBadgeClassByMultiplier(r.relativeRisk)}`}>
                                                {r.relativeRisk}배
                                            </span>
                                        )}
                                    </div>
                                    {r.riskCategory && (
                                        <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5 mr-1">
                                            {r.riskCategory}
                                        </span>
                                    )}
                                    {r.evidenceLevel && (
                                        <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5">
                                            근거 {r.evidenceLevel}
                                        </span>
                                    )}
                                    {r.explanation && (
                                        <p className="text-xs text-gray-700 mt-2 leading-relaxed">{r.explanation}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {report.disclaimer && (
                    <p className="text-[11px] text-gray-500 leading-relaxed">{report.disclaimer}</p>
                )}

                <p className="text-[11px] text-gray-500 text-center pt-2">
                    본 리포트는 보비(BoBi)에서 발급된 위험도 분석 결과이며, 발송일로부터 7일간 유효합니다.
                </p>
            </div>
        </div>
    );
}
