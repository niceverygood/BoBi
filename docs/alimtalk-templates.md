# 카카오 알림톡 템플릿 레지스트리

ALIGO를 통해 발송하는 카카오 비즈니스 알림톡 템플릿 매핑·검수 상태·환경변수 가이드.

## 발신 채널

- 카카오 비즈채널: `@바틀` (주식회사 바틀)
- ALIGO 가맹점 ID: `golfpeople` 계정
- 검수 소요: 영업일 기준 3~5일 (ALIGO → 카카오 검수)

## 템플릿 매핑

| 코드 | 이름 | 용도 | 검수 상태 | ENV 키 |
|---|---|---|---|---|
| `UH_0933` | future_me_link | 미래의 나 — 링크 | ✅ 통과 (사용 중) | `ALIGO_TPL_FUTURE_ME_LINK` |
| `UH_0934` | future_me_summary | 미래의 나 — 요약 | ✅ 통과 (사용 중) | `ALIGO_TPL_FUTURE_ME_SUMMARY` |
| `UH_6830` | BOBI_MEDICAL_LINK | 진료정보 — 링크 | 🟡 검수중 (2026-05-07) | `ALIGO_TPL_MEDICAL_LINK` |
| `UH_6831` | BOBI_MEDICAL_SUMMARY | 진료정보 — 요약 | 🟡 검수중 (2026-05-07) | `ALIGO_TPL_MEDICAL_SUMMARY` |
| `UH_6832` | BOBI_RISK_LINK | 위험도 리포트 — 링크 | 🟡 검수중 (2026-05-07) | `ALIGO_TPL_RISK_LINK` |
| `UH_6833` | BOBI_RISK_SUMMARY | 위험도 리포트 — 요약 | 🟡 검수중 (2026-05-07) | `ALIGO_TPL_RISK_SUMMARY` |
| `UH_6835` | BOBI_RECEIPT_LINK | 가상영수증 — 링크 | 🟡 검수중 (2026-05-07) | `ALIGO_TPL_RECEIPT_LINK` |
| `UH_6836` | BOBI_RECEIPT_SUMMARY | 가상영수증 — 요약 | 🟡 검수중 (2026-05-07) | `ALIGO_TPL_RECEIPT_SUMMARY` |

## 검수 통과 후 환경변수 설정

검수 통과 시 ALIGO 어드민이 알려주는 코드는 등록 시점에 받아둔 위 코드 그대로일 가능성이 큼. 그대로 Vercel 환경변수에 추가:

```bash
# .env.production / Vercel Project Settings → Environment Variables

# 미래의 나 (이미 검수 완료된 코드)
ALIGO_TPL_FUTURE_ME_LINK=UH_0933
ALIGO_TPL_FUTURE_ME_SUMMARY=UH_0934

# 진료정보
ALIGO_TPL_MEDICAL_LINK=UH_6830
ALIGO_TPL_MEDICAL_SUMMARY=UH_6831

# 위험도 리포트
ALIGO_TPL_RISK_LINK=UH_6832
ALIGO_TPL_RISK_SUMMARY=UH_6833

# 가상영수증
ALIGO_TPL_RECEIPT_LINK=UH_6835
ALIGO_TPL_RECEIPT_SUMMARY=UH_6836
```

> ⚠️ **검수 통과 전엔 발송 시도 시 ALIGO가 거절합니다.** 사용자에게 명확한 "검수 진행 중" 안내가 노출되도록 코드가 처리.

## 본문 — 신규 6종

검수 등록 시점의 본문이 그대로 100% 일치해야 발송이 동작합니다 (변수 치환 후 본문 = 등록 본문 100% 일치). 변경하려면 카카오에 재검수 요청 필요.

### BOBI_MEDICAL_LINK

```
[보비] #{고객명}님의 진료정보 분석 리포트가 도착했습니다.
설계사: #{설계사명}

최근 5년 진료내역 기반 분석이 완료되었습니다.
아래 버튼을 눌러 리포트를 확인해주세요.

링크 유효: 발송일로부터 7일
```
- 변수: `고객명`, `설계사명`
- 버튼: 웹링크 "리포트 확인" → `https://www.bobi.co.kr/share/medical/{token}`

