# crawler/ — Claude Agent 작업 지침

이 디렉토리는 **보비 본체와 완전히 분리된** 보험상품 데이터 크롤러다.
`/CLAUDE.md`(루트)의 일반 지침을 따르되, 다음 차이점에 유의.

## 보비 본체와 절대 섞이면 안 되는 것

- **빌드 의존성**: 크롤러가 `package.json` 또는 `next.config.ts`를 건드리면 안 된다.
  Vercel 배포 산출물에 들어가지 않도록 `.vercelignore` (Phase 2에서 추가) 로 차단.
- **DB 권한**: 크롤러는 Supabase의 `insurance` 스키마만 접근. 보비 본체의 `public`
  스키마(profiles / subscriptions / 의료기록 등)는 RLS·키 분리로 접근 차단.
- **service_role 키**: 보비 본체용과 별개로 발급된 크롤러 전용 키만 사용.
  레포 어디에도 평문 노출 금지(.env.crawler / GitHub Secrets).

## 크롤러를 만들 때 항상 지키는 것

1. **robots.txt 우선** — fetch 전에 robots.txt 확인 후 disallow 경로면 즉시 abort.
2. **이용약관 확인 흔적** — 새 사이트 추가 시 `sources/<site>.py` 상단에 ToS 발췌 + 수집
   범위가 ToS에 부합하는 근거를 주석으로 남긴다.
3. **rate limit** — 한 도메인당 최소 1 req/sec, robots.txt의 Crawl-delay가 더 크면 그것에 맞춤.
4. **User-Agent 명시** — `BoBi-Crawler/<version> (contact: <email>)` 형태로 식별 가능하게.
5. **변경 감지 로깅** — 페이지 구조 변경 / 약관 변경 시 즉시 알림(Sentry 또는 Slack).

## 합법성 / 데이터 정확성

- 보험사·협회·금감원 공시 데이터는 **공익적 성격**이지만, 수집 방식이 사이트 ToS를
  위반하면 법적 리스크 발생. 새 소스 추가 전 변호사 자문 필요 항목은 반드시 PR
  description에 명시한다.
- 크롤링한 데이터를 보비 사용자에게 노출하기 전, "출처/수집일/공시 의무 데이터 여부"를
  함께 표기한다.

## Phase 2 진입 체크

Phase 2를 시작하려면 **`docs/insurance-db-research.md`의 Phase 1 보고서를 한승수
대표가 승인**한 상태여야 한다. 사전 조사 없이 구현부터 들어가지 않는다.
