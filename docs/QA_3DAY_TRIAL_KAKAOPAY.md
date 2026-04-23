# QA 체크리스트: 3일 무료 체험 + 카카오페이 지원

> 브랜치: `claude/kakaopay-trial`
> 관련 커밋: `e43a943` (카카오페이 체험 지원), `33ac1ab` (7일→3일), 본 커밋 (결제 화면 안내 강화)

이 기능을 main에 머지하기 전에 반드시 실제 결제 환경에서 확인해야 하는 항목 모음입니다.

---

## 🚨 배포 전 필수 사전 작업

### 1. DB 마이그레이션 (Supabase SQL Editor)
```sql
-- 카카오페이 체험 플로우 지원
\i scripts/add_intent_to_kakaopay_sessions.sql
```
→ `kakaopay_sessions.intent` 컬럼 추가 확인

### 2. 환경변수 확인
- `KAKAOPAY_CID` — 프로덕션 정기결제 CID (테스트 환경은 `TCSUBSCRIP`)
- `KAKAOPAY_SECRET_KEY` — SECRET_KEY (카카오페이 가맹점센터에서 발급)
- `CRON_SECRET` — trial-end cron 인증용 (기존)

---

## ✅ 실환경 QA 시나리오

### 시나리오 A. 카카오페이 체험 가입 정상 플로우

**준비:**
- 테스트 계정 (체험 이력 없음, 구독 없음 — 무료 플랜)

**단계:**
1. `/pricing` 접속 → **"3일 무료 체험 시작"** 버튼 (베이직 카드) 확인
2. 클릭 → `/dashboard/subscribe?plan=basic` 이동
3. "3일 무료 체험 사용 (권장)" **체크박스 체크**
4. 결제 수단 **카카오페이** 선택
5. 카카오페이 선택 시 노란색 **"100원 임시결제 → 즉시 환불"** 알림 박스 표시 확인
6. CTA 바로 위 보라색 **"📋 오늘 결제 안내"** 박스 표시 확인 (4개 불릿: 100원 결제 / 자동 환불 / 3일 뒤 자동청구 / 해지 시 0원)
7. **"✨ 3일 무료 체험 시작"** CTA 클릭
8. 카카오페이 인증 → 카드/머니 선택 → 승인

**검증 (서버·DB):**
```sql
-- 체험 구독 생성 확인
SELECT status, trial_ends_at, current_period_end, payment_provider, payment_key
FROM subscriptions
WHERE user_id = '<테스트유저ID>'
ORDER BY created_at DESC LIMIT 1;
-- 기대: status='trialing', trial_ends_at ≈ now() + 3 days
```

```sql
-- payment_history에 100원 + refunded 기록
SELECT amount, status, payment_id
FROM payment_history
WHERE user_id = '<테스트유저ID>'
ORDER BY created_at DESC LIMIT 1;
-- 기대: amount=100, status='refunded'
```

```sql
-- 체험 이력 기록 (중복 체험 방지)
SELECT * FROM trial_history WHERE user_id = '<테스트유저ID>';
-- 기대: plan_slug='basic', converted=false
```

**검증 (카카오페이 가맹점센터 `pg.kakao.com`):**
- 통합 결제 내역에서 **동일 시각의 결제 100원 + 취소 −100원** 2줄 확인

**검증 (클라이언트):**
- 리다이렉트 URL에 `?status=success&plan=basic&trial=1` 포함
- **성공 페이지**에 노란색 **"카카오페이 알림: 100원이 결제 후 즉시 환불되었습니다"** 박스 표시 확인
- 대시보드 접근 시 베이직 플랜 기능 사용 가능

---

### 시나리오 B. 토스페이먼츠 체험 가입 (기존 플로우 유지 확인)

1~3 시나리오 A와 동일
4. 결제 수단 **토스 카드** 선택 (카카오페이 알림 박스 **미표시** 확인)
5. CTA 위 보라색 "📋 오늘 결제 안내" 박스가 토스용 문구(0원만 청구, 3일 뒤 자동청구)로 표시되는지 확인
6. CTA 클릭 → 토스 카드 등록 → 성공
7. 성공 페이지에서 **카카오페이 알림 박스 미표시** 확인 (토스 사용자에게만 안 보임)

**DB 검증:**
- `subscriptions.payment_provider='tosspayments_direct'`
- `trial_ends_at` = 3일 뒤
- `payment_history`에 **첫 결제 레코드 없음** (토스는 체험 시 카드만 등록)

---

### 시나리오 C. 3일 후 자동 결제 (Trial 종료 시뮬레이션)

