// components/coverage/PolicyInputForm.tsx
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Trash2, Upload, User, Shield, ChevronDown, ChevronUp,
    FileSpreadsheet, Loader2, AlertCircle, Camera, Search, X, CheckCircle2
} from 'lucide-react';
import type { CoverageInput, Policy, Coverage, CustomerInfo } from '@/types/coverage';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';

interface PolicyInputFormProps {
    onSubmit: (data: CoverageInput) => void;
    loading?: boolean;
}

const COVERAGE_TYPES = ['진단', '일당', '수술', '사망', '실손', '배상', '후유장해', '기타'] as const;

const SAMPLE_DATA: CoverageInput = {
    customer: { name: '홍길동', birth: '1985-03-15', gender: 'M' },
    policies: [
        {
            insurer: '삼성생명', product_name: '(무)뉴건강보험2401',
            contract_date: '2020-01-15', expiry_date: '2050-01-15',
            monthly_premium: 85000, status: '유지', renewal_type: '비갱신',
            coverages: [
                { coverage_name: '일반암 진단비', coverage_amount: 30000000, coverage_type: '진단', category: '암' },
                { coverage_name: '뇌혈관질환 진단비', coverage_amount: 20000000, coverage_type: '진단', category: '뇌혈관' },
                { coverage_name: '급성심근경색 진단비', coverage_amount: 20000000, coverage_type: '진단', category: '심장' },
                { coverage_name: '입원일당', coverage_amount: 50000, coverage_type: '일당', category: '입원' },
                { coverage_name: '질병수술비', coverage_amount: 1000000, coverage_type: '수술', category: '수술' },
            ],
        },
        {
            insurer: '한화생명', product_name: '(무)시그니처암보험2301',
            contract_date: '2023-06-01', expiry_date: '2053-06-01',
            monthly_premium: 45000, status: '유지', renewal_type: '비갱신',
            coverages: [
                { coverage_name: '일반암 진단비', coverage_amount: 50000000, coverage_type: '진단', category: '암' },
                { coverage_name: '유사암 진단비', coverage_amount: 10000000, coverage_type: '진단', category: '암' },
            ],
        },
    ],
};

function emptyPolicy(): Policy {
    return {
        insurer: '', product_name: '', contract_date: '', expiry_date: '',
        monthly_premium: 0, status: '유지', renewal_type: '비갱신', coverages: [],
    };
}

function emptyCoverage(): Coverage {
    return { coverage_name: '', coverage_amount: 0, coverage_type: '진단', category: '' };
}

