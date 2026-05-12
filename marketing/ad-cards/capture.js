// marketing/ad-cards/capture.js
//
// templates/slides.html 의 8장 카드뉴스를 1080×1080 PNG로 캡처.
// 인스타 정사각형 광고 / 캐러셀용.
//
// 사용:
//   node marketing/ad-cards/capture.js
//
// 출력:
//   marketing/ad-cards/out/s1.png ~ s8.png

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const OUT_DIR = path.join(__dirname, 'out');
const HTML_PATH = 'file://' + path.join(__dirname, 'templates', 'slides.html');
const SLIDES = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
const W = 1080, H = 1080;  // 인스타 정사각형

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async () => {
    ensureDir(OUT_DIR);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    // deviceScaleFactor=2 — 인스타 업로드 시 다운스케일 손실 방지, 고해상도 확보
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.goto(HTML_PATH, { waitUntil: 'networkidle0' });
    // 웹폰트 로딩 완료 대기
    await page.evaluate(async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready; });
    // 캡처 모드 — 다른 슬라이드 숨기고 한 장씩 보여줌
    await page.evaluate(() => {
        document.body.style.background = '#fff';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.display = 'block';
        document.querySelectorAll('.slide').forEach((s) => { s.style.display = 'none'; });
    });

    for (const id of SLIDES) {
        await page.evaluate((args) => {
            document.querySelectorAll('.slide').forEach((s) => { s.style.display = 'none'; });
            const t = document.getElementById(args.id);
            if (!t) return;
            t.style.display = 'flex';
            t.style.width = args.w + 'px';
            t.style.height = args.h + 'px';
            t.style.boxShadow = 'none';
        }, { id, w: W, h: H });
        await new Promise((r) => setTimeout(r, 300));
        const el = await page.$(`#${id}`);
        if (!el) { console.warn(`✗ ${id} 못 찾음`); continue; }
        await el.screenshot({
            path: path.join(OUT_DIR, `${id}.png`),
            omitBackground: false,
            captureBeyondViewport: false,
        });
        console.log(`✓ ${id}.png  (${W}×${H} @2x)`);
    }
    await page.close();
    await browser.close();
    console.log('\n완료. marketing/ad-cards/out/ 폴더 확인.');
    console.log('인스타 업로드 시 캐러셀 순서: s1 → s2 → ... → s8');
})().catch((err) => { console.error(err); process.exit(1); });
