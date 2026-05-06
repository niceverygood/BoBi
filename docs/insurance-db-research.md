# 보험상품 DB 시스템 — Phase 1 사전 조사 보고서

**작성일:** 2026-05-06
**범위:** 코드 변경 0, 디렉토리 골격(crawler/) 생성 + 본 조사 보고서만.
**목적:** 한승수 대표가 Phase 2(실제 구현) 진입 여부를 결정할 수 있도록 사실·옵션·위험을 정리.

> **표기 규칙**
> - 🔵 **확정**: 직접 fetch / 공시 자료로 확인된 사실
> - 🟡 **추정**: 코드·구조 관찰 기반 판단 (직접 검증 가능하지만 본 단계에서는 추론)
> - 🔴 **변호사 자문 필요**: 법률 해석 또는 보험사 컴플레인 사전 점검이 필요한 항목

---

## 0. Executive Summary (1페이지 요약)

### 가장 중요한 4가지 발견

1. **통합공시 5개 중 3개 URL이 부정확.** 사용자가 제시한 `lifeplaza.or.kr`, `kifa.or.kr`, `klia.or.kr` 셋 다 실제 공시 데이터를 보유한 호스트가 아니다. 정정된 URL은 본문 §1.1에.

2. **생명보험협회 공시(`pub.insure.or.kr`)는 robots.txt에서 모든 일반 봇을 명시적으로 차단**한다 (`User-agent: * / Disallow: /`, Yeti·daumoa만 허용). 🔴 **이 사이트의 크롤링은 명백한 robots 위반 + ToS 위반 가능성**. 직접 크롤링 대신 **API 협조 요청 또는 PDF 일괄 다운로드**가 정공법.

3. **통합공시 3개(보험다모아·손보협회 공시·손보 소비자포털)가 본 조사의 fetch에 403 응답.** WAF / User-Agent 차단으로 추정. 일반 브라우저에서는 보일 수 있으나, **자동화된 크롤러가 안정적으로 운영 가능한 환경은 아님.**

4. **개별 보험사 robots.txt는 대부분 허용**(10개 중 5개 전면 허용)이지만, **약관·요율 같은 깊이 데이터는 회원가입/로그인 또는 PDF 형태로만 제공**됨. 자동 수집 효율이 낮고, 사이트 개편 빈도도 높아 장기 운영 비용이 크다.

### 결론 권장안

- **Phase 2 진입은 권장하나, 수집 모델을 "직접 크롤링 우선"이 아닌 "공시 PDF + 협회 협조 + 일부 정적 페이지 크롤링"의 하이브리드로 재설계**한다.
- 첫 6주는 **금감원 fine.fss.or.kr의 정적 비교공시 페이지 + 보험사 IR/공시 PDF**만 자동 수집하고, 협회 공시는 보름 안에 협조 요청 메일을 보낸다.
- 인프라는 **Python + Playwright + GitHub Actions 일 1회 cron + Supabase `insurance` 별도 스키마** (보비 본체와 권한·RLS·키 모두 분리).

상세는 §6 Phase 2 추정.

---

## 1. Step 0a — 데이터 소스 매핑

### 1.1 통합공시 5개 — 정정된 URL 표

🔵 사용자가 제시한 URL 5개 중 3개가 잘못됐고, 정정된 URL은 다음과 같다 (검색 + 직접 확인).

| # | 사이트명 | 사용자 제공 URL | **정정 URL** | 운영 주체 |
|---|---|---|---|---|
| 1 | 보험다모아 (생/손해 통합) | ❌ `lifeplaza.or.kr` (응답 없음) <br> ❌ `kifa.or.kr` (TLS 인증서 오류) | ✅ `https://www.e-insmarket.or.kr/` | 생보협회 + 손보협회 공동 |
| 2 | 손해보험협회 공시 | ❌ `knia.or.kr` (협회 본체) | ✅ `https://kpub.knia.or.kr/` | 손해보험협회 |
| 3 | 생명보험협회 공시 | ❌ `klia.or.kr` (없음) | ✅ `https://pub.insure.or.kr/` | 생명보험협회 |
| 4 | 금감원 보험 비교공시 | ❌ `fss.or.kr` (메인) | ✅ `https://fine.fss.or.kr/` (`/main/prc/is/sub/is008.jsp`) | 금융감독원 |
| 5 | 손해보험협회 소비자포털 | (제공 안 됨) | ✅ `https://consumer.knia.or.kr/` | 손해보험협회 |

