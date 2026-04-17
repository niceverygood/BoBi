# KG이니시스 직접 연동 가이드

> PortOne을 거치지 않고 INIpay Standard + INIAPI로 직접 연동하는 방식.

## 변경 범위

| 항목 | 이전 (PortOne 경유) | 이후 (직접 연동) |
|---|---|---|
| 빌링키 발급 | PortOne V2 SDK `requestIssueBillingKey` | INIpay Standard JS SDK `INIStdPay.pay()` |
| 빌링 승인 (첫 결제) | PortOne `payWithBillingKey` | INIAPI `https://iniapi.inicis.com/api/v1/billing` |
| 정기 갱신 | PortOne `payWithBillingKey` | INIAPI 동일 엔드포인트 |
| 결제수단 제어 | PortOne SDK에 종속 (앱카드 불가) | `acceptmethod` 파라미터로 완전 자유 |
| provider 값 | `portone_inicis` | `inicis_direct` |

## 신규 파일

- `lib/inicis/hash.ts` — SHA256/SHA512 + timestamp
- `lib/inicis/types.ts` — 인터페이스
- `lib/inicis/server.ts` — 빌링키 발급 폼 빌드 + authUrl 승인 + INIAPI 청구
- `app/api/inicis/prepare-billing-key/route.ts` — 폼 파라미터 서명 후 반환
- `app/api/inicis/billing-key-return/route.ts` — returnUrl 콜백: authToken → 빌링키 → 첫 결제 → 구독 생성
- `scripts/create_inicis_pending_billing_keys.sql` — 발급 세션 테이블

## 수정된 파일

- `app/dashboard/subscribe/page.tsx` — `handleCardSubscribe`가 INIpay JS SDK 호출로 전환
- `app/api/cron/renew-subscriptions/route.ts` — `inicis_direct` provider 갱신 지원

## 배포 전 필수 작업

### 1. Supabase 마이그레이션 실행
```sql
-- scripts/create_inicis_pending_billing_keys.sql 내용을
-- Supabase 대시보드 → SQL Editor에서 실행
```

### 2. Vercel 환경변수 추가

| 이름 | 값 | 설명 |
|---|---|---|
| `INICIS_MID` | `MOIbobi998` | 정기결제 전용 MID |
| `INICIS_SIGN_KEY` | `bk8yL1pKeXhZNmlzSW9DWEFEZjFOZz09` | 웹결제 signkey |
| `INICIS_API_KEY` | `t1C8Xvx3p10CMeaz` | INIAPI Key |
| `INICIS_API_IV` | `sBLwK9Q6PVg3j7==` | INIAPI IV (현재 미사용, 추후 AES 암호화용) |
| `INICIS_MODE` | `production` | 운영 / `test`로 바꾸면 스테이징 |

Vercel → Settings → Environment Variables → 위 5개 추가 (Production · Preview · Development 모두).

### 3. 포트원 환경변수는 유지 OR 제거

PortOne 환경변수(`NEXT_PUBLIC_PORTONE_*`)는:
- **유지**: 기존에 PortOne으로 발급된 빌링키 갱신 시 필요 (현재 사용자 없으므로 불필요)
- **제거 가능**: 완전 INICIS 직접 연동으로 전환한 후

현재 상황: 기존 PortOne 구독자가 없으므로 제거해도 안전합니다. 단, 크론 코드에서 `payWithBillingKey` 호출 경로는 폴백으로 남겨둠.

## 동작 플로우

### 첫 결제 (빌링키 발급 + 구독 생성)

1. 사용자가 subscribe 페이지에서 신용카드 선택 + 구매자 정보 입력 + "결제하기" 클릭
2. 프론트 → `POST /api/inicis/prepare-billing-key`
3. 서버: OID 생성 + signature/verification/mKey 계산 + `inicis_pending_billing_keys` DB에 세션 저장 + 폼 파라미터 반환
4. 프론트: INIpay JS SDK 로드 → 동적 form 생성 → `INIStdPay.pay(formId)` 호출 → 결제창 팝업
5. 사용자: 카드 정보 + 앱카드/ISP/공동인증서 중 선택하여 인증
6. INIpay → `returnUrl` (`/api/inicis/billing-key-return`) 에 POST (authToken + authUrl)
7. 서버:
   a. `authUrl`에 승인 요청 → 최종 `billKey` 수신
   b. `inicis_pending_billing_keys`에서 세션 복원 (플랜/쿠폰/구매자정보)
   c. INIAPI `/api/v1/billing` 호출로 실제 첫 결제 실행
   d. `subscriptions` 테이블에 active 구독 생성 (`payment_provider=inicis_direct`, `payment_key=billKey`)
   e. `billing_keys` 테이블에 업서트 (cron용)
   f. 쿠폰 사용 기록 + `usage_tracking` 갱신
   g. 브라우저를 `/dashboard/subscribe?inicis_status=success` 로 303 리다이렉트
