// app/share/medical/[token]/page.tsx
// 공개 진료정보 리포트 (로그인 불필요, 토큰 검증 + 7일 만료).

import { createServiceClient } from '@/lib/supabase/server';
import { verifyShareToken } from '@/lib/share/token';
import { Stethoscope, Pill, AlertTriangle, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ token: string }>;
}

interface MedicalHistoryShape {
    diseaseSummary?: Array<{
        diseaseName?: string;
        diseaseCode?: string;
        firstDate?: string;
        lastDate?: string;
        totalVisits?: number;
        status?: string;
    }>;
    items?: Array<{
        category?: string;
        applicable?: boolean;
        summary?: string;
        details?: Array<{ medication?: string; ingredient?: string; diagnosisName?: string }>;
    }>;
    overallSummary?: string;
    dataRange?: string;
}

export default async function ShareMedicalPage({ params }: PageProps) {
    const { token } = await params;

    let verified;
    try {
        verified = verifyShareToken(token, 'medical');
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
                    <p className="text-xs text-gray-500 mt-4">설계사에게 다시 발송을 요청해주세요.</p>
                </div>
            </div>
        );
    }

    const svc = await createServiceClient();
    const { data: analysis } = await svc
        .from('analyses')
        .select('id, created_at, medical_history')
        .eq('id', verified.resourceId)
        .maybeSingle();

    if (!analysis) {
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

    const history = (analysis.medical_history || {}) as MedicalHistoryShape;
    const diseases = history.diseaseSummary || [];
    const meds = new Set<string>();
    for (const it of history.items || []) {
        for (const d of it?.details || []) {
            if (d.medication) meds.add(d.medication);
            if (d.ingredient) meds.add(d.ingredient);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-4">
                {/* 헤더 */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">진료정보 분석 리포트</h1>
                            <p className="text-xs text-gray-500">
                                생성일: {new Date(analysis.created_at).toLocaleDateString('ko-KR')}
                                {history.dataRange ? ` · 조회 기간: ${history.dataRange}` : ''}
                            </p>
                        </div>
                    </div>
                    {history.overallSummary && (
                        <p className="text-sm text-gray-700 leading-relaxed mt-3 pt-3 border-t border-gray-100">
                            {history.overallSummary}
                        </p>
                    )}
                </div>

                {/* 주요 질환 */}
                {diseases.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            주요 질환 ({diseases.length}건)
                        </h2>
                        <ul className="space-y-2">
                            {diseases.map((d, i) => (
                                <li key={i} className="flex items-start justify-between gap-2 text-sm py-2 border-b border-gray-100 last:border-0">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">{d.diseaseName || '-'}</p>
                                        {(d.firstDate || d.lastDate) && (
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {d.firstDate || '-'} ~ {d.lastDate || '-'} · {d.totalVisits || 0}회 방문
                                            </p>
                                        )}
                                    </div>
                                    {d.status && (
                                        <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5 shrink-0">
                                            {d.status}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 복용 약물 */}
                {meds.size > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-emerald-600" />
                            복용 약물 ({meds.size}종)
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                            {[...meds].map((m, i) => (
                                <span key={i} className="text-[11px] text-gray-700 bg-gray-100 rounded-full px-2.5 py-1">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-[11px] text-gray-500 text-center pt-2">
                    본 리포트는 보비(BoBi)에서 발급된 진료정보 분석 결과이며, 발송일로부터 7일간 유효합니다.
                </p>
            </div>
        </div>
    );
}
