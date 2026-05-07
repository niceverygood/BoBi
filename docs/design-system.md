# BoBi 디자인 시스템 v2.2

> **Status**: 진행 중 — PR별 학습을 누적 반영하는 living document.
> **Scope**: BoBi 제품 한정. 다른 제품으로의 일반화는 §16 (미정 — BoBi 안정화 후).
> **Source of truth**: 코드가 정답. 문서와 코드가 충돌하면 코드를 따르고, 발견 즉시 PR로 문서 갱신.

이 문서는 PR #21 ~ #26에서 도출된 결정사항만 기록한다. 미정 영역은 *(TBD)* 로 표시하여 후속 PR에서 채운다.

---

## §1 핵심 원칙

*(TBD — 별도 PR에서 정리)*

비공식 요약: 회색 99% + BoBi 블루 1% + semantic <1%. 의미 없는 색 ❌. 정보는 텍스트·굵기·크기·간격이 1차, 색은 보조.

---

## §2 컬러

### §2.1 회색 스케일 *(TBD)*

### §2.2 Semantic 컬러 *(TBD)*

### §2.3 *(예약)*

### §2.4 Brand Accent — BoBi 블루

**hex 확정** (PR #22, v2.2 재확인):

| 항목 | 값 |
|---|---|
| BoBi 블루 | `#1a56db` |
| Tailwind 유틸리티 | `bg-brand-600`, `text-brand-600`, `ring-brand-600`, `border-brand-600` |
| CSS 변수 | `--color-brand-600` |
| 정의 위치 | `app/globals.css` `@theme` 블록 |
| 출처 | 기존 `BobiLogo` 컴포넌트(`#1a56db`)와 동일. PR #22에서 토큰화하며 정합성 확보 |

전체 스케일: `brand-50` `#EFF6FF` / `brand-100` `#DBEAFE` / `brand-500` `#3B82F6` / **`brand-600` `#1a56db`** / `brand-700` `#1E40AF` / `brand-800` `#1E3A8A`.

**사용 화이트리스트** — 한 페이지에 동시 5~7곳 한도:

1. 로고 마크
2. 활성 nav 메뉴 (현재 위치 표시)
3. Primary CTA 버튼 (`Button` default variant)
4. 인라인 링크 / 텍스트 액션
5. Focus ring (input·select·button)
6. (선택) 체크박스/토글 활성
7. (선택) 차트 메인 시리즈

**금지 위치**:

- 통계 숫자, 헤딩 텍스트, 카드 테두리·배경
- 본문 강조 (굵기·크기로 처리)
- 아이콘 배경 박스
- semantic 상태(success/warning/danger) 색 대체
- placeholder·빈 상태 (§5.9 참고)
- 메시지 버블 등 인접한 brand 영역과 합쳐지는 자리 (§5.9 참고)

---

## §3 타이포 *(TBD)*

## §4 레이아웃·간격 *(TBD)*

---

## §5 컴포넌트

### §5.1 Button *(TBD — default variant은 PR #23에서 `bg-brand-600` 확정)*
### §5.2 Badge *(TBD)*
### §5.3 Card *(TBD)*
### §5.4 Input·Select *(TBD — focus ring은 PR #23에서 `ring-brand-600/20` 확정)*
### §5.5 Table *(TBD)*
### §5.6 Sidebar / Nav *(TBD — 활성 메뉴는 PR #22에서 `bg-brand-600` 확정)*
### §5.7 Modal·Dialog *(TBD)*
### §5.8 Toast·Alert *(TBD)*

### §5.9 Chat Interface

**iOS Messages 패턴 채택** (PR #26).

발화 주체별 톤 분리:

| 영역 | 클래스 | 의도 |
|---|---|---|
| 헤더 | `bg-brand-600 text-white` | BoBi 제품 정체성 표시 |
| AI(보비) 메시지 버블 | `bg-muted` (옅은 회색) | 응답자, 부드러운 톤 |
| 사용자 메시지 버블 | `bg-gray-900 text-white` | 발신자 본인, 강한 정체성 |
| 관리자 응답 메시지 | `bg-amber-100 text-amber-900` | 사람이 응답함을 명시 (semantic) |
| 시스템 안내 메시지 | `bg-muted/50 text-muted-foreground` | 이벤트·안내 텍스트 |

**규칙**:

- 같은 색이 인접하면 시각이 합쳐진다. 헤더가 brand-600인데 사용자 버블도 brand-600이면 두 영역이 합쳐져 보이고 위계가 사라진다.
- 발화 주체별로 다른 톤을 줘 위계를 만든다 (브랜드 헤더 / 옅은 회색 AI / 검정 본인).

**빈 상태 placeholder**:

- **기본**: `text-gray-300`
- **콘텐츠 의미가 약한 빈 상태**: `text-gray-400` (예: "검색 결과 없음" — 사용자 의도가 메시지 자체로 명확하면 아이콘은 더 약하게)
- brand 톤(`text-brand-600/30` 등) ❌ — placeholder는 브랜드 자리가 아님

**플로팅 진입 버튼**:

- `bg-brand-600 hover:bg-brand-700` (whitelist #3에 해당)
- 외부 채널 버튼(예: KakaoChatButton의 `#FEE500`)은 그 채널 브랜드 색 유지. BoBi 토큰 적용 ❌

**출처**: PR #26 — `components/chat/ChatBot.tsx`

---

## §6 ~ §10 *(TBD)*

---

## §11 안티패턴 — 실전 사례

### §11.1 ~ §11.2 *(TBD — 이전 PR 학습 정리는 별도 PR)*

### §11.3 디자인 시스템 도입 전후 학습 사례

각 사례는 "이전 작업이 잘못됐다"의 비판이 아니라, **디자인 시스템이 정착되기 전과 후의 차이**를 기록한다. 같은 자리에서 다음 작업자가 같은 함정에 빠지지 않도록 패턴화한다.

#### §11.3.1 위험 배율 색이 배율값이 아닌 string 필드로 결정 (데이터 일관성 먼저 확인)

**상황**: 디자인 시스템 도입 전, 위험 질환 예측 배지의 색이 `riskLevel` string 필드(`'high'|'moderate'|'low'`)로 결정되고 있었다. AI 또는 룰이 이 필드를 부여하는데, AI가 두 1.6배 케이스에 다른 `riskLevel`을 주면서 같은 배율인데 한 항목은 노랑·다른 항목은 파랑으로 표시되는 일이 발생.

**문제**: 색 결정 기준이 비결정적이면 사용자가 "왜 이 색?" 질문에 답할 수 없어 신뢰가 손실된다. UI 단순화 작업 전에 **데이터 일관성**부터 확인했어야 한다. 시각 배지 색은 하나의 결정적 기준으로만 결정되어야 하고, 다른 정보(임상 컨텍스트 등)는 다른 채널(텍스트·카테고리 라벨·리포트 본문)로 분리해야 한다.

**해결**: 색 결정 입력을 `relativeRisk`(숫자) 단일 필드로 고정. 임계값은 `lib/risk/risk-matcher.ts`의 rule-based 임계값과 동기화.

```typescript
function getRiskMultiplierBadgeClass(relativeRisk: number): string {
    if (relativeRisk >= 3.0) return 'bg-red-50 text-red-700 border-red-200';
    if (relativeRisk >= 1.8) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
}
```

**출처**: PR #25 사전 분석 단계.

---

#### §11.3.2 행 1개에 색깔 배지 3개 (강조점은 행당 0~1개 한도)

**상황**: 디자인 시스템 도입 전, 고객 카드 리스트 한 행에 [파랑 문서] [초록 S2] [빨강 하트] 3개 배지가 동시에 표시되고 있었다. 각 데이터 필드(`analysisCount > 0` / `hasStep2` / `hasRiskReport`)의 존재 여부를 시각적으로 강조하려고 색을 다르게 부여한 결과.

**문제**: 행 1개당 컬러 강조점이 3개면 시선이 분산되어 사용자가 어디를 봐야 할지 모르게 된다. 게다가 빨강 하트는 "위험"으로 오독되지만 실제 의미는 "위험분석 완료"라는 중립 상태였음. 정보가 다른 자리에 이미 있으면(예: "N건" 텍스트와 파랑 문서 배지) 배지가 노이즈가 된다.

**해결**: 한 행의 컬러 강조점을 0~1개로 한도. 정보 보존이 필요하면 회색 outline 배지 + 텍스트 또는 tooltip으로 처리. 다른 자리와 중복되는 배지는 제거.

- 파랑 [FileSearch] → 제거 (옆 "N건" 텍스트와 정보 중복)
- 초록 [S2] → 회색 outline + "S2" 텍스트 유지
- 빨강 [HeartPulse] → 회색 outline + HeartPulse 아이콘 + `title` 속성 (위험이 아닌 "분석 완료" 상태)

**출처**: PR #26 — `app/dashboard/customers/page.tsx`

---

#### §11.3.3 "AI 시그니처"라며 보라 그라디언트 (그라디언트는 정보 0)

**상황**: 디자인 시스템 도입 전, 고객 상세 페이지 하단의 "미래의 나" 버튼이 `bg-gradient-to-r from-violet-500 to-violet-600`으로 표시되어 있었다. AI 기능임을 시각적으로 강조해 클릭을 유도하려는 의도.

**문제**: 그라디언트는 "프리미엄"·"AI"·"특별함"의 분위기 시그널로 자주 쓰이지만 사용자에게 전달되는 정보는 0이다. 옆 버튼들이 outline 회색일 때 보라 채움 그라디언트만 혼자 튀어 행 전체의 위계를 파괴한다. "AI 기능"이라는 뜻은 Sparkles 같은 아이콘이 충분히 전달한다.

**해결**: 같은 행의 버튼들과 동일한 variant로 통일 (`variant="outline"`). Sparkles 아이콘은 유지하여 "AI" 의미는 보존. 사용자가 "여기는 같은 부류 액션"임을 인지하도록.

**출처**: PR #25 영역 7 — `app/dashboard/customers/[id]/page.tsx` 하단 바로가기 행.

---

#### §11.3.4 모노크롬 평탄화로 브랜드 정체성까지 지움 (회색 99% + brand 1%)

**상황**: 디자인 시스템 v2 도입 시 "Pure Monochrome" 원칙을 적용해 컬러를 0개로 정리. 의미 없는 컬러 노이즈를 제거하려는 의도. 결과적으로 로고·활성 nav 메뉴·primary CTA 버튼까지 모두 회색이 되어 브랜드 식별이 약화됨.

**문제**: 정보 없는 색을 제거하는 것과 **정보 있는 색을 제거하는 것**은 다르다. 브랜드 정체성(로고)·현재 위치 표시(활성 nav)·primary 액션(CTA)은 의미 있는 색의 자리. 한 번에 0으로 만들면 사용자가 "여기는 BoBi다", "내가 지금 어디 있다", "여기를 누르면 된다"의 단서를 잃는다.

**해결**: §2.4 화이트리스트 7곳을 정의. 회색 99% + brand-600 1% + semantic <1%. "이 자리에 색을 쓰면 사용자가 무엇을 더 잘하게 되는가?"의 답이 있는 자리에만 색을 둔다.

**출처**: PR #21 (모노크롬 평탄화) → PR #22 (브랜드 액센트 복원)

---

#### §11.3.5 focus ring 토큰 혼재 (한 인터랙션 = 한 토큰)

**상황**: 디자인 시스템 도입 전, admin 페이지 입력·셀렉트의 focus ring이 `ring-primary/20`, `ring-1 ring-primary`, `ring-gray-400 border-gray-400` 등으로 혼재되어 있었다. 페이지·섹션별로 다른 시점에 작성되면서 자연스럽게 흩어진 결과.

**문제**: 같은 인터랙션(focus)인데 시각이 다르면 사용자가 무의식적 위계 혼란을 겪고, 토큰 추적도 어려워진다. 같은 시각 처리가 한 자리에서는 BoBi 블루 글로우, 다른 자리에서는 회색 단색으로 보이면 일관성이 깨진 것.

**해결**: focus ring을 단일 토큰 `ring-brand-600/20`으로 통일 (10개 input 일괄 변경). danger 컨텍스트(예: 정지 사유 입력)의 `ring-red-500`만 의미 있는 예외로 보존.

**출처**: PR #23

---

#### §11.3.6 기능 그라디언트는 예외 (정보 0 + 기능 1이면 보존)

**상황**: `bg-gradient-*` 일괄 정리 작업(PR #28~#30) 중 `components/landing/TestimonialMarquee.tsx`의 좌·우 페이드 마스크가 그라디언트로 발견됨. 마퀴 스크롤 텍스트가 카드 가장자리에서 자연스럽게 fade-out 하도록 `bg-gradient-to-r from-background to-transparent`(좌측) / `bg-gradient-to-l from-background to-transparent`(우측)을 사용 중이었다.

**문제**: "그라디언트는 정보 0이라 제거" 규칙(§11.3.3)을 단순 적용하면 페이드 효과까지 사라져 마퀴 텍스트가 카드 끝에서 잘려 보임. 색이 정보를 전달하는 그라디언트(어필·강조·구분)와 시각 기능을 만드는 그라디언트(페이드·블러·opacity transition)는 다르게 취급해야 한다.

**해결**: 그라디언트 발견 시 코드 추적으로 "이 색이 정보를 전달하는가"를 먼저 확인 (§14 Phase 0 적용). 색=정보(브랜드 어필·등급 표시·CTA 강조) → 단색화·제거. 색=시각 기능(페이드 마스크·blur transition·opacity gradient) → **보존**. PR #30에서 페이드 마스크 2건은 모든 후속 PR에서 보존하기로 명시.

**출처**: PR #30 — `components/landing/TestimonialMarquee.tsx` L115·L116 마퀴 페이드 마스크

---

#### §11.3.7 도메인 시각 효과는 단색으로 보존 (그라디언트만 제거)

**상황**: PR #30에서 `components/accident-receipt/ReceiptView.tsx`의 가상 영수증 헤더가 `bg-gradient-to-r from-slate-800 to-slate-900 text-white`로 어두운 톤. "영수증 = 어두운 헤더가 정보를 담는 영역"이라는 도메인 특성을 시각적으로 전달하고 있었다.

**문제**: 일반 카드 패턴(B → `bg-gray-50`)을 그대로 적용하면 영수증답지 않게 너무 밝아져 도메인 정체성이 사라짐. semantic 카드 패턴(B′)도 적용 안 됨(success/warning/danger 의미 아님). 모달 hero 패턴(D2 → `bg-gray-50` + 강한 heading)도 회색 톤이라 부적합. 그라디언트는 정보 0이지만 어두운 톤 자체는 도메인 정보.

**해결**: 그라디언트만 제거하고 **어두운 단색**(`bg-gray-900`)으로 통일. 도메인 시각 의도(어두운 헤더)는 단색으로 충분히 전달됨. 보조 텍스트도 `text-slate-400` → `text-gray-400`로 토큰 통일. 영수증·약관·계약서처럼 도메인 특성상 어두운 톤이 의미를 갖는 영역은 패턴 B/D2 외 별도 카테고리.

**출처**: PR #30 — `components/accident-receipt/ReceiptView.tsx` L26 영수증 헤더

---

#### §11.3.8 두 플로팅 동시 노출 안티패턴 (위치 충돌 + 시선 분산)

**상황**: dashboard 메인에 `ChatBot`(`bottom-6 right-6 z-50`, `bg-brand-600`)과 `ReferralFloating`(`bottom-24 right-6 z-40`, amber 그라디언트)이 둘 다 우하단 영역에 위치하여 항상 동시에 노출. PR #30 코드 추적 결과 `ReferralFloating`은 `mounted && !dismissed`만 체크하고 ChatBot 활성 여부는 비검사 — 무조건 동시 표시.

**문제**: (1) 우하단 같은 세로 라인(`right-6`)에 두 floating 버튼이 위아래로 쌓여 시선 충돌 — 사용자가 어느 쪽을 누를지 매번 판단. (2) 둘 다 색 영역이면 페이지 brand 한도(5~7곳)를 빠르게 도달 — ChatBot brand + ReferralFloating amber이면 마케팅 영역만으로 2곳 차지. (3) 의도가 다른 두 액션(채팅 진입 vs 추천 코드 확산)이 같은 자리를 경쟁.

**해결 (단기, PR #30 적용)**: 두 플로팅을 **다른 톤**으로 시각 분리. ChatBot은 brand-600 유지(whitelist #3 채팅 진입 시그너처). ReferralFloating은 회색(`bg-white border-gray-200`)으로 회색화 — amber=주의 semantic 충돌도 함께 해소. 같은 자리에 위아래로 보이지만 색으로 위계 분리.

**해결 (장기, 별도 PR 후속)**: 노출 조건 재설계. 한쪽이 활성/expanded일 때 다른 쪽은 숨김. 또는 ReferralFloating dismiss UX 개선(첫 진입 1회 표시 후 자동 dismiss, ChatBot 호버 시 숨김 등). 색 정리만으로는 근본 해결 안 됨.

**출처**: PR #30 — `components/common/ReferralFloating.tsx` 회색화 처리 + 노출 조건 재검토 메모

---

#### §11.3.9 색과 등급 시스템은 분리된 채널 (시각 요청을 데이터 모델 변경으로 받지 말 것)

**상황**: PR #35 영역 C에서 영업 사용자(이종인 이사 5/2 카톡)가 "위험배율을 노랑/빨강 2단계로 통일해달라"고 시각 요청. 첫 직관은 "그럼 `RiskLevel` 타입을 `'high' | 'low'` 2-tier로 narrow하고 분기를 다 정리한다"였음. Phase 0 분석에서 `'moderate'` 의존 코드를 추적한 결과, 타입 narrow + `future-me:310` 라벨 변환 분기 + AI prompt 응답 형식 + 기저장 데이터(`'moderate'` 값을 가진 row)의 호환성까지 회귀 영역이 폭넓게 드러남.

**문제**: 시각 요청을 데이터 모델 변경으로 받으면 회귀 위험이 폭증한다. 영업이 본 것은 "두 색"이지 "두 등급"이 아니다. 색 채널과 등급 채널이 한 string에 묶여 있으면 한쪽만 바꿀 수 없는 강결합이 발생 — §11.3.1에서 학습한 "색이 string에 의존" 안티패턴의 자매 케이스다. §11.3.1이 "색을 string에서 떼어내라"였다면, §11.3.9는 그 다음 결정점: **색을 떼어낸 자리에서 string 등급은 그대로 두고 두 채널을 독립으로 운영하라**.

**해결**: 색 결정과 등급 분류를 다른 함수·다른 입력 형태로 분리. 색은 `relativeRisk: number`만 받는 헬퍼에서 결정 (`lib/risk/risk-color.ts`). 등급 string은 데이터 분류·라벨링 용도로 별도 채널에서 결정 (`lib/risk/risk-matcher.ts` `toRiskLevel`). 두 함수는 서로 호출하지 않고, 서로의 입력으로 쓰이지도 않는다.

```typescript
// 색 채널 — relativeRisk 숫자만 받음, string 등급을 받지 않는다
export function getRiskColorByMultiplier(rr: number): string {
    return rr >= 2.0 ? 'text-red-700' : 'text-amber-700';
}

// 등급 채널 — 데이터 분류·AI 응답 형식·DB 저장값 호환을 위해 3-tier 유지
function toRiskLevel(rr: number): RiskLevel {
    if (rr >= 2.0) return 'high';
    if (rr >= 1.0) return 'moderate';
    return 'low';
}
```

영업의 "2단계" 요청은 색 채널의 임계값(`>=2.0`)만 sync하는 것으로 충족된다. 등급 채널의 3-tier(`high`/`moderate`/`low`)는 그대로 유지 → 분기 처리·기저장 데이터·AI 응답 형식 회귀 0. **§11.3.1이 "색이 데이터에 의존하지 않는다"라면, §11.3.9는 "그렇다고 데이터를 색에 맞춰 깎아내지도 않는다"이다.**

**출처**: PR #35 영역 C — `lib/risk/risk-color.ts` 신규 + `lib/risk/risk-matcher.ts` 임계값 sync (1.8/3.0 → 2.0 단일 컷오프) + `RiskGauge.tsx`·`customers/[id]/page.tsx` 헬퍼 일원화.

---

## §12 검증 체크리스트 *(TBD)*

---

## §13 PR 작성자용 체크리스트

PR을 발의하기 전 task 작성자가 확인:

- [ ] **Step 0a — 현재 코드 상태 확인**: 스크린샷·복붙한 코드가 최신인가? task 작성 시점과 PR 출발 시점 사이에 다른 PR이 머지되어 이미 반영되지 않았는가?
- [ ] **Step 0b — 작업 범위 추리기**: task 명세 중 이미 처리된 항목을 식별. 실제 작업 범위만 남김.
- [ ] **Step 0c — 의미 모호한 시각 요소 사전 분석 (§14 Phase 0)**: 색·배지·아이콘의 의미가 코드를 봐야 알 수 있는 경우, 분석 단계를 task에 명시.
- [ ] **Step 1 이후**: 영역별 변경, 자가 점검, 회귀 검증.

**사례** (PR #26):

- 원 task: "+ 고객 추가" 버튼 그라디언트 → 단색 변경 지시
- 실제 코드: 이미 PR #23에서 `Button` default variant를 `bg-brand-600`으로 변경 → 손댈 필요 없었음
- 사전 확인 단계가 있었다면 task 범위가 정확해졌을 것 — 클코가 실행 전 보고한 후 수정됨

---

## §14 워크플로우

### Phase 0: 사전 분석 (의미 모호한 시각 요소 있을 때)

**조건**: 색·배지·아이콘의 의미가 코드를 보지 않으면 알 수 없을 때.

**순서**:

1. `grep`으로 렌더링 로직 추적 — 어떤 prop·state가 색을 결정하는가
2. 결정 기준을 표로 정리해 보고:

   | 요소 | 현재 상태 (스크린샷) | 결정 기준 (코드 추적 결과) | 의미 |
   |---|---|---|---|

3. 옵션 A/B/C/D 제시. 각 옵션의 장단점 명시
4. 한승수 대표 컨펌 후 작업 진행

**핵심 사례** (PR #25 위험 배율):

- 표면 증상: "UI 색이 이상하다" — 같은 1.6배인데 다른 색
- 실제 원인: 데이터 일관성 문제 — `riskLevel` string 필드와 `relativeRisk` number 필드가 분리되어 있었음
- 분석 안 했으면: "그냥 색만 바꿔" 식 수정 → AI가 다음에 또 다르게 부여하면 같은 문제 재발
- Phase 0 분석 후: 색 결정 입력을 `relativeRisk` 단일 필드로 고정 → 재발 방지 (§11.3.1)

### Phase 1 ~ N *(TBD)*

---

## §15 *(예약)*

## §16 다른 제품으로의 일반화

*(미정 — BoBi 자체가 진행 중이라 일반화 시기상조. BoBi 작업이 모두 완료된 뒤 별도 PR에서 다룸. 이 문서의 어떤 규칙도 현재로서는 BoBi 외 제품에 그대로 적용된다고 가정하지 않는다.)*