8. 프론트 `useEffect`가 `inicis_status=success` 감지 → 완료 화면 표시

### 정기 갱신 (매일 자정 cron)

1. Vercel Cron → `GET /api/cron/renew-subscriptions` (Bearer CRON_SECRET)
2. 만료된 active 구독 중 `payment_provider='inicis_direct'` 필터
3. `billing_keys.billing_key` 조회
4. `chargeBillkey({billKey, price, ...})` 호출
5. 성공 시 `current_period_*` 연장 + `usage_tracking` 리셋
6. 실패 시 `past_due` 전환 → 3일 내 재시도 → 실패 지속 시 자동 취소

## 결제창 수단 제어

`lib/inicis/server.ts:buildBillingKeyForm`의 `acceptmethod` 생성 부분:

```typescript
const acceptParts: string[] = ['BILLAUTH(Card)'];
if (input.enableEasyPay !== false) acceptParts.push('noeasypay(N)');  // 간편결제 ON
if (input.enableIsp !== false) acceptParts.push('useisp(Y)');          // ISP/안심클릭 ON
if (input.enableAppCard !== false) acceptParts.push('cardcode(...)');  // 앱카드 카드사 목록
```

`prepare-billing-key` 라우트에서 `enableAppCard: true` 등으로 기본 모두 ON.
추후 UI에서 사용자가 원하는 수단만 선택하도록 확장 가능.

## 롤백 방법

문제 발생 시 PortOne 경로로 즉시 복귀:

1. `app/dashboard/subscribe/page.tsx`의 `handleCardSubscribe` 함수를 이전 git commit에서 복원
2. `NEXT_PUBLIC_PORTONE_*` 환경변수 그대로 유지되어 있으므로 추가 작업 불필요
3. 크론은 `inicis_direct` 분기만 추가된 것이라 PortOne 경로는 그대로 작동

## 트러블슈팅

### 결제창이 안 뜸
- INIpay JS SDK 로드 실패 → 콘솔에서 `stdpay.inicis.com` 요청 확인
- `INICIS_MODE=test`로 설정 시 스테이징 SDK 사용

### returnUrl 콜백 404
- Vercel 재배포 확인
- `returnUrl`이 https여야 함 (INIpay는 http 거부)

### 빌링키 승인 실패 (authUrl)
- `INICIS_SIGN_KEY`가 정확한지 확인 (가맹점관리자 → 웹결제 Sign Key 조회와 일치)
- 로그에서 `authUrl` 응답 확인

### INIAPI 청구 실패
- `INICIS_API_KEY` 확인 (가맹점관리자 → INIAPI Key 조회)
- `hashData` 계산 로직 확인 (`apiKey + mid + 'billing' + timestamp + JSON(data)`)
- INIAPI에 가맹점 계약된 paymethod가 `Card`인지 확인

### 세션 복원 실패 ("pending 레코드 없음")
- `inicis_pending_billing_keys` 테이블이 Supabase에 생성되었는지 확인
- RLS 정책 때문에 service_role로 접근해야 — 서버 라우트에서 `createServiceClient` 사용 확인

## 테스트 시나리오

1. **정상 결제**: 베이직 월간 선택 → 카드정보 입력 → 승인 → `inicis_status=success` 확인
2. **취소**: 결제창에서 X 버튼 → `inicis_status=closed` 에러 표시
3. **카드 한도초과**: 카드사 거절 → `inicis_status=payment_failed` + 사유 코드
4. **쿠폰 100%**: 0원 결제 → INIAPI 호출 스킵, 바로 구독 생성
5. **재결제**: 구독 `current_period_end`를 과거로 수동 업데이트 → cron 수동 호출 → 갱신 확인
