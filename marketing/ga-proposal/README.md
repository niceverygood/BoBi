# GA 제품 제안서 (보비)

GA 본사·임원에게 보비 도구 도입을 제안하는 17장 PPT.
`docs/ga-proposal.md` 본문 + HTML 슬라이드 + PNG/PPTX 빌드.

## 결과물 (17장)

```
out/
├── s1.png   Cover (라운드 정보 박스)
├── s2.png   Tagline ("5분 안에 끝냅니다")
├── s3.png   Problem (4 페인포인트)
├── s4.png   Solution (4 해결 원리)
├── s5.png   Platform Overview (표)
├── s6.png   GA Structure (보비의 위치)
├── s7.png   How It Works (7단계)
├── s8.png   Core Features (5대 + α)
├── s9.png   UX 주요 5개 화면
├── s10.png  Differentiation (기존 vs 보비 표)
├── s11.png  Effects (본사·설계사·고객)
├── s12.png  Business Model (단체 라이선스 단가)
├── s13.png  Operations & Quality
├── s14.png  Growth Strategy (2026~2031)
├── s15.png  Onboarding (5단계 4~6주)
├── s16.png  Company (바틀 정보)
└── s17.png  Closing / Contact
```

각 PNG: 1920×1080 (16:9). `bobi-ga-proposal.pptx` (PowerPoint·Keynote·Google Slides 호환).

## 실행

```bash
# 1. PNG 17장 생성
node marketing/ga-proposal/capture.js

# 2. PNG → PPTX 패키징
node marketing/ga-proposal/build-pptx.js
```

## 사용법

### GA별 맞춤 변형
1. `templates/slides.html` Cover (s1) 의 "[GA명] 본사 귀하" 부분을 실제 GA 이름으로 변경
   - 예: `인카금융서비스 본사 귀하`, `에이플러스에셋 본사 귀하`
2. Closing (s17) 의 "[GA명] 디지털 영업 혁신" 도 동일하게 변경
3. capture + build-pptx 재실행
4. GA별 PPTX 따로 보관

### 발송 방법
- **이메일 첨부**: `bobi-ga-proposal.pptx` (~3MB, Gmail 25MB 제한 OK)
- **본사 임원 미팅**: ZOOM 화면 공유 또는 대면 PPT
- **데이터룸**: Notion/Drive에 PDF 변환 후 업로드

## 단일 출처 동기화

`docs/ga-proposal.md` 가 본문 마스터. 카피 수정 시:
1. docs 먼저 수정
2. `templates/slides.html` 동기화
3. capture + build-pptx 재실행

## 보비 디자인시스템 §11.3 준수

- brand-50~800 컬러 스케일
- Pretendard 폰트 (CDN)
- 단정 표현 X ("확실한 진단" → "조회·분석·추정")
- 정직 톤 (가짜 수치·후기 X)

## 다음 작업 (선택)

1. **VC 코워크 프롬프트 응용 → GA 코워크 프롬프트** — GA별 맞춤 메일 자동 작성
2. **영문 버전** — 글로벌 GA 진출 시
3. **각 GA별 Cover 자동 생성** — 42개 GA 한번에 변형