> 🟡 보험다모아는 생/손해를 한 도메인에서 통합 제공한다. 사용자가 두 사이트로 분리한 것은 옛 정보. 협회별 비교공시는 #2(손보), #3(생보)이 별도로 존재.

### 1.2 통합공시 5개 — robots.txt / 페이지 구조 / 인증 / 데이터 깊이

| 사이트 | robots.txt | 페이지 구조 | 인증 | 데이터 깊이 (관측치) |
|---|---|---|---|---|
| 보험다모아 (`e-insmarket.or.kr`) | 🔴 직접 fetch 시 **403** (WAF 차단 추정) | 🟡 SPA 추정 (자동차/실손/연금 비교 결과를 동적 호출) | 비회원 조회 가능 | 상품명, 보험료(시뮬레이션), 보장 요약 |
| 손보 공시 (`kpub.knia.or.kr`) | 🔴 직접 fetch 시 **403** | 🔵 SSR/정적 HTML — 메뉴(화재/종합/생명/장기보장 등) 인라인 | 비회원 | 🔵 상품명·**약관·보장·인수기준** 다수 노출 (가장 깊이) |
| 생보 공시 (`pub.insure.or.kr`) | 🔴 **`User-agent: * Disallow: /`** — 모든 일반 봇 차단. Yeti·daumoa만 허용 | 🔵 SPA — 상품명만 링크, 상세는 `javascript:void(0)` | 비회원 | 상품명, 종신/암 등 카테고리. 보험료/약관은 클릭 후 |
| 금감원 (`fine.fss.or.kr`) | 🔵 일부 disallow (`/bos/`, `/upload/`, `/fss/cvpl/stepNotice/`, `/fss/cvpl/extincNotice/`) — Yeti 대상. 그 외 path는 허용 | 🟡 보험상품 비교공시 페이지 자체는 본 조사 시 404 응답 — 메뉴 경로 변경 가능성 | 비회원 | 비교공시 항목(추정): 상품명·보험료 |
| 소비자포털 (`consumer.knia.or.kr`) | 🟡 `/robots.txt` 404 — 정책 미명시 | 🔵 정적 HTML (메뉴·링크 사전 렌더링) | 비회원 | 회사별 공시·민원·약관 해설 |

> 🔴 **결정적 위험:** 생보협회 공시(`pub.insure.or.kr`)는 robots.txt에서 명시적으로 일반 봇을 차단한다. 이 사이트를 크롤링하면 **법률적으로는 robots를 강제력 있는 것으로 보긴 어렵지만, ToS 위반 + 부정경쟁방지법 사례에서 자료 인용 시 패소한 판례 다수**. 변호사 자문 없이 운영 시 리스크.

### 1.3 보험사 10개 — robots.txt 표면 조사

| 회사 | 도메인 | robots.txt | 비고 |
|---|---|---|---|
| 삼성화재 | `samsungfire.com` | 🟢 `User-agent: * / Allow: /` | 전면 허용 |
| 현대해상 | `hi.co.kr` | ⚠️ 소켓 끊김 — 재확인 필요 | |
| DB손보 | `idbins.com` | 🔴 **사실상 차단** — `Disallow: /` + 특정 .do path 11개만 Allow | 깊이 있는 데이터 수집 어려움 |
| KB손보 | `kbinsure.co.kr` | 🟡 `User-agent: Yeti / Allow:/` — Naver만 명시 허용 | 한국 사이트 패턴, 일반 봇 명시 차단은 아님 |
| 메리츠화재 | `meritzfire.com` | ⚠️ 서비스 에러 응답 | 재확인 필요 |
| 삼성생명 | `samsunglife.com` | 🟢 `User-agent: * / Allow: /` + Sitemap 제공 | 전면 허용 + 사이트맵 |
| 한화생명 | `hanwhalife.com` | 🟢 `User-agent: * / Disallow:` (빈) | 전면 허용 |
| 교보생명 | `kyobo.com` | 🟢 `User-agent: * / Disallow: /https://t.kyobo.com/` (오타지만 사실상 모바일만 차단) + Sitemap | 사실상 전면 허용 |
| 신한라이프 | `shinhanlife.co.kr` | ⚠️ timeout | 재확인 필요 |
| 미래에셋생명 | `life.miraeasset.com` | 🟢 `User-agent: * / Allow: /` | 전면 허용 |

