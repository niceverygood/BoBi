'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, ArrowRight, User, FileSearch, Stethoscope, HeartPulse,
    Receipt, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, Info,
    Pill, Hospital, Calendar, TrendingUp, TrendingDown, Shield,
} from 'lucide-react';
import {
    TUTORIAL_PERSONA,
    TUTORIAL_ANALYZE,
    TUTORIAL_MEDICAL,
    TUTORIAL_HEALTH_CHECKUP,
    TUTORIAL_ACCIDENT_RECEIPT,
    TUTORIAL_FUTURE_ME,
} from '@/lib/tutorial/persona';

const STEPS = [
    { id: 'persona', title: '고객 만나기', icon: User },
    { id: 'analyze', title: '새 분석', icon: FileSearch },
    { id: 'medical', title: '진료정보 조회', icon: Stethoscope },
    { id: 'health', title: '건강검진', icon: HeartPulse },
    { id: 'receipt', title: '가상 사고 영수증', icon: Receipt },
    { id: 'future', title: '미래의 나', icon: Sparkles },
    { id: 'complete', title: '완료', icon: CheckCircle2 },
] as const;

function formatKRW(value: number): string {
    if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}천만원`.replace('.0', '');
    if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만원`;
    return `${value.toLocaleString()}원`;
}

