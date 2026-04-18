# Sentry 에러 트래킹 설정 가이드

> 운영 중 발생하는 결제 실패, AI 에러, 사용자 에러를 실시간으로 추적하기 위한 Sentry 연동.

## 1. Sentry 계정 + 프로젝트 생성

1. [sentry.io](https://sentry.io) 가입 (무료 플랜 월 5,000 에러)
2. **Projects → Create Project** → **Platform: Next.js** 선택
3. 프로젝트 이름: `bobi-web`
4. 생성 후 DSN 복사 (`https://xxxxx@oXXXX.ingest.sentry.io/XXXXX`)

## 2. Vercel 환경변수 추가

**Settings → Environment Variables → Production·Preview·Development 모두:**

| 이름 | 값 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxxxx@oXXXX.ingest.sentry.io/XXXXX` | 브라우저 + 서버 공용 DSN |
| `SENTRY_ORG` | Sentry 조직 slug (URL의 `sentry.io/organizations/{slug}`) | 소스맵 업로드용 |
| `SENTRY_PROJECT` | `bobi-web` (프로젝트 slug) | 소스맵 업로드용 |
| `SENTRY_AUTH_TOKEN` | Sentry에서 발급한 Auth Token | 빌드 시 소스맵 업로드 |

### Auth Token 발급
Sentry → **Settings → Account → API → Auth Tokens → Create New Token**:
- 권한: `project:releases`, `project:read`, `org:read`
- Vercel에 복사

## 3. 배포

`NEXT_PUBLIC_SENTRY_DSN`만 세팅해도 동작하지만, `SENTRY_AUTH_TOKEN`까지 있어야 소스맵이 업로드되어 **스택 트레이스에 원본 코드가 보임**.

배포 후 테스트:
```ts
// 아무 API에서 일부러 에러 발생
throw new Error('Sentry test error');
```
→ Sentry 대시보드 **Issues** 탭에서 수 초 내 확인 가능.

## 4. 민감정보 마스킹 확인

자동 마스킹되는 항목 (`sentry.server.config.ts`, `sentry.client.config.ts`):
- ✅ URL 쿼리 파라미터: `token`, `authKey`, `billingKey`, `customerKey`, `api_key`, `signkey`, `paymentId` 등
- ✅ HTTP 헤더: `Authorization`, `Cookie`
- ✅ 에러 메시지/스택의 주민등록번호, 카드번호, Bearer 토큰, 32자+ 토큰 문자열
- ✅ 이메일 local part (`user@example.com` → `***@example.com`)
- ✅ 쿠키 전체 제거
- ❌ 유저 IP는 Sentry가 자동 수집 (무시 가능)

**수동 확인 방법**: Sentry → 첫 에러 발생 후 → Issue 상세 → Tags/Contexts에 민감정보 노출 여부 확인.

## 5. 알림 설정

### Slack/카톡 통합
Sentry → **Settings → Integrations → Slack** → 워크스페이스 연결 → 채널 지정 (`#alerts`)

**추천 알림 룰** (Alerts → Create Alert):

| 룰 이름 | 조건 | 액션 |
|---|---|---|
| **결제 관련 새 이슈** | `area:billing` 태그 있고 처음 발생 | Slack 즉시 |
| **에러 급증** | 1시간 내 같은 이슈 50회 이상 | Slack 경고 |
| **갱신 실패율 저하** | `alert:low_success_rate` 태그 발생 | Slack 즉시 |
| **FATAL 레벨** | `level:fatal` | SMS/카톡 즉시 |

## 6. 태그 기반 필터링

Sentry Issues 탭에서 `area:billing`, `provider:inicis_direct` 등으로 필터:

| 태그 | 값 | 의미 |
|---|---|---|
| `area` | `analyze` / `billing` / `alimtalk` / `future-me` | 기능 영역 |
| `provider` | `inicis_direct` / `tosspayments_direct` / `kakaopay` | 결제 프로바이더 |
| `stage` | `billing_key_issue` / `first_charge` / `return_exception` | 결제 단계 |
| `job` | `cron_renew` | 크론잡 |
| `api` | `analyze` / ... | API 경로 |

## 7. 비용 관리

### 무료 플랜 한도
- 에러 이벤트: 월 5,000개
- 트랜잭션 (성능 추적): 월 10,000개
- Session replay: 월 500개
- 첨부파일: 월 1GB

### 현재 설정 기준 예상 사용량
- 에러: **월 500~2,000개** (정상 운영 시), 이슈 발생 시 급증
- 트랜잭션: `tracesSampleRate=0.1`로 10%만 → **월 2,000~5,000개**
- 세션 리플레이: `replaysOnErrorSampleRate=0.1` → **월 50~200개**

→ 무료 플랜으로 충분. 사용자 1만 명 넘어가면 Team 플랜($26/월) 검토.

### 사용량 줄이기
만약 무료 한도 초과 위험 시:
1. `sentry.server.config.ts`에서 `tracesSampleRate: 0.05` (5%로 축소)
2. `ignoreErrors`에 소음성 에러 추가
3. Session Replay 끄기 (`replaysOnErrorSampleRate: 0`)

## 8. 수동 에러 캡처 (코드 내에서 명시적 호출)

```typescript
import { captureError, captureWarning, addBreadcrumb } from '@/lib/monitoring/sentry-helpers';

// 치명적 에러
try {
    await someApiCall();
} catch (err) {
    captureError(err, {
        area: 'billing',
        level: 'error',
        tags: { provider: 'inicis_direct', stage: 'first_charge' },
        metadata: { userId, planSlug, amount },
    });
    throw err;
}

// 경고 (에러는 아니지만 주의)
if (retryCount > 3) {
    captureWarning('결제 재시도 3회 초과', {
        area: 'billing',
        metadata: { userId, retryCount },
    });
}

// 사용자 액션 로그 (에러 발생 시 맥락 제공)
addBreadcrumb('user-action', '쿠폰 적용 시도', { couponCode: 'XXX' });
```

## 9. 소스맵 업로드 확인

배포 후 Sentry → **Releases → 최신 릴리스 → Artifacts** 에서 소스맵 파일 존재 확인.

소스맵 없으면 스택트레이스가 `/chunks/app/_not-found.js:1:12345` 같은 **난독화된 코드**로 보임.
소스맵 있으면 `/app/api/analyze/route.ts:287` 같이 **원본 코드 경로**로 보임.

## 10. 민감한 이슈 Sentry에서 삭제

우발적으로 민감정보가 캡처된 경우:
1. Sentry → Issue 상세
2. 우상단 `···` → **Delete & Discard**

## 운영 체크리스트

- [ ] Sentry 프로젝트 생성 완료
- [ ] `NEXT_PUBLIC_SENTRY_DSN` Vercel 등록
- [ ] `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` Vercel 등록
- [ ] Vercel 재배포
- [ ] 테스트 에러 1회 발생 + Sentry Issues에 표시 확인
- [ ] 민감정보 마스킹 검증 (카드번호, 이메일 등)
- [ ] Slack 통합 연결
- [ ] 주요 알림 룰 3개 이상 생성
- [ ] 팀원들에게 Sentry 초대 (Organization → Members)