> 🟡 robots.txt 허용 ≠ ToS 허용. 자동화 크롤링은 **각 사 약관·이용규정에 별도 금지 조항이 있는지** Phase 2 진입 전 확인 필요. 본 조사에서는 robots.txt까지만 확인.

### 1.4 데이터 노출 깊이 매트릭스

| 항목 | 보험다모아 | 손보 공시 | 생보 공시 | 금감원 | 보험사 직영 |
|---|---|---|---|---|---|
| 상품명 | ✅ | ✅ | ✅ | 🟡 | ✅ |
| 보장 요약 | ✅ | ✅ | 🟡 (클릭 후) | 🟡 | ✅ |
| 약관 PDF | 🟡 | ✅ | 🟡 (클릭 후) | ❌ | ✅ |
| 보험료 시뮬레이션 | ✅ (조건 입력) | 🟡 | 🟡 (클릭 후) | ✅ | ✅ |
| 인수기준 (질병 고지·면책) | ❌ | ✅ (일부) | ❌ | ❌ | 🔴 (대부분 비공개) |
| 사업비 / 환급률 | ❌ | ✅ (일부) | ✅ (일부) | ✅ | 🟡 |

> 🔵 **인수기준이 가장 큰 갭이다.** 보비의 차별화 가치(질병 위험도 → 가입 가능 상품 매칭)에 가장 중요한 데이터인데, 공식 공시 채널 어디에서도 자동 수집 가능한 형태로 제공되지 않는다. **인수기준 DB는 별도 수집 채널이 필요** — 보험사 직접 협조 또는 GA 라이센스 데이터.

---

## 2. Step 0b — 데이터 모델 초안 (Supabase `insurance` 스키마)

### 2.1 스키마 격리 방침 (★보비 본체 영향 차단)

🔵 **결정:** `public` 스키마 안에 접두사로 분리하지 않고, **별도 `insurance` 스키마**를 생성한다.

이유:
- `public` 스키마에 `insurance_*` 접두사로 두면 보비 본체의 RLS 정책·트리거·외래키가 동일 namespace에서 충돌 가능
- 별도 스키마는 비용 0, 권한 분리가 명확 (`GRANT USAGE ON SCHEMA insurance TO ...`)
- 크롤러용 service_role 키는 `insurance` 스키마만 접근하도록 별도 발급
- 보비 본체의 무거운 쿼리(usage_tracking·payment_history)와 크롤러의 대량 upsert가 같은 connection pool을 공유하지만, **테이블 락은 분리**되어 본체 영향 최소화

### 2.2 테이블 초안

