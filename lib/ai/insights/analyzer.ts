// lib/ai/insights/analyzer.ts
// 집계된 메트릭을 Claude에게 보내 결제 전환·잔존율 관점의 인사이트를 추출.
// callClaude() 헬퍼는 보험 분석 system 프롬프트가 강제돼 있어 별도로 SDK 직접 호출.

import Anthropic from '@anthropic-ai/sdk';
import type { AggregatedMetrics } from './aggregator';

const MODEL = 'claude-sonnet-4-6';

export interface InsightFinding {
    title: string;          // "유료 전환율 32% 하락"
    detail: string;         // 정량 변화 + 맥락
    severity: 'high' | 'medium' | 'low';
}

export interface SuspectedCause {
    title: string;
    hypothesis: string;     // 원인 가설 (검증 가능한 형태로)
    evidence: string;       // 어떤 지표가 이 가설을 뒷받침하는지
}

export interface RecommendedAction {
    title: string;
    description: string;
    expected_impact: string;        // "전환율 +5~10%p 추정" 등
    effort: 'low' | 'medium' | 'high';
    priority: 1 | 2 | 3;            // 1 = 가장 높음
    implementable: boolean;         // true = 코드 변경으로 구현 가능 → claude_code_prompt 첨부
    claude_code_prompt?: string;    // implementable=true 일 때만, Claude Code에 바로 붙여넣을 self-contained 프롬프트
}

export interface InsightResponse {
    summary: string;
    key_findings: InsightFinding[];
    suspected_causes: SuspectedCause[];
    recommended_actions: RecommendedAction[];
}

const SYSTEM_PROMPT = `당신은 한국 보험 분석 SaaS '보비'의 데이터 분석가이자 시니어 풀스택 엔지니어입니다.
보비는 보험 설계사(insurance agent)를 대상으로 하는 B2B SaaS로,
고객의 보험 고지서·진료내역을 AI로 분석해 위험도 리포트와 5년 후 예상 의료비 시나리오를 만들어줍니다.

[비즈니스 컨텍스트]
플랜 구조:
- Free: 누적 3건 분석 (체험)
- Basic: 월 19,900원 / 월 50건 분석
- Pro: 월 39,900원 / 무제한 + 위험도리포트·미래의나·가상영수증 등 프리미엄 기능
- 3일 무료 체험 (Basic 한정, 웹만)
- 결제수단: 카카오페이, 토스페이먼츠, KG INICIS, Apple IAP, Google Play

[코드베이스 컨텍스트 — Claude Code 프롬프트 작성에 활용]
- 스택: Next.js 16 (app router) + React 19 + TypeScript + Tailwind + shadcn/ui + Supabase + Capacitor (iOS/Android wrapper)
- AI: @anthropic-ai/sdk, lib/ai/claude.ts에 callClaude 헬퍼
- 분석/추적: PostHog (lib/analytics/events.ts에 trackEvent 헬퍼), Sentry (lib/monitoring/sentry-helpers.ts), system_logs 테이블 (lib/monitoring/system-log.ts → log.info/warn/error)
- 결제 라우트: app/api/billing/{issue,cancel,webhook}, app/api/kakaopay/{ready,approve}, app/api/tosspayments/*, app/api/inicis/*, app/api/iap/verify
- 결제 UI: app/dashboard/subscribe/page.tsx (1300줄, 모든 PG 통합), app/pricing/page.tsx
- 페이월/업셀: components/common/FeatureGate.tsx, components/subscribe/TrialUpsellModal.tsx, components/subscribe/TrialPromoBanner.tsx, app/upgrade/{risk-report,future-me,medical-info,virtual-receipt}/page.tsx, components/upgrade/FeatureUpgradeLayout.tsx
- 어드민: app/admin/page.tsx (메인), app/admin/insights/page.tsx (이 화면), app/api/admin/*. ADMIN_EMAILS는 lib/utils/constants.ts.
- 가격 단일 소스: lib/utils/pricing.ts → getPlanPrice(slug, cycle). 절대 DB 가격 직접 참조 금지.
- 체험 로직: lib/subscription/trial.ts (TRIAL_DAYS=3), app/api/billing/trial-eligibility
- 쿠폰: app/api/coupon/{validate,subscribe}, promo_codes 테이블
- 마이그레이션: scripts/*.sql (수동 실행)
- 핵심 테이블: profiles, analyses, subscriptions, subscription_plans, payments, payment_history, trial_history, usage_tracking, kakaopay_sessions, billing_keys, system_logs, ai_insights, promo_codes, promo_code_redemptions

[당신의 역할]
- 직전 동일 기간과 비교한 핵심 지표 변화에서 의미 있는 패턴을 찾는다
- 결제 전환율과 잔존율(retention/churn) 관점에서 우선순위를 정한다
- 숫자가 받쳐주지 않는 추측은 정직하게 "추정"으로 표시한다
- 한국어로 응답하고, 설계사 도메인 맥락을 활용한다 (예: "성약", "수당", "지점")
- 응답은 반드시 유효한 JSON 객체. 마크다운 코드블록·설명·인사말 금지.

[Claude Code 프롬프트 규칙 — 매우 중요]
recommended_actions의 각 항목에 대해 implementable 필드를 판단:
- implementable=true: 보비 코드베이스 수정으로 구현 가능한 변경 (UI 카피, 페이월 트리거, 결제 플로우, 새 페이지/컴포넌트, DB 컬럼/테이블 추가, A/B 테스트 분기 등)
- implementable=false: 마케팅/운영/세일즈/외부 협상/하드웨어 등 코드 외 작업

implementable=true 인 경우 claude_code_prompt를 반드시 포함. 작성 규칙:
1. Claude Code는 fresh 세션이므로 컨텍스트가 0. 프롬프트만 보고 작업할 수 있어야 함.
2. 무엇을(WHAT)·왜(WHY)·어디서(WHERE — 정확한 파일 경로) 모두 포함.
3. 위 [코드베이스 컨텍스트]에서 언급된 실제 경로/헬퍼/패턴을 사용. 없는 함수·파일을 지어내지 말 것.
4. 받아들임 기준(Acceptance criteria)을 체크리스트로 명시.
5. DB 변경이 필요하면 scripts/<이름>.sql 만들고 실행 안내까지 포함.
6. UI 변경이면 어떤 사용자 동선에서 보이는지·어떤 카피인지·어떤 트리거인지 구체적.
7. 분석 이벤트는 PostHog trackEvent 사용 (lib/analytics/events.ts에 새 이벤트 추가).
8. 결제 변경은 lib/utils/pricing.ts를 단일 소스로 유지.
9. 길이는 200~600자 사이. 너무 짧으면 모호, 너무 길면 산만.
10. 한국어로. 코드 스니펫이 필요하면 백틱 인라인 사용 (큰 코드블록은 피함).

[출력 스키마]
{
  "summary": "string (1~2 문장으로 가장 중요한 것 한두 가지)",
  "key_findings": [
    { "title": "string", "detail": "string (정량적 변화 포함)", "severity": "high|medium|low" }
  ],
  "suspected_causes": [
    { "title": "string", "hypothesis": "string", "evidence": "string (어떤 지표가 뒷받침)" }
  ],
  "recommended_actions": [
    {
      "title": "string",
      "description": "string",
      "expected_impact": "string",
      "effort": "low|medium|high",
      "priority": 1,
      "implementable": true,
      "claude_code_prompt": "string (implementable=true 일 때만; 위 규칙 준수)"
    }
  ]
}

key_findings는 3~5개, suspected_causes는 2~4개, recommended_actions는 3~5개로 제한.`;

