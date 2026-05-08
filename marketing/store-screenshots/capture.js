// marketing/store-screenshots/capture.js
//
// templates/slides.html 의 각 <section> 을 다음 사이즈로 캡처:
//
//   App Store  iPhone 6.7"        : 1284 × 2778   (out/ios-67/)
//   Google Play Phone (권장)       : 1080 × 1920   (out/android/)
//   Google Play Feature Graphic    : 1024 ×  500   (out/feature-graphic/)
//
// 스토어 정책상 #s1~#s6 = 폰 사이즈, #fg = Feature Graphic.
// App Store Connect 6.7" 필수 해상도는 1284×2778 (iPhone 14 Pro Max). 1290×2796은 거부됨.
//
// 사용:
//   node marketing/store-screenshots/capture.js
//
// 의존성: puppeteer (이미 설치됨)

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const OUT_ROOT = path.join(__dirname, 'out');
const HTML_PATH = 'file://' + path.join(__dirname, 'templates', 'slides.html');

const PHONE_SLIDES = ['s1', 's2', 's3', 's4', 's5', 's6'];
const FEATURE_GRAPHIC_ID = 'fg';

const TARGETS = [
    { name: 'ios-67',          width: 1284, height: 2778, ids: PHONE_SLIDES },
    { name: 'android',         width: 1080, height: 1920, ids: PHONE_SLIDES },
    { name: 'feature-graphic', width: 1024, height:  500, ids: [FEATURE_GRAPHIC_ID] },
];

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

(async () => {
    ensureDir(OUT_ROOT);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const target of TARGETS) {
        const targetDir = path.join(OUT_ROOT, target.name);
        ensureDir(targetDir);

        const page = await browser.newPage();
        await page.setViewport({ width: target.width, height: target.height, deviceScaleFactor: 1 });
        await page.goto(HTML_PATH, { waitUntil: 'networkidle0' });

        // Pretendard 폰트 로드 보장
        await page.evaluate(async () => {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
        });

        // 캡처 준비 — 모든 슬라이드 숨기고 body 배경만 정리
        await page.evaluate(() => {
            document.body.style.background = '#fff';
            document.body.style.margin = '0';
            document.querySelectorAll('.slide').forEach((s) => { s.style.display = 'none'; });
        });

        for (const id of target.ids) {
            await page.evaluate((args) => {
                const slides = document.querySelectorAll('.slide');
                slides.forEach((s) => { s.style.display = 'none'; });
                const target = document.getElementById(args.id);
                target.style.display = 'flex';
                target.style.width  = args.w + 'px';
                target.style.height = args.h + 'px';
            }, { id, w: target.width, h: target.height });

            // 폰트·렌더 안정화 약간의 대기
            await new Promise((r) => setTimeout(r, 200));

            const el = await page.$(`#${id}`);
            const outPath = path.join(targetDir, `${id}.png`);
            await el.screenshot({ path: outPath, omitBackground: false });
            console.log(`✓ ${target.name}/${id}.png  (${target.width}×${target.height})`);
        }

        await page.close();
    }

    await browser.close();
    console.log('\n완료. marketing/store-screenshots/out/ 확인.');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
