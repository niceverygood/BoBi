'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Loader2, HeartPulse, Activity, Brain, Stethoscope,
    AlertCircle, TrendingUp, TrendingDown, Shield, Minus,
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { apiFetch } from '@/lib/api/client';
import type { HealthCheckupPreview, HealthAgeResult, DiseaseRiskPrediction } from '@/lib/codef/client';

interface HealthCheckupResults {
    checkup?: {
        resCheckupTarget: string;
        resPreviewList: HealthCheckupPreview[];
        resResultList: unknown[];
    };
    healthAge?: HealthAgeResult;
    stroke?: DiseaseRiskPrediction;
    cardio?: DiseaseRiskPrediction;
}

const AUTH_PROVIDERS = [
    { id: '1', name: '카카오톡', icon: '💬' },
    { id: '8', name: '토스', icon: '💙' },
    { id: '5', name: 'PASS', icon: '📱', needsTelecom: true },
    { id: '6', name: '네이버', icon: '💚' },
];

const TELECOM_PROVIDERS = [
    { id: '0', name: 'SKT' },
    { id: '1', name: 'KT' },
    { id: '2', name: 'LGU+' },
];

function HealthCheckupContent() {
    const [userName, setUserName] = useState('');
    const [identity, setIdentity] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [authProvider, setAuthProvider] = useState('1');
    const [privacyConsent, setPrivacyConsent] = useState(false);
    const [telecom, setTelecom] = useState('0');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<HealthCheckupResults | null>(null);
    const [step, setStep] = useState<'form' | 'results'>('form');

    const selectedProvider = AUTH_PROVIDERS.find(a => a.id === authProvider);
    const needsTelecom = (selectedProvider as { needsTelecom?: boolean })?.needsTelecom === true;

    const handleSubmit = async () => {
        if (!userName || !identity || !phoneNo) {
            setError('모든 필드를 입력해주세요.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch<{ results: HealthCheckupResults; errors?: string[] }>('/api/codef/health-checkup', {
                method: 'POST',
                body: {
                    userName: userName.trim(),
                    identity: identity.replace(/\D/g, ''),
                    phoneNo: phoneNo.replace(/-/g, ''),
                    loginType: '5',
                    loginTypeLevel: authProvider,
                    telecom: needsTelecom ? telecom : '',
                    queryType: 'all',
                },
            });

            setResults(data.results);
            setStep('results');

            if (data.errors && data.errors.length > 0) {
                setError(`일부 조회 실패: ${data.errors.join(', ')}`);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (v: string) => {
        const d = v.replace(/\D/g, '').slice(0, 11);
        if (d.length <= 3) return d;
        if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    };

    const getRiskColor = (grade: string) => {
        if (grade.includes('높') || grade.includes('위험') || grade.includes('3')) return 'text-red-600 bg-red-50';
        if (grade.includes('보통') || grade.includes('주의') || grade.includes('2')) return 'text-amber-600 bg-amber-50';
        return 'text-green-600 bg-green-50';
    };

    if (step === 'results' && results) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setStep('form'); setResults(null); }}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <HeartPulse className="w-6 h-6 text-red-500" />
                            건강검진 결과
                        </h1>
                        <p className="text-sm text-muted-foreground">건강보험공단 건강검진 데이터</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                {/* 건강나이 */}
                {results.healthAge && (
                    <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                건강나이
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 rounded-xl bg-blue-50">
                                    <p className="text-xs text-muted-foreground">실제 나이</p>
                                    <p className="text-3xl font-black text-blue-700">{results.healthAge.resChronologicalAge}세</p>
                                </div>
                                <div className="p-4 rounded-xl bg-primary/5">
                                    <p className="text-xs text-muted-foreground">건강 나이</p>
                                    <p className="text-3xl font-black text-primary">{results.healthAge.resAge}세</p>
                                </div>
                            </div>
                            {results.healthAge.resChangeAfter && (
                                <p className="text-sm text-muted-foreground mt-3">{results.healthAge.resChangeAfter}</p>
                            )}
                            {results.healthAge.resNote1 && (
                                <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    {results.healthAge.resNote1}
                                </div>
                            )}
                            {results.healthAge.resDetailList?.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground">위험요인</p>
                                    {results.healthAge.resDetailList.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                            <span>{d.resRiskFactor}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">{d.resState}</span>
                                                <span className="text-xs text-primary">→ {d.resRecommendValue}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* 건강검진 수치 */}
                {results.checkup?.resPreviewList && results.checkup.resPreviewList.length > 0 && (
                    <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-green-600" />
                                건강검진 수치
                            </CardTitle>
                            <CardDescription>최근 검진 결과</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {results.checkup.resPreviewList.slice(0, 3).map((preview, idx) => (
                                <div key={idx} className="mb-4 last:mb-0">
                                    <p className="text-xs text-muted-foreground mb-2">{preview.resCheckupYear}년 ({preview.resOrganizationName})</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { label: 'BMI', value: preview.resBMI, unit: '' },
                                            { label: '혈압', value: preview.resBloodPressure, unit: 'mmHg' },
                                            { label: '공복혈당', value: preview.resFastingBloodSuger, unit: 'mg/dL' },
                                            { label: '총콜레스테롤', value: preview.resTotalCholesterol, unit: 'mg/dL' },
                                            { label: 'HDL', value: preview.resHDLCholesterol, unit: 'mg/dL' },
                                            { label: 'LDL', value: preview.resLDLCholesterol, unit: 'mg/dL' },
                                            { label: '중성지방', value: preview.resTriglyceride, unit: 'mg/dL' },
                                            { label: 'GFR', value: preview.resGFR, unit: 'mL/min' },
                                            { label: 'AST', value: preview.resAST, unit: 'U/L' },
                                            { label: 'ALT', value: preview.resALT, unit: 'U/L' },
                                            { label: 'y-GTP', value: preview.resyGPT, unit: 'U/L' },
                                            { label: '혈색소', value: preview.resHemoglobin, unit: 'g/dL' },
                                        ].filter(item => item.value).map((item, i) => (
                                            <div key={i} className="p-2 rounded-lg bg-muted/50 text-center">
                                                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                                <p className="text-sm font-bold">{item.value}</p>
                                                {item.unit && <p className="text-[10px] text-muted-foreground">{item.unit}</p>}
                                            </div>
                                        ))}
                                    </div>
                                    {preview.resJudgement && (
                                        <div className="mt-2">
                                            <Badge variant="outline" className="text-xs">판정: {preview.resJudgement}</Badge>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* 뇌졸중 예측 */}
                {results.stroke && results.stroke.resRiskGrade && (
                    <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Brain className="w-4 h-4 text-purple-600" />
                                뇌졸중 위험도
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold ${getRiskColor(results.stroke.resRiskGrade)}`}>
                                {results.stroke.resRiskGrade}
                                {results.stroke.resRatio && <span className="text-sm font-normal">({results.stroke.resRatio})</span>}
                            </div>
                            {results.stroke.resDetailList?.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {results.stroke.resDetailList.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                            <span>{d.resType}</span>
                                            <span className="text-muted-foreground">{d.resState}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* 심뇌혈관 예측 */}
                {results.cardio && results.cardio.resRiskGrade && (
                    <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <HeartPulse className="w-4 h-4 text-red-600" />
                                심뇌혈관 질환 위험도
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold ${getRiskColor(results.cardio.resRiskGrade)}`}>
                                {results.cardio.resRiskGrade}
                                {results.cardio.resRatio && <span className="text-sm font-normal">({results.cardio.resRatio})</span>}
                            </div>
                            {results.cardio.resDetailList?.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {results.cardio.resDetailList.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                                            <span>{d.resType}</span>
                                            <span className="text-muted-foreground">{d.resState}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* 면책 */}
                <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-4">
                    본 건강검진 데이터는 건강보험공단에서 제공하는 정보이며, 의학적 진단이 아닌 참고 자료입니다.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <HeartPulse className="w-6 h-6 text-red-500" />
                        건강검진 조회
                    </h1>
                    <p className="text-sm text-muted-foreground">건강보험공단 건강검진 결과 + 건강나이 + 질환예측</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">본인확인 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">이름</label>
                        <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="홍길동"
                            className="w-full mt-1 px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">주민등록번호</label>
                        <input value={identity} onChange={e => setIdentity(e.target.value)} placeholder="주민등록번호 13자리" type="password"
                            className="w-full mt-1 px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">전화번호</label>
                        <input value={phoneNo} onChange={e => setPhoneNo(formatPhone(e.target.value))} placeholder="010-1234-5678"
                            className="w-full mt-1 px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">간편인증 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {AUTH_PROVIDERS.map(ap => (
                            <button key={ap.id} onClick={() => setAuthProvider(ap.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                    authProvider === ap.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                                }`}>
                                <span>{ap.icon}</span> <span>{ap.name}</span>
                            </button>
                        ))}
                    </div>
                    {needsTelecom && (
                        <div className="grid grid-cols-3 gap-2">
                            {TELECOM_PROVIDERS.map(t => (
                                <button key={t.id} onClick={() => setTelecom(t.id)}
                                    className={`px-3 py-2 rounded-lg border-2 text-sm ${telecom === t.id ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <div className="space-y-1">
                        <p>입력하신 개인정보(이름, 주민등록번호, 전화번호)는 건강보험공단 본인인증에만 사용되며 서버에 저장되지 않습니다.</p>
                        <p>조회된 건강검진 결과는 질병 위험도 분석을 위해 AI(OpenRouter/Claude)에 전송될 수 있습니다.</p>
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={privacyConsent}
                        onChange={(e) => setPrivacyConsent(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                        <strong>개인정보 수집·이용 및 제3자 제공에 동의합니다.</strong>
                        {' '}
                        <a href="/privacy" target="_blank" className="text-primary underline">개인정보처리방침</a>
                    </span>
                </label>
            </div>

            <Button onClick={handleSubmit} disabled={loading || !privacyConsent} className="w-full" size="lg">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HeartPulse className="w-4 h-4 mr-2" />}
                건강검진 조회하기
            </Button>
        </div>
    );
}

export default function HealthCheckupPage() {
    return (
        <Suspense fallback={<div className="max-w-4xl mx-auto py-12"><LoadingSpinner text="로딩 중..." size="lg" /></div>}>
            <HealthCheckupContent />
        </Suspense>
    );
}