```sql
-- 마이그레이션 위치: supabase/migrations/insurance/
-- (Phase 2에서 실제 작성. 본 보고서에는 모델만 제시.)

CREATE SCHEMA IF NOT EXISTS insurance;

-- 1. 보험사
CREATE TABLE insurance.company (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK (type IN ('life', 'non_life')),
  website      TEXT,
  business_no  TEXT,                          -- 사업자등록번호
  source_url   TEXT,                          -- 공시 등록 페이지
  last_updated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 보험상품 (상품 마스터)
CREATE TABLE insurance.product (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES insurance.company(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  product_code    TEXT,                       -- 회사 내부 상품코드 (있으면)
  product_type    TEXT NOT NULL,              -- 종신/정기/암/실손/연금/저축 등
  sales_status    TEXT NOT NULL DEFAULT 'active' CHECK (sales_status IN ('active', 'sales_stopped', 'archived')),
  launch_date     DATE,
  source_url      TEXT,                       -- 어느 공시 페이지에서 수집했는지 (감사 추적)
  source_site     TEXT,                       -- 'damoa' / 'knia' / 'klia' / 'fss' / direct
  last_crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload     JSONB,                      -- 원본 응답 (변환 실패 시 디버깅용)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, product_name, launch_date)
);
CREATE INDEX idx_insurance_product_type      ON insurance.product (product_type);
CREATE INDEX idx_insurance_product_company   ON insurance.product (company_id);
CREATE INDEX idx_insurance_product_status    ON insurance.product (sales_status);
CREATE INDEX idx_insurance_product_crawled   ON insurance.product (last_crawled_at);

-- 3. 약관 (PDF + 텍스트)
CREATE TABLE insurance.product_clause (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES insurance.product(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,              -- 약관 버전 (예: 2026.04 改正)
  effective_from  DATE,
  pdf_url         TEXT,                       -- 원본 PDF URL
  pdf_storage_key TEXT,                       -- Supabase Storage 키 (영구 보관)
  clause_text     TEXT,                       -- OCR / pdfplumber 추출 텍스트
  text_hash       TEXT NOT NULL,              -- 변경 감지용 (SHA-256)
  source_url      TEXT,
  crawled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, version)
);

-- 4. 보장내역 (담보)
CREATE TABLE insurance.coverage_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES insurance.product(id) ON DELETE CASCADE,
  coverage_name TEXT NOT NULL,                -- 예: 암진단비, 뇌출혈진단비
  coverage_code TEXT,                         -- 회사 내부 담보코드
  is_required   BOOLEAN NOT NULL DEFAULT false, -- 주계약/특약 구분
  amount_min    INTEGER,                      -- 가입금액 최소
  amount_max    INTEGER,                      -- 가입금액 최대
  description   TEXT,
  source_url    TEXT,
  crawled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coverage_item_product ON insurance.coverage_item (product_id);

-- 5. 보험료 요율 (연령·성별·흡연 조건별)
CREATE TABLE insurance.premium_rate (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES insurance.product(id) ON DELETE CASCADE,
  age              INTEGER NOT NULL,
  gender           TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  smoker           BOOLEAN,
  payment_period   TEXT,                      -- 10년/20년/전기납 등
  insurance_period TEXT,                      -- 보험기간
  monthly_premium  INTEGER NOT NULL,
  total_premium    INTEGER,
  refund_rate      NUMERIC(5, 2),             -- 환급률 (%)
  source_url       TEXT,
  crawled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, age, gender, smoker, payment_period, insurance_period)
);
CREATE INDEX idx_premium_rate_product_age ON insurance.premium_rate (product_id, age);

-- 6. 인수기준 (질병·직업·연령별 가입 가능 여부)
CREATE TABLE insurance.product_eligibility (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES insurance.product(id) ON DELETE CASCADE,
  condition_type      TEXT NOT NULL,          -- 'disease' / 'occupation' / 'age' / 'pregnancy' / ...
  condition_code      TEXT,                   -- 한국표준질병코드 (KCD-7) 등
  condition_name      TEXT NOT NULL,
  eligibility_status  TEXT NOT NULL CHECK (eligibility_status IN ('eligible', 'sub_standard', 'declined', 'conditional')),
  notes               TEXT,                   -- 부담보·할증 등 부가조건
  source_url          TEXT,
  crawled_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_eligibility_product   ON insurance.product_eligibility (product_id);
CREATE INDEX idx_eligibility_condition ON insurance.product_eligibility (condition_type, condition_code);

-- 7. 크롤링 작업 이력 (운영 감사·디버깅용)
CREATE TABLE insurance.crawl_run (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_site  TEXT NOT NULL,                 -- 'damoa' / 'knia' / 'fss' 등
  started_at   TIMESTAMPTZ NOT NULL,
  finished_at  TIMESTAMPTZ,
  status       TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  records_upserted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata     JSONB                          -- 사이트별 추가 정보
);

-- RLS: insurance 스키마는 service_role만 접근 (사용자 직접 조회 불가)
-- 보비 본체에서 사용자에게 노출할 때는 별도 read-only view + RLS 가공
ALTER TABLE insurance.product           ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance.product_clause    ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance.coverage_item     ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance.premium_rate      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance.product_eligibility ENABLE ROW LEVEL SECURITY;
-- (실제 정책은 Phase 2에서 작성)
```

