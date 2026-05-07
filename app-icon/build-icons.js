// app-icon/build-icons.js
//
// source/icon.svg (라운드 모서리) + source/icon-square.svg (직각, App Store용)을
// 다양한 크기의 PNG로 export. iOS·Android·PWA·favicon 표준 사이즈 모두 포함.
//
// 실행:
//   node app-icon/build-icons.js
//
// 산출 (out/):
//   - 1024.png             ← App Store (직각·알파 X, icon-square.svg 기반)
//   - 1024-rounded.png     ← 미리보기·Notion 썸네일 등 (라운드 모서리)
//   - 512.png              ← Google Play (라운드 모서리 OK)
//   - 192.png ~ 16.png     ← Android·iOS·favicon 표준 사이즈
//   - apple-touch-icon.png ← 180×180
//   - favicon-32.png, favicon-16.png

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const SRC_DIR = path.join(__dirname, 'source');
const OUT_DIR = path.join(__dirname, 'out');

// 사이즈 사양 — { size, name?, source? }
// source: 'rounded' (디폴트) | 'square'
//   'rounded': icon.svg (라운드 모서리, Android·웹 표준)
//   'square':  icon-square.svg (직각, App Store 1024 전용)
const ICON_SPECS = [
    // App Store / iOS — 1024는 직각, 나머지는 라운드(자동 마스킹)
    { size: 1024, name: '1024.png',          source: 'square'  },
    { size: 1024, name: '1024-rounded.png',  source: 'rounded' },

    // Google Play / Android Adaptive — 라운드 OK
    { size: 512,  name: '512.png',           source: 'rounded' },

    // PWA / Android xxxhdpi
    { size: 192,  name: '192.png',           source: 'rounded' },

    // Apple Touch Icon
    { size: 180,  name: 'apple-touch-icon.png', source: 'rounded' },

    // iPad Pro
    { size: 167,  name: '167.png',           source: 'rounded' },

    // iPad
    { size: 152,  name: '152.png',           source: 'rounded' },

    // Android xxhdpi
    { size: 144,  name: '144.png',           source: 'rounded' },

    // iPhone App @2x
    { size: 120,  name: '120.png',           source: 'rounded' },

    // Android xhdpi
    { size: 96,   name: '96.png',            source: 'rounded' },

    // iPhone Settings @3x
    { size: 87,   name: '87.png',            source: 'rounded' },

    // iPhone Spotlight @2x / iPad @2x
    { size: 80,   name: '80.png',            source: 'rounded' },

    // iPad
    { size: 76,   name: '76.png',            source: 'rounded' },

    // Android hdpi
    { size: 72,   name: '72.png',            source: 'rounded' },

    // iPhone App @1x
    { size: 60,   name: '60.png',            source: 'rounded' },

    // iPhone Settings @2x
    { size: 58,   name: '58.png',            source: 'rounded' },

    // Android mdpi
    { size: 48,   name: '48.png',            source: 'rounded' },

    // Favicon
    { size: 32,   name: 'favicon-32.png',    source: 'rounded' },
    { size: 16,   name: 'favicon-16.png',    source: 'rounded' },
];

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

(async () => {
    ensureDir(OUT_DIR);

    const roundedSvg = fs.readFileSync(path.join(SRC_DIR, 'icon.svg'), 'utf-8');
    const squareSvg = fs.readFileSync(path.join(SRC_DIR, 'icon-square.svg'), 'utf-8');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // 폰트 로드용 HTML — Pretendard CDN + SVG 인라인
    // viewport와 SVG 크기를 동기화해서 정확한 픽셀로 캡처
    const buildHtml = (svg, size) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; }
  html, body { width: ${size}px; height: ${size}px; background: transparent; }
  svg { display: block; width: ${size}px; height: ${size}px; }
</style>
</head>
<body>
${svg.replace(/width="\d+"\s+height="\d+"/, `width="${size}" height="${size}"`)}
</body>
</html>`;

    for (const spec of ICON_SPECS) {
        const svg = spec.source === 'square' ? squareSvg : roundedSvg;
        const html = buildHtml(svg, spec.size);

        await page.setViewport({
            width: spec.size,
            height: spec.size,
            deviceScaleFactor: 1,
        });
        await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

        // 폰트 로드 보장
        await page.evaluate(async () => {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
        });
        // 작은 안정화 대기
        await new Promise((r) => setTimeout(r, 150));

        const outPath = path.join(OUT_DIR, spec.name);
        await page.screenshot({
            path: outPath,
            type: 'png',
            // 1024 square는 알파 채널 있어도 OK (배경 직각이라 알파 영역 없음)
            // 라운드는 모서리 부분이 투명하므로 omitBackground: true
            omitBackground: spec.source === 'rounded',
            clip: { x: 0, y: 0, width: spec.size, height: spec.size },
        });

        console.log(`✓ ${spec.name.padEnd(24)} ${spec.size}×${spec.size} (${spec.source})`);
    }

    await page.close();
    await browser.close();

    console.log(`\n총 ${ICON_SPECS.length}개 아이콘 생성 완료. app-icon/out/ 확인.`);
    console.log('\n필수 사이즈:');
    console.log('  - 1024.png        ← App Store 등록용 (직각·알파 X)');
    console.log('  - 512.png         ← Google Play 등록용');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