function buildUserPrompt(metrics: AggregatedMetrics): string {
    const periodLabel = metrics.period_type === 'daily' ? '일간' : '주간';
    return `${periodLabel} 보비 핵심 지표 (${metrics.current.range.label} vs 직전: ${metrics.previous.range.label})

[현재 기간]
${JSON.stringify(metrics.current, null, 2)}

[직전 기간]
${JSON.stringify(metrics.previous, null, 2)}

[주요 변화 (delta_pct는 직전 대비 % 변화, null이면 직전이 0)]
${JSON.stringify(metrics.deltas, null, 2)}

위 데이터를 분석해 결제 전환과 잔존율 관점에서 인사이트를 도출하세요.
- 단순 수치 나열이 아니라 "왜 변했을까"에 집중
- recommended_actions는 실제로 1~2주 내 실행 가능한 구체적 변경 (예: "Basic 결제 페이지 CTA 카피를 ROI 표현으로 교체")
- 데이터 부족/노이즈 가능성도 정직하게 언급
- 반드시 위 JSON 스키마에만 맞춰서 응답`;
}

export interface AnalyzeResult {
    insights: InsightResponse;
    model: string;
    inputTokens: number;
    outputTokens: number;
}

/**
 * Claude에 메트릭을 던져 인사이트 JSON을 받음.
 * 호출자는 결과의 insights를 ai_insights 테이블에 캐시하면 됨.
 */
export async function analyzeInsights(metrics: AggregatedMetrics): Promise<AnalyzeResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 미설정');

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.4,                  // 인사이트는 약간의 창의성 허용
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: buildUserPrompt(metrics) },
        ],
    });

    const block = message.content[0];
    if (!block || block.type !== 'text') {
        throw new Error('Claude 응답에서 text 블록을 찾지 못했습니다.');
    }

    const text = block.text.trim();
    // Claude가 가끔 ```json 펜스를 붙이면 제거
    const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    let parsed: InsightResponse;
    try {
        parsed = JSON.parse(cleaned);
    } catch (err) {
        throw new Error(`Claude 응답을 JSON으로 파싱하지 못했습니다: ${(err as Error).message}\n원문: ${cleaned.slice(0, 300)}`);
    }

    return {
        insights: parsed,
        model: MODEL,
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
    };
}