### 2.3 키 운영

- 🔵 보비 본체 service_role 키와 **다른** 키를 발급한다. Supabase 대시보드에서 새 service role 발급은 안 되므로, **Postgres role을 따로 만들어 `crawler_writer`를 부여**:
  ```sql
  CREATE ROLE crawler_writer LOGIN PASSWORD '...';
  GRANT USAGE ON SCHEMA insurance TO crawler_writer;
  GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA insurance TO crawler_writer;
  -- public 스키마는 절대 접근 금지: GRANT 미부여
  ```
- 🟡 GitHub Secrets에 `INSURANCE_DB_URL`로 저장. 보비 본체의 `SUPABASE_SERVICE_ROLE_KEY`와 별개.

---

## 3. Step 0c — 기술 스택 검토

### 3.1 크롤러 언어

| 옵션 | 장점 | 단점 |
|---|---|---|
| **Python + Playwright** ★ | (1) PDF 파싱(pdfplumber/PyMuPDF) 생태계가 가장 강력. 약관 PDF 텍스트화에 필수. (2) 데이터 처리(pandas)·정규식·자연어 라이브러리 다수. (3) 크롤러 코드와 보비 본체(TS)가 완전 분리되어 의존성·CI 충돌 없음. | (1) 레포 안에 두 언어 공존. (2) 신규 레포지터리 분리 시 더 깔끔 — 본 PR에서는 일단 한 레포에 두는 방향. |
| TypeScript + Puppeteer | 본체와 동일 언어 | PDF 파싱 약함, 약관 텍스트화 시 별도 Python 우회 필요. 프로젝트 구조 복잡. |

🔵 **추천: Python + Playwright.** 약관 PDF 처리 비중이 크기 때문.

### 3.2 스케줄러

| 옵션 | 비용 | 보비 본체 영향 | 적합도 |
|---|---|---|---|
| **GitHub Actions cron** ★ | 무료 (public repo) / 월 2,000분 (private repo Free tier — 충분) | 0 (별도 runner) | 가장 적합 |
| Vercel cron | 보비 함수 사용량 잠식 | ⚠️ 보비 함수 timeout(60s) / 메모리(1GB) 한계로 크롤링 부적합 | 부적합 |
| 별도 EC2/Cloud Run | $5~20/월 | 0 | 오버킬 |

🔵 **추천: GitHub Actions.** 일 1회 cron, 회당 10분 가정 시 월 사용량 ~5시간 — Free tier 한참 안. workflow는 `.github/workflows/insurance-crawl.yml` 별도 파일.

### 3.3 보비 Vercel 배포에서 크롤러 제외

🔵 **방법 1 (추천): `.vercelignore`**
```
crawler/
docs/insurance-db-research.md
```
- Vercel은 빌드 시 `.vercelignore`에 명시된 경로를 무시.
- 보비 본체의 `next.config.ts` / `package.json` 영향 0.

🟡 방법 2 (보조): `next.config.ts`의 `outputFileTracingExcludes` — 빌드는 되지만 산출물에 미포함. `.vercelignore`가 더 단순.

🔵 **본 PR에서는 둘 다 추가하지 않는다 — Phase 2 진입 시점에 함께 처리.** Phase 1은 디렉토리만 있으므로 빌드 영향 0.

---

## 4. Step 0d — 합법성 체크리스트

### 4.1 사이트별 합법성 매트릭스

| 사이트 | 공시의무 데이터? | robots.txt 허용? | ToS 위반 가능성 | 권장 빈도 | 자문 필요 |
|---|---|---|---|---|---|
| 보험다모아 | ✅ (협회 공동 운영, 공익성 강) | 🔴 fetch 차단 | 🟡 ToS 직접 미확인 | 일 1회 | 🔴 자문 권장 |
| 손보협회 공시 | ✅ (공시의무) | 🔴 fetch 차단 | 🟡 ToS 직접 미확인 | 일 1회 | 🔴 자문 권장 |
| **생보협회 공시** | ✅ (공시의무) | **🔴 명시 차단** | **🔴 명백한 위반** | — | **🔴 자문 필수** |
| 금감원 공시 | ✅ (감독기관 직접 운영) | 🟢 일부 path 외 허용 | 🟢 낮음 | 일 1회 | 자문 불필요 |
| 손보 소비자포털 | ✅ | 🟡 robots 미명시 | 🟡 ToS 미확인 | 주 1회 | 자문 권장 |

