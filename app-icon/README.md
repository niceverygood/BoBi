# 보비 앱 아이콘

iOS · Android · PWA · favicon 표준 사이즈를 SVG 마스터에서 자동 생성.

## 디자인

- **배경**: 보비 브랜드 그라디언트 (`#1a56db` → `#1E3A8A`)
- **중앙**: 하얀색 "B" (Pretendard 900, letter-spacing -30)
- **우상단 액센트**: ring 효과 흰 점 (brand-50 → DBEAFE → 93C5FD)
- **모서리**: rx 220 squircle (1024 기준 ≈ 21.5% — iOS 가이드라인 부합)

## 결과물 (19개)

```
out/
├── 1024.png             ★ App Store 등록 (직각·알파 X, icon-square.svg 기반)
├── 1024-rounded.png       미리보기·Notion 썸네일 등 (라운드)
├── 512.png              ★ Google Play 등록
├── 192.png                PWA · Android xxxhdpi
├── apple-touch-icon.png   iOS Safari (180×180)
├── 167.png                iPad Pro
├── 152.png                iPad
├── 144.png                Android xxhdpi
├── 120.png                iPhone App @2x
├── 96.png                 Android xhdpi
├── 87.png                 iPhone Settings @3x
├── 80.png                 iPhone Spotlight @2x
├── 76.png                 iPad
├── 72.png                 Android hdpi
├── 60.png                 iPhone App @1x
├── 58.png                 iPhone Settings @2x
├── 48.png                 Android mdpi
├── favicon-32.png         웹 브라우저 favicon
└── favicon-16.png         웹 브라우저 favicon (구형)
```

★ 표시 = 앱스토어 등록 필수.

## 실행

```bash
node app-icon/build-icons.js
```

19개 PNG 동시 생성. 약 30초 소요.

## 디자인 수정

`source/icon.svg` (라운드 모서리 — Android·웹·미리보기) 또는
`source/icon-square.svg` (직각 — App Store 1024 전용) 수정 후
build-icons.js 재실행.

색상·자형 변경 시 둘 다 동일하게 맞춰야 함 (자동 동기화 X).

## 사이즈 사양 근거

### iOS (App Store / iPhone / iPad)
- **1024×1024** — App Store Connect 등록 필수. 직각 + 알파 채널 X (iOS가 자동으로 둥글게 마스킹)
- 180×180 — Apple Touch Icon (iOS Safari 홈화면 추가)
- 167×167 — iPad Pro App
- 152×152 — iPad App @2x
- 120×120 — iPhone App @2x
- 87×87 — iPhone Settings @3x
- 80×80 — iPhone Spotlight @2x
- 76×76 — iPad App @1x
- 60×60 — iPhone App @1x
- 58×58 — iPhone Settings @2x

### Android (Google Play / mipmap)
- **512×512** — Google Play Console 등록 필수
- 192×192 — xxxhdpi 런처 아이콘
- 144×144 — xxhdpi
- 96×96 — xhdpi
- 72×72 — hdpi
- 48×48 — mdpi

### Web (PWA / favicon)
- 192×192 — PWA Manifest icon (large)
- 32×32 — Browser favicon (modern)
- 16×16 — Browser favicon (legacy)

## 사용 위치

### Android (mipmap-*)

각 사이즈 PNG를 Android 프로젝트의 mipmap 폴더로 이동:
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png        ← out/48.png
├── mipmap-hdpi/ic_launcher.png        ← out/72.png
├── mipmap-xhdpi/ic_launcher.png       ← out/96.png
├── mipmap-xxhdpi/ic_launcher.png      ← out/144.png
└── mipmap-xxxhdpi/ic_launcher.png     ← out/192.png
```

### iOS (Asset Catalog)

Xcode `Assets.xcassets/AppIcon.appiconset/` 에 각 사이즈 임포트:
```
AppIcon-20@2x.png  ← 40×40   (별도 빌드 필요)
AppIcon-20@3x.png  ← 60.png
AppIcon-29@2x.png  ← 58.png
AppIcon-29@3x.png  ← 87.png
AppIcon-40@2x.png  ← 80.png
AppIcon-40@3x.png  ← 120.png
AppIcon-60@2x.png  ← 120.png
AppIcon-60@3x.png  ← 180 (apple-touch-icon.png)
AppIcon-76.png     ← 76.png
AppIcon-76@2x.png  ← 152.png
AppIcon-83.5@2x.png ← 167.png
AppIcon-1024.png   ← 1024.png
```

### Web (Next.js / public/)

```bash
cp app-icon/out/192.png public/icon-192.png
cp app-icon/out/512.png public/icon-512.png
cp app-icon/out/apple-touch-icon.png public/apple-touch-icon.png
cp app-icon/out/favicon-32.png public/favicon-32x32.png
cp app-icon/out/favicon-16.png public/favicon-16x16.png
```

`app/layout.tsx` metadata 또는 `public/manifest.json`에 등록.

## 보비 디자인시스템 §11.3 준수 체크

- [x] 보비 브랜드 컬러 (#1a56db) 메인 사용
- [x] 그라디언트는 brand-600 → brand-800 표준
- [x] 액센트 점은 brand-50 / DBEAFE / 93C5FD ring 톤
- [x] Pretendard 폰트 (한글 자형 호환)
- [x] 단정 표현 X (이미지에 텍스트 카피 없음)

## App Store 등록 시 주의

`1024.png` 는 `icon-square.svg` 기반으로 직각 + 알파 영역 없음.
**App Store Connect 업로드 시 1024.png 사용** (1024-rounded는 미리보기용).

iOS는 1024 PNG를 받아 자동으로 둥근 모서리로 마스킹하니, 업로드 PNG 자체는
직각이어야 한다 (Apple 공식 가이드라인).

## 다음 작업 (선택)

1. **Android Adaptive Icon** — foreground/background 분리 PNG (108dp/72dp safe zone)
2. **macOS App Icon** — 1024 + 512 + 256 + 128 + 64 + 32 + 16 (icns 생성)
3. **Windows Tile Icons** — 70×70, 150×150, 310×310
4. **Splash Screen** — 다양한 디바이스 비율의 스플래시 이미지