export default function PolicyInputForm({ onSubmit, loading }: PolicyInputFormProps) {
    const [customer, setCustomer] = useState<CustomerInfo>({ name: '', birth: '', gender: 'M' });
    const [policies, setPolicies] = useState<Policy[]>([emptyPolicy()]);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<number>>(new Set([0]));
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState<'excel' | 'ocr' | null>(null);

    // 코드에프 자동조회
    const [showCodefModal, setShowCodefModal] = useState(false);
    const [codefLoading, setCodefLoading] = useState(false);
    const [codefLoginId, setCodefLoginId] = useState('');
    const [codefLoginPw, setCodefLoginPw] = useState('');
    const [codefFetched, setCodefFetched] = useState(false);

    const handleCodefFetch = useCallback(async () => {
        if (!customer.name || !customer.birth) {
            setError('고객 이름과 생년월일을 먼저 입력해주세요.');
            setShowCodefModal(false);
            return;
        }
        if (!codefLoginId || !codefLoginPw) {
            toast.error('내보험다보여 아이디와 비밀번호를 입력해주세요.');
            return;
        }

        setCodefLoading(true);
        toast.info('보험 정보 조회 중... (약 15~30초 소요)');

        try {
            const data = await apiFetch<{ requires2Way?: boolean; coverageInput?: { policies: unknown[] }; summary?: { insurers: { length: number }; totalPolicies: number; totalCoverages: number } }>('/api/codef/fetch-insurance', {
                method: 'POST',
                body: {
                    loginId: codefLoginId,
                    loginPassword: codefLoginPw,
                    customerName: customer.name,
                    customerBirth: customer.birth,
                    customerGender: customer.gender,
                },
            });

            if (data.requires2Way) {
                toast.error('추가 인증이 필요합니다. 내보험다보여 앱에서 인증을 완료해주세요.');
                return;
            }

            if (data.coverageInput?.policies?.length > 0) {
                setPolicies(data.coverageInput.policies);
                setExpandedPolicies(new Set(data.coverageInput.policies.map((_: unknown, i: number) => i)));
                setCodefFetched(true);
                setShowCodefModal(false);
                setCodefLoginId('');
                setCodefLoginPw('');
                toast.success(
                    `${data.summary.insurers.length}개 보험사, ${data.summary.totalPolicies}건 보험, ${data.summary.totalCoverages}건 특약 조회 완료!`
                );
            } else {
                toast.error('조회된 보험 내역이 없습니다.');
            }
        } catch (err) {
            toast.error((err as Error).message || '보험 정보 조회 중 오류가 발생했습니다.');
        } finally {
            setCodefLoading(false);
        }
    }, [customer, codefLoginId, codefLoginPw]);

    const toggleExpand = (index: number) => {
        setExpandedPolicies(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    const addPolicy = () => {
        const newIndex = policies.length;
        setPolicies(prev => [...prev, emptyPolicy()]);
        setExpandedPolicies(prev => new Set(prev).add(newIndex));
    };

    const removePolicy = (index: number) => {
        setPolicies(prev => prev.filter((_, i) => i !== index));
        setExpandedPolicies(prev => {
            const next = new Set<number>();
            prev.forEach(i => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
            return next;
        });
    };

    const updatePolicy = (index: number, field: keyof Policy, value: unknown) => {
        setPolicies(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const addCoverage = (policyIndex: number) => {
        setPolicies(prev => prev.map((p, i) =>
            i === policyIndex ? { ...p, coverages: [...p.coverages, emptyCoverage()] } : p
        ));
    };

    const removeCoverage = (policyIndex: number, covIndex: number) => {
        setPolicies(prev => prev.map((p, i) =>
            i === policyIndex ? { ...p, coverages: p.coverages.filter((_, ci) => ci !== covIndex) } : p
        ));
    };

    const updateCoverage = (policyIndex: number, covIndex: number, field: keyof Coverage, value: unknown) => {
        setPolicies(prev => prev.map((p, i) =>
            i === policyIndex ? {
                ...p, coverages: p.coverages.map((c, ci) =>
                    ci === covIndex ? { ...c, [field]: value } : c
                ),
            } : p
        ));
    };

    const loadSample = () => {
        setCustomer(SAMPLE_DATA.customer);
        setPolicies(SAMPLE_DATA.policies);
        setExpandedPolicies(new Set([0, 1]));
    };

    const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setUploading('excel');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/coverage/parse-excel', {
                method: 'POST',
                body: formData,
            });

            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error('서버 응답을 처리할 수 없습니다.');
            }
            if (!response.ok) throw new Error(result.error || '엑셀 파싱 실패');

            const { policies: parsed } = result;
            if (parsed && parsed.length > 0) {
                setPolicies(parsed);
                setExpandedPolicies(new Set(parsed.map((_: unknown, i: number) => i)));
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    }, []);

    const handleOcrUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setError('');
        setUploading('ocr');

        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('images', files[i]);
            }

            const ocrResponse = await fetch('/api/coverage/ocr', {
                method: 'POST',
                body: formData,
            });

            let ocrResult;
            try {
                ocrResult = await ocrResponse.json();
            } catch {
                throw new Error('서버 응답을 처리할 수 없습니다.');
            }
            if (!ocrResponse.ok) throw new Error(ocrResult.error || 'OCR 처리 실패');

            const { policies: parsed } = ocrResult;
            if (parsed && parsed.length > 0) {
                setPolicies(prev => {
                    const existing = prev.filter(p => p.insurer || p.product_name);
                    const combined = [...existing, ...parsed];
                    return combined.length > 0 ? combined : [emptyPolicy()];
                });
                setExpandedPolicies(prev => {
                    const next = new Set(prev);
                    const startIdx = policies.filter(p => p.insurer || p.product_name).length;
                    parsed.forEach((_: unknown, i: number) => next.add(startIdx + i));
                    return next;
                });
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setUploading(null);
            e.target.value = '';
        }
    }, [policies]);

    const handleSubmit = () => {
        setError('');
        if (!customer.name || !customer.birth) {
            setError('고객 이름과 생년월일을 입력해주세요.');
            return;
        }
        const activePolicies = policies.filter(p => p.insurer && p.product_name);
        if (activePolicies.length === 0) {
            setError('최소 1개 이상의 보험을 입력해주세요.');
            return;
        }
        for (const p of activePolicies) {
            if (p.coverages.length === 0) {
                setError(`"${p.product_name}" 보험에 보장 항목을 추가해주세요.`);
                return;
            }
        }
        onSubmit({ customer, policies: activePolicies });
    };

    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
    const selectClass = `${inputClass} appearance-none`;
    const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

    return (
        <div className="space-y-6">
            {/* Header actions */}
            <div className="flex flex-wrap gap-3">
                {/* 코드에프 자동조회 (메인 버튼) */}
                <Button
                    size="sm"
                    onClick={() => setShowCodefModal(true)}
                    disabled={loading || !!uploading || codefLoading}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                >
                    {codefFetched ? (
                        <><CheckCircle2 className="w-4 h-4" /> 조회 완료</>
                    ) : codefLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> 조회 중...</>
                    ) : (
                        <><Search className="w-4 h-4" /> 내보험다보여 자동조회</>
                    )}
                </Button>

                <div className="w-px h-8 bg-border" />

                <Button variant="outline" size="sm" onClick={loadSample} disabled={loading || !!uploading}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    샘플 데이터
                </Button>
                <label className="cursor-pointer">
                    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 px-3">
                        {uploading === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading === 'excel' ? '파싱 중...' : '엑셀 업로드'}
                    </span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={!!uploading} />
                </label>
                <label className="cursor-pointer">
                    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 px-3">
                        {uploading === 'ocr' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        {uploading === 'ocr' ? 'OCR 처리 중...' : '증권 사진 촬영'}
                    </span>
                    <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleOcrUpload} disabled={!!uploading} />
                </label>
            </div>

            {/* Customer Info */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        고객 정보
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>이름 *</label>
                            <input className={inputClass} placeholder="홍길동"
                                value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className={labelClass}>생년월일 *</label>
                            <input className={inputClass} type="date"
                                value={customer.birth} onChange={e => setCustomer(c => ({ ...c, birth: e.target.value }))} />
                        </div>
                        <div>
                            <label className={labelClass}>성별 *</label>
                            <select className={selectClass}
                                value={customer.gender} onChange={e => setCustomer(c => ({ ...c, gender: e.target.value as 'M' | 'F' }))}>
                                <option value="M">남성</option>
                                <option value="F">여성</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Policies */}
            {policies.map((policy, pi) => (
                <Card key={pi} className="border-0 shadow-sm overflow-hidden">
                    <div
                        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-accent/30 transition-colors"
                        onClick={() => toggleExpand(pi)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <span className="font-medium text-sm">
                                    {policy.insurer && policy.product_name
                                        ? `${policy.insurer} - ${policy.product_name}`
                                        : `보험 ${pi + 1}`}
                                </span>
                                {policy.coverages.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                        보장 {policy.coverages.length}건
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {policies.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                    onClick={e => { e.stopPropagation(); removePolicy(pi); }}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                            {expandedPolicies.has(pi) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </div>

                    {expandedPolicies.has(pi) && (
                        <CardContent className="pt-0 pb-6">
                            {/* Policy info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className={labelClass}>보험회사 *</label>
                                    <input className={inputClass} placeholder="삼성생명"
                                        value={policy.insurer} onChange={e => updatePolicy(pi, 'insurer', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>상품명 *</label>
                                    <input className={inputClass} placeholder="(무)뉴건강보험2401"
                                        value={policy.product_name} onChange={e => updatePolicy(pi, 'product_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>월 보험료 (원)</label>
                                    <input className={inputClass} type="number" placeholder="85000"
                                        value={policy.monthly_premium || ''} onChange={e => updatePolicy(pi, 'monthly_premium', Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>계약일</label>
                                    <input className={inputClass} type="date"
                                        value={policy.contract_date} onChange={e => updatePolicy(pi, 'contract_date', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>만기일</label>
                                    <input className={inputClass} type="date"
                                        value={policy.expiry_date} onChange={e => updatePolicy(pi, 'expiry_date', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>갱신 유형</label>
                                    <select className={selectClass}
                                        value={policy.renewal_type} onChange={e => updatePolicy(pi, 'renewal_type', e.target.value)}>
                                        <option value="비갱신">비갱신</option>
                                        <option value="갱신">갱신</option>
                                    </select>
                                </div>
                            </div>

                            {/* Coverages */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">보장 항목</span>
                                    <Button variant="outline" size="sm" onClick={() => addCoverage(pi)}>
                                        <Plus className="w-3 h-3 mr-1" /> 항목 추가
                                    </Button>
                                </div>

                                {policy.coverages.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                        보장 항목을 추가해주세요
                                    </div>
                                )}

                                {policy.coverages.map((cov, ci) => (
                                    <div key={ci} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/30">
                                        <div className="col-span-12 sm:col-span-3">
                                            <label className={labelClass}>보장명</label>
                                            <input className={inputClass} placeholder="일반암 진단비"
                                                value={cov.coverage_name} onChange={e => updateCoverage(pi, ci, 'coverage_name', e.target.value)} />
                                        </div>
                                        <div className="col-span-6 sm:col-span-3">
                                            <label className={labelClass}>보장금액 (원)</label>
                                            <input className={inputClass} type="number" placeholder="30000000"
                                                value={cov.coverage_amount || ''} onChange={e => updateCoverage(pi, ci, 'coverage_amount', Number(e.target.value))} />
                                        </div>
                                        <div className="col-span-6 sm:col-span-2">
                                            <label className={labelClass}>유형</label>
                                            <select className={selectClass}
                                                value={cov.coverage_type} onChange={e => updateCoverage(pi, ci, 'coverage_type', e.target.value)}>
                                                {COVERAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-10 sm:col-span-3">
                                            <label className={labelClass}>카테고리</label>
                                            <input className={inputClass} placeholder="암, 뇌혈관, 심장 등"
                                                value={cov.category} onChange={e => updateCoverage(pi, ci, 'category', e.target.value)} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                                                onClick={() => removeCoverage(pi, ci)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            ))}

            {/* Add policy button */}
            <Button variant="outline" className="w-full border-dashed" onClick={addPolicy}>
                <Plus className="w-4 h-4 mr-2" /> 보험 추가
            </Button>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Submit */}
            <Button size="lg" className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI 분석 중...</>
                ) : (
                    <><Shield className="w-4 h-4 mr-2" /> 보장 분석 시작</>
                )}
            </Button>

            {/* 코드에프 로그인 모달 */}
            {showCodefModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            <div>
                                <h3 className="text-lg font-bold">내보험다보여 자동조회</h3>
                                <p className="text-xs text-white/80 mt-0.5">
                                    전 보험사 가입 현황 + 특약까지 자동 조회
                                </p>
                            </div>
                            <button onClick={() => setShowCodefModal(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-5 space-y-4">
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300">
                                💡 <strong>내보험다보여</strong> (insurance.insure.or.kr) 계정이 필요합니다.
                                아직 가입하지 않았다면 먼저 회원가입을 해주세요.
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">아이디</label>
                                <input
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                    placeholder="내보험다보여 아이디"
                                    value={codefLoginId}
                                    onChange={e => setCodefLoginId(e.target.value)}
                                    disabled={codefLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">비밀번호</label>
                                <input
                                    type="password"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                                    placeholder="내보험다보여 비밀번호"
                                    value={codefLoginPw}
                                    onChange={e => setCodefLoginPw(e.target.value)}
                                    disabled={codefLoading}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCodefFetch(); }}
                                />
                            </div>

                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                                🔒 입력하신 정보는 보험 조회 목적으로만 사용되며, 서버에 저장되지 않습니다.
                            </div>

                            <Button
                                className="w-full gap-2"
                                onClick={handleCodefFetch}
                                disabled={codefLoading || !codefLoginId || !codefLoginPw}
                            >
                                {codefLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> 조회 중... (15~30초 소요)</>
                                ) : (
                                    <><Search className="w-4 h-4" /> 보험 정보 조회하기</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
