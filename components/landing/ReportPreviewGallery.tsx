import { ShieldCheck, TrendingDown } from 'lucide-react';

export default function ReportPreviewGallery() {
    return (
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <FutureMePreviewCard />
            <RiskReportPreviewCard />
            <DisclosurePreviewCard />
            <ReceiptPreviewCard />
        </div>
    );
}

/* ─────────── Card 1: 미래의 나 · 5년 시나리오 ─────────── */
function FutureMePreviewCard() {
    return (
        <div className="p-5 sm:p-6 rounded-2xl border bg-card shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-violet-600 mb-1 uppercase tracking-wider">Pro 기능</div>
                    <h3 className="font-bold text-base sm:text-lg">미래의 나 · 5년 시나리오</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">암 진단 시 보장 비교</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] sm:text-xs font-semibold shrink-0">샘플</span>
            </div>

            <div className="space-y-3">
                <div className="pl-3 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs sm:text-sm font-semibold">지금 보완 시</span>
                        <span className="text-xs sm:text-sm font-bold tabular-nums">3,500만원</span>
                    </div>
                    <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-emerald-500" style={{ width: '80%' }} />
                        <div className="bg-slate-300" style={{ width: '15%' }} />
                        <div className="bg-rose-400" style={{ width: '5%' }} />
                    </div>
                </div>
                <div className="pl-3 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs sm:text-sm font-semibold">5년 후 가입 시도</span>
                        <span className="text-xs sm:text-sm font-bold tabular-nums">3,500만원</span>
                    </div>
                    <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-emerald-500" style={{ width: '35%' }} />
                        <div className="bg-slate-300" style={{ width: '40%' }} />
                        <div className="bg-rose-400" style={{ width: '25%' }} />
                    </div>
                </div>
                <div className="pl-3 border-l-4 border-rose-500">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs sm:text-sm font-semibold">아무것도 안 하면</span>
                        <span className="text-xs sm:text-sm font-bold tabular-nums">3,500만원</span>
                    </div>
                    <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-emerald-500" style={{ width: '10%' }} />
                        <div className="bg-slate-300" style={{ width: '20%' }} />
                        <div className="bg-rose-400" style={{ width: '70%' }} />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t text-[10px] sm:text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />보장</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300" />자기부담</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-400" />미보장</span>
            </div>
        </div>
    );
}

/* ─────────── Card 2: 질병 위험도 리포트 ─────────── */
function RiskReportPreviewCard() {
    const rows: Array<{ name: string; level: string; levelColor: string; multi: string; pct: number; barFrom: string; barTo: string; bg: string }> = [
        { name: '제2형 당뇨병', level: '높음', levelColor: 'bg-red-100 text-red-700', multi: '3.2배', pct: 75, barFrom: 'from-red-400', barTo: 'to-red-600', bg: 'bg-red-100' },
        { name: '뇌졸중', level: '보통', levelColor: 'bg-amber-100 text-amber-700', multi: '2.4배', pct: 58, barFrom: 'from-amber-400', barTo: 'to-amber-600', bg: 'bg-amber-100' },
        { name: '급성심근경색', level: '보통', levelColor: 'bg-amber-100 text-amber-700', multi: '1.8배', pct: 42, barFrom: 'from-amber-400', barTo: 'to-amber-600', bg: 'bg-amber-100' },
        { name: '위암', level: '낮음', levelColor: 'bg-blue-100 text-blue-700', multi: '1.3배', pct: 28, barFrom: 'from-blue-400', barTo: 'to-blue-600', bg: 'bg-blue-100' },
    ];

    return (
        <div className="p-5 sm:p-6 rounded-2xl border bg-card shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wider">Pro 기능</div>
                    <h3 className="font-bold text-base sm:text-lg">질병 위험도 리포트</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">동일 연령 대비 상대 위험도</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-semibold shrink-0">샘플</span>
            </div>

            <div className="space-y-3">
                {rows.map((r) => (
                    <div key={r.name}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs sm:text-sm font-semibold truncate">{r.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${r.levelColor}`}>{r.level}</span>
                            </div>
                            <span className="text-xs sm:text-sm font-bold tabular-nums shrink-0 ml-2">{r.multi}</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${r.bg}`}>
                            <div className={`h-full bg-gradient-to-r ${r.barFrom} ${r.barTo}`} style={{ width: `${r.pct}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>대한고혈압학회 · Framingham 근거 기반</span>
            </div>
        </div>
    );
}

/* ─────────── Card 3: 고지사항 자동 정리 ─────────── */
function DisclosurePreviewCard() {
    const items: Array<{ label: string; applicable: boolean; count?: string }> = [
        { label: '3개월 이내 투약', applicable: true, count: '3건' },
        { label: '5년 이내 입원', applicable: false },
        { label: '5년 이내 수술', applicable: false },
        { label: '5년 이내 주요질병', applicable: true, count: '2건' },
    ];

    return (
        <div className="p-5 sm:p-6 rounded-2xl border bg-card shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-[10px] sm:text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider">전 플랜 제공</div>
                    <h3 className="font-bold text-base sm:text-lg">고지사항 자동 정리</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">심평원 진료이력 기반 자동 판정</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-semibold shrink-0">샘플</span>
            </div>

            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className={`flex items-center justify-between p-2.5 rounded-lg border ${item.applicable ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.applicable ? 'bg-red-500' : 'bg-green-500'}`} />
                            <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs sm:text-sm font-semibold ${item.applicable ? 'text-red-600' : 'text-green-700'}`}>
                                {item.applicable ? '예' : '아니오'}
                            </span>
                            {item.count && <span className="text-[10px] text-muted-foreground">{item.count}</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-2">검출된 질환 (KCD)</div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] sm:text-xs font-mono">I10 고혈압</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] sm:text-xs font-mono">E11 제2형당뇨</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] sm:text-xs font-mono">F32 주요우울</span>
                </div>
            </div>
        </div>
    );
}

/* ─────────── Card 4: 가상 영수증 ─────────── */
function ReceiptPreviewCard() {
    return (
        <div className="rounded-2xl border bg-card shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-5">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <div className="text-[10px] font-semibold opacity-70 mb-1 uppercase tracking-wider">Pro 기능 · 가상 영수증</div>
                        <h3 className="font-bold text-base sm:text-lg">폐암 진단 시나리오</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] sm:text-xs font-semibold shrink-0">샘플</span>
                </div>
                <div className="text-[10px] sm:text-xs opacity-80">투병기간 12개월 · 국립암센터 2024</div>
            </div>

            <div className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">총 진료비</span>
                    <span className="font-semibold tabular-nums">3,500만원</span>
                </div>
                <div className="flex items-center justify-between text-green-700">
                    <span>건강보험 적용</span>
                    <span className="font-semibold tabular-nums">−2,800만원</span>
                </div>
                <div className="flex items-center justify-between text-red-600 pb-2.5 border-b border-dashed">
                    <span>개인 부담금</span>
                    <span className="font-semibold tabular-nums">−700만원</span>
                </div>
                <div className="flex items-center justify-between text-blue-600">
                    <span>설계 보험금</span>
                    <span className="font-semibold tabular-nums">+2,000만원</span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                    <span>생활비 (12개월)</span>
                    <span className="font-semibold tabular-nums">−1,800만원</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200 mt-2">
                    <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs sm:text-sm font-semibold text-red-700">부족 예상 금액</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-red-600 tabular-nums">−500만원</span>
                </div>
            </div>
        </div>
    );
}
