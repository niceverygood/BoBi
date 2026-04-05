'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    FileSearch, HeartPulse, Receipt, TrendingUp,
    CheckCircle2, ArrowRight, Download, Loader2, Zap,
    Brain, BarChart3, Lock, Users, Building, Sparkles,
} from 'lucide-react';
import BobiLogo from '@/components/common/BobiLogo';
import Link from 'next/link';

const FEATURES = [
    {
        icon: FileSearch,
        title: 'AI 고지사항 분석',
        desc: '심평원 PDF를 업로드하면 19개 고지사항 항목을 자동 분석합니다.',
        detail: '진단코드, 입원/수술/통원 내역을 정확히 분류하여 설계사가 즉시 활용할 수 있는 형태로 정리합니다.',
        color: 'text-blue-600 bg-blue-100',
    },
    {
        icon: TrendingUp,
        title: '가입가능 상품 자동 판단',
        desc: '병력 기반으로 간편심사/유병자/표준체 상품 가입 가능 여부를 즉시 판단합니다.',
        detail: '흥국, KB, 롯데, 한화 등 주요 보험사 상품별 O/X/△ 판정과 근거를 제공합니다.',
        color: 'text-green-600 bg-green-100',
    },
    {
        icon: HeartPulse,
        title: '질병 위험도 리포트',
        desc: '고객 병력을 기반으로 향후 발생 가능성이 높은 질환을 의학 통계로 분석합니다.',
        detail: '"왜 이 보험이 필요한가"를 데이터로 설명할 수 있어, 상담 설득력이 크게 향상됩니다.',
        color: 'text-red-600 bg-red-100',
    },
    {
        icon: Receipt,
        title: '가상 사고 영수증',
        desc: '질병 발생 시 예상 비용 vs 현재 보험 보장을 한눈에 비교합니다.',
        detail: '진료비, 건보 적용, 생활비까지 반영한 시뮬레이션으로 보장 갭을 시각적으로 보여줍니다.',
        color: 'text-slate-600 bg-slate-100',
    },
];

const PAIN_POINTS = [
    { before: '"이 보험 드세요"만 반복', after: '데이터 기반 근거 제시로 신뢰 확보' },
    { before: '고지사항 정리에 30분 이상', after: 'AI가 30초 만에 자동 분석' },
    { before: '보장분석표 수작업 작성', after: 'PDF 업로드만으로 리포트 완성' },
    { before: '상품 가입 가능 여부 일일이 확인', after: '병력 기반 자동 판정 (O/X/△)' },
];

const PLANS = [
    { name: '무료', price: '0원', analyses: '5건/월', features: ['고지사항 분석', '상품 판단', '질병 위험도 리포트'] },
    { name: '베이직', price: '19,900원', analyses: '30건/월', features: ['무료 기능 전체', '보장 분석 리포트', '가상 사고 영수증', 'PDF 다운로드'], popular: true },
    { name: '프로', price: '39,900원', analyses: '200건/월', features: ['베이직 기능 전체', '팀 관리 기능', '우선 지원', 'API 연동'] },
];