### BOBI_MEDICAL_SUMMARY

```
[보비] #{고객명}님 진료정보 분석 요약
────────────────
조회 기간: 최근 #{조회연수}년
총 진료 건수: #{진료건수}건
주요 진단: #{주요진단}
복용 약물: #{복용약물}
────────────────
상세 리포트는 설계사 #{설계사명}에게 문의해주세요.
```
- 변수: `고객명`, `조회연수`, `진료건수`, `주요진단`, `복용약물`, `설계사명`

### BOBI_RISK_LINK

```
[보비] #{고객명}님의 질병 위험도 리포트가 도착했습니다.
설계사: #{설계사명}

진료 내역과 건강검진 데이터를 기반으로 위험도 분석이 완료되었습니다.
아래 버튼을 눌러 리포트를 확인해주세요.

링크 유효: 발송일로부터 7일
```
- 변수: `고객명`, `설계사명`
- 버튼: 웹링크 "리포트 확인" → `https://www.bobi.co.kr/share/risk-report/{token}`

### BOBI_RISK_SUMMARY

```
[보비] #{고객명}님 위험도 리포트 요약
────────────────
주의 질환: #{주의질환}
일반 대비 위험: #{최대위험배율}배
근거 수준: #{근거수준}
권장 점검: #{권장점검}
────────────────
상세 리포트는 설계사 #{설계사명}에게 문의해주세요.
```
- 변수: `고객명`, `주의질환`, `최대위험배율`, `근거수준`, `권장점검`, `설계사명`

### BOBI_RECEIPT_LINK

```
[보비] #{고객명}님의 가상 사고영수증이 도착했습니다.
설계사: #{설계사명}

#{질환명} 발병 시 예상 의료비 시뮬레이션 결과입니다.
아래 버튼을 눌러 영수증을 확인해주세요.

링크 유효: 발송일로부터 7일
```
- 변수: `고객명`, `설계사명`, `질환명`
- 버튼: 웹링크 "영수증 확인" → `https://www.bobi.co.kr/share/accident-receipt/{token}`

### BOBI_RECEIPT_SUMMARY

```
[보비] #{고객명}님 가상영수증 요약
────────────────
시뮬레이션 질환: #{질환명}
예상 총 의료비: #{총의료비}만원
현재 보장 추정: #{보장추정}만원
자기부담 예상: #{자기부담}만원
────────────────
상세 영수증은 설계사 #{설계사명}에게 문의해주세요.
```
- 변수: `고객명`, `질환명`, `총의료비`, `보장추정`, `자기부담`, `설계사명`

## 검수 통과 팁 (이번 등록 시 반영된 사항)

- 부가정보 비움 (광고성 거절 회피)
- 채널 추가 ❌ (광고/마케팅 메시지 동의 X — 알림톡 본질 유지)
- 강조 표기 사용 안 함
- 변수 6종 모두 의미 있는 사용자별 데이터
- 발송일·만료일 본문에 명시 ("링크 유효: 발송일로부터 7일")
- 도메인은 `bobi.co.kr` 단일 (ALIGO 어드민 도메인 화이트리스트 등록 필요)

## share 토큰 시스템

- `lib/share/token.ts`에 일반화된 발급/검증 함수 (`issueShareToken`, `verifyShareToken`)
- 토큰은 HMAC-SHA256 서명, 7일 만료, DB 컬럼 추가 0
- 페이로드: `{ kind: 'medical' | 'risk-report' | 'accident-receipt' | 'future-me', resourceId, userId, expiresAt }`
- secret: `SHARE_TOKEN_SECRET` (없으면 `SUPABASE_SERVICE_ROLE_KEY`로 fallback)

## 발송 흐름

1. 사용자(설계사)가 리포트 페이지에서 "카카오 알림톡으로 전송" 버튼 클릭
2. 다이얼로그에서 수신 번호·이름 입력 + 템플릿 (link/summary) 선택
3. 서버가 share token 발급 → ALIGO 알림톡 발송 호출
4. 검수 미통과 템플릿이면 ALIGO가 즉시 거절 → "검수 진행 중입니다" 안내
5. 통과 템플릿이면 정상 발송 + 결과 사용자에게 표시
