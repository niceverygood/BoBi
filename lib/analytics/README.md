# 분석·추적 시스템

보비는 두 가지 분석 시스템을 병행해 사용합니다:

| 시스템 | 용도 | 환경변수 |
|---|---|---|
| **PostHog** | 제품 분석 (퍼널, retention, feature usage) | `NEXT_PUBLIC_POSTHOG_KEY` |
| **Meta Pixel + Conversions API** | 광고 전환 추적 (페북·인스타 광고 ROI) | `NEXT_PUBLIC_FB_PIXEL_ID`, `FB_CAPI_ACCESS_TOKEN` |

## Meta Pixel + CAPI 활성화

### 1. Meta Business Manager에서 받아오기

1. [business.facebook.com](https://business.facebook.com) → 이벤트 매니저 → 데이터 소스 → **새 픽셀**
2. 픽셀 생성 후 **픽셀 ID** 복사 (15~16자리 숫자)
3. 픽셀 설정 → **Conversions API** → 액세스 토큰 생성 → 긴 문자열 복사
4. (선택) 비즈니스 매니저 → **브랜드 안전 → 도메인** → `bobi.co.kr` 추가 → 메타 태그 방식 인증 → `content` 값 복사

### 2. Vercel ENV에 추가

```
NEXT_PUBLIC_FB_PIXEL_ID=<픽셀ID>
FB_CAPI_ACCESS_TOKEN=<CAPI 토큰>
NEXT_PUBLIC_FB_DOMAIN_VERIFICATION=<도메인 인증 코드>  # 선택
```

배포 후 **자동 활성화**됩니다. ENV 없으면 모든 추적이 no-op.

### 3. 테스트

이벤트 매니저 → **테스트 이벤트** 탭에서 6자리 코드 발급 후 Vercel ENV에 임시 추가:
```
FB_CAPI_TEST_EVENT_CODE=TEST1234
```
사이트에서 회원가입·결제 등 동작 → 테스트 이벤트 탭에 실시간 표시. 확인 후 ENV 제거.

## 추적되는 전환 이벤트

| 이벤트 | 발화 시점 | 위치 | value |
|---|---|---|---|
| `PageView` | 모든 라우트 진입 | `MetaPixel` 자동 | - |
| `CompleteRegistration` | 회원가입 성공 | `app/auth/signup/page.tsx` | - |
| `StartTrial` | 3일 무료체험 시작 (토스 빌링키 발급) | `app/api/tosspayments/billing-success/route.ts` | 0 |
| `Subscribe` | 첫 정기결제 성공 | 토스/이니시스 success route | 결제 금액 (KRW) |
| `Lead` | 진료조회/건강검진/사고접수 시작 | `components/analytics/TrackFeatureUse.tsx` | - |

## 클라이언트에서 새 이벤트 추가하기

```typescript
import { trackConversion } from '@/lib/analytics/fb-pixel';

// 광고 전환 이벤트 — 픽셀 + CAPI 동시 발사 (dedup 처리됨)
await trackConversion('AddPaymentInfo', {
    eventId: `payment-info-${userId}-${Date.now()}`,  // 멱등성 보장
    email,
    plan_slug: 'pro',
});
```

## 서버에서 새 이벤트 추가하기

```typescript
import { sendFbCapiEvent } from '@/lib/analytics/fb-capi';

await sendFbCapiEvent({
    event: 'Purchase',
    eventId: `purchase-${orderId}`,
    value: 50000,
    currency: 'KRW',
    email: userEmail,        // SHA256 해시되어 전송
    userId: user.id,
    eventSourceUrl: 'https://bobi.co.kr/checkout/success',
    customData: { product: 'pro_yearly' },
});
```

## 클라이언트·서버 dedup

같은 `eventId`를 양쪽에서 보내면 Meta가 중복 제거합니다.
- `trackConversion()`는 내부에서 픽셀과 서버 CAPI를 같은 `eventId`로 자동 호출
- 서버에서 직접 `sendFbCapiEvent()`만 호출 시 멱등성 위해 `subscription.id` 같은 안정 ID를 `eventId`로 사용

## 디버그

`FB_CAPI_DEBUG=1` 환경변수로 서버 콘솔에 CAPI 호출 로그 출력 (ENV 미설정 스킵 사유 포함).
