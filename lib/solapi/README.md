# SOLAPI 알림톡 (카카오 비즈메시지)

ALIGO 에서 솔라피로 마이그레이션 (이종인 5/13). 이유: Vercel 서버리스 동적 IP 와
ALIGO IP 화이트리스트 충돌 → 솔라피는 HMAC SHA256 인증이라 IP 무관.

## 활성화 절차

### 1. 솔라피 콘솔 작업 (한승수님)

1. **API Key** 발급
   - [console.solapi.com](https://console.solapi.com) → 개발 → API Key
   - "새로운 API KEY" → 발급 (Secret 은 한 번만 노출 — 메모 필수)

2. **카카오 비즈니스 채널 연동**
   - 카카오톡 → 카카오 채널 → `@bottle` 채널이 사업자 인증 완료 상태인지 확인
   - 솔라피 콘솔 → 카카오 비즈니스 → 채널 연동 → `@bottle` 등록
   - 연동 후 **pfId** (예: `KA01PF...`) 확인 → 메모

3. **12개 알림톡 템플릿 등록 + 검수 신청**
   - 솔라피 → 카카오 비즈니스 → 템플릿 관리 → 새 템플릿
   - ALIGO 에 등록되어 있던 12개 템플릿 본문을 동일하게 등록
   - 검수 신청 (영업일 2~5일)
   - 통과 후 솔라피가 부여한 새 templateId (예: `KA01TP...`) 확인

4. **발신번호 등록** (SMS 대체용)
   - 솔라피 → 발신번호 → 등록 → `070-4147-9771` 사업자 명의 인증

### 2. Vercel ENV 추가

```
SOLAPI_API_KEY        = NCSYKXBQX2IZQ2FC
SOLAPI_API_SECRET     = <Secret 재발급 후 새 값>
SOLAPI_PFID           = KA01PF...
SOLAPI_SENDER_NUMBER  = 07041479771

# 검수 통과 후 채울 12개 (통과 전엔 비워둬도 됨 — 발송 시도 시 친절한 안내)
SOLAPI_TPL_FUTURE_ME_LINK     = KA01TP...
SOLAPI_TPL_FUTURE_ME_SUMMARY  = KA01TP...
SOLAPI_TPL_MEDICAL_LINK       = KA01TP...
SOLAPI_TPL_MEDICAL_SUMMARY    = KA01TP...
SOLAPI_TPL_RISK_LINK          = KA01TP...
SOLAPI_TPL_RISK_SUMMARY       = KA01TP...
SOLAPI_TPL_RECEIPT_LINK       = KA01TP...
SOLAPI_TPL_RECEIPT_SUMMARY    = KA01TP...
SOLAPI_TPL_CRM_RENEWAL        = KA01TP...
SOLAPI_TPL_CRM_EXEMPTION_END  = KA01TP...
SOLAPI_TPL_CRM_REDUCTION_END  = KA01TP...
SOLAPI_TPL_CRM_BIRTHDAY       = KA01TP...
```

### 3. 기존 ALIGO_* ENV 삭제

- 모든 `ALIGO_*` 환경변수는 더 이상 안 쓰임. Vercel ENV 에서 제거.

## API 호출 흐름

```typescript
import { sendAlimtalk } from '@/lib/solapi/client';
import { getTemplateId } from '@/lib/solapi/templates';

await sendAlimtalk({
    templateId: getTemplateId('future_me_link'),
    receiverPhone: '01012345678',
    smsFallbackSubject: '리포트 도착',
    smsFallbackText: '리포트 본문 (알림톡 실패 시 SMS 로 발송)',
    buttons: [
        { buttonName: '리포트 보기', buttonType: 'WL', linkMo: 'https://...', linkPc: 'https://...' },
    ],
});
```

## 인증 방식

```
Authorization: HMAC-SHA256 apiKey=KEY, date=ISO8601, salt=RANDOM, signature=HMAC
signature = HMAC-SHA256(secret).update(date + salt).hex()
```

IP 화이트리스트 없음. Vercel 동적 IP 에서도 그대로 동작.
