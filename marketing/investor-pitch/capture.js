// marketing/investor-pitch/capture.js
//
// templates/slides.html 의 15장 슬라이드를 1920×1080 PNG 로 캡처.
// store-screenshots/capture.js 패턴 재활용.
//
// 사용:
//   node marketing/investor-pitch/capture.js
//
// 출력:
//   out/s1.png ~ s15.png (각 1920×1080)

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const OUT_DIR = path.join(__dirname, 'out');
const HTML_PATH = 'file://' + path.join(__dirname, 'templates', 'slides.html');

const SLIDES = [
    's1', 's2', 's3', 's4',
    's4a', 's4b', 's4c', 's4d', 's4e',  // 제품 데모 5장 (폰 모킹)
    's5', 's6', 's7', 's8',
    's9', 's10', 's11', 's12', 's13', 's14', 's15',
];
const WIDTH = 1920;
const HEIGHT = 1080;

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

(async () => {
    ensureDir(OUT_DIR);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await page.goto(HTML_PATH, { waitUntil: 'networkidle0' });

    // Pretendard 폰트 로드 보장
    await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });

    // 모든 슬라이드 숨기고 body 정리
    await page.evaluate(() => {
        document.body.style.background = '#fff';
        document.body.style.margin = '0';
        document.querySelectorAll('.slide').forEach((s) => { s.style.display = 'none'; });
    });

    for (const id of SLIDES) {
        await page.evaluate((args) => {
            document.querySelectorAll('.slide').forEach((s) => { s.style.display = 'none'; });
            const target = document.getElementById(args.id);
            if (!target) return;
            target.style.display = 'flex';
            target.style.width = args.w + 'px';
            target.style.height = args.h + 'px';
        }, { id, w: WIDTH, h: HEIGHT });

        // 폰트·렌더 안정화
        await new Promise((r) => setTimeout(r, 250));

        const el = await page.$(`#${id}`);
        if (!el) {
            console.warn(`✗ ${id} 못 찾음 — 스킵`);
            continue;
        }
        const outPath = path.join(OUT_DIR, `${id}.png`);
        await el.screenshot({ path: outPath, omitBackground: false });
        console.log(`✓ ${id}.png  (${WIDTH}×${HEIGHT})`);
    }

    await page.close();
    await browser.close();
    console.log('\n완료. marketing/investor-pitch/out/ 확인.');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
