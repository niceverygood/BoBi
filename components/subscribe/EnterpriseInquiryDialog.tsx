'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, Phone, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 사용자 정보 사전 채우기 */
    defaultName?: string;
    defaultEmail?: string;
    defaultPhone?: string;
}

const PHONE_RE = /^01[016789]\d{7,8}$/;

const TEAM_SIZE_OPTIONS = [
    '5~10명',
    '11~30명',
    '31~50명',
    '51~100명',
    '100명 이상',
];

export default function EnterpriseInquiryDialog({
    open,
    onOpenChange,
    defaultName = '',
    defaultEmail = '',
    defaultPhone = '',
}: Props) {
    const [contactName, setContactName] = useState(defaultName);
    const [contactPhone, setContactPhone] = useState(defaultPhone);
    const [contactEmail, setContactEmail] = useState(defaultEmail);
    const [companyName, setCompanyName] = useState('');
    const [teamSize, setTeamSize] = useState('');
    const [inquiryMessage, setInquiryMessage] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const phoneDigits = contactPhone.replace(/\D/g, '');
    const phoneValid = PHONE_RE.test(phoneDigits);
    const messageValid = inquiryMessage.trim().length >= 10;
    const canSubmit = contactName.trim() && phoneValid && messageValid;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setError(null);
        setLoading(true);
        try {
            await apiFetch('/api/enterprise-inquiries', {
                method: 'POST',
                body: {
                    contactName: contactName.trim(),
                    contactPhone: phoneDigits,
                    contactEmail: contactEmail.trim() || undefined,
                    companyName: companyName.trim() || undefined,
                    teamSize: teamSize || undefined,
                    inquiryMessage: inquiryMessage.trim(),
                },
                timeout: 30000,
            });
            setSuccess(true);
        } catch (err) {
            setError((err as Error).message || '문의 등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (next: boolean) => {
        if (!next) {
            // 닫을 때 success/error만 리셋, 입력값은 유지 (재오픈 시 편함)
            setSuccess(false);
            setError(null);
        }
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-600" />
                        엔터프라이즈 / 팀 플랜 문의
                    </DialogTitle>
                    <DialogDescription>
                        담당자가 영업일 기준 1~2일 내에 연락드립니다.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="space-y-3 py-4">
                        <div className="flex items-start gap-3 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <Check className="w-5 h-5 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">문의가 접수되었습니다.</p>
                                <p className="text-xs mt-1">
                                    영업일 기준 <strong>1~2일 내</strong>에 입력하신 연락처로 담당자가 연락드립니다.
                                </p>
                            </div>
                        </div>
                        <Button onClick={() => handleClose(false)} className="w-full">
                            닫기
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3 py-2">
                        {/* 담당자명 */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                담당자 이름 <span className="text-rose-500">*</span>
                            </label>
                            <input
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="홍길동"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 연락처 (필수) */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-rose-500" />
                                연락받을 휴대폰 번호 <span className="text-rose-500">*</span>
                            </label>
                            <input
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="010-1234-5678"
                                inputMode="tel"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            {contactPhone && !phoneValid && (
                                <p className="text-[10px] text-rose-600 mt-1">
                                    올바른 휴대폰 번호 형식이 아닙니다
                                </p>
                            )}
                            {!contactPhone && (
                                <p className="text-[10px] text-slate-500 mt-1">
                                    문의 처리를 위해 반드시 입력해주세요
                                </p>
                            )}
                        </div>

                        {/* 이메일 (옵션) */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                이메일 <span className="text-slate-400 font-normal">(선택)</span>
                            </label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="contact@company.com"
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* 회사명 + 인원 */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    회사 / 조직 <span className="text-slate-400 font-normal">(선택)</span>
                                </label>
                                <input
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="(주)회사명"
                                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    예상 인원 <span className="text-slate-400 font-normal">(선택)</span>
                                </label>
                                <select
                                    value={teamSize}
                                    onChange={(e) => setTeamSize(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">선택</option>
                                    {TEAM_SIZE_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 문의 내용 */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                문의 내용 <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={inquiryMessage}
                                onChange={(e) => setInquiryMessage(e.target.value)}
                                placeholder="필요한 기능, 도입 시기, 예산 등 자유롭게 작성해주세요. (10자 이상)"
                                rows={4}
                                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-1 text-right">
                                {inquiryMessage.length}자 (최소 10자)
                            </p>
                        </div>

                        {error && (
                            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                                {error}
                            </p>
                        )}

                        <DialogFooter className="gap-2 pt-2">
                            <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !canSubmit}
                                className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Building2 className="w-4 h-4 mr-2" />
                                )}
                                문의 접수
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
