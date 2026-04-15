'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Loader2, HeartPulse, Activity, Brain, Stethoscope,
    AlertCircle, TrendingUp, TrendingDown, Shield, Minus, Sparkles,
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
    const [step, setStep] = useState<'form' | 'auth-waiting' | 'results'>('form');
    const [twoWayData, setTwoWayData] = useState<Record<string, unknown> | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [recentAnalyses, setRecentAnalyses] = useState<Array<{ id: string; created_at: string; customer_name?: string }>>([]);
    const [integrating, setIntegrating] = useState<string | null>(null);
    const [integrateMsg, setIntegrateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const router = useRouter();

    // 결과 화면 진입 시 최근 분석 목록 로드
    useEffect(() => {
        if (step !== 'results') return;
        (async () => {
            try {
                const data = await apiFetch<{ analyses: Array<{ id: string; created_at: string; customer_name?: string }> }>('/api/analyses/recent?limit=5');
                setRecentAnalyses(data.analyses || []);
            } catch { /* ignore */ }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // 건강검진 데이터를 분석 리포트에 통합
    const handleIntegrateToReport = async (analysisId: string) => {
        setIntegrating(analysisId);
        setIntegrateMsg(null);
        try {
            await apiFetch('/api/risk-report', {
                method: 'POST',
                body: {
                    analysisId,
                    regenerate: true,
                    healthCheckupData: results,
                },
            });
            setIntegrateMsg({ type: 'success', text: '건강검진 데이터가 질병위험리포트에 반영되었습니다.' });
            setTimeout(() => router.push(`/dashboard/risk-report?analysisId=${analysisId}`), 1200);
        } catch (err) {
            setIntegrateMsg({ type: 'error', text: (err as Error).message || '통합 실패' });
        }
        setIntegrating(null);
    };

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
            const data = await apiFetch<{
                results?: HealthCheckupResults;
                errors?: string[];
                requires2Way?: boolean;
                twoWayData?: Record<string, unknown>;
                sessionId?: string;
            }>('/api/codef/health-checkup', {
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

            // 2-way 인증 필요 (카카오/토스 등 간편인증 대기)
            if (data.requires2Way) {
                setTwoWayData(data.twoWayData || null);
                setSessionId(data.sessionId || null);
                setStep('auth-waiting');
                setLoading(false);
                return;
            }

            if (data.results) {
                setResults(data.results);
                setStep('results');
            }

            if (data.errors && data.errors.length > 0) {
                setError(`일부 조회 실패: ${data.errors.join(', ')}`);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 2-way 인증 완료 후 재요청
    const handleAuthComplete = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch<{
                results?: HealthCheckupResults;
                errors?: string[];
            }>('/api/codef/health-checkup', {
                method: 'POST',
                body: {
                    userName: userName.trim(),
                    identity: identity.replace(/\D/g, ''),
                    phoneNo: phoneNo.replace(/-/g, ''),
                    loginType: '5',
                    loginTypeLevel: authProvider,
                    telecom: needsTelecom ? telecom : '',
                    queryType: 'all',
                    is2Way: true,
                    twoWayInfo: twoWayData,
                    sessionId,
                },
            });

            if (data.results) {
                setResults(data.results);
                setStep('results');
            } else {
                setError('건강검진 데이터를 가져오지 못했습니다. 다시 시도해주세요.');
                setStep('form');
            }

            if (data.errors && data.errors.length > 0) {
                setError(`일부 조회 실패: ${data.errors.join(', ')}`);
            }
        } catch (err) {
            setError((err as Error).message);
            setStep('form');
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

    // 인증 대기 화면
    if (step === 'auth-waiting') {
        const providerName = AUTH_PROVIDERS.find(a => a.id === authProvider)?.name || '간편인증';
        return (
            <div className="max-w-md mx-auto space-y-6 animate-fade-in text-center py-12">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                    <HeartPulse className="w-10 h-10 text-blue-500 animate-pulse" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-2">{providerName} 인증 요청됨</h2>
                    <p className="text-muted-foreground">
                        {providerName} 앱에서 인증을 완료해주세요.
                    </p>
                </div>

                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-sm text-amber-700">
                                {providerName} 앱에서 인증 알림을 확인하고 승인해주세요.
                            </p>
                        </div>

                        <Button
                            onClick={handleAuthComplete}
                            disabled={loading}
                            className="w-full"
                            size="lg"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />조회 중...</>
                            ) : (
                                <><HeartPulse className="w-5 h-5 mr-2" />인증 완료 · 결과 조회하기</>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStep('form'); setTwoWayData(null); setSessionId(null); }}
                            className="w-full text-muted-foreground"
                        >
                            처음부터 다시 하기
                        </Button>
                    </CardContent>
                </Card>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>
        );
    }

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

                {/* 분석 리포트 통합 */}
                {recentAnalyses.length > 0 && (
                    <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-violet-50 border-blue-100">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-[#1a56db]" />
                                질병위험리포트에 반영하기
                            </CardTitle>
                            <CardDescription className="text-xs">
                                건강검진 데이터를 기존 분석 리포트와 통합해 정확도를 높일 수 있습니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {integrateMsg && (
                                <p className={`text-xs px-3 py-2 rounded-lg ${integrateMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {integrateMsg.text}
                                </p>
                            )}
                            {recentAnalyses.map(a => (
                                <div key={a.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                    <div>
                                        <p className="text-sm font-medium">{a.customer_name || '이름 없음'}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(a.created_at).toLocaleDateString('ko-KR')} 분석
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={integrating === a.id}
                                        onClick={() => handleIntegrateToReport(a.id)}
                                        className="bg-[#1a56db] hover:bg-[#1a56db]/90 gap-1"
                                    >
                                        {integrating === a.id ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> 통합 중...</>
                                        ) : (
                                            <><Sparkles className="w-3 h-3" /> 리포트에 반영</>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
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
                                            <div key={i} className="p-2 rounded-lg bg-muted/50 text-center min-h-[72px] flex flex-col justify-center">
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
                        <input value={identity} onChange={e => setIdentity(e.target.value)} placeholder="주민등록번호 13자리 또는 생년월일 8자리" type="password"
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
                        <a href="/privacy" className="text-primary underline">개인정보처리방침</a>
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
