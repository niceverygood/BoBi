# PostHog 분석 + A/B 테스트 설정 가이드

> 사용자 funnel 분석, 기능별 전환율, A/B 테스트를 위한 PostHog 연동.

## 1. PostHog 계정 + 프로젝트 생성

1. [posthog.com](https://posthog.com) 가입 (무료 플랜 월 100만 이벤트)
2. 지역 선택: **EU Cloud** 권장 (한국 개인정보 법 대응 유리)
   - URL: `https://eu.posthog.com`
3. 프로젝트 생성 → API Key 복사 (`phc_xxxxxxxx`)

## 2. Vercel 환경변수

Settings → Environment Variables (Production + Preview + Development):

| 이름 | 값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_xxxxxxxx` | Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | EU 호스트 (기본값) |

**주의**: `NEXT_PUBLIC_` prefix는 **의도적**입니다 — PostHog는 클라이언트에서 초기화되어야 함.

## 3. 자동 수집되는 이벤트

### 페이지뷰
- 모든 경로 변경 시 `$pageview` 자동 전송
- URL 쿼리 파라미터 포함 (민감 파라미터는 Sentry와 별개로 PostHog에 남을 수 있음 — 주의)

### 사용자 식별
- 대시보드 진입 시 `identify(user.id)` 자동 호출
- 이메일/이름은 PostHog에 전송 안 함 (PII 보호)
- `signup_date`만 traits로 기록

## 4. 수동 계측된 이벤트

| 이벤트 이름 | 발생 시점 | 주요 속성 |
|---|---|---|
| `user_login` | 대시보드 첫 진입 | `signup_date` |
| `future_me_generated` | 미래의나 리포트 생성 완료 | `hasCurrentInsurance`, `totalCoverage` |
| `checkout_completed` | 결제 성공 | `provider` (inicis/tosspayments/kakaopay) |
| `checkout_failed` | 결제 실패 | `provider`, `code` |
| `dashboard_followup_shown` | 팔로업 위젯 노출 | `count`, `variant` |
| `dashboard_followup_clicked` | 팔로업 아이템 클릭 | `type`, `daysSince`, `variant` |

## 5. A/B 테스트 설정 — 팔로업 위젯 문구 실험

### PostHog 대시보드 작업

1. **Feature Flags → New feature flag**
2. Key: `followups_widget_copy`
3. **Multivariate** 선택 후 3개 변형:
   - `control` — 가중치 34%
   - `urgent` — 가중치 33%
   - `opportunity` — 가중치 33%
4. Release conditions:
   - 100% of users (또는 특정 그룹만)
5. Save

### 실험 (Experiment) 연결
1. **Experiments → New experiment**
2. Feature flag: `followups_widget_copy` 선택
3. **Primary metric**: `dashboard_followup_clicked` count
4. **Secondary metric**: 각 변형별 총 클릭 수
5. Hypothesis 입력: "긴급성을 강조한 'urgent' 변형이 클릭률을 20% 상승시킨다"
6. **Min sample size**: 각 변형당 200+ 노출 권장
7. Start experiment

### 결과 해석
PostHog → Experiment 상세 → **Winning variant** 표시:
- ✅ 통계적 유의성 95% 이상이면 winner 확정
- ❌ 샘플 부족 또는 효과 미미하면 "Inconclusive"

실험 결과 반영:
- winner가 `urgent`면 → PostHog flag를 `urgent` 100%로 롤아웃
- 코드 변경 없이 PostHog에서만 토글

## 6. 핵심 Funnel 구성

### A. 분석 → 전환 Funnel
Funnels → New funnel:
1. `user_login`
2. `analysis_completed`
3. `future_me_generated`
4. `future_me_shared_kakao` (또는 `future_me_pdf_downloaded`)

**이탈 구간 파악** → 어디서 사용자가 멈추는지 시각화.

### B. 결제 Funnel
1. `subscribe_page_viewed`
2. `checkout_started`
3. `checkout_completed`

**결제 실패율** = failed / (failed + completed).

### C. 리텐션 Funnel
Paths 차트:
1. 시작: `$pageview` to `/dashboard`
2. 2단계 내 `dashboard_followup_clicked` 발생 여부

## 7. Cohort (사용자 그룹)

중요한 코호트 정의:
- **파워 유저**: `future_me_generated` 5회 이상
- **이탈 위험**: 최근 7일 로그인 없음
- **팔로업 무시자**: `dashboard_followup_shown` > 3 && `dashboard_followup_clicked` = 0

→ 각 코호트에 맞춤 리텐션 캠페인 가능.

## 8. Session Replay 활성화 (선택)

PostHog → Session Replay → Settings:
- **Record**: 10% 샘플링
- **Mask inputs**: 기본 ON (민감정보 보호)
- **Mask text**: OFF (한글 UI 가독성 유지)

용량 초과 시 샘플링 5%로 축소.

## 9. 비용 관리

### 무료 플랜 한도 (월)
- 이벤트: 100만
- 세션 리플레이: 5천
- Feature flag 평가: 100만

### 예상 사용량 (월 활성 사용자 1,000명 기준)
- 페이지뷰: ~30,000
- 수동 이벤트: ~20,000
- Feature flag: ~30,000
- **합계: 월 80,000 이벤트** → 무료 플랜 내 (여유 88%)

### 초과 시 대응
1. `autocapture: false` 유지 (이미 설정됨)
2. 세션 리플레이 샘플링 축소
3. 유료 플랜 전환: $0.00031/이벤트 (100만 이상부터)

## 10. GDPR / 개인정보보호법 대응

### 현재 설정
- ✅ IP 저장 안 함 (`ip: false`)
- ✅ 입력값 마스킹 (카드/주민번호 자동 차단)
- ✅ Do Not Track 브라우저 설정 존중 (`respect_dnt: true`)
- ✅ 이메일/이름 PostHog에 전송 안 함 (id만)

### 추가 권장
- 개인정보처리방침에 PostHog 사용 명시
- "분석 쿠키 거부" 버튼 추가 (cookie consent banner)
- 유럽 EU 지역 데이터 저장 (위에서 EU Cloud 선택)

## 11. 디버깅

### 이벤트가 안 보이는 경우
1. 브라우저 콘솔 → `posthog` 객체 있는지 확인
2. `posthog.debug(true)` 호출 → 모든 이벤트 콘솔 출력
3. Network 탭 → `eu.i.posthog.com/e/?...` 요청 확인
4. PostHog → **Live Events** 탭에서 실시간 수신 확인

### Feature Flag가 적용 안 되는 경우
1. PostHog → Flags 탭에서 해당 flag가 Enabled인지
2. Release conditions에 현재 사용자가 포함되는지
3. 코드에서 `useFeatureFlag`의 반환값이 `undefined`인지 확인 (flag 미존재)
4. `posthog.reloadFeatureFlags()` 호출 후 재확인

## 12. Sentry와의 관계

두 도구는 다른 용도:

| 도구 | 용도 | 데이터 |
|---|---|---|
| **Sentry** | 에러 트래킹 + 성능 | 예외, 스택 트레이스, 느린 요청 |
| **PostHog** | 제품 분석 + A/B | 이벤트, funnel, 코호트, 실험 |

사용자 행동 중 에러 발생 시:
- Sentry: 에러 그 자체
- PostHog: 에러 직전 사용자 행동 (breadcrumb)

PostHog에서 "Sentry URL" 링크 통합 가능 (Integrations 탭).

## 운영 체크리스트

- [ ] PostHog 프로젝트 생성 (EU Cloud 권장)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` Vercel 환경변수 등록
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` 등록 (EU = `https://eu.i.posthog.com`)
- [ ] Vercel 재배포
- [ ] 대시보드 접속 → Live Events에 `$pageview`, `user_login` 수신 확인
- [ ] Feature Flag `followups_widget_copy` 생성 + 3개 변형
- [ ] Experiment 시작 (Primary metric: `dashboard_followup_clicked`)
- [ ] 2주 후 결과 확인 + winner 롤아웃
- [ ] 개인정보처리방침에 PostHog 명시
