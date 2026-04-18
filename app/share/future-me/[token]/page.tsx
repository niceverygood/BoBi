// app/share/future-me/[token]/page.tsx
// 공개 미래의 나 리포트 (로그인 불필요)

import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyShareToken } from '@/lib/future-me/share-token';
import type { FutureMeResult, FutureMeScenario, CategoryAmount } from '@/types/future-me';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ token: string }>;
}

function fmtMan(v: number): string {
    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}억`;
    return `${Math.round(v).toLocaleString()}만`;
}

const RISK_BAR_COLOR: Record<string, string> = {
    '암': 'bg-rose-500',
    '뇌혈관': 'bg-orange-500',
    '심혈관': 'bg-amber-500',
    '대사': 'bg-emerald-500',
    '신장': 'bg-teal-500',
    '호흡기': 'bg-sky-500',
    '정신': 'bg-indigo-500',
    '근골격': 'bg-violet-500',
    '소화기': 'bg-lime-500',
    '신경': 'bg-fuchsia-500',
};

export default async function SharedFutureMePage({ params }: PageProps) {
    const { token } = await params;

    let reportId: string;
    let expiresAt: number;
    try {
        const verified = verifyShareToken(token);
        reportId = verified.reportId;
        expiresAt = verified.expiresAt;
    } catch (err) {
        return <ShareError title="유효하지 않은 링크입니다" description={(err as Error).message} />;
    }

    const supabase = await createServiceClient();
    const { data: row } = await supabase
        .from('future_me_reports')
        .select('result')
        .eq('id', reportId)
        .maybeSingle();

    if (!row?.result) return notFound();

    const result = row.result as FutureMeResult;
    const expiryStr = new Date(expiresAt * 1000).toLocaleDateString('ko-KR');

    return (
        <div className="min-h-screen bg-slate-50 py-6 px-3">
            {/* 헤더 */}
            <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between">
                <div>
                    <p className="text-base font-bold text-slate-900">보비 BoBi</p>
                    <p className="text-[11px] text-slate-500">설계사가 공유한 미래의 나 리포트</p>
                </div>
                <span className="text-[10px] text-slate-400">유효 ~ {expiryStr}</span>
            </div>

            {/* 리포트 본문 */}
            <div className="max-w-2xl mx-auto space-y-4">
                {/* 고객 카드 */}
                <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-base font-bold text-slate-700">{result.customerName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-base">{result.customerName}</p>
                        <p className="text-xs text-slate-500">
                            {result.gender}{result.customerAge ? ` · 만 ${result.customerAge}세` : ''}
                        </p>
                    </div>
                    <span className="bg-violet-100 text-violet-700 text-[11px] px-2 py-0.5 rounded">AI 분석</span>
                </div>

                {/* 위험도 */}
                {result.riskSummary.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <p className="text-xs font-semibold text-slate-500 mb-3">질병위험도 리포트 연동</p>
                        <div className="space-y-2.5">
                            {result.riskSummary.map((r, idx) => {
                                const color = RISK_BAR_COLOR[r.category] || 'bg-slate-500';
                                return (
                                    <div key={idx} className="flex items-center gap-3 text-sm">
                                        <span className="w-14 font-semibold text-slate-700">{r.category}</span>
                                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${color} rounded-full`} style={{ width: `${r.percentage}%` }} />
                                        </div>
                                        <span className="text-xs font-bold w-[68px] text-right">
                                            {r.percentage}% <span className="text-slate-500 font-medium">{r.level}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 입력값 */}
                <div className="bg-blue-50 rounded-xl shadow-sm p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-2">설계사가 검토한 보장</p>
                    <CategoryAmountRow label="보장 금액" amounts={result.coveredAmountByCategory} colorClass="text-blue-700" />
                    <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-sm">
                        <span className="text-slate-700">추가 월 보험료</span>
                        <span className="font-bold text-blue-700">{result.additionalPremium.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">만원</span></span>
                    </div>
                </div>

                {/* 보장 공백 */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-semibold text-rose-700">현재 보장 공백</p>
                        <span className="text-2xl font-bold text-rose-700">
                            {result.coverageGap.toLocaleString()}<span className="text-xs font-normal ml-0.5">만원</span>
                        </span>
                    </div>
                    <CategoryAmountRow label="공백" amounts={result.coverageGapByCategory} colorClass="text-rose-700" hideLabel />
                </div>

                {/* 시나리오 */}
                {result.scenarios.map((s, idx) => (
                    <ScenarioCard key={idx} scenario={s} />
                ))}

                {/* AI 종합 */}
                {result.aiSummary && (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl shadow-sm p-4">
                        <p className="text-xs font-semibold text-violet-900 mb-1.5">AI 종합 분석</p>
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{result.aiSummary}</p>
                    </div>
                )}

                <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed py-3">
                    {result.disclaimer}
                </p>
                <p className="text-[10px] text-slate-400 text-center pb-4">
                    본 리포트는 보험설계사가 고객님 상담을 위해 발송한 자료입니다.
                </p>
            </div>
        </div>
    );
}

