'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2, ArrowLeft, Stethoscope, Car, Search, Shield,
    Calendar, Building2, DollarSign, FileText, Pill, CheckCircle2,
    Smartphone, AlertCircle, ChevronDown, ChevronUp, HeartPulse,
    Info,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { HiraMedicalRecord, HiraBasicTreatRecord, HiraCarInsuranceRecord, HiraCarBasicTreatRecord, HiraPrescribeDrugRecord, MyMedicineRecord } from '@/lib/codef/client';
import { useSubscription } from '@/hooks/useSubscription';
import TrackFeatureUse from '@/components/analytics/TrackFeatureUse';

// 인증 방식 (간편인증 + SMS)
const AUTH_METHODS = [
    { id: 'simple', name: '간편인증', description: '앱에서 인증' },
    { id: 'sms', name: 'SMS 인증', description: '문자 인증번호' },
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
    { id: 'medical', name: '내 진료정보', icon: Stethoscope, description: '심평원 진료 + 건보공단 투약 통합' },
    { id: 'car', name: '자동차보험 진료', icon: Car, description: '자동차보험 관련 진료 내역' },
    { id: 'both', name: '전체 조회', icon: Search, description: '진료정보 + 자동차보험 동시' },
];

type Step = 'form' | 'auth-waiting' | 'results';
type QueryType = 'medical' | 'car' | 'both';