export default function TutorialPage() {
    const [stepIndex, setStepIndex] = useState(0);
    const step = STEPS[stepIndex];
    const isLast = stepIndex === STEPS.length - 1;
    const isFirst = stepIndex === 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <Badge className="bg-[#1a56db]/10 text-[#1a56db] border-0 mb-2">
                        튜토리얼 · 간접 체험
                    </Badge>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        {TUTORIAL_PERSONA.name}님 상담 시뮬레이션
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        실제 고객 페르소나로 보비의 전체 기능을 체험해보세요 — 모든 데이터는 가상입니다.
                    </p>
                </div>
                <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="text-xs shrink-0">
                        건너뛰기
                    </Button>
                </Link>
            </div>

            {/* 진행 스테퍼 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-1 overflow-x-auto">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done = i < stepIndex;
                        const active = i === stepIndex;
                        return (
                            <div key={s.id} className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setStepIndex(i)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${active
                                        ? 'bg-[#1a56db] text-white'
                                        : done
                                            ? 'text-[#1a56db]'
                                            : 'text-muted-foreground hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium whitespace-nowrap">{s.title}</span>
                                </button>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-4 h-px ${i < stepIndex ? 'bg-[#1a56db]' : 'bg-slate-200'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#1a56db] transition-all"
                        style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* 스텝 콘텐츠 */}
            <div className="min-h-[400px]">
                {step.id === 'persona' && <PersonaStep />}
                {step.id === 'analyze' && <AnalyzeStep />}
                {step.id === 'medical' && <MedicalStep />}
                {step.id === 'health' && <HealthStep />}
                {step.id === 'receipt' && <ReceiptStep />}
                {step.id === 'future' && <FutureStep />}
                {step.id === 'complete' && <CompleteStep />}
            </div>

            {/* 하단 네비게이션 */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <Button
                    variant="outline"
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    disabled={isFirst}
                    className="text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    이전
                </Button>
                <span className="text-xs text-muted-foreground">
                    {stepIndex + 1} / {STEPS.length}
                </span>
                {isLast ? (
                    <Link href="/dashboard/analyze">
                        <Button className="text-sm bg-[#1a56db] hover:bg-[#1a56db]/90">
                            실제 분석 시작하기
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                ) : (
                    <Button
                        onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                        className="text-sm bg-[#1a56db] hover:bg-[#1a56db]/90"
                    >
                        다음
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// ===== STEP 0: 페르소나 소개 =====
function PersonaStep() {
    const p = TUTORIAL_PERSONA;
    return (
        <div className="space-y-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a56db] to-[#1e40af] text-white">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <User className="w-8 h-8" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold">{p.name}</h2>
                            <p className="text-white/80 mt-1">
                                {p.age}세 · {p.gender} · {p.occupation}
                            </p>
                            <p className="text-sm text-white/70 mt-2 leading-relaxed">
                                연봉 {p.annualIncome} · 부양가족 {p.dependents}명 · 현재 가입: {p.currentInsurance}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            건강 이슈
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1.5">
                            {p.medicalHistory.map((h) => (
                                <li key={h} className="flex items-start gap-2">
                                    <span className="text-amber-600 mt-0.5">•</span>
                                    <span>{h}</span>
                                </li>
                            ))}
                            <li className="flex items-start gap-2">
                                <span className="text-amber-600 mt-0.5">•</span>
                                <span>{p.smoker}</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            가족력 · 생활습관
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1.5">
                        <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">가족력:</span> {p.familyHistory}
                        </p>
                        <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">운동:</span> {p.exercise}
                        </p>
                        <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">월 수입/지출:</span> {p.monthlyIncome}만원 / {p.monthlyExpense}만원
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4 text-sm">
                    <p className="text-blue-900">
                        <strong>상담 목표:</strong> 김민수 고객님의 병력·가족력·현재 보장을 종합 분석해,
                        <strong> &lsquo;왜 지금 보장을 보완해야 하는지&rsquo; </strong>
                        구체적인 숫자와 시나리오로 제안합니다. 다음 단계부터 보비의 5가지 핵심 기능을 순서대로 체험해보세요.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// ===== STEP 1: 새 분석 =====
function AnalyzeStep() {
    const a = TUTORIAL_ANALYZE;
    const severityStyle = {
        high: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
        medium: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
        low: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Info },
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                icon={FileSearch}
                title="새 분석 — 고지사항 AI 분석"
                description="심평원 PDF 업로드 → 30초 만에 AI가 고지 대상 질환을 자동 추출하고 리스크 플래그를 달아줍니다."
            />

            <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-[#1a56db]" />
                        <h3 className="font-bold">종합 요약</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {a.overallSummary}
                    </p>
                </CardContent>
            </Card>

            <div>
                <h3 className="text-sm font-semibold mb-2">⚠️ 리스크 플래그</h3>
                <div className="grid md:grid-cols-3 gap-3">
                    {a.riskFlags.map((f) => {
                        const s = severityStyle[f.severity];
                        const Icon = s.icon;
                        return (
                            <Card key={f.flag} className="border-0 shadow-sm">
                                <CardContent className={`p-4 ${s.bg} rounded-lg`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={`w-4 h-4 ${s.text}`} />
                                        <Badge className={`${s.bg} ${s.text} border-0 text-[10px]`}>
                                            {f.severity === 'high' ? '높음' : f.severity === 'medium' ? '중간' : '낮음'}
                                        </Badge>
                                    </div>
                                    <p className={`text-sm font-semibold ${s.text}`}>{f.flag}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{f.recommendation}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-2">🏥 발견된 질환 ({a.diseases.length}건)</h3>
                <div className="space-y-2">
                    {a.diseases.map((d) => (
                        <Card key={d.code} className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold">{d.name}</span>
                                            <Badge variant="outline" className="text-[10px]">{d.code}</Badge>
                                            <Badge className={`text-[10px] border-0 ${d.status === '진행 중' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {d.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            {d.firstDate} ~ {d.lastDate} · 총 {d.totalVisits}회 방문
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {d.hospitals.join(' · ')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ===== STEP 2: 진료정보 =====
function MedicalStep() {
    const m = TUTORIAL_MEDICAL;

    return (
        <div className="space-y-4">
            <SectionHeader
                icon={Stethoscope}
                title="진료정보 조회 — CODEF 자동 수집"
                description="고객이 과거 병원 기록을 기억 못 해도 본인 인증 한 번으로 심평원 데이터를 통째로 가져옵니다."
            />

            <div className="grid grid-cols-3 gap-3">
                <StatCard label="총 진료 건수" value={`${m.totalVisits}건`} color="blue" />
                <StatCard label="자동차보험" value={`${m.carTreatments}건`} color="amber" />
                <StatCard label="총 본인부담금" value={formatKRW(m.totalCost)} color="emerald" />
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-2">📋 최근 진료 이력 ({m.treatments.length}건)</h3>
                <div className="space-y-2">
                    {m.treatments.map((t, i) => (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                        <Hospital className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{t.hospital}</span>
                                            <Badge variant="outline" className="text-[10px]">{t.department}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {t.date} · {t.disease}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs">
                                            <span className="text-muted-foreground">
                                                본인부담 <strong className="text-foreground">{t.cost.toLocaleString()}원</strong>
                                            </span>
                                            <span className="text-muted-foreground">
                                                방문 <strong className="text-foreground">{t.visitDays}일</strong>
                                            </span>
                                        </div>
                                        {t.drugs.length > 0 && (
                                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                                <Pill className="w-3 h-3 text-muted-foreground" />
                                                {t.drugs.map((drug) => (
                                                    <Badge key={drug} variant="outline" className="text-[10px] font-normal">
                                                        {drug}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ===== STEP 3: 건강검진 =====
function HealthStep() {
    const h = TUTORIAL_HEALTH_CHECKUP;
    const statusStyle = {
        normal: 'border-emerald-200 bg-emerald-50',
        warning: 'border-amber-200 bg-amber-50',
        danger: 'border-red-200 bg-red-50',
    };
    const gradeStyle = {
        '낮음': 'bg-emerald-100 text-emerald-700',
        '주의': 'bg-amber-100 text-amber-700',
        '높음': 'bg-red-100 text-red-700',
    } as Record<string, string>;

    return (
        <div className="space-y-4">
            <SectionHeader
                icon={HeartPulse}
                title={`건강검진 ${h.year}년 결과`}
                description="12개 핵심 수치와 뇌졸중·심혈관 위험도를 자동으로 분석합니다."
            />

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">📊 검진 수치 12개</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {h.metrics.map((m) => (
                            <div
                                key={m.label}
                                className={`border rounded-lg p-2.5 ${statusStyle[m.status]}`}
                            >
                                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                                <p className="font-bold text-sm mt-0.5">
                                    {m.value} <span className="text-[10px] font-normal text-muted-foreground">{m.unit}</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">정상: {m.normalRange}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-sm">🧠 뇌졸중 위험도</h3>
                            <Badge className={`text-[10px] border-0 ${gradeStyle[h.strokeRisk.grade]}`}>
                                {h.strokeRisk.grade}
                            </Badge>
                        </div>
                        <p className="text-2xl font-bold text-amber-600">
                            {h.strokeRisk.percentage}%
                            <span className="text-xs font-normal text-muted-foreground ml-1">(10년 내)</span>
                        </p>
                        <div className="mt-3 space-y-1">
                            {h.strokeRisk.factors.map((f) => (
                                <div key={f.type} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{f.type}</span>
                                    <span className="font-medium">{f.state}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-sm">❤️ 심혈관 위험도</h3>
                            <Badge className={`text-[10px] border-0 ${gradeStyle[h.cardioRisk.grade]}`}>
                                {h.cardioRisk.grade}
                            </Badge>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                            {h.cardioRisk.percentage}%
                            <span className="text-xs font-normal text-muted-foreground ml-1">(10년 내)</span>
                        </p>
                        <div className="mt-3 space-y-1">
                            {h.cardioRisk.factors.map((f) => (
                                <div key={f.type} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{f.type}</span>
                                    <span className="font-medium">{f.state}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ===== STEP 4: 가상 사고 영수증 =====
function ReceiptStep() {
    const r = TUTORIAL_ACCIDENT_RECEIPT;

    return (
        <div className="space-y-4">
            <SectionHeader
                icon={Receipt}
                title={`가상 사고 영수증 — ${r.diseaseName} 시나리오`}
                description={`"만약 ${r.diseaseName}(${r.diseaseCode})이 발병한다면?" 실제 병원비와 보험금 공백을 시뮬레이션합니다.`}
            />

            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
                <CardContent className="p-5">
                    <Badge className="bg-red-100 text-red-700 border-0 mb-2">{r.category}</Badge>
                    <h3 className="font-bold text-lg">{r.diseaseName} ({r.diseaseCode})</h3>
                    <p className="text-xs text-muted-foreground mt-1">재활 포함 {r.treatmentMonths}개월 시나리오</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        <div>
                            <p className="text-[11px] text-muted-foreground">총 의료비</p>
                            <p className="font-bold text-base">{formatKRW(r.totalMedicalCost)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">본인부담</p>
                            <p className="font-bold text-base text-red-600">{formatKRW(r.selfPayAmount)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">현재 보험금</p>
                            <p className="font-bold text-base text-blue-600">{formatKRW(r.insurancePayout)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">생활비 ({r.treatmentMonths}개월)</p>
                            <p className="font-bold text-base">{formatKRW(r.totalLivingCost)}</p>
                        </div>
                        <div className="col-span-2 md:col-span-2 md:border-l md:pl-3">
                            <p className="text-[11px] text-muted-foreground">최종 부족액</p>
                            <p className="font-bold text-2xl text-red-700">{formatKRW(r.finalShortage)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                        월별 비용 흐름
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {r.monthlyScenario.map((s) => {
                            const total = s.medical + s.living;
                            const gap = total - s.insurance;
                            return (
                                <div key={s.month} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium">{s.month}개월차</span>
                                        <span className="text-red-600 font-medium">
                                            공백 {formatKRW(gap)}
                                        </span>
                                    </div>
                                    <div className="flex h-6 rounded-md overflow-hidden bg-slate-100">
                                        <div
                                            className="bg-rose-400"
                                            style={{ width: `${(s.medical / total) * 100}%` }}
                                            title={`의료비 ${formatKRW(s.medical)}`}
                                        />
                                        <div
                                            className="bg-amber-300"
                                            style={{ width: `${(s.living / total) * 100}%` }}
                                            title={`생활비 ${formatKRW(s.living)}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-rose-400 rounded-sm" /> 의료비
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-amber-300 rounded-sm" /> 생활비
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-blue-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        AI 상담 포인트
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {r.aiConsulting.map((c, i) => (
                            <li key={i} className="text-sm text-blue-900 flex items-start gap-2">
                                <span className="font-bold text-blue-600 shrink-0">{i + 1}.</span>
                                <span>{c}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

// ===== STEP 5: 미래의 나 =====
function FutureStep() {
    const f = TUTORIAL_FUTURE_ME;
    const levelColor = {
        high: 'bg-red-500',
        medium: 'bg-amber-500',
        low: 'bg-emerald-500',
    };
    const levelBg = {
        high: 'bg-red-50 text-red-700',
        medium: 'bg-amber-50 text-amber-700',
        low: 'bg-emerald-50 text-emerald-700',
    };
    const scenarioStyle = {
        complement: { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-700' },
        delay: { bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-700' },
        nothing: { bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-700' },
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                icon={Sparkles}
                title={`미래의 나 — ${f.timeHorizon}`}
                description="병력 기반 질환 발병 확률과 예상 의료비, 그리고 3가지 선택지의 결과를 시뮬레이션합니다."
            />

            <div className="grid md:grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">예상 의료비</p>
                        <p className="font-bold text-xl mt-1">{formatKRW(f.estimatedTotalCost)}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">현재 보장</p>
                        <p className="font-bold text-xl mt-1 text-blue-600">{formatKRW(f.currentCoverage)}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-red-50">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">보장 공백</p>
                        <p className="font-bold text-xl mt-1 text-red-600">{formatKRW(f.coverageGap)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">⚠️ 질환 발병 위험도</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {f.riskItems.map((r) => (
                        <div key={r.category}>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium">{r.category}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${levelBg[r.level]}`}>
                                    {r.percentage}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${levelColor[r.level]}`}
                                    style={{ width: `${r.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div>
                <h3 className="text-sm font-semibold mb-2">🔀 3가지 선택지 비교</h3>
                <div className="grid md:grid-cols-3 gap-3">
                    {f.scenarios.map((s) => {
                        const st = scenarioStyle[s.type];
                        return (
                            <Card key={s.type} className={`border shadow-sm ${st.border}`}>
                                <CardContent className={`p-4 ${st.bg}`}>
                                    <h4 className={`font-bold text-sm ${st.title}`}>{s.label}</h4>
                                    <p className="text-2xl font-bold mt-2">
                                        {s.monthlyPremium === 0 ? '0원' : `월 ${(s.monthlyPremium / 1000).toFixed(0)}천원`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">추가 보험료</p>
                                    <div className="mt-3 pt-3 border-t border-white/50 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">잔여 공백</span>
                                            <span className="font-bold">{formatKRW(s.totalGap)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">거절 위험</span>
                                            <span className="font-medium">{s.rejectionRisk}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs mt-3 font-medium">{s.highlight}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <Card className="border-0 shadow-sm bg-violet-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        AI 종합 분석
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-violet-900 leading-relaxed">{f.aiSummary}</p>
                </CardContent>
            </Card>
        </div>
    );
}

// ===== STEP 6: 완료 =====
function CompleteStep() {
    return (
        <div className="space-y-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-900">
                        튜토리얼 완료 🎉
                    </h2>
                    <p className="text-sm text-emerald-800 mt-2 max-w-lg mx-auto leading-relaxed">
                        김민수 고객님의 상담 여정을 통해 보비의 5가지 핵심 기능을 모두 체험하셨습니다.
                        이제 <strong>실제 고객의 심평원 PDF</strong>로 분석을 시작해보세요.
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-3">
                <Link href="/dashboard/analyze">
                    <Card className="border-0 shadow-sm bg-[#1a56db] text-white hover:bg-[#1a56db]/90 transition-colors cursor-pointer">
                        <CardContent className="p-5">
                            <FileSearch className="w-6 h-6 mb-2" />
                            <h3 className="font-bold">새 분석 시작</h3>
                            <p className="text-xs text-white/80 mt-1">심평원 PDF 업로드 →</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-5">
                            <TrendingUp className="w-6 h-6 mb-2 text-[#1a56db]" />
                            <h3 className="font-bold">대시보드로 돌아가기</h3>
                            <p className="text-xs text-muted-foreground mt-1">전체 기능 둘러보기 →</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}

// ===== 재사용 컴포넌트 =====
function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3 pb-2">
            <div className="w-10 h-10 rounded-xl bg-[#1a56db]/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#1a56db]" />
            </div>
            <div>
                <h2 className="text-lg font-bold">{title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: 'blue' | 'amber' | 'emerald';
}) {
    const bg = {
        blue: 'bg-blue-50 text-blue-700',
        amber: 'bg-amber-50 text-amber-700',
        emerald: 'bg-emerald-50 text-emerald-700',
    }[color];
    return (
        <Card className="border-0 shadow-sm">
            <CardContent className={`p-3 ${bg} rounded-lg`}>
                <p className="text-[11px]">{label}</p>
                <p className="font-bold text-base mt-0.5">{value}</p>
            </CardContent>
        </Card>
    );
}
