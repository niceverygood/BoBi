'use client';

import { useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, ArrowLeft, Stethoscope, Car, Search, Shield,
    Calendar, Building2, DollarSign, FileText, Pill, CheckCircle2,
    Smartphone, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import type { HiraMedicalRecord, HiraCarInsuranceRecord } from '@/lib/codef/client';

// 간편인증사 목록
const AUTH_PROVIDERS = [
    { id: '1', name: '카카오톡', icon: '💬', color: 'bg-yellow-400/10 border-yellow-400/30' },
    { id: '12', name: '토스', icon: '💙', color: 'bg-blue-500/10 border-blue-500/30' },
    { id: '7', name: 'PASS', icon: '📱', color: 'bg-red-500/10 border-red-500/30' },
    { id: '5', name: '네이버', icon: '💚', color: 'bg-green-500/10 border-green-500/30' },
    { id: '9', name: 'KB모바일', icon: '⭐', color: 'bg-amber-500/10 border-amber-500/30' },
    { id: '8', name: '삼성패스', icon: '🔵', color: 'bg-indigo-500/10 border-indigo-500/30' },
];

// 통신사 목록 (휴대폰 인증용)
const TELECOM_PROVIDERS = [
    { id: '0', name: 'SKT', icon: '🔴' },
    { id: '1', name: 'KT', icon: '🟠' },
    { id: '2', name: 'LGU+', icon: '🟣' },
    { id: '3', name: 'SKT 알뜰폰', icon: '🔴' },
    { id: '4', name: 'KT 알뜰폰', icon: '🟠' },
    { id: '5', name: 'LGU+ 알뜰폰', icon: '🟣' },
];

// 조회 타입
const QUERY_TYPES = [
    { id: 'medical', name: '내 진료정보', icon: Stethoscope, description: '최대 5년간 진료 이력 조회' },
    { id: 'car', name: '자동차보험 진료', icon: Car, description: '자동차보험 관련 진료 내역' },
    { id: 'both', name: '전체 조회', icon: Search, description: '진료정보 + 자동차보험 동시' },
];

type Step = 'form' | 'auth-waiting' | 'results';
type QueryType = 'medical' | 'car' | 'both';
type AuthMode = 'simple' | 'phone'; // 간편인증 / 휴대폰인증

function MedicalInfoContent() {
    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 폼 입력
    const [userName, setUserName] = useState('');
    const [identity, setIdentity] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [authMode, setAuthMode] = useState<AuthMode>('simple');
    const [authProvider, setAuthProvider] = useState('1'); // 간편인증 기본: 카카오
    const [telecom, setTelecom] = useState('0');            // 휴대폰인증 기본: SKT
    const [queryType, setQueryType] = useState<QueryType>('medical');

    // 2-Way 인증 관련
    const [twoWayData, setTwoWayData] = useState<Record<string, unknown> | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // 결과
    const [medicalRecords, setMedicalRecords] = useState<HiraMedicalRecord[]>([]);
    const [carRecords, setCarRecords] = useState<HiraCarInsuranceRecord[]>([]);
    const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());

    // 전화번호 포맷팅
    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    };

    // 주민번호 앞자리 포맷팅
    const formatIdentity = (value: string) => {
        return value.replace(/\D/g, '').slice(0, 8);
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

    // API 요청 body 생성
    const buildRequestBody = (extraFields?: Record<string, unknown>) => ({
        userName: userName.trim(),
        identity: identity.replace(/\D/g, ''),
        phoneNo: phoneNo.replace(/-/g, ''),
        loginType: authMode === 'simple' ? '5' : '6',
        ...(authMode === 'simple' ? { loginTypeLevel: authProvider } : { telecom }),
        queryType,
        ...extraFields,
    });

    // 제출
    const handleSubmit = async () => {
        if (!userName.trim() || !identity.trim() || !phoneNo.trim()) {
            setError('이름, 주민등록번호(앞 8자리), 전화번호를 모두 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/codef/medical-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildRequestBody(
                    twoWayData ? { is2Way: true, twoWayInfo: twoWayData, sessionId } : {}
                )),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '조회에 실패했습니다.');
            }

            // 2-Way 추가인증 필요
            if (data.requires2Way) {
                setTwoWayData(data.twoWayData);
                setSessionId(data.sessionId);
                setStep('auth-waiting');
                setLoading(false);
                return;
            }

            // 결과 처리
            if (data.medical) {
                setMedicalRecords(data.medical.records || []);
            }
            if (data.carInsurance) {
                setCarRecords(data.carInsurance.records || []);
            }

            setStep('results');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 2-Way 인증 완료 후 재조회
    const handleAuthComplete = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/codef/medical-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildRequestBody({
                    is2Way: true,
                    twoWayInfo: twoWayData,
                    sessionId,
                })),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '인증 확인에 실패했습니다.');
            }

            if (data.requires2Way) {
                setError(authMode === 'simple'
                    ? '간편인증 앱에서 인증을 완료해주세요.'
                    : '휴대폰에서 인증번호를 확인해주세요.');
                setLoading(false);
                return;
            }

            if (data.medical) setMedicalRecords(data.medical.records || []);
            if (data.carInsurance) setCarRecords(data.carInsurance.records || []);

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
        setMedicalRecords([]);
        setCarRecords([]);
        setTwoWayData(null);
        setSessionId(null);
        setError(null);
        setExpandedRecords(new Set());
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
                            <label className="text-sm font-medium mb-1.5 block">주민등록번호 (앞 8자리)</label>
                            <input
                                type="text"
                                value={identity}
                                onChange={(e) => setIdentity(formatIdentity(e.target.value))}
                                placeholder="YYYYMMDD"
                                maxLength={8}
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">생년월일 8자리 (예: 19900101)</p>
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
                            인증 방식 선택
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 인증 방식 탭 */}
                        <div className="flex rounded-lg border overflow-hidden">
                            <button
                                onClick={() => setAuthMode('simple')}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                                    authMode === 'simple'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                📱 간편인증
                            </button>
                            <button
                                onClick={() => setAuthMode('phone')}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l ${
                                    authMode === 'phone'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                💬 휴대폰 인증
                            </button>
                        </div>

                        {/* 간편인증 */}
                        {authMode === 'simple' && (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    인증 요청이 선택한 앱으로 전송됩니다
                                </p>
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

                        {/* 휴대폰 인증 */}
                        {authMode === 'phone' && (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    SMS 인증번호가 입력한 전화번호로 전송됩니다
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {TELECOM_PROVIDERS.map((tp) => (
                                        <button
                                            key={tp.id}
                                            onClick={() => setTelecom(tp.id)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                                                telecom === tp.id
                                                    ? 'bg-primary/5 border-primary'
                                                    : 'border-muted hover:border-muted-foreground/30'
                                            }`}
                                        >
                                            <span>{tp.icon}</span>
                                            <span>{tp.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
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
        const selectedTelecom = TELECOM_PROVIDERS.find(t => t.id === telecom);
        const isSimple = authMode === 'simple';

        return (
            <div className="max-w-md mx-auto mt-12 space-y-6 animate-fade-in text-center">
                <Card className="border-0 shadow-xl">
                    <CardContent className="py-10 space-y-6">
                        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <Smartphone className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-2">
                                {isSimple ? '간편인증 요청됨' : '휴대폰 인증 요청됨'}
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                {isSimple ? (
                                    <>
                                        <span className="font-semibold text-foreground">
                                            {selectedAuth?.icon} {selectedAuth?.name}
                                        </span> 앱에서
                                        <br />인증을 완료해주세요
                                    </>
                                ) : (
                                    <>
                                        <span className="font-semibold text-foreground">
                                            {selectedTelecom?.icon} {selectedTelecom?.name}
                                        </span> 인증번호가
                                        <br />SMS로 발송되었습니다
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="space-y-2 text-left bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>인증 요청 전송 완료</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>
                                    {isSimple ? '앱에서 인증 대기 중...' : 'SMS 인증 대기 중...'}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                onClick={handleAuthComplete}
                                disabled={loading}
                                className="w-full bg-gradient-primary hover:opacity-90 h-11"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />확인 중...</>
                                ) : (
                                    isSimple ? '인증 완료했어요' : '인증번호 입력 완료'
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
    const totalMedical = medicalRecords.length;
    const totalCar = carRecords.length;
    const totalAmount = medicalRecords.reduce((sum, r) => sum + (parseInt(r.resTotalAmount?.replace(/\D/g, '') || '0', 10) || 0), 0);

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

            {/* 진료 기록 목록 */}
            {medicalRecords.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        진료 기록
                        <Badge variant="secondary" className="text-xs">{medicalRecords.length}건</Badge>
                    </h2>
                    {medicalRecords.map((record, idx) => (
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
                                                <span>{formatDate(record.resReceiptDate)}</span>
                                                {record.resMedicalSubject && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{record.resMedicalSubject}</span>
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
                                            <span className="text-muted-foreground">총 진료일수</span>
                                            <p className="font-medium mt-0.5">{record.resTotalDays || '-'}일</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">본인부담금</span>
                                            <p className="font-medium mt-0.5">{formatAmount(record.resPatientAmount)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">보험자부담금</span>
                                            <p className="font-medium mt-0.5">{formatAmount(record.resInsuranceAmount)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">비급여</span>
                                            <p className="font-medium mt-0.5">{formatAmount(record.resNonPaymentAmount)}</p>
                                        </div>
                                    </div>

                                    {record.resTreatmentContent && (
                                        <div className="text-xs mt-2 p-2 bg-muted/30 rounded-md">
                                            <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                                                <FileText className="w-3 h-3" />
                                                <span>진료내용</span>
                                            </div>
                                            <p className="text-foreground">{record.resTreatmentContent}</p>
                                        </div>
                                    )}

                                    {record.resPrescriptionList && record.resPrescriptionList.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Pill className="w-3 h-3" />
                                                처방 의약품
                                            </p>
                                            {record.resPrescriptionList.map((rx, rxIdx) => (
                                                <div key={rxIdx} className="text-xs p-2 bg-muted/20 rounded-md">
                                                    <p className="font-medium">{rx.resMedicineName || '-'}</p>
                                                    <p className="text-muted-foreground mt-0.5">
                                                        {rx.resDosagePerTime && `1회 ${rx.resDosagePerTime}`}
                                                        {rx.resDailyDoses && ` · 1일 ${rx.resDailyDoses}회`}
                                                        {rx.resTotalDoseDays && ` · ${rx.resTotalDoseDays}일분`}
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
            {carRecords.length > 0 && (
                <div className="space-y-3">
                    <Separator />
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Car className="w-5 h-5 text-amber-600" />
                        자동차보험 진료 기록
                        <Badge variant="secondary" className="text-xs">{carRecords.length}건</Badge>
                    </h2>
                    {carRecords.map((record, idx) => (
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
                                            <span>{formatDate(record.resReceiptDate)}</span>
                                            {record.resMedicalSubject && (
                                                <><span>·</span><span>{record.resMedicalSubject}</span></>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                            {record.resAccidentDate && (
                                                <div>
                                                    <span className="text-muted-foreground">사고일</span>
                                                    <p className="font-medium">{formatDate(record.resAccidentDate)}</p>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-muted-foreground">총 진료비</span>
                                                <p className="font-medium">{formatAmount(record.resTotalAmount)}</p>
                                            </div>
                                            {record.resInsuranceCompany && (
                                                <div>
                                                    <span className="text-muted-foreground">보험회사</span>
                                                    <p className="font-medium">{record.resInsuranceCompany}</p>
                                                </div>
                                            )}
                                            {record.resClaimStatus && (
                                                <div>
                                                    <span className="text-muted-foreground">청구상태</span>
                                                    <Badge variant="outline" className="text-[10px] mt-0.5">
                                                        {record.resClaimStatus}
                                                    </Badge>
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

            {/* 결과 없음 */}
            {totalMedical === 0 && totalCar === 0 && (
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
