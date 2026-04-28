import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileSearch, Package, Receipt, ArrowRight, CheckCircle2, Sparkles, Zap, Lock, LayoutDashboard, Database, Stethoscope, TrendingUp, Brain, ShieldCheck, Clock, Timer, Calculator, FileText, Star } from 'lucide-react';
import BobiLogo from '@/components/common/BobiLogo';
import { createClient } from '@/lib/supabase/server';
import { SocialProofStrip, TestimonialCards } from '@/components/common/SocialProof';
import ROICalculator from '@/components/landing/ROICalculator';
import ReportPreviewGallery from '@/components/landing/ReportPreviewGallery';
import TestimonialMarquee from '@/components/landing/TestimonialMarquee';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <BobiLogo size="sm" />
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                보비 <span className="text-primary">BoBi</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link href="/pricing">
                <Button variant="ghost" className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9">요금제</Button>
              </Link>
              {user ? (
                <Link href="/dashboard">
                  <Button className="text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 bg-gradient-primary hover:opacity-90">
                    <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                    대시보드
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9">로그인</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 bg-gradient-primary hover:opacity-90">
                      <span className="hidden sm:inline">무료로 시작하기</span>
                      <span className="sm:hidden">시작하기</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-12 sm:pb-20 px-4 overflow-hidden bg-gradient-hero">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>AI가 심평원 진료이력을 자동 분석합니다</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            보험설계사를 위한
            <br />
            <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">
              AI 보험비서
            </span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s' }}>
            고객의 건강보험심평원 진료이력 PDF를 업로드하면
            <br className="hidden sm:block" />
            AI가 고지사항, 가입가능 상품, 보험금 청구까지 한번에 분석합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link href={user ? '/dashboard/analyze' : '/auth/signup'}>
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 w-full sm:w-auto bg-gradient-primary hover:opacity-90 shadow-lg animate-pulse-glow">
                {user ? '분석 시작하기' : '무료로 시작하기'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Steps Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">3단계로 완성하는 보험 분석</h2>
            <p className="text-muted-foreground text-sm sm:text-lg">PDF 업로드 한 번으로 모든 분석이 완료됩니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            {/* Step 1 */}
            <div className="group relative p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <FileSearch className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-sm font-semibold text-blue-500 mb-2">STEP 1</div>
              <h3 className="text-xl font-bold mb-3">고지사항 자동 정리</h3>
              <p className="text-muted-foreground leading-relaxed">
                심평원 진료이력 PDF를 업로드하면 AI가 보험 고지사항 항목별로 자동 분류하여 정리합니다.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  3개월/1년/5년 기간별 자동 분류
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  상시 복용약 자동 감지
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="group relative p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-sm font-semibold text-emerald-500 mb-2">STEP 2</div>
              <h3 className="text-xl font-bold mb-3">가입가능 상품 판단</h3>
              <p className="text-muted-foreground leading-relaxed">
                고지사항을 보험상품 유형별 기준과 대조하여 가입 가능 여부를 즉시 판단합니다.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  간편/초경증/표준체 상품 비교
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  고지의무 질문별 상세 근거
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="group relative p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Receipt className="w-6 h-6 text-violet-500" />
              </div>
              <div className="text-sm font-semibold text-violet-500 mb-2">STEP 3</div>
              <h3 className="text-xl font-bold mb-3">보험금 청구 안내</h3>
              <p className="text-muted-foreground leading-relaxed">
                진료이력과 약관을 대조하여 보험금 청구 가능한 항목을 찾아 안내합니다.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  특약별 청구 가능 여부 판단
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  약관 근거 및 청구 방법 안내
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 사회적 증거 — Hero 직후 */}
      <section className="py-12 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <SocialProofStrip />
        </div>
      </section>

      {/* 설계사 실제 후기 마키 — 가로 스크롤 카드뉴스 */}
      <section className="py-12 sm:py-16 bg-background border-y">
        <div className="max-w-6xl mx-auto mb-8 sm:mb-10 px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-primary" />
              <span>현장 설계사 실제 후기</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              이미 보비로 실적을 바꾸고 있습니다
            </h2>
          </div>
        </div>
        <TestimonialMarquee />
      </section>

      {/* 신뢰 가능한 숫자 — 근거 기반 분석 */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>근거 기반 분석</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">추측이 아닌 숫자로 말합니다</h2>
            <p className="text-muted-foreground text-sm sm:text-lg">
              공공 의료 데이터 · 학회 가이드라인 · AI가 만드는 신뢰 가능한 분석
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* 14,283개 KCD 질병코드 */}
            <div className="group p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                14,283<span className="text-xl sm:text-2xl text-muted-foreground font-semibold">개</span>
              </div>
              <h3 className="font-semibold mb-1">KCD 질병코드 DB</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                한국표준질병사인분류 전체 코드 기반으로 고지사항을 자동 판정합니다
              </p>
            </div>

            {/* 10년 NHIS 발병 예측 */}
            <div className="group p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                10<span className="text-xl sm:text-2xl text-muted-foreground font-semibold">년 예측</span>
              </div>
              <h3 className="font-semibold mb-1">NHIS 공단 공식 기반</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                건강보험공단 공식 수치로 뇌졸중·심근경색 10년 발병 확률을 계산합니다
              </p>
            </div>

            {/* 50+ 질환 진료비 데이터 */}
            <div className="group p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Receipt className="w-6 h-6 text-violet-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                50<span className="text-xl sm:text-2xl text-muted-foreground font-semibold">+ 질환</span>
              </div>
              <h3 className="font-semibold mb-1">공식 진료비 통계</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                국립암센터·건강보험심사평가원 통계로 미래 병원비를 만원 단위까지 정량화
              </p>
            </div>

            {/* 학회 가이드라인 */}
            <div className="group p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6 text-amber-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                학회 가이드라인
              </div>
              <h3 className="font-semibold mb-1">의학 근거로 위험도 매핑</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                대한고혈압학회·Framingham Heart Study 등 국내외 가이드라인 기반
              </p>
            </div>

            {/* 7종 AI 분석 엔진 */}
            <div className="group p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                7<span className="text-xl sm:text-2xl text-muted-foreground font-semibold">종 AI 분석</span>
              </div>
              <h3 className="font-semibold mb-1">Claude + OpenAI 듀얼 엔진</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                진료·심사·청구·리모델링 등 7가지 전문 분석을 한 화면에서 제공
              </p>
            </div>

            {/* 7일 HMAC 공유 링크 */}
            <div className="group p-6 sm:p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-teal-500" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                7<span className="text-xl sm:text-2xl text-muted-foreground font-semibold">일 공유 링크</span>
              </div>
              <h3 className="font-semibold mb-1">HMAC-SHA256 서명 보안</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                고객에게 안전하게 직송하는 서명 링크, 만료 후 자동 차단됩니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 리포트 미리보기 갤러리 — 고객이 받는 실제 아웃풋 */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>고객이 받는 실제 리포트</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 tracking-tight">
              설계사가 <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">의사처럼</span> 보이는 유일한 도구
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              고객이 받아보는 리포트의 품질이 설계사의 전문성을 증명합니다. 이런 분석을 30초 만에 만들 수 있습니다
            </p>
          </div>

          <ReportPreviewGallery />

          <div className="mt-8 sm:mt-10 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              ↑ 위 4가지 리포트를 PDF · 카카오 알림톡 · 공유 링크로 고객에게 즉시 전달합니다
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">왜 보비인가요?</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-6 rounded-xl bg-card border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">30초 만에 분석 완료</h3>
                <p className="text-sm text-muted-foreground">수작업으로 30분 걸리던 고지사항 정리를 AI가 30초 만에</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 rounded-xl bg-card border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">안전한 데이터 관리</h3>
                <p className="text-sm text-muted-foreground">고객 데이터는 암호화되어 설계사 본인만 접근 가능</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 rounded-xl bg-card border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">최신 AI 기술</h3>
                <p className="text-sm text-muted-foreground">최신 AI(Claude Sonnet 4.5) 기반으로 정확한 분석과 자연스러운 요약 제공</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 설계사 후기 */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">현장 설계사들의 이야기</h2>
            <p className="text-muted-foreground">이미 보비로 성과를 내고 있는 분들의 후기입니다</p>
          </div>
          <TestimonialCards />
        </div>
      </section>

      {/* Before / After — 수작업 vs 보비 */}
      <section className="py-16 sm:py-24 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>시간 절감 효과</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 tracking-tight">
              건당 <span className="text-muted-foreground line-through decoration-2">80분</span> → <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">1분 30초</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg">
              주 10건 분석 시 <span className="font-semibold text-foreground">월 52시간</span>이 다시 돌아옵니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* Before — 수작업 */}
            <div className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-background/50">
              <div className="flex items-end justify-between mb-6 pb-4 border-b border-dashed border-muted-foreground/20">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Before</div>
                  <div className="text-lg font-bold text-muted-foreground">수작업</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">건당 총 소요</div>
                  <div className="text-3xl font-bold text-muted-foreground tabular-nums">80<span className="text-lg">분</span></div>
                </div>
              </div>

              <ul className="space-y-3">
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">진료이력 PDF 스캔 & 읽기</span>
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">30분</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                    <div className="h-full bg-muted-foreground/40" style={{ width: '37.5%' }} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">고지사항 질병코드 분류</span>
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">20분</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                    <div className="h-full bg-muted-foreground/40" style={{ width: '25%' }} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">보험금 청구 가능 항목 조회</span>
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">20분</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                    <div className="h-full bg-muted-foreground/40" style={{ width: '25%' }} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">고객 상담 자료 정리</span>
                    <span className="text-sm font-semibold text-muted-foreground tabular-nums">10분</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                    <div className="h-full bg-muted-foreground/40" style={{ width: '12.5%' }} />
                  </div>
                </li>
              </ul>
            </div>

            {/* After — 보비 */}
            <div className="relative p-6 sm:p-8 rounded-2xl border-2 border-primary/40 bg-primary/5 shadow-lg">
              <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-primary text-white text-xs font-semibold shadow-md">
                ⚡ 53배 빠름
              </div>
              <div className="flex items-end justify-between mb-6 pb-4 border-b border-primary/20">
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">After</div>
                  <div className="text-lg font-bold">보비</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">건당 총 소요</div>
                  <div className="text-3xl font-bold tabular-nums bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">1분 30초</div>
                </div>
              </div>

              <ul className="space-y-3">
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm">PDF 업로드</span>
                    <span className="text-sm font-semibold text-primary tabular-nums">5초</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: '6%' }} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm">AI 자동 분석 (고지·상품·청구)</span>
                    <span className="text-sm font-semibold text-primary tabular-nums">30초</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: '33%' }} />
                  </div>
                </li>
                <li>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm">리포트 확인 & 고객 전송</span>
                    <span className="text-sm font-semibold text-primary tabular-nums">55초</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: '61%' }} />
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* 하단 임팩트 */}
          <div className="mt-6 sm:mt-10 p-6 sm:p-10 rounded-2xl bg-gradient-primary text-white text-center shadow-xl">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm opacity-90 mb-2 sm:mb-3">
              <Timer className="w-4 h-4" />
              <span>주 10건 분석 가정</span>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-4">
              <div>
                <div className="text-3xl sm:text-5xl font-bold tabular-nums">52<span className="text-xl sm:text-2xl">시간</span></div>
                <div className="text-xs sm:text-sm opacity-90 mt-1">월 절감 시간</div>
              </div>
              <div className="border-x border-white/20">
                <div className="text-3xl sm:text-5xl font-bold tabular-nums">26<span className="text-xl sm:text-2xl">건</span></div>
                <div className="text-xs sm:text-sm opacity-90 mt-1">추가 가능 미팅</div>
              </div>
              <div>
                <div className="text-3xl sm:text-5xl font-bold tabular-nums">53<span className="text-xl sm:text-2xl">배</span></div>
                <div className="text-xs sm:text-sm opacity-90 mt-1">분석 속도 향상</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI 계산기 */}
      <section className="py-16 sm:py-24 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>수익 계산기</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 tracking-tight">
              보비로 얼마나 더 벌 수 있을까요?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg">
              당신의 평균 수수료와 기대 체결 건수를 입력해보세요
            </p>
          </div>

          <ROICalculator />

          <div className="mt-8 text-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 bg-gradient-primary hover:opacity-90 shadow-lg">
                지금 바로 무료로 체험하기
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground text-lg mb-8">
            무료로 3건 분석을 체험해보고, 베이직은 <strong>3일 무료</strong>로 시작하세요
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="text-base px-8 h-12 bg-gradient-primary hover:opacity-90 shadow-lg">
                무료로 시작하기
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="text-base px-8 h-12">
                요금제 보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BobiLogo size="sm" />
                <span className="font-semibold text-lg">보비 BoBi</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                보험설계사를 위한 AI 보험비서. 고지사항 분석부터 상품 매칭, 보험금 청구 안내까지.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <h4 className="font-semibold text-sm mb-3">서비스</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/pricing" className="hover:text-foreground transition-colors">요금제</Link></li>
                  <li><Link href="/auth/login" className="hover:text-foreground transition-colors">로그인</Link></li>
                  <li><Link href="/auth/signup" className="hover:text-foreground transition-colors">회원가입</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">법적 고지</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link></li>
                  <li><Link href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t pt-6">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>주식회사 바틀 | 대표자: 한승수 | 사업자등록번호: 376-87-01076 | 통신판매업신고번호: 제2019-성남분당B-0177호</p>
              <p>주소: 경기도 성남시 분당구 판교로289번길 20, 2동 8층 (삼평동, 판교테크노밸리 스타트업 캠퍼스)</p>
              <p>연락처: 010-2309-7443 | 이메일: dev@bottlecorp.kr</p>
              <p className="mt-2">주식회사 바틀에서 운영하는 보비(BoBi)에서 판매되는 모든 상품은 주식회사 바틀에서 책임지고 있습니다.</p>
              <p className="mt-3">© 2026 BoBi. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