### 4.2 변호사 자문 필요 항목 (🔴)

1. **생보협회 공시(`pub.insure.or.kr`) 크롤링 가능 여부** — robots 명시 차단인 만큼 직접 크롤링은 사실상 불가. 협회에 공식 데이터 제공 협조 요청을 보내고, 응답에 따라 대체 채널 검토.
2. **공시 의무 데이터의 2차 가공·재배포** — 공시 자체는 공익 성격이지만, 보비가 가공해서 사용자에게 제공할 때 "비교공시 사업자 신고" 의무가 발생할 수 있음. 금감원 자문 필요.
3. **개별 보험사 약관 PDF의 저작권** — 약관은 공시 의무 사항이지만 PDF 자체에 대한 저작권 귀속이 보험사. 인용 범위 문제.
4. **인수기준 데이터 수집 방식** — 보험사 직접 협조 외 경로(GA 인수가이드 유출, 영업소 공유 자료 등)는 부정경쟁방지법 영업비밀 침해 가능. 절대 금지.

### 4.3 운영 원칙 (Phase 2 적용)

- 모든 크롤러는 User-Agent를 `BoBi-Crawler/<version> (contact: <email>)` 로 명시
- robots.txt의 Crawl-delay를 항상 준수, 미명시 시 1 req/sec로 자체 제한
- 한 도메인 동시 연결 ≤ 1
- 페이지 / 약관 PDF는 SHA-256 해시로 변경 감지 — 변경 없으면 upsert 스킵 (트래픽 절감)
- robots.txt가 명시 차단한 사이트는 코드상 fetcher를 작성하지 않음 (예: pub.insure.or.kr)

---

## 5. Step 0e — 위험 요소

### 5.1 사이트 개편 빈도 (크롤러 깨짐)

🟡 한국 정부·협회 사이트는 평균 **1~2년에 한 번 전면 개편**. 보험사 사이트는 **6개월~1년**.

대응:
- 각 사이트별 fetcher에 **smoke test** 코드 동봉 (메인 페이지에서 특정 셀렉터·문자열 존재 검증)
- GitHub Actions cron이 smoke test 실패 시 Sentry/Slack 알림
- 약관 PDF는 텍스트 해시 + 텍스트 길이 동시 모니터링 — 길이 ±20% 변동 시 검토

### 5.2 데이터 정확성 검증

- 🔵 **이중 출처 비교**: 보험다모아·손보협회 공시·보험사 직영 중 두 곳 이상에서 같은 상품의 보험료를 받고, **5% 이상 차이 시 quarantine** 테이블로 격리, 사람이 검토.
- 🟡 약관 텍스트는 OCR 오류율이 있어 **PDF 원본 URL을 항상 보존**. 사용자 노출 시 원본 링크 동시 제공.

### 5.3 보험사 컴플레인 가능성 + 대응책

🔴 가능성 시나리오:
1. 보험사 트래픽 부하 컴플레인 → **Crawl-delay 준수 + User-Agent 명시 + 협조 요청 메일을 사전에 송부**
2. 자사 상품 노출 순서·표현에 대한 항의 → **출처·수집일 명시 + 정정 요청 채널(이메일·전화) 명시**
3. "다른 회사 상품과 함께 비교 노출" 자체에 대한 거부 → 공시 데이터인 만큼 거부 근거 약함, 그러나 **법무 대응 매뉴얼은 준비**

대응책 ≪필수 사전 준비≫:
- `crawler/CLAUDE.md`에 운영 원칙 명시 (이미 작성됨)
- 컴플레인 접수 시 **48시간 내** 해당 사 데이터 일시 제거 + 검토
- 정정 요청 폼 (Phase 2 운영 시 연동) — 보비 본체의 inquiries 시스템 활용