**방법 1: 실시간 대기 (정석)**
- 3일 기다림 + cron 01:00 UTC 실행 관찰

**방법 2: 수동 시뮬레이션 (권장)**
```sql
-- 체험 종료일을 과거로 앞당김
UPDATE subscriptions
SET trial_ends_at = NOW() - INTERVAL '1 minute'
WHERE user_id = '<테스트유저ID>'
  AND status = 'trialing';
```

```bash
# cron 수동 호출
curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://www.bobi.co.kr/api/cron/trial-end"
```

**검증:**
```sql
SELECT status, current_period_start, current_period_end
FROM subscriptions WHERE user_id = '<테스트유저ID>';
-- 기대: status='active', period 재설정
```

- 카카오페이 가맹점센터: **연속 결제 내역**에 19,900원 자동결제 레코드 1건 추가
- `trial_history.converted = true` 업데이트 확인

---

### 시나리오 D. 체험 중 해지

1. 체험 상태(`trialing`)에서 `/dashboard/settings` → 구독 해지
2. 3일차 이전 해지 → cron 실행 시 skip (or `status='cancelled'`)
3. 카카오페이 SID는 `kakaoPayInactivate` 또는 DB에서 billing_key 삭제
4. **결제 0원 유지** 확인 (가맹점센터에 추가 결제 없어야 함)

---

### 시나리오 E. 예외 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 이미 체험 사용한 유저가 재시도 | `/api/billing/trial-eligibility` → `eligible: false` → 체험 체크박스 숨김 |
| 체험 자격 없는데 클라에서 `intent=trial` 전달 시도 | `/api/kakaopay/ready` 에서 재검증 → 일반 결제로 다운그레이드 (정가 청구) |
| 100원 mini 환불 실패 | Sentry 알림 + 구독은 `trialing`으로 생성 (수동 환불 필요). 가맹점센터에서 확인·취소 |
| 3일차 자동결제 실패 | `status='past_due'` + Sentry 알림 |
| 신용카드(KG이니시스) 선택 + 체험 체크 | `useEffect`로 자동 `tosspayments`로 전환 (신용카드 체험 미지원) |

---

## 🎨 UI 회귀 확인

### 카피 검증 체크리스트
- [ ] 랜딩 `/` CTA 섹션: "베이직은 **3일** 무료로 시작하세요"
- [ ] `/pricing` 베이직 카드:
  - 배지 "3일 무료 체험"
  - "첫 3일 무료 · 언제든 해지 가능"
  - CTA 버튼 "3일 무료 체험 시작"
- [ ] `/dashboard/subscribe` 체험 섹션:
  - "첫 결제 3일 무료 체험"
  - "오늘 카드를 등록하고 3일간 모든 기능을 써보세요"
  - 체크박스 "3일 무료 체험 사용 (권장)"
- [ ] `TrialPromoBanner` (대시보드 상단): "베이직 플랜 3일 무료 체험"
- [ ] `TrialUpsellModal`: "3일 무료 체험을 준비했습니다"
- [ ] `FeatureGate`: "먼저 베이직을 3일 무료로 써보세요"
- [ ] 마중물 페이지 (`/upgrade/medical-info`): "3일 무료 체험", STATS "3일 무료 체험"
- [ ] 성공 페이지: "3일 무료 체험 시작!" + "3일간 무료"

### 고정 7일 (변경 금지 확인)
- [ ] 이용약관: "결제일로부터 7일 이내 전액 환불" (법적)
- [ ] 개인정보처리방침: "무료 7일 보관" (저장 정책)
- [ ] 카카오 공유 링크: "7일간 유효"
- [ ] 리퍼럴 시스템: "인바이터 7일 / 친구 3일" (별도 정책)
- [ ] 의학 고지사항: "7일 이상 치료"

---

## ⚠️ 알려진 제약 및 추후 개선

1. **100원 환불 실패 시**: try/catch로 통과하고 Sentry에만 기록. 구독은 정상 생성되지만 고객이 100원 환불 안 된 상태가 될 수 있음. 현재 실패율 낮음으로 추정하고 수동 대응. → 자동 재시도 cron 추후 고려.

2. **리퍼럴 리워드 불일치**: 인바이터 7일 / 친구 3일 보상이 정규 체험 3일보다 후함. 체험이 3일로 줄어든 만큼 리퍼럴 보상도 조정할지 **사업팀 재검토 필요**.

3. **신용카드 체험 미지원**: KG이니시스는 체험 플로우 미구현. 체험 체크 시 자동으로 토스 전환. 향후 이니시스 빌링키 방식으로 확장 가능.

4. **연간 결제는 카카오페이 미지원**: 기존 제약 유지.
