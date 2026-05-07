# 앱스토어 소개 이미지 (보비)

Google Play / App Store 등록용 스크린샷·프로모션 그래픽 생성 도구.

## 결과물

```
out/
├── ios-67/                      App Store iPhone 6.7" (1290×2796)
│   ├── s1.png  Hero (로고 + 태그라인)
│   ├── s2.png  진료정보 분석 (5년치 진료내역)
│   ├── s3.png  위험도 리포트 (개인 위험 배율)
│   ├── s4.png  가상 사고영수증 (보장 갭 시각화)
│   ├── s5.png  CRM 자동 알림톡 (갱신·면책·생일)
│   └── s6.png  Pricing (베이직 19,900원 / 프로 39,900원)
├── android/                     Google Play Phone (1080×1920)
│   └── s1~s6.png  (동일 컨셉)
└── feature-graphic/             Google Play Feature Graphic (1024×500)
    └── fg.png
```

## 실행

```bash
node marketing/store-screenshots/capture.js
```

Puppeteer 가 templates/slides.html 을 로드해서 각 `<section>` 을 PNG 로 캡처.

## 디자인 수정

`templates/slides.html` 한 파일 안에 6장 폰 슬라이드 + Feature Graphic 1장이
모두 들어 있다. 카피·색상·레이아웃 수정 후 다시 capture.js 실행.

브랜드 컬러는 `app/globals.css` §색상 토큰과 동일:
- brand-50  #EFF6FF
- brand-100 #DBEAFE
- brand-500 #3B82F6
- brand-600 #1a56db (메인 액션)
- brand-700 #1E40AF
- brand-800 #1E3A8A

폰트는 Pretendard Variable (CDN 로드).

## 스토어 업로드 시점 체크

### App Store Connect

- iPhone 6.7" 스크린샷: **3장 이상, 최대 10장** 필수
- 1290×2796 (세로) 또는 2796×1290 (가로) 권장
- 6.7" 만 등록하면 6.5"·5.5" 자동 사용 (Apple 정책)

### Google Play Console

- 폰 스크린샷: **2장 이상, 최대 8장**
- 1080×1920 (세로) 또는 1920×1080 (가로)
- Feature Graphic: **1024×500 (필수, 1장)**
- 앱 아이콘 512×512 은 별도 (이 도구에서 생성하지 않음)

## 다음 단계 (선택)

1. **실 앱 스크린샷 합성** — 현재는 일러스트형 카드 UI. 실제 보비 앱 화면을 추가하고 싶으면
   templates/slides.html 의 `.card` 영역을 `<img src="actual-screenshot.png">` 로 교체
2. **A/B 테스트용 버전** — capture.js 의 TARGETS 배열을 늘려 다른 카피 버전 생성
3. **로컬라이즈** — 영문 버전이 필요하면 templates/slides-en.html 만들고 capture-en.js 실행

## 보비 디자인시스템 §11.3 준수 체크

- [x] 보비 블루(#1a56db) 한 페이지 5~7곳 이내 — 각 슬라이드 헤드라인·CTA·아이콘 강조 위주
- [x] 등급/위험도 색은 별도 채널 (빨강·주황·노랑·파랑) — 슬라이드 3 위험도 바
- [x] 카드 배경 흰색, 그림자는 brand 톤으로 옅게
- [x] Pretendard 폰트, 한글 자간 -0.02~-0.04em
