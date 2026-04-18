# 토스페이먼츠 자동결제(빌링) 연동 가이드

> **공동인증서 없이** 카드 정보 + 휴대폰 본인인증만으로 정기결제 등록 가능.
> 주부/중장년 고객층에 특히 친숙한 UX.

## 결제 플로우

1. 사용자가 구독 페이지에서 **"토스 카드"** 선택 + 구매자 정보 입력
2. 프론트 → `POST /api/tosspayments/prepare-billing` → customerKey + SDK 파라미터 반환
3. 프론트: 토스페이먼츠 SDK(`tossPayments.requestBillingAuth('카드', {...})`) 호출 → **결제창 팝업**
4. 사용자: **카드번호 + 유효기간 + 생년월일 + 휴대폰 본인인증** (공동인증서 ❌)
5. 성공 시 토스가 `successUrl` (`/api/tosspayments/billing-success`)로 리다이렉트
6. 서버: authKey → billingKey 발급 → 쿠폰 재검증 + 첫 결제 → 구독 생성 → `/dashboard/subscribe?toss_status=success`로 리다이렉트
7. cron이 매일 자정 만료 구독 조회 → billingKey + customerKey로 `/v1/billing/{billingKey}` 호출하여 자동 갱신

## 환경변수 (필수)

Vercel → Settings → Environment Variables 에서 **Production·Preview·Development** 모두 추가:

| 이름 | 값 (테스트) | 값 (운영) | 설명 |
|---|---|---|---|
| `NEXT_PUBLIC_TOSSPAYMENTS_CLIENT_KEY` | `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm` | 계약 후 발급 | 클라이언트용 공개 키 |
| `TOSSPAYMENTS_SECRET_KEY` | `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6` | 계약 후 발급 | 서버용 시크릿 키 |

⚠️ 자동결제(빌링)는 토스페이먼츠와 **리스크 검토 + 추가 계약** 후에만 사용 가능:
- 고객센터 1544-7772 / support@tosspayments.com
- 계약 완료 후 [개발자센터 → API 키](https://developers.tosspayments.com/my/api-keys)에서 자동결제 MID 전용 라이브 키 발급

## Supabase 마이그레이션

SQL Editor에서 실행:
```
scripts/create_tosspayments_pending_billing.sql
```

생성 테이블:
- `tosspayments_pending_billing`: 빌링키 발급 중인 세션 임시 저장 (customer_key PK)
- `tosspayments_customer_keys`: user_id → customerKey + billingKey 매핑 (cron 갱신용)

## 방화벽 (Vercel은 자동으로 outbound 허용)

토스페이먼츠 API 호출: `api.tosspayments.com` (`HTTPS`, `TLS 1.2+`)

라이브 환경의 경우 이니시스와 달리 별도 IP 화이트리스트 등록 불필요.

## 테스트 방법

### 테스트 환경에서
- 테스트 시크릿 키 (`test_gsk_*`) 사용 시 모든 결제가 가상 승인
- **카드 번호 앞 6자리(BIN)만 유효**해도 자동결제 등록 가능
- 휴대폰 본인인증: `000000` 입력
- [개발자센터 → 테스트 결제내역](https://developers.tosspayments.com/my/payment-logs)에서 확인

### 라이브 환경 전환
1. 토스페이먼츠와 자동결제 계약 완료
2. 라이브 시크릿/클라이언트 키 발급받아 Vercel 환경변수 교체
3. 실제 카드로 소액 결제 테스트

## 롤백

문제 발생 시 subscribe 페이지에서 "토스 카드" 버튼만 숨기면 됨:

```tsx
// app/dashboard/subscribe/page.tsx — 토스 버튼 조건부 숨김
{process.env.NEXT_PUBLIC_TOSSPAYMENTS_ENABLED === 'true' && (
    <button onClick={() => setPaymentMethod('tosspayments')}>토스 카드</button>
)}
```

또는 백엔드는 놔두고 UI에서만 제거.

## 이니시스 / 카카오페이와 공존

| 결제수단 | DB `payment_provider` | 설명 |
|---|---|---|
| 카카오페이 | `kakaopay` | 카카오 SID 정기결제 |
| 토스 카드 | `tosspayments_direct` | 토스 빌링키 — **공동인증서 없이** |
| 신용카드 (이니시스) | `inicis_direct` | 공동인증서 인증 포함 — fallback |

cron은 provider에 따라 자동 분기:
- `app/api/cron/renew-subscriptions/route.ts`에서 provider별 로직

## 에러 코드 참고

| 에러 코드 | 원인 | 대응 |
|---|---|---|
| `NOT_SUPPORTED_METHOD` | 자동결제 미계약 클라이언트 키 사용 | 계약된 자동결제용 키 사용 |
| `UNAUTHORIZED_KEY` | 시크릿 키 잘못됨 | `TOSSPAYMENTS_SECRET_KEY` 재확인 |
| `INVALID_CARD_NUMBER` | 카드번호 무효 | 사용자에게 재입력 요청 |
| `REJECT_CARD_PAYMENT` | 잔액 부족 / 한도 초과 | 다른 카드 권장 |

전체 목록: https://docs.tosspayments.com/reference/error-codes

## 빌링키 유효기간

- 카드 유효기간과 동일
- 카드 재발급/만료 시 자동 실패 → 새 카드로 빌링키 재발급 필요
- 별도 빌링키 갱신 API는 **없음**
