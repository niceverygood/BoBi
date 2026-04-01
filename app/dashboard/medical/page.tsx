'use client';

import { useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, ArrowLeft, Stethoscope, Car, Search, Shield,
    Calendar, Building2, DollarSign, FileText, Pill, CheckCircle2,
    Smartphone, AlertCircle, ChevronDown, ChevronUp, HeartPulse,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { HiraMedicalRecord, HiraBasicTreatRecord, HiraCarInsuranceRecord, HiraCarBasicTreatRecord, HiraPrescribeDrugRecord, NhisTreatmentRecord } from '@/lib/codef/client';

// 인증 방식
const AUTH_METHODS = [
    { id: 'simple', name: '간편인증', description: '앱에서 인증' },
    { id: 'sms', name: '휴대폰인증(SMS)', description: 'SMS 인증번호 입력' },
];

// 간편인증사 목록 - CODEF 공식 loginTypeLevel 코드
const AUTH_PROVIDERS = [
    { id: '1', name: '카카오톡', icon: '💬', color: 'bg-yellow-400/10 border-yellow-400/30' },
    { id: '8', name: '토스', icon: '💙', color: 'bg-blue-500/10 border-blue-500/30' },
    { id: '5', name: 'PASS', icon: '📱', color: 'bg-red-500/10 border-red-500/30', needsTelecom: true },
    { id: '6', name: '네이버', icon: '💚', color: 'bg-green-500/10 border-green-500/30' },
    { id: '4', name: 'KB모바일', icon: '⭐', color: 'bg-amber-500/10 border-amber-500/30' },
    { id: '3', name: '삼성패스', icon: '🔵', color: 'bg-indigo-500/10 border-indigo-500/30' },
];

// 통신사 목록 (PASS 인증 시 필수) - CODEF 공식 코드
// 간편인증(loginType=5) PASS: 0=SKT(알뜰폰 포함), 1=KT(알뜰폰 포함), 2=LGU+(알뜰폰 포함)
const TELECOM_PROVIDERS = [
    { id: '0', name: 'SKT', icon: '🔴', desc: '알뜰폰 포함' },
    { id: '1', name: 'KT', icon: '🟠', desc: '알뜰폰 포함' },
    { id: '2', name: 'LGU+', icon: '🟣', desc: '알뜰폰 포함' },
];

// 조회 타입
const QUERY_TYPES = [
    { id: 'medical', name: '내 진료정보', icon: Stethoscope, description: '심평원 최대 5년 진료 이력' },
    { id: 'car', name: '자동차보험 진료', icon: Car, description: '자동차보험 관련 진료 내역' },
    { id: 'both', name: '심평원 전체', icon: Search, description: '진료정보 + 자동차보험 동시' },
    { id: 'nhis', name: '진료/투약정보', icon: HeartPulse, description: '건보공단 진료 및 투약내역' },
];

type Step = 'form' | 'auth-waiting' | 'results';
type QueryType = 'medical' | 'car' | 'both' | 'nhis';

function MedicalInfoContent() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 폼 입력
    const [userName, setUserName] = useState('');
    const [identity, setIdentity] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [authMethod, setAuthMethod] = useState<'simple' | 'sms'>('simple');
    const [authProvider, setAuthProvider] = useState('1');
    const [telecom, setTelecom] = useState('0');
    const [queryType, setQueryType] = useState<QueryType>('medical');
    const [smsCode, setSmsCode] = useState('');

    // 2-Way 인증 관련
    const [twoWayData, setTwoWayData] = useState<Record<string, unknown> | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [bothStep, setBothStep] = useState<string | null>(null);
    const [pendingMedical, setPendingMedical] = useState<{ records: unknown[]; count: number } | null>(null);

    // 결과
    const [medicalTreatRecords, setMedicalTreatRecords] = useState<HiraBasicTreatRecord[]>([]);
    const [medicalDrugRecords, setMedicalDrugRecords] = useState<HiraPrescribeDrugRecord[]>([]);
    const [carTreatRecords, setCarTreatRecords] = useState<HiraCarBasicTreatRecord[]>([]);
    const [nhisRecords, setNhisRecords] = useState<NhisTreatmentRecord[]>([]);
    const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());

    // 고지분석 관련
    const [analyzing, setAnalyzing] = useState(false);

    // 전화번호 포맷팅
    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    };

    // 주민등록번호 포맷팅 (13자리, 하이픈 자동 삽입)
    const formatIdentity = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 13);
        if (digits.length <= 6) return digits;
        return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    };

    // 금액 포맷팅
    const formatAmount = (amount?: string) => {
        if (!amount) return '-';
        const num = parseInt(amount.replace(/\D/g, ''), 10);
        return isNaN(num) ? '-' : `${num.toLocaleString()}원`;
    };

    // 날짜 포맷팅
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        if (dateStr.length === 8) {
            return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
        }
        return dateStr;
    };

    // PASS 인증 여부 확인
    const selectedProvider = AUTH_PROVIDERS.find(a => a.id === authProvider);
    const needsTelecom = (selectedProvider as { needsTelecom?: boolean })?.needsTelecom === true;
    const isNhis = queryType === 'nhis';

    // 건보공단: 주민번호에서 생년월일(YYYYMMDD) 추출
    const extractBirthDate = (id: string) => {
        const digits = id.replace(/\D/g, '');
        if (digits.length !== 13) return digits;
        const yymmdd = digits.slice(0, 6);
        const g = digits[6];
        const century = ['3','4','7','8'].includes(g) ? '20' : '19';
        return `${century}${yymmdd}`;
    };

    // API 요청 body 생성
    const isSmsAuth = authMethod === 'sms';
    const buildRequestBody = (extraFields?: Record<string, unknown>) => ({
        userName: userName.trim(),
        identity: isNhis ? extractBirthDate(identity) : identity.replace(/\D/g, ''),
        phoneNo: phoneNo.replace(/-/g, ''),
        loginType: isSmsAuth ? '2' : '5',
        loginTypeLevel: isSmsAuth ? '1' : authProvider,
        ...(isSmsAuth ? { authMethod: '0' } : {}),
        telecom: needsTelecom ? telecom : '',
        queryType,
        ...extraFields,
    });

    // 제출
    const handleSubmit = async () => {
        if (!userName.trim() || !identity.trim() || !phoneNo.trim()) {
            setError('이름, 주민등록번호, 전화번호를 모두 입력해주세요.');
            return;
        }

        const identityDigits = identity.replace(/\D/g, '');
        if (identityDigits.length !== 13) {
            setError('주민등록번호 13자리를 모두 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const apiUrl = isNhis ? '/api/codef/nhis-treatment' : '/api/codef/medical-info';
            const extraParams = twoWayData
                ? { is2Way: true, twoWayInfo: twoWayData, simpleAuth: '1', ...(isSmsAuth && smsCode ? { smsAuthNo: smsCode } : {}), sessionId, bothStep }
                : {};

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildRequestBody(extraParams)),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '조회에 실패했습니다.');
            }

            if (data.requires2Way) {
                setTwoWayData(data.twoWayData);
                setSessionId(data.sessionId);
                if (data.bothStep) setBothStep(data.bothStep);
                if (data.medical) setPendingMedical(data.medical);
                setStep('auth-waiting');
                setLoading(false);
                return;
            }

            // both: medical 완료, car 인증 필요
            if (data.needsCarAuth) {
                if (data.medical) setPendingMedical(data.medical);
                setSessionId(data.sessionId);
                setBothStep('car');
                setTwoWayData(null);
                setLoading(false);
                await startCarQuery(data.sessionId, data.medical);
                return;
            }

            // 건보공단 결과 처리
            if (isNhis && data.records) {
                setNhisRecords(data.records);
                setStep('results');
                return;
            }

            applyResults(data);
            setStep('results');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 결과 데이터 적용 헬퍼
    const applyResults = (data: Record<string, unknown>) => {
        const med = data.medical as { records: HiraMedicalRecord[] } | undefined;
        const car = data.carInsurance as { records: HiraCarInsuranceRecord[] } | undefined;
        if (med) {
            const records = med.records || [];
            setMedicalTreatRecords(records.flatMap(r => r.resBasicTreatList || []));
            setMedicalDrugRecords(records.flatMap(r => r.resPrescribeDrugList || []));
        }
        if (car) {
            const records = car.records || [];
            setCarTreatRecords(records.flatMap(r => r.resBasicTreatList || []));
        }
    };

    // both: medical 완료 후 car 자동 시작
    const startCarQuery = async (baseSessionId: string, medicalData: { records: unknown[]; count: number } | null) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/codef/medical-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildRequestBody({
                    bothStep: 'car',
                    sessionId: baseSessionId,
                    previousMedical: medicalData,
                })),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '자동차보험 조회 실패');

            if (data.requires2Way) {
                setTwoWayData(data.twoWayData);
                setSessionId(data.sessionId);
                setBothStep('car');
                if (data.medical) setPendingMedical(data.medical);
                setStep('auth-waiting');
                setLoading(false);
                return;
            }

            applyResults(data);
            setStep('results');
        } catch (err) {
            // car 실패해도 medical 결과는 보여줌
            if (medicalData) {
                const records = medicalData.records as HiraMedicalRecord[];
                setMedicalTreatRecords((records || []).flatMap(r => r.resBasicTreatList || []));
                setMedicalDrugRecords((records || []).flatMap(r => r.resPrescribeDrugList || []));
            }
            setError(`자동차보험 조회 실패: ${(err as Error).message}. 내진료정보만 표시합니다.`);
            setStep('results');
        } finally {
            setLoading(false);
        }
    };

    // 2-Way 인증 완료 후 재조회
    const handleAuthComplete = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/codef/medical-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildRequestBody({
                    is2Way: true,
                    twoWayInfo: twoWayData,
                    simpleAuth: '1',
                    ...(isSmsAuth && smsCode ? { smsAuthNo: smsCode } : {}),
                    sessionId,
                    bothStep,
                    previousMedical: pendingMedical,
                })),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '인증 확인에 실패했습니다.');
            }

            if (data.requires2Way) {
                setTwoWayData(data.twoWayData);
                if (data.bothStep) setBothStep(data.bothStep);
                if (data.medical) setPendingMedical(data.medical);
                const providerName = AUTH_PROVIDERS.find(a => a.id === authProvider)?.name || '인증 앱';
                setError(`${providerName}에서 인증을 완료해주세요.`);
                setLoading(false);
                return;
            }

            // both: medical 2-Way 완료 → car 자동 시작
            if (data.needsCarAuth) {
                if (data.medical) setPendingMedical(data.medical);
                setSessionId(data.sessionId);
                setBothStep('car');
                setTwoWayData(null);
                setLoading(false);
                await startCarQuery(data.sessionId, data.medical);
                return;
            }

            applyResults(data);
            setStep('results');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const toggleRecord = (idx: number) => {
        const next = new Set(expandedRecords);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        setExpandedRecords(next);
    };

    const reset = () => {
        setStep('form');
        setMedicalTreatRecords([]);
        setMedicalDrugRecords([]);
        setCarTreatRecords([]);
        setNhisRecords([]);
        setTwoWayData(null);
        setSessionId(null);
        setBothStep(null);
        setPendingMedical(null);
        setError(null);
        setExpandedRecords(new Set());
    };

    // 고지분석 시작
    const handleStartAnalysis = async () => {
        if (analyzing) return;
        if (medicalTreatRecords.length === 0 && carTreatRecords.length === 0 && nhisRecords.length === 0) {
            setError('분석할 진료 기록이 없습니다.');
            return;
        }
        setAnalyzing(true);
        setError(null);

        try {
            const analyzeBody: Record<string, unknown> = {};
            if (nhisRecords.length > 0) {
                analyzeBody.nhisRecords = nhisRecords;
            }
            if (medicalTreatRecords.length > 0 || carTreatRecords.length > 0) {
                analyzeBody.codefRecords = {
                    treats: medicalTreatRecords,
                    drugs: medicalDrugRecords,
                    cars: carTreatRecords,
                };
            }

            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analyzeBody),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '분석에 실패했습니다.');
            }

            router.push(`/dashboard/analyze?analysisId=${data.analysisId}`);
        } catch (err) {
            setError((err as Error).message);
            setAnalyzing(false);
        }
    };

    // ─── STEP 1: 입력 폼 ───────────────────────────
    if (step === 'form') {
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                {/* 헤더 */}
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            <Stethoscope className="w-6 h-6 text-primary" />
                            진료정보 조회
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            건강보험심사평가원(HIRA) 데이터 기반 조회
                        </p>
                    </div>
                </div>

                {/* 조회 유형 선택 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">조회 유형 선택</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {QUERY_TYPES.map((qt) => {
                                const Icon = qt.icon;
                                const isSelected = queryType === qt.id;
                                return (
                                    <button
                                        key={qt.id}
                                        onClick={() => setQueryType(qt.id as QueryType)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-muted hover:border-primary/30'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <p className="font-semibold text-sm">{qt.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{qt.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 본인정보 입력 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">본인 정보 입력</CardTitle>
                        <CardDescription>건강보험심사평가원 본인확인에 필요한 정보입니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">이름</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="홍길동"
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">주민등록번호</label>
                            <input
                                type="password"
                                value={identity}
                                onChange={(e) => setIdentity(formatIdentity(e.target.value))}
                                placeholder="주민등록번호 13자리"
                                maxLength={14}
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">13자리 전체 입력 (예: 900101-1234567)</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">전화번호</label>
                            <input
                                type="tel"
                                value={phoneNo}
                                onChange={(e) => setPhoneNo(formatPhone(e.target.value))}
                                placeholder="010-1234-5678"
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 인증 방식 선택 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            인증 방식
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {AUTH_METHODS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setAuthMethod(m.id as 'simple' | 'sms')}
                                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                                        authMethod === m.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-primary/30'
                                    }`}
                                >
                                    <p className="font-semibold text-sm">{m.name}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>
                                </button>
                            ))}
                        </div>

                        {/* 간편인증 선택 시 앱 선택 */}
                        {authMethod === 'simple' && (
                            <>
                                <p className="text-xs text-muted-foreground font-medium pt-1">간편인증 앱 선택</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {AUTH_PROVIDERS.map((ap) => (
                                        <button
                                            key={ap.id}
                                            onClick={() => setAuthProvider(ap.id)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                                authProvider === ap.id
                                                    ? `${ap.color} border-primary`
                                                    : 'border-muted hover:border-muted-foreground/30'
                                            }`}
                                        >
                                            <span className="text-lg">{ap.icon}</span>
                                            <span>{ap.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* PASS 선택 시 통신사 선택 */}
                        {needsTelecom && (
                            <div className="pt-2 space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                    통신사 선택 (필수)
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {TELECOM_PROVIDERS.map((tp) => (
                                        <button
                                            key={tp.id}
                                            onClick={() => setTelecom(tp.id)}
                                            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                                telecom === tp.id
                                                    ? 'bg-primary/5 border-primary'
                                                    : 'border-muted hover:border-muted-foreground/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>{tp.icon}</span>
                                                <span>{tp.name}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">{tp.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 에러/보안 안내 */}
                {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg">
                    <Shield className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <p>입력하신 개인정보는 건강보험심사평가원 본인인증에만 사용되며, 서버에 저장되지 않습니다.</p>
                </div>

                {/* 조회 버튼 */}
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !userName || !identity || !phoneNo}
                    className="w-full bg-gradient-primary hover:opacity-90 h-12 text-base"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            조회 요청 중...
                        </>
                    ) : (
                        <>
                            <Search className="w-5 h-5 mr-2" />
                            진료정보 조회하기
                        </>
                    )}
                </Button>
            </div>
        );
    }

    // ─── STEP 2: 인증 대기 ──────────────────────────
    if (step === 'auth-waiting') {
        const selectedAuth = AUTH_PROVIDERS.find(a => a.id === authProvider);

        return (
            <div className="max-w-md mx-auto mt-12 space-y-6 animate-fade-in text-center">
                <Card className="border-0 shadow-xl">
                    <CardContent className="py-10 space-y-6">
                        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <Smartphone className="w-10 h-10 text-primary animate-pulse" />
                        </div>

                        {isSmsAuth ? (
                            <>
                                <div>
                                    <h2 className="text-xl font-bold mb-2">SMS 인증번호 입력</h2>
                                    <p className="text-muted-foreground text-sm">
                                        휴대폰으로 전송된 인증번호를 입력해주세요
                                    </p>
                                </div>
                                <div className="space-y-2 text-left bg-muted/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span>SMS 인증번호 전송 완료</span>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={smsCode}
                                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="인증번호 입력"
                                    maxLength={6}
                                    className="w-full px-4 py-3 rounded-lg border bg-background text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    autoFocus
                                />
                            </>
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-xl font-bold mb-2">간편인증 요청됨</h2>
                                    <p className="text-muted-foreground text-sm">
                                        <span className="font-semibold text-foreground">
                                            {selectedAuth?.icon} {selectedAuth?.name}
                                        </span> 앱에서
                                        <br />인증을 완료해주세요
                                    </p>
                                </div>
                                <div className="space-y-2 text-left bg-muted/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span>인증 요청 전송 완료</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>앱에서 인증 대기 중...</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                onClick={handleAuthComplete}
                                disabled={loading || (isSmsAuth && !smsCode)}
                                className="w-full bg-gradient-primary hover:opacity-90 h-11"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />확인 중...</>
                                ) : isSmsAuth ? (
                                    '인증번호 확인'
                                ) : (
                                    '인증 완료했어요'
                                )}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={reset}>
                                처음으로 돌아가기
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── STEP 3: 결과 보기 ──────────────────────────
    const totalMedical = medicalTreatRecords.length;
    const totalCar = carTreatRecords.length;
    const totalAmount = medicalTreatRecords.reduce((sum, r) => sum + (parseInt(r.resTotalAmount?.replace(/\D/g, '') || '0', 10) || 0), 0);

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={reset} className="h-9 w-9">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">조회 결과</h1>
                        <p className="text-sm text-muted-foreground">{userName}님의 진료정보</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>
                    새로 조회
                </Button>
            </div>

            {/* 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(queryType === 'medical' || queryType === 'both') && (
                    <Card className="border-0 shadow-sm bg-blue-50/50 dark:bg-blue-950/10">
                        <CardContent className="p-4 text-center">
                            <Stethoscope className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                            <p className="text-2xl font-bold">{totalMedical}건</p>
                            <p className="text-xs text-muted-foreground">진료 기록</p>
                        </CardContent>
                    </Card>
                )}
                {(queryType === 'car' || queryType === 'both') && (
                    <Card className="border-0 shadow-sm bg-amber-50/50 dark:bg-amber-950/10">
                        <CardContent className="p-4 text-center">
                            <Car className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                            <p className="text-2xl font-bold">{totalCar}건</p>
                            <p className="text-xs text-muted-foreground">자동차보험 진료</p>
                        </CardContent>
                    </Card>
                )}
                <Card className="border-0 shadow-sm bg-green-50/50 dark:bg-green-950/10">
                    <CardContent className="p-4 text-center">
                        <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-600" />
                        <p className="text-2xl font-bold">{totalAmount > 0 ? `${(totalAmount / 10000).toFixed(0)}만` : '-'}</p>
                        <p className="text-xs text-muted-foreground">총 진료비</p>
                    </CardContent>
                </Card>
            </div>

            {/* 고지분석 시작 버튼 */}
            {(totalMedical > 0 || totalCar > 0 || nhisRecords.length > 0) && (
                <Card className="border-0 shadow-md bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-sm">조회된 진료정보로 고지분석을 진행할 수 있습니다</p>
                                <p className="text-xs text-muted-foreground mt-0.5">AI가 고지사항 해당 여부를 자동 분석합니다</p>
                            </div>
                            <Button
                                onClick={handleStartAnalysis}
                                disabled={analyzing}
                                className="bg-gradient-primary hover:opacity-90 h-10 px-6 shrink-0"
                            >
                                {analyzing ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />분석 중...</>
                                ) : (
                                    <><FileText className="w-4 h-4 mr-2" />고지분석 시작</>
                                )}
                            </Button>
                        </div>
                        {error && analyzing === false && (
                            <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 진료 기록 목록 */}
            {medicalTreatRecords.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        진료 기록
                        <Badge variant="secondary" className="text-xs">{medicalTreatRecords.length}건</Badge>
                    </h2>
                    {medicalTreatRecords.map((record, idx) => (
                        <Card key={idx} className="border-0 shadow-sm overflow-hidden">
                            <button
                                onClick={() => toggleRecord(idx)}
                                className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{record.resHospitalName || '의료기관'}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(record.resTreatStartDate)}</span>
                                                {record.resDepartment && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{record.resDepartment}</span>
                                                    </>
                                                )}
                                                {record.resTreatType && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{record.resTreatType}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <span className="text-sm font-semibold">{formatAmount(record.resTotalAmount)}</span>
                                        {expandedRecords.has(idx)
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        }
                                    </div>
                                </div>
                            </button>

                            {expandedRecords.has(idx) && (
                                <div className="px-4 pb-4 pt-0 border-t">
                                    <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">내원일수</span>
                                            <p className="font-medium mt-0.5">{record.resVisitDays || '-'}일</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">내가 낸 의료비</span>
                                            <p className="font-medium mt-0.5">{formatAmount(record.resDeductibleAmt)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">혜택받은 금액</span>
                                            <p className="font-medium mt-0.5">{formatAmount(record.resPublicCharge)}</p>
                                        </div>
                                        {record.resDiseaseName && (
                                            <div>
                                                <span className="text-muted-foreground">주상병명</span>
                                                <p className="font-medium mt-0.5">{record.resDiseaseName}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 해당 진료일의 처방 정보 */}
                                    {medicalDrugRecords.filter(rx =>
                                        rx.resTreatStartDate === record.resTreatStartDate &&
                                        rx.resHospitalName === record.resHospitalName
                                    ).length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Pill className="w-3 h-3" />
                                                처방 의약품
                                            </p>
                                            {medicalDrugRecords.filter(rx =>
                                                rx.resTreatStartDate === record.resTreatStartDate &&
                                                rx.resHospitalName === record.resHospitalName
                                            ).map((rx, rxIdx) => (
                                                <div key={rxIdx} className="text-xs p-2 bg-muted/20 rounded-md">
                                                    <p className="font-medium">{rx.resDrugName || rx.resIngredients || '-'}</p>
                                                    <p className="text-muted-foreground mt-0.5">
                                                        {rx.resOneDose && `1회 ${rx.resOneDose}`}
                                                        {rx.resDailyDosesNumber && ` · 1일 ${rx.resDailyDosesNumber}회`}
                                                        {rx.resTotalDosingdays && ` · ${rx.resTotalDosingdays}일분`}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* 자동차보험 기록 */}
            {carTreatRecords.length > 0 && (
                <div className="space-y-3">
                    <Separator />
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Car className="w-5 h-5 text-amber-600" />
                        자동차보험 진료 기록
                        <Badge variant="secondary" className="text-xs">{carTreatRecords.length}건</Badge>
                    </h2>
                    {carTreatRecords.map((record, idx) => (
                        <Card key={`car-${idx}`} className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <Car className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm">{record.resHospitalName || '의료기관'}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(record.resTreatStartDate)}</span>
                                            {record.resDepartment && (
                                                <><span>·</span><span>{record.resDepartment}</span></>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                            <div>
                                                <span className="text-muted-foreground">진료일수</span>
                                                <p className="font-medium">{record.resTreatDate || '-'}일</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">청구진료비</span>
                                                <p className="font-medium">{formatAmount(record.resTotalAmount)}</p>
                                            </div>
                                            {record.resMedicalFee && (
                                                <div>
                                                    <span className="text-muted-foreground">자동차보험 진료비</span>
                                                    <p className="font-medium">{formatAmount(record.resMedicalFee)}</p>
                                                </div>
                                            )}
                                            {record.resDiseaseName && (
                                                <div>
                                                    <span className="text-muted-foreground">주상병명</span>
                                                    <p className="font-medium">{record.resDiseaseName}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* 건보공단 진료/투약정보 */}
            {nhisRecords.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-emerald-600" />
                        건보공단 진료/투약정보
                        <Badge variant="secondary" className="text-xs">{nhisRecords.length}건</Badge>
                    </h2>
                    {nhisRecords.map((record, idx) => (
                        <Card key={`nhis-${idx}`} className="border-0 shadow-sm overflow-hidden">
                            <button
                                onClick={() => toggleRecord(idx + 10000)}
                                className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Building2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{record.resHospitalName || '의료기관'}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(record.resTreatStartDate)}</span>
                                                {record.resTreatType && <><span>·</span><span>{record.resTreatType}</span></>}
                                                {record.resType && <><span>·</span><span>{record.resType}</span></>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <span className="text-xs text-muted-foreground">{record.resVisitDays || '-'}일</span>
                                        {expandedRecords.has(idx + 10000)
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </div>
                            </button>
                            {expandedRecords.has(idx + 10000) && record.resMediDetailList && record.resMediDetailList.length > 0 && (
                                <div className="px-4 pb-4 pt-0 border-t space-y-2 mt-2">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Pill className="w-3 h-3" /> 투약 상세
                                    </p>
                                    {record.resMediDetailList.map((d, dIdx) => (
                                        <div key={dIdx} className="text-xs p-2 bg-muted/20 rounded-md">
                                            <p className="font-medium">{d.resPrescribeDrugName || '-'}</p>
                                            <p className="text-muted-foreground mt-0.5">
                                                {d.resPrescribeDrugEffect && `${d.resPrescribeDrugEffect}`}
                                                {d.resPrescribeDays && ` · ${d.resPrescribeDays}일분`}
                                                {d.resTreatDate && ` · ${formatDate(d.resTreatDate)}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* 결과 없음 */}
            {totalMedical === 0 && totalCar === 0 && nhisRecords.length === 0 && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="font-semibold">조회된 진료 기록이 없습니다</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            최대 5년 이내 진료분까지 조회 가능합니다
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function MedicalInfoPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
            <MedicalInfoContent />
        </Suspense>
    );
}