export default function PromoPage() {
    const [pdfLoading] = useState(false);

    const handleDownloadPdf = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b" data-print-hide>
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BobiLogo size="sm" />
                        <span className="text-lg font-bold">보비 <span className="text-blue-600">BoBi</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                            {pdfLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                            PDF 다운로드
                        </Button>
                        <Link href="/auth/signup">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">무료 시작</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <div>
                {/* Hero */}
                <section className="py-16 sm:py-24 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <Badge className="bg-blue-100 text-blue-700 mb-6 text-sm px-4 py-1">
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            GA 법인 도입 문의 환영
                        </Badge>
                        <h1 className="text-3xl sm:text-5xl font-black leading-tight">
                            보험설계사를 위한<br />
                            <span className="text-blue-600">AI 보험비서</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
                            고객의 심평원 진료이력을 AI가 분석하여<br className="hidden sm:inline" />
                            고지사항, 가입가능 상품, 질병 위험도, 보장 시뮬레이션까지<br className="hidden sm:inline" />
                            <strong>상담에 필요한 모든 데이터</strong>를 30초 만에 제공합니다.
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <Badge variant="outline" className="text-xs gap-1 border-violet-300 text-violet-600">
                                <Brain className="w-3 h-3" /> Claude Sonnet 4.5 기반
                            </Badge>
                            <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-600">
                                <Lock className="w-3 h-3" /> 개인정보 서버 미저장
                            </Badge>
                        </div>
                    </div>
                </section>

                {/* Pain Point → Solution */}
                <section className="py-16 px-4 bg-slate-50">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                            설계사 상담, 이렇게 바뀝니다
                        </h2>
                        <div className="grid gap-4">
                            {PAIN_POINTS.map((p, i) => (
                                <div key={i} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
                                    <div className="flex-1 text-right">
                                        <p className="text-sm text-red-500 line-through">{p.before}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-blue-700">{p.after}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-16 px-4">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">핵심 기능</h2>
                        <p className="text-center text-muted-foreground mb-12">원수사에도 없는 기능, 보비에만 있습니다</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {FEATURES.map((f, i) => (
                                <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                                    <CardContent className="p-6">
                                        <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                                            <f.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                                        <p className="text-sm font-medium text-foreground mb-2">{f.desc}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{f.detail}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 상담 플로우 */}
                <section className="py-16 px-4 bg-blue-50">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">하나의 상담 플로우</h2>
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                            {[
                                { step: '1', title: '병력 분석', desc: 'PDF 업로드 → AI 고지사항 분석', color: 'bg-blue-600' },
                                { step: '2', title: '위험도 리포트', desc: '질병 위험 예측 + 의학 근거', color: 'bg-red-600' },
                                { step: '3', title: '가상 영수증', desc: '예상 비용 vs 보험 보장 비교', color: 'bg-slate-700' },
                                { step: '4', title: '상품 판단', desc: '가입 가능 상품 O/X/△', color: 'bg-green-600' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="flex flex-col items-center text-center w-36">
                                        <div className={`w-10 h-10 rounded-full ${s.color} text-white flex items-center justify-center font-bold text-sm`}>
                                            {s.step}
                                        </div>
                                        <p className="text-sm font-bold mt-2">{s.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                                    </div>
                                    {i < 3 && <ArrowRight className="w-4 h-4 text-blue-400 hidden sm:block shrink-0" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 왜 GA에 도입해야 하는가 */}
                <section className="py-16 px-4">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                            GA 법인에 왜 필요한가
                        </h2>
                        <div className="grid sm:grid-cols-3 gap-6">
                            <Card className="border-0 shadow-md text-center">
                                <CardContent className="p-6">
                                    <TrendingUp className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                                    <h3 className="font-bold mb-2">성약률 향상</h3>
                                    <p className="text-sm text-muted-foreground">
                                        데이터 기반 상담으로<br />고객 신뢰도 상승
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-md text-center">
                                <CardContent className="p-6">
                                    <Zap className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                                    <h3 className="font-bold mb-2">업무 효율화</h3>
                                    <p className="text-sm text-muted-foreground">
                                        고지사항 분석 시간<br />30분 → 30초
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-md text-center">
                                <CardContent className="p-6">
                                    <BarChart3 className="w-10 h-10 text-green-600 mx-auto mb-3" />
                                    <h3 className="font-bold mb-2">차별화 무기</h3>
                                    <p className="text-sm text-muted-foreground">
                                        원수사에도 없는 기능으로<br />경쟁 GA 대비 우위
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 요금제 */}
                <section className="py-16 px-4 bg-slate-50">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">요금제</h2>
                        <p className="text-center text-muted-foreground mb-12">법인 단위 도입 시 별도 협의 가능</p>
                        <div className="grid sm:grid-cols-3 gap-6">
                            {PLANS.map((p, i) => (
                                <Card key={i} className={`border-0 shadow-md ${p.popular ? 'ring-2 ring-blue-600 relative' : ''}`}>
                                    {p.popular && (
                                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs">
                                            인기
                                        </Badge>
                                    )}
                                    <CardContent className="p-6 text-center">
                                        <h3 className="font-bold text-lg">{p.name}</h3>
                                        <p className="text-2xl font-black mt-2">월 {p.price}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{p.analyses}</p>
                                        <ul className="mt-4 space-y-2 text-left">
                                            {p.features.map((f, j) => (
                                                <li key={j} className="flex items-center gap-2 text-sm">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <div className="inline-flex items-center gap-2 bg-white rounded-xl px-6 py-3 shadow-sm border">
                                <Building className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium">법인 단위 도입 문의</span>
                                <span className="text-sm text-muted-foreground">dev@bottlecorp.kr</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 보안 */}
                <section className="py-16 px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-3">개인정보 보호</h2>
                        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> 고객 정보 서버 미저장</span>
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> 분석 후 즉시 파기</span>
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> SSL 암호화 통신</span>
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> 개인정보처리방침 준수</span>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                            지금 바로 시작하세요
                        </h2>
                        <p className="text-blue-100 mb-8">
                            무료 플랜으로 5건까지 체험 가능합니다.<br />
                            법인 단위 도입은 별도 협의해 드립니다.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/auth/signup">
                                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8">
                                    무료로 시작하기
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                        <p className="text-xs text-blue-200 mt-6">
                            주식회사 바틀 | dev@bottlecorp.kr | bobi.co.kr
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