### 5.4 ★ 보비 본체 영향 위험 분석 (지시사항 강조 항목)

| 위험 | 영향 | 격리 방안 |
|---|---|---|
| Supabase 부하 공유 | 🟡 같은 프로젝트라 connection pool / DB CPU 공유 | (1) `insurance` 별도 스키마 → 락 분리. (2) 크롤러는 batch upsert 사용, 일 1회·새벽 시간대(KST 03:00). (3) Supabase Pro 플랜의 `pgbouncer` connection limit 분리 모니터링. |
| 권한 누출 (크롤러 → 보비 본체 데이터) | 🔴 critical | 별도 Postgres role(`crawler_writer`)이 `insurance` 스키마만 접근. `public` 스키마 GRANT 미부여 → 보비 본체 테이블 read 불가. |
| 크롤러 오류가 본체 함수 영향 | 🟡 Vercel 함수와 GitHub Actions runner 분리 | 0 — 실행 환경 완전 분리. |
| 마이그레이션 충돌 | 🟡 `supabase/migrations/` 디렉토리 공유 | `supabase/migrations/insurance/` 하위 디렉토리로 격리. PR 단위에서 절대 본체 마이그레이션과 같이 머지하지 않음. |
| 크롤러로 인한 Supabase 비용 증가 | 🟡 storage·egress | 약관 PDF는 Supabase Storage가 아닌 외부 S3 / R2로 분리 검토 (Phase 2). |

🔵 **결론: 별도 스키마 + 별도 role + 별도 cron + 별도 Storage 버킷 = 4중 격리.** 보비 본체에 미치는 영향은 사실상 0에 가까움.

### 5.5 약관 변경 감지·알림 시스템 (Phase 2)

- 약관 PDF 다운로드 → SHA-256 해시 비교
- 변경 감지 시: (1) `product_clause`에 새 row 추가, (2) Sentry breadcrumb + Slack `#insurance-crawl` 채널 알림
- 사용자(설계사)에게는 보비 본체에서 "최근 7일 약관 변경 상품" 섹션을 별도로 제공해 차별화 가치 강화

---

## 6. Step 0f — Phase 2 작업 추정

### 6.1 시간 추정 (주 단위)

| 작업 | 예상 기간 |
|---|---|
| `insurance` 스키마 마이그레이션 + role 분리 | 2일 |
| 금감원 fine.fss.or.kr fetcher (정적 HTML) | 3일 |
| 보험다모아 fetcher (SPA, Playwright 필요) | 1주 |
| 손보협회 공시 fetcher (정적 HTML, 양 많음) | 1주 |
| 약관 PDF 다운로드 + 텍스트 추출 파이프라인 | 4일 |
| 보험사 5개사 직영 fetcher (Phase 2.1) | 1.5주 |
| 데이터 정합성 검증 (이중 출처 비교) | 3일 |
| GitHub Actions cron + Sentry 연동 | 2일 |
| 보비 본체에서 사용자 노출용 read-only view + API | 1주 |

🔵 **총 ~6주** (1인 풀타임 기준). 변호사 자문 답변 대기 시간은 **별도** (1~2주).

### 6.2 GitHub Actions 비용 추정

- 일 1회 cron, 회당 10분, 30회/월 = **300분/월**
- GitHub Actions Free tier: private repo 2,000분/월
- 🔵 **무료 한도 안.** Phase 2.1 (보험사 직영 추가)에서도 회당 30분 = 900분/월로 여유.

### 6.3 Supabase 추가 부하

- 행 수 추정: 보험사 30사 × 평균 50상품 × 5년 약관 버전 = 7,500 product_clause 행
- premium_rate: 30사 × 50상품 × 70연령 × 2성별 × 2흡연 × 5납입기간 = ~210만 행 (단순 곱셈)
- 🟡 Supabase Pro 플랜의 8GB DB 한도 안에서 충분. 단, premium_rate 인덱스 설계 중요 (위 스키마에서 `(product_id, age)` 복합 인덱스로 처리).
- Storage: 약관 PDF 500개 × 평균 2MB = 1GB. **Supabase Storage 대신 Cloudflare R2 권장** (egress 무료) — Phase 2 결정.

