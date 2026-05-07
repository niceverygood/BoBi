# 투자 제안서 — HTML 슬라이드 (보비)

VC 미팅용 슬라이드 15장. `docs/investor-pitch-deck.md` v3 의 텍스트를
보비 디자인시스템(brand-50~800, Pretendard) 기반 HTML 으로 시각화.

## 결과물

```
out/
├── s1.png   Cover (보비 로고 + 라운드 정보 박스)
├── s2.png   Problem (4 페인포인트 그리드)
├── s3.png   Solution (5대 핵심 기능)
├── s4.png   Why Now (3 변곡점)
├── s5.png   Market (TAM/SAM/SOM 동심원)
├── s6.png   Product (오전·오후·저녁 시나리오)
├── s7.png   Traction (Seed 1 검증 + 분기별 가입 곡선)
├── s8.png   Business Model (3-Layer 매출)
├── s9.png   Go-to-Market (3 Phase 타임라인)
├── s10.png  Competition (5 경쟁사 비교 표)
├── s11.png  Team (한승수·이종인 + 코어팀)
├── s12.png  Financials & The Ask (10억 / Pre 100억)
├── s13.png  Why BoBi Wins (5 모트)
├── s14.png  Closing (CTA + 라운드 박스)
└── s15.png  Q&A (예상 질문 8개)
```

각 PNG: **1920×1080 (PPT 표준 16:9)**. PowerPoint·Keynote·Google Slides 에 즉시 임포트 가능.

## 실행

```bash
node marketing/investor-pitch/capture.js
```

## 디자인 수정

`templates/slides.html` 한 파일에 15장 모두 들어있음. 카피·색상·레이아웃
수정 후 capture.js 재실행.

브랜드 컬러 (보비 디자인시스템 §11.3):
- brand-50  #EFF6FF — 배경
- brand-100 #DBEAFE — 카드
- brand-500 #3B82F6 — 보조
- brand-600 #1a56db — **메인 액션**
- brand-700 #1E40AF — 헤드라인
- brand-800 #1E3A8A — 그라디언트

폰트: Pretendard Variable (CDN).

## VC 발표용 활용

### 1. PowerPoint / Keynote 임포트
- 새 발표 만들기 → 슬라이드 크기 16:9 (1920×1080)
- 각 PNG 를 슬라이드 배경으로 삽입
- 발표자 노트는 `docs/investor-pitch-deck.md` 각 슬라이드 본문 활용

### 2. PDF 합치기
```bash
# macOS — 모든 PNG를 PDF로 합치기
cd marketing/investor-pitch/out
img2pdf s*.png -o ../bobi-pitch-deck.pdf
# 또는 ImageMagick:
convert -density 300 s*.png ../bobi-pitch-deck.pdf
```

### 3. Notion / Google Drive
- 데이터룸 폴더에 PNG 업로드
- VC가 NDA 후 접근 가능하도록 권한 설정

## 슬라이드별 디자인 메모

### s1 Cover
- 라운드 박스: ROUND / RAISE / PRE-MONEY 3개 칩 — VC 첫 5분 질문 즉시 답
- 보비 로고 280px 큼지막하게 (브랜드 인식)

### s7 Traction
- 4 검증 카드 (투자·영업·제품·파이프라인) → "이미 검증됐다" 신호
- 타임라인에 Q3 active 강조 → 현재 진행 단계 명확

### s12 Financials & The Ask
- 좌측 매출 추정표 (3 시나리오) / 우측 The Ask 큰 박스
- 자금 사용 가로 막대 차트 (50/30/15/5)
- Pre 100억 정당화 4가지 한 줄 요약

### s13 Why BoBi Wins
- 5 모트 카드 + 비대칭 BD 채널 강조
- "빅테크는 못 하는 사람 기반 신뢰" 메시지

### s15 Q&A
- VC 미팅에서 자주 받는 8개 질문 미리 답변
- "Pre 100억 근거" 첫 줄 (가장 핵심)

## 다음 작업

1. **VC 미팅 일정 확정** → 슬라이드 검토 후 한승수가 직접 발표 연습
2. **PDF 합치기** → Drive·Notion 데이터룸 업로드
3. **NDA 템플릿 준비** → Appendix 자료(KPI·이종인 채널) 별도 보호
4. **영문 버전** → 글로벌 VC (DCM·500 Global·Sequoia SE Asia) 컨택 시
