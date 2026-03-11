import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, FileSearch, Package, Receipt, ArrowRight, CheckCircle2, Sparkles, Zap, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                보비 <span className="text-primary">BoBi</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button variant="ghost" className="text-sm">요금제</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="text-sm">로그인</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="text-sm bg-gradient-primary hover:opacity-90">
                  무료로 시작하기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-gradient-hero">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            AI가 심평원 진료이력을 자동 분석합니다
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            보험설계사를 위한
            <br />
            <span className="bg-gradient-to-r from-[oklch(0.35_0.07_250)] to-[oklch(0.55_0.15_230)] bg-clip-text text-transparent">
              AI 보험비서
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            고객의 건강보험심평원 진료이력 PDF를 업로드하면
            <br className="hidden sm:block" />
            AI가 고지사항, 가입가능 상품, 보험금 청구까지 한번에 분석합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link href="/auth/signup">
              <Button size="lg" className="text-base px-8 h-12 bg-gradient-primary hover:opacity-90 shadow-lg animate-pulse-glow">
                무료로 시작하기
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Steps Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">3단계로 완성하는 보험 분석</h2>
            <p className="text-muted-foreground text-lg">PDF 업로드 한 번으로 모든 분석이 완료됩니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="group relative p-8 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
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
                <p className="text-sm text-muted-foreground">Claude AI 기반으로 정확한 분석과 자연스러운 요약 제공</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground text-lg mb-8">
            무료로 매월 3건까지 AI 분석을 체험하세요
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
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">보비 BoBi</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 BoBi. AI 보험비서 서비스.
          </p>
        </div>
      </footer>
    </div>
  );
}