function CategoryAmountRow({
    label,
    amounts,
    colorClass = 'text-slate-900',
    hideLabel = false,
}: {
    label: string;
    amounts: CategoryAmount;
    colorClass?: string;
    hideLabel?: boolean;
}) {
    return (
        <div className="flex justify-between items-center text-[11px]">
            {!hideLabel && <span className="text-slate-600 font-medium">{label}</span>}
            <div className="flex gap-2 ml-auto">
                <span><span className="text-slate-500">암</span> <span className={`font-bold ${colorClass}`}>{amounts.cancer.toLocaleString()}</span><span className="text-slate-500">만원</span></span>
                <span><span className="text-slate-500">뇌혈관</span> <span className={`font-bold ${colorClass}`}>{amounts.brain.toLocaleString()}</span><span className="text-slate-500">만원</span></span>
                <span><span className="text-slate-500">심혈관</span> <span className={`font-bold ${colorClass}`}>{amounts.cardio.toLocaleString()}</span><span className="text-slate-500">만원</span></span>
            </div>
        </div>
    );
}

function ScenarioCard({ scenario }: { scenario: FutureMeScenario }) {
    const isComp = scenario.type === 'complement';
    const isDelay = scenario.type === 'delay';
    const border = isComp ? 'border-l-emerald-500' : isDelay ? 'border-l-amber-500' : 'border-l-rose-500';
    const badgeColor = isComp ? 'bg-emerald-500' : isDelay ? 'bg-amber-500' : 'bg-rose-500';
    const selfPayColor = isComp ? 'text-emerald-700' : 'text-rose-700';

    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 ${border} p-4`}>
            <div className="flex items-start justify-between mb-2">
                <p className="font-bold text-base">{scenario.label}</p>
                <span className={`${badgeColor} text-white text-[10px] font-semibold px-2 py-0.5 rounded`}>{scenario.badge}</span>
            </div>
            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">예상 총 병원비</span><span className="font-bold">{scenario.estimatedTotalCost.toLocaleString()}만원</span></div>
                <div className="flex justify-between"><span className="text-slate-600">{scenario.type === 'nothing' ? '현재 보장' : '보장되는 금액'}</span><span className="font-bold text-emerald-700">{scenario.coverageAmount.toLocaleString()}만원</span></div>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-sm text-slate-600">실제 자기부담금</span>
                <span className={`text-xl font-bold ${selfPayColor}`}>약 {scenario.selfPayAmount.toLocaleString()}만원</span>
            </div>
            {scenario.details && (
                <p className="text-[11px] text-slate-500 leading-relaxed mt-2">{scenario.details}</p>
            )}
        </div>
    );
}

function ShareError({ title, description }: { title: string; description: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md text-center space-y-3">
                <h1 className="text-xl font-bold text-slate-900">{title}</h1>
                <p className="text-sm text-slate-600">{description}</p>
                <p className="text-xs text-slate-400">설계사에게 새 링크를 요청해주세요.</p>
            </div>
        </div>
    );
}
