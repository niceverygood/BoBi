# 투자 제안서 — HTML 슬라이드 (보비)

VC 미팅용 슬라이드 15장. `docs/investor-pitch-deck.md` v3 의 텍스트를
보비 디자인시스템(brand-50~800, Pretendard) 기반 HTML 으로 시각화.

## 결과물 (20장)

```
out/
├── s1.png    Cover (보비 로고 + 라운드 정보 박스)
├── s2.png    Problem (4 페인포인트 그리드)
├── s3.png    Solution (5대 핵심 기능)
├── s4.png    Why Now (3 변곡점)
├── s4a.png  ★ Product Demo: 진료정보 분석 (폰 모킹)
├── s4b.png  ★ Product Demo: 위험도 리포트 (폰 모킹)
├── s4c.png  ★ Product Demo: 가상 사고영수증 (폰 모킹)
├── s4d.png  ★ Product Demo: CRM 자동 알림톡 (폰 모킹)
├── s4e.png  ★ Product Demo: 미래의 나 (폰 모킹)
├── s5.png    Market (TAM/SAM/SOM 동심원)
├── s6.png    Product (오전·오후·저녁 시나리오)
├── s7.png    Traction (Seed 1 검증 + 분기별 가입 곡선)
├── s8.png    Business Model (3-Layer 매출)
├── s9.png    Go-to-Market (3 Phase 타임라인)
├── s10.png   Competition (5 경쟁사 비교 표)
├── s11.png   Team (한승수·이종인 + 코어팀)
├── s12.png   Financials & The Ask (10억 / Pre 100억)
├── s13.png   Why BoBi Wins (5 모트)
├── s14.png   Closing (CTA + 라운드 박스)
└── s15.png   Q&A (예상 질문 8개)
```

★ = 폰 모킹 + 실제 보비 UI 톤 + 정량 가치 + 인용구. VC 미팅에서 가장 강력한 무기.

각 PNG: **1920×1080 (PPT 표준 16:9)**. PowerPoint·Keynote·Google Slides 에 즉시 임포트 가능.

## 실행

```bash
# 1. PNG 20장 생성 (1920×1080)
node marketing/investor-pitch/capture.js

# 2-A. PNG → PPTX 패키징 (이미지 배경, 깔끔한 발표·인쇄용)
node marketing/investor-pitch/build-pptx.js

# 2-B. 네이티브 도형 PPTX (모든 텍스트 수정 가능 ⭐)
node marketing/investor-pitch/build-pptx-editable.js
```

산출:
- `out/s1.png ~ s15.png` (PNG 20장, 각 1920×1080)
- `out/bobi-pitch-deck.pptx` (이미지 배경, ~3.4MB) — 발표·인쇄·PDF 변환용
- `out/bobi-pitch-deck-editable.pptx` (네이티브 도형, ~0.5MB) — **카피·디자인 직접 수정**

### 두 PPTX 차이

| 항목 | bobi-pitch-deck.pptx | bobi-pitch-deck-editable.pptx |
|---|---|---|
| 구성 | PNG 이미지 배경 | 네이티브 도형 + 텍스트 박스 |
| 시각 품질 | 매우 깔끔 (HTML 렌더링 그대로) | 약간 단순 (PowerPoint 도형으로 재현) |
| 용량 | 3.4MB | 0.5MB |
| 텍스트 수정 | ❌ (이미지에 박힘) | ✅ 클릭하면 즉시 편집 |
| 도형·색상 수정 | ❌ | ✅ |
| 한국어 폰트 | Pretendard (HTML 렌더링) | 맑은 고딕 (시스템 fallback) |
| **추천 용도** | VC 미팅 발표·PDF 출력 | 카피 다듬기·VC별 맞춤 변형 |

### 워크플로우 권장

1. **카피 수정** → editable.pptx 열어서 텍스트 박스 클릭 후 수정
2. **수정 내용을 templates/slides.html에도 반영** (단일 출처 유지)
3. **capture.js + build-pptx.js 재실행** → 깔끔한 PNG 배경 PPTX 갱신
4. **VC 발송** → bobi-pitch-deck.pptx (이미지 배경, 폰트·디자인 100% 정확)

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

### 1. PowerPoint / Keynote / Google Slides — PPTX 직접 열기 (권장)
- `out/bobi-pitch-deck.pptx` 더블클릭 → PowerPoint 또는 Keynote에서 즉시 열림
- Google Slides: Drive 업로드 → 우클릭 → "Google Slides로 열기"
- 발표자 노트는 `docs/investor-pitch-deck.md` 각 슬라이드 본문 복붙
- 슬라이드 수정 시 → templates/slides.html 변경 → capture.js + build-pptx.js 재실행

### 2. PDF 합치기 (옵션)
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