function MedicalInfoContent() {
    const router = useRouter();
    const { plan, loading: planLoading } = useSubscription();

    // 무료 플랜은 업그레이드 페이지로 리다이렉트 (진료정보는 베이직 이상 전용).
    // trialing(체험 중)은 useSubscription에서 체험 플랜으로 해석되므로 통과.
    useEffect(() => {
        if (!planLoading && plan.slug === 'free') {
            router.replace('/upgrade/medical-info');
        }
    }, [planLoading, plan.slug, router]);

    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState('');
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
    const [myMedicineRecords, setMyMedicineRecords] = useState<MyMedicineRecord[]>([]);
    const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());

    // 누적 조회 (HIRA 1년 정책 우회 — 사용자가 1년 윈도우 단위로 여러 번 인증해 5년치를 모음)
    type AccumulatedWindow = {
        record_type: 'medical' | 'car_insurance' | 'medicine';
        period_start: string;
        period_end: string;
        record_count: number;
        fetched_at: string;
    };
    const [accumulatedWindows, setAccumulatedWindows] = useState<AccumulatedWindow[]>([]);
    const [accumulatedLoaded, setAccumulatedLoaded] = useState(false);
    // 마지막 인증 결과의 누적 저장 상태 — 사용자가 "조회안됨" 호소 시 진단 가능하게 노출.
    type SaveStatusItem = { record_type: string; saved: boolean; count: number; error?: string };
    const [lastSaveStatus, setLastSaveStatus] = useState<SaveStatusItem[] | null>(null);
    const [lastSavedPeriod, setLastSavedPeriod] = useState<{ start: string; end: string } | null>(null);

    const MAX_ACCUMULATION_YEARS = 5;

    // 누적 진료기록의 실제 커버 기간(년) 계산.
    // HIRA가 1번 인증으로 5년치를 다 주므로 보통 1윈도우=5년이지만, 사용자가 직접 짧은
    // 기간을 지정한 경우엔 윈도우가 여러 개 쌓일 수 있어 모든 윈도우를 union으로 계산.
    const computeCoveredYears = (windows: AccumulatedWindow[]): number => {
        const medical = windows.filter(w => w.record_type === 'medical');
        if (medical.length === 0) return 0;
        const oldestStart = medical.reduce((min, w) => (w.period_start < min ? w.period_start : min), medical[0].period_start);
        const latestEnd = medical.reduce((max, w) => (w.period_end > max ? w.period_end : max), medical[0].period_end);
        const ms = new Date(latestEnd).getTime() - new Date(oldestStart).getTime();
        return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 365.25)));
    };

    // 다음 추가로 받을 기간 계산:
    // - 누적 0개 → 기본 5년치 (server default)
    // - 5년 미만 누적 → 가장 옛날 period_start 이전의 1년치 (점진 누적)
    // - 5년 이상 누적 → null (HIRA 정책상 그 이상은 없음)
    const computeNextChunk = (windows: AccumulatedWindow[]): { startDate?: string; endDate?: string; label: string } | null => {
        const medical = windows
            .filter(w => w.record_type === 'medical')
            .sort((a, b) => a.period_start.localeCompare(b.period_start));

        if (medical.length === 0) return { label: '최근 5년 진료기록' };

        const covered = computeCoveredYears(windows);
        if (covered >= MAX_ACCUMULATION_YEARS) return null;

        // 부분 누적 케이스 — 가장 옛날 period_start 직전 1년치 추가
        const oldestStart = new Date(medical[0].period_start + 'T00:00:00Z');
        const newEnd = new Date(oldestStart);
        newEnd.setUTCDate(newEnd.getUTCDate() - 1);
        const newStart = new Date(newEnd);
        newStart.setUTCFullYear(newStart.getUTCFullYear() - 1);
        newStart.setUTCDate(newStart.getUTCDate() + 1);

        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        return {
            startDate: fmt(newStart).replace(/-/g, ''),
            endDate: fmt(newEnd).replace(/-/g, ''),
            label: `${fmt(newStart)} ~ ${fmt(newEnd)} 진료기록`,
        };
    };

    const nextChunk = computeNextChunk(accumulatedWindows);
    const collectedYears = computeCoveredYears(accumulatedWindows);

    // 고지분석 관련
    const [analyzing, setAnalyzing] = useState(false);
    const [privacyConsent, setPrivacyConsent] = useState(false);


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

    // PASS 또는 SMS 인증 시 통신사 필요 여부
    const selectedProvider = AUTH_PROVIDERS.find(a => a.id === authProvider);
    const needsTelecom = (selectedProvider as { needsTelecom?: boolean })?.needsTelecom === true;
    const isNhis = false; // NHIS는 medical에 통합됨

    // API 요청 body 생성
    const isSmsAuth = authMethod === 'sms';
    // SMS 인증과 PASS 인증 모두 telecom(통신사) 파라미터 필수 (CF-12401 방지)
    const needsTelecomParam = isSmsAuth || needsTelecom;
    const buildRequestBody = (extraFields?: Record<string, unknown>) => ({
        userName: userName.trim(),
        identity: identity.replace(/\D/g, ''),
        phoneNo: phoneNo.replace(/-/g, ''),
        loginType: isSmsAuth ? '2' : '5',
        loginTypeLevel: isSmsAuth ? '1' : authProvider,
        ...(isSmsAuth ? { authMethod: '0' } : {}),
        telecom: needsTelecomParam ? telecom : '',
        queryType,
        // 누적 조회: 비어있는 1년 윈도우만 추가 인증. nextChunk이 명시한 startDate/endDate를 서버에 전달.
        ...(nextChunk?.startDate ? { startDate: nextChunk.startDate, endDate: nextChunk.endDate } : {}),
        ...extraFields,
    });

    // 누적 진료기록 로드 — 페이지 진입 또는 새 인증 후 호출
    const fetchAccumulated = async () => {
        try {
            const data = await apiFetch<{
                windows: AccumulatedWindow[];
                merged: { medical: HiraMedicalRecord[]; car_insurance: HiraCarInsuranceRecord[]; medicine: MyMedicineRecord[] };
                tableMissing?: boolean;
            }>('/api/codef/medical-info/accumulated');

            setAccumulatedWindows(data.windows || []);
            setAccumulatedLoaded(true);

            // 누적된 데이터가 있으면 즉시 결과 화면에 반영
            if (data.merged && (data.merged.medical.length > 0 || data.merged.car_insurance.length > 0 || data.merged.medicine.length > 0)) {
                applyResults({
                    medical: { records: data.merged.medical },
                    carInsurance: { records: data.merged.car_insurance },
                    myMedicine: { records: data.merged.medicine },
                });
                setStep('results');
            }
        } catch {
            // 로그인 직후·테이블 미마이그레이션 환경에서는 조용히 빈 상태로 시작
            setAccumulatedLoaded(true);
        }
    };

    // 페이지 진입 시 누적 데이터 자동 로드
    useEffect(() => {
        if (planLoading || plan.slug === 'free') return;
        fetchAccumulated();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planLoading, plan.slug]);

    // 로딩 단계 자동 업데이트
    const startLoadingPhases = () => {
        setLoadingPhase('인증 요청 중...');
        const timer = setInterval(() => {
            setLoadingPhase(prev => {
                if (prev === '인증 요청 중...') return '본인 인증 확인 중...';
                if (prev === '본인 인증 확인 중...') return '심평원 데이터 수집 중...';
                if (prev === '심평원 데이터 수집 중...') return '진료 기록 분석 중...';
                return prev;
            });
        }, 5000);
        return timer;
    };

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
        const phaseTimer = startLoadingPhases();

        try {
            const apiUrl = '/api/codef/medical-info';
            const extraParams = twoWayData
                ? { is2Way: true, twoWayInfo: twoWayData, simpleAuth: '1', ...(isSmsAuth && smsCode ? { smsAuthNo: smsCode } : {}), sessionId, bothStep }
                : {};

            const data = await apiFetch<Record<string, any>>(apiUrl, {
                method: 'POST',
                body: buildRequestBody(extraParams),
            });

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

            applyResults(data);
            // 누적 저장 상태를 화면에서 확인 가능하게 — "조회 안 됨" 진단의 첫 단서
            if (data.saveStatus) setLastSaveStatus(data.saveStatus as SaveStatusItem[]);
            if (data.savedPeriod) setLastSavedPeriod(data.savedPeriod as { start: string; end: string });
            setStep('results');
            // 새 1년 윈도우가 DB에 저장됐으니 누적 상태 갱신 → "이전 1년 더 보기" 버튼이 다음 윈도우로 갱신됨
            void fetchAccumulated();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            clearInterval(phaseTimer);
            setLoading(false);
            setLoadingPhase('');
        }
    };

    // 결과 데이터 적용 헬퍼 — 내가먹는약을 심평원 데이터에 통합
    const applyResults = (data: Record<string, unknown>) => {
        const med = data.medical as { records: HiraMedicalRecord[] } | undefined;
        const car = data.carInsurance as { records: HiraCarInsuranceRecord[] } | undefined;
        const medicine = data.myMedicine as { records: MyMedicineRecord[] } | undefined;

        // 심평원 기본진료내역
        const treatRecords: HiraBasicTreatRecord[] = med
            ? (med.records || []).flatMap(r => r.resBasicTreatList || [])
            : [];

        // 심평원 처방조제내역
        const drugRecords: HiraPrescribeDrugRecord[] = med
            ? (med.records || []).flatMap(r => r.resPrescribeDrugList || [])
            : [];

        // 내가먹는약 → 심평원 형태로 변환 후 합침
        if (medicine) {
            for (const rec of (medicine.records || [])) {
                // 진료내역에 추가 (처방기관 기준)
                if (rec.resPrescribeOrg) {
                    treatRecords.push({
                        resTreatStartDate: rec.resManufactureDate,
                        resHospitalName: rec.resPrescribeOrg,
                        resTreatType: '처방조제',
                        resVisitDays: '1',
                    });
                }
                // 약품 목록을 처방조제내역에 추가
                for (const drug of (rec.resDrugList || [])) {
                    drugRecords.push({
                        resTreatStartDate: rec.resManufactureDate,
                        resHospitalName: rec.resPrescribeOrg || rec.commBrandName || '',
                        resDrugName: drug.resDrugName,
                        resIngredients: drug.resIngredients,
                        resOneDose: drug.resOneDose,
                        resDailyDosesNumber: drug.resDailyDosesNumber,
                        resTotalDosingdays: drug.resTotalDosingdays,
                    });
                }
            }
            setMyMedicineRecords(medicine.records || []);
        }

        // 날짜순 정렬 (최신 먼저)
        treatRecords.sort((a, b) => (b.resTreatStartDate || '').localeCompare(a.resTreatStartDate || ''));
        drugRecords.sort((a, b) => (b.resTreatStartDate || '').localeCompare(a.resTreatStartDate || ''));

        setMedicalTreatRecords(treatRecords);
        setMedicalDrugRecords(drugRecords);

        if (car) {
            setCarTreatRecords((car.records || []).flatMap(r => r.resBasicTreatList || []));
        }
    };

    // both: medical 완료 후 car 자동 시작
    const startCarQuery = async (baseSessionId: string, medicalData: { records: unknown[]; count: number } | null) => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<Record<string, any>>('/api/codef/medical-info', {
                method: 'POST',
                body: buildRequestBody({
                    bothStep: 'car',
                    sessionId: baseSessionId,
                    previousMedical: medicalData,
                }),
            });

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
            const data = await apiFetch<Record<string, any>>('/api/codef/medical-info', {
                method: 'POST',
                body: buildRequestBody({
                    is2Way: true,
                    twoWayInfo: twoWayData,
                    simpleAuth: '1',
                    ...(isSmsAuth && smsCode ? { smsAuthNo: smsCode } : {}),
                    sessionId,
                    bothStep,
                    previousMedical: pendingMedical,
                }),
            });

            if (data.requires2Way) {
                setTwoWayData(data.twoWayData);
                if (data.bothStep) setBothStep(data.bothStep);
                if (data.medical) setPendingMedical(data.medical);
                // 폴링 중이면 에러 안 보여줌 (자동 재시도)
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
            const msg = (err as Error).message;
            // 대기시간 초과는 무시 (폴링이 자동 재시도)
            if (!msg.includes('CF-01004') && !msg.includes('대기시간')) {
                setError(msg);
            }
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
        setMyMedicineRecords([]);
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
        if (medicalTreatRecords.length === 0 && carTreatRecords.length === 0 && myMedicineRecords.length === 0) {
            setError('분석할 진료 기록이 없습니다.');
            return;
        }
        setAnalyzing(true);
        setError(null);

        try {
            // 세션 갱신 (CODEF 조회 시간이 길어 세션 만료 가능)
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.auth.refreshSession();

            const analyzeBody: Record<string, unknown> = {};
            if (myMedicineRecords.length > 0) {
                analyzeBody.myMedicineRecords = myMedicineRecords;
            }
            if (medicalTreatRecords.length > 0 || carTreatRecords.length > 0) {
                analyzeBody.codefRecords = {
                    treats: medicalTreatRecords,
                    drugs: medicalDrugRecords,
                    cars: carTreatRecords,
                };
            }

            const data = await apiFetch<{ analysisId: string }>('/api/analyze', {
                method: 'POST',
                body: analyzeBody,
            });

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
                            건강보험심사평가원(HIRA) 진료내역 — 본인인증 1회당 1년치 누적 (최대 5년)
                        </p>
                    </div>
                </div>

                {/* 첫 진입 안내 — HIRA 정책 명시 (오해 방지) */}
                {accumulatedLoaded && collectedYears === 0 && (
                    <Card className="border border-blue-200 bg-blue-50/40 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-start gap-2 text-xs">
                                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold mb-0.5">심평원 정책 안내</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        심평원 API는 본인인증 1회당 <span className="font-semibold text-foreground">최근 1년치</span>만 응답합니다.
                                        더 옛날 데이터(최대 5년)는 결과 화면의 <span className="font-semibold text-foreground">"이전 1년 더 받기"</span> 버튼으로 누적해 받아주세요.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 누적 상태 안내 — 이미 받은 데이터가 있으면 진행률 표시 */}
                {accumulatedLoaded && collectedYears > 0 && (
                    <Card className="border-2 border-amber-200 bg-amber-50/60 shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                                이미 수집된 진료기록: {collectedYears} / {MAX_ACCUMULATION_YEARS}년
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                                {nextChunk
                                    ? `이번 인증으로 추가될 기간: ${nextChunk.label}`
                                    : '최대 누적 기간(5년) 도달 — 추가 인증 불필요'}
                            </p>
                            <div className="h-2 bg-white/70 border border-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all"
                                    style={{ width: `${(collectedYears / MAX_ACCUMULATION_YEARS) * 100}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                            인증 방식 선택
                        </CardTitle>
                        <CardDescription>인증 요청이 선택한 방식으로 전송됩니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 간편인증 / SMS 선택 */}
                        <div className="grid grid-cols-2 gap-2">
                            {AUTH_METHODS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setAuthMethod(m.id as 'simple' | 'sms')}
                                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                        authMethod === m.id
                                            ? 'bg-primary/5 border-primary'
                                            : 'border-muted hover:border-muted-foreground/30'
                                    }`}
                                >
                                    <span>{m.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{m.description}</span>
                                </button>
                            ))}
                        </div>

                        {/* 간편인증 앱 선택 (간편인증일 때만) */}
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

                        {/* PASS 또는 SMS 인증 시 통신사 선택 */}
                        {needsTelecomParam && (
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

                {/* 개인정보 동의 */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Shield className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        <div className="space-y-1">
                            <p>입력하신 개인정보(이름, 주민등록번호, 전화번호)는 심평원 본인인증에만 사용되며 서버에 저장되지 않습니다.</p>
                            <p>단, 분석 결과(진단명, 진료내역 등)는 서비스 제공을 위해 암호화하여 저장되며, AI 분석을 위해 제3자(OpenRouter/Claude)에 전송됩니다.</p>
                            <p>조회된 진료정보를 바탕으로 생성된 분석 결과는 담당 보험설계사와 공유되며 보험 상담 목적으로만 활용됩니다.</p>
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

                {/* 조회 버튼 */}
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !userName || !identity || !phoneNo || !privacyConsent}
                    className="w-full h-12 text-base"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {loadingPhase || '조회 요청 중...'}
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
                                className="w-full h-11"
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

    // 플랜 조회 중이거나 무료 플랜(리다이렉트 대기 중)은 빈 로더 표시
    if (planLoading || plan.slug === 'free') {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <TrackFeatureUse feature="medical" />
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={reset} className="h-9 w-9">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">조회 결과</h1>
                        <p className="text-sm text-muted-foreground">{userName ? `${userName}님의 진료정보` : '진료정보 누적 결과'}</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>
                    새로 조회
                </Button>
            </div>

            {/* 누적 진행률 + 이전 1년 더 보기 버튼
                HIRA(심평원) 정책: 1회 본인인증 = 1년치 응답. 5년치는 인증 5번 누적. */}
            {accumulatedLoaded && (
                <Card className={`border-2 shadow-sm ${nextChunk ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${nextChunk ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {nextChunk ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold mb-0.5">
                                    {collectedYears === 0
                                        ? '이번 1년치 진료기록을 받았어요'
                                        : nextChunk
                                            ? `현재까지 ${collectedYears}년치 누적 — 5년치까지 인증 ${MAX_ACCUMULATION_YEARS - collectedYears}번 더 필요`
                                            : `5년치 진료기록 모두 누적 완료 ✓`}
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    심평원(HIRA) 정책상 본인인증 1회당 1년치만 응답합니다. 더 옛날 데이터는 인증을 반복해 누적해야 5년치를 모을 수 있어요.
                                </p>
                            </div>
                        </div>
                        {/* 진행률 바 */}
                        <div className="mb-3">
                            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                                <span>{collectedYears}년 / {MAX_ACCUMULATION_YEARS}년</span>
                                <span>{Math.round((collectedYears / MAX_ACCUMULATION_YEARS) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-white/70 border border-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${nextChunk ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${(collectedYears / MAX_ACCUMULATION_YEARS) * 100}%` }}
                                />
                            </div>
                        </div>
                        {/* 다음 단계 액션 */}
                        {nextChunk ? (
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-xs">
                                    <span className="text-muted-foreground">다음 인증으로 추가될 기간: </span>
                                    <span className="font-semibold">{nextChunk.label}</span>
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setStep('form');
                                        setTwoWayData(null);
                                        setSessionId(null);
                                        setBothStep(null);
                                        setError(null);
                                    }}
                                    disabled={loading}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    이전 1년 더 받기 →
                                </Button>
                            </div>
                        ) : (
                            <p className="text-xs text-emerald-700 font-medium">
                                ✓ 누적 가능한 최대 기간(5년)에 도달했습니다.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 누적 저장 진단 — 마지막 인증의 저장 결과를 명시 (이종인 5/10 "조회안됨" 진단 대응) */}
            {lastSaveStatus && lastSaveStatus.length > 0 && (
                <Card className={`border shadow-sm ${lastSaveStatus.some(s => !s.saved) ? 'border-red-200 bg-red-50/60' : 'border-blue-200 bg-blue-50/40'}`}>
                    <CardContent className="p-3">
                        <div className="flex items-start gap-2 text-xs">
                            {lastSaveStatus.some(s => !s.saved) ? (
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className="font-semibold mb-0.5">
                                    {lastSaveStatus.some(s => !s.saved) ? '⚠️ 누적 저장 일부 실패' : '이번 인증 저장 완료'}
                                    {lastSavedPeriod && (
                                        <span className="font-normal text-muted-foreground ml-1">
                                            ({lastSavedPeriod.start} ~ {lastSavedPeriod.end})
                                        </span>
                                    )}
                                </p>
                                <ul className="space-y-0.5">
                                    {lastSaveStatus.map((s, i) => (
                                        <li key={i} className={s.saved ? 'text-foreground' : 'text-red-700'}>
                                            {s.saved ? '✓' : '✗'} {s.record_type} — {s.count}건
                                            {s.error && <span className="ml-1 text-red-700">({s.error})</span>}
                                        </li>
                                    ))}
                                </ul>
                                {lastSaveStatus.some(s => !s.saved) && (
                                    <p className="mt-1 text-red-700">
                                        저장 실패가 반복되면 dev@bottlecorp.kr으로 문의해주세요.
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
            {(totalMedical > 0 || totalCar > 0 || myMedicineRecords.length > 0) && (
                <Card className="border border-gray-200 shadow-md bg-gray-50">
                    <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-sm">조회된 진료정보로 고지분석을 진행할 수 있습니다</p>
                                <p className="text-xs text-muted-foreground mt-0.5">AI가 고지사항 해당 여부를 자동 분석합니다</p>
                            </div>
                            <Button
                                onClick={handleStartAnalysis}
                                disabled={analyzing}
                                className="h-10 px-6 shrink-0"
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
                        진료 · 처방 기록
                        <Badge variant="secondary" className="text-xs">{medicalTreatRecords.length}건</Badge>
                    </h2>
                    {/* 약국 데이터 출처 안내 — 4/28 이종인 이사 컴플레인("안 다녀온 약국이 떠서 의아")
                        대응. 카드 inline 안내(아래)와 짝을 이뤄 가시성 강화. */}
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-3">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                            <p className="font-medium mb-0.5">병원과 약국이 함께 표시됩니다</p>
                            <p>
                                <span className="font-medium">병원</span>은 심평원, <span className="font-medium">약국</span>은 건강보험공단의 처방조제 데이터입니다.
                                <strong className="ml-1">실제로 약국에 방문하지 않으셨더라도 처방받은 약을 조제한 약국이 표시될 수 있습니다.</strong>
                            </p>
                        </div>
                    </div>
                    {medicalTreatRecords.map((record, idx) => {
                        const isPharmacy = record.resTreatType === '처방조제';
                        return (
                        <Card key={idx} className="border-0 shadow-sm overflow-hidden">
                            <button
                                onClick={() => toggleRecord(idx)}
                                className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                            isPharmacy
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                : 'bg-blue-100 dark:bg-blue-900/30'
                                        }`}>
                                            {isPharmacy
                                                ? <Pill className="w-4 h-4 text-emerald-600" />
                                                : <Building2 className="w-4 h-4 text-blue-600" />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-semibold text-sm truncate">{record.resHospitalName || (isPharmacy ? '약국' : '의료기관')}</p>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0 ${
                                                        isPharmacy
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                                    }`}
                                                >
                                                    {isPharmacy ? '약국' : '병원'}
                                                </Badge>
                                            </div>
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
                                {/* 약국 카드는 펼치지 않아도 항상 안내 노출 — 4/28 컴플레인 대응 */}
                                {isPharmacy && (
                                    <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed flex items-start gap-1">
                                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                        <span>처방전을 약을 조제한 약국이며, <strong>직접 방문하지 않으셨을 수 있습니다.</strong></span>
                                    </p>
                                )}
                            </button>

                            {expandedRecords.has(idx) && (
                                <div className="px-4 pb-4 pt-0 border-t">
                                    {isPharmacy && (
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-md px-2 py-1.5 mt-3">
                                            ℹ️ 처방전을 받아 약을 조제한 약국입니다. 직접 방문하지 않으셨더라도 처방 데이터가 건강보험공단에 기록됩니다.
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">{isPharmacy ? '조제일수' : '내원일수'}</span>
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
                        );
                    })}
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
