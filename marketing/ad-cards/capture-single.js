// marketing/ad-cards/capture-single.js
//
// templates/single.html 의 3가지 비율 단일 광고 이미지를 PNG로 캡처.
// 사용:  node marketing/ad-cards/capture-single.js

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const OUT_DIR = path.join(__dirname, 'out');
const HTML_PATH = 'file://' + path.join(__dirname, 'templates', 'single.html');

// id, 출력 파일명, 너비, 높이
const VARIANTS = [
    { id: 'square',   file: 'single-square-1080.png',   w: 1080, h: 1080 },  // 피드·릴스 인스트림
    { id: 'vertical', file: 'single-vertical-1080.png', w: 1080, h: 1920 },  // 스토리·릴스·앱
    { id: 'wide',     file: 'single-wide-1200.png',     w: 1200, h: 628  },  // 오른쪽 칼럼·외부
];

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async () => {
    ensureDir(OUT_DIR);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(HTML_PATH, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready; });

    await page.evaluate(() => {
        document.body.style.background = '#fff';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.display = 'block';
        document.querySelectorAll('.ad').forEach((s) => { s.style.display = 'none'; });
    });

    for (const v of VARIANTS) {
        // deviceScaleFactor=2 — 고해상도 (Meta 추천: 최소 1080px 변, 가급적 2x)
        await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 2 });
        await page.evaluate((args) => {
            document.querySelectorAll('.ad').forEach((s) => { s.style.display = 'none'; });
            const t = document.getElementById(args.id);
            if (!t) return;
            t.style.display = 'flex';
            t.style.width = args.w + 'px';
            t.style.height = args.h + 'px';
            t.style.boxShadow = 'none';
        }, { id: v.id, w: v.w, h: v.h });
        await new Promise((r) => setTimeout(r, 300));
        const el = await page.$(`#${v.id}`);
        if (!el) { console.warn(`✗ ${v.id} 못 찾음`); continue; }
        await el.screenshot({
            path: path.join(OUT_DIR, v.file),
            omitBackground: false,
            captureBeyondViewport: false,
        });
        console.log(`✓ ${v.file}  (${v.w}×${v.h} @2x)`);
    }
    await page.close();
    await browser.close();
    console.log('\n완료. marketing/ad-cards/out/ 에서 single-*.png 확인.');
})().catch((err) => { console.error(err); process.exit(1); });