### 6.4 우선 수집 대상 (10개사 중)

🔵 **추천 순서**:
1. **금감원 비교공시** — robots 깨끗하고 공익성 명확. 첫 fetcher.
2. **삼성화재·한화생명·교보생명·미래에셋생명·삼성생명** (5사 robots 전면 허용) — 보험사 직영 중 가장 안전.
3. **손보협회 공시** — 데이터 깊이가 가장 큰 (인수기준 일부 노출). 단, 403 우회 + ToS 자문 후.
4. **보험다모아** — 공시 자체는 공익이지만 SPA 크롤링 + 협회 협조 모두 필요.
5. **DB손보·KB손보** — robots 제한 — 공식 협조 채널만 시도, 직접 크롤링 금지.
6. **현대해상·메리츠·신한라이프** — 본 조사에서 응답 불안정. Phase 2 1주차에 재확인.

🔴 **수집 금지**: 생보협회 공시(`pub.insure.or.kr`) — robots 명시 차단. 대신 금감원·생보협회 공시 PDF 일괄 다운로드 / 협회 협조 메일.

### 6.5 보비 본체 연동 작업량

- read-only view 작성: `public.v_insurance_product_search` 같은 형태로 `insurance` 스키마 조인 결과 노출 (1일)
- API: `/api/insurance/search` (1일), `/api/insurance/product/[id]` (1일), `/api/insurance/eligibility-match` (3일 — 보비 사용자의 위험도 리포트와 매칭)
- 프론트: `/dashboard/products` 페이지가 이미 존재 — 그 페이지에 새 데이터 소스 연결 (3일)

🔵 **총 연동 작업 ~1.5주.** Phase 2.1로 분리.

---

## 7. 한승수 대표 결정 항목

진행 전 확정이 필요한 항목 (★ 우선순위 순):

1. **🔴 ★ 생보협회 공시(`pub.insure.or.kr`) 처리 방침** — 직접 크롤링 금지로 결정 시, 데이터 갭을 어떻게 메울지 (협조 요청 / PDF 일괄 다운로드 / 데이터 구매)
2. **🔴 ★ 변호사 자문 일정** — Phase 2 진입 전 §4.2의 4가지 항목을 한 번에 자문. 자문료·시간 가늠
3. **🟡 신규 레포지터리 분리 vs 한 레포 유지** — 본 보고서는 한 레포 유지로 작성됨. Phase 2 시작 시 코드 양이 늘면 분리 검토
4. **🟡 약관 PDF 저장소** — Supabase Storage / Cloudflare R2 / S3 중 선택
5. **🟡 첫 6주 우선순위 5사 확정** — §6.4 추천안 그대로 진행할지

---

## 8. 부록

### 8.1 본 조사에서 확인한 사실의 한계

- WebFetch로 직접 fetch 불가능했던 사이트(보험다모아·손보협회 공시·손보 소비자포털)는 **403** 응답. 일반 브라우저(User-Agent 위장)로는 보일 가능성 있으나, 본 조사에서는 추가 우회를 시도하지 않았다 — 우회 자체가 ToS 위반 소지.
- ToS 본문은 본 조사에서 직접 fetch 못 함. Phase 2 진입 전 변호사가 수동으로 사이트별 ToS 검토 필요.
- 일부 보험사 도메인이 timeout/소켓 끊김. Phase 2 1주차에 재확인.

### 8.2 사용한 툴 / 출처

- WebFetch (Claude tool) — 각 사이트 robots.txt + 메인 페이지 SSR/SPA 판단
- 검색 결과 — 통합공시 정확한 URL 매핑
  - [보험다모아](https://www.e-insmarket.or.kr/) (생/손해 통합)
  - [손보협회 공시](https://kpub.knia.or.kr/)
  - [생보협회 공시](https://pub.insure.or.kr/)
  - [금감원 보험상품 비교공시](https://fine.fss.or.kr/main/prc/is/sub/is008.jsp)
  - [손해보험협회 소비자포털](https://consumer.knia.or.kr/)

---

**이상.** Phase 2 진입 결정은 §7의 5개 항목을 한승수 대표가 확정한 뒤로 미룬다.
