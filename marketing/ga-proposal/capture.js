// marketing/ga-proposal/capture.js
//
// templates/slides.html 의 17장 슬라이드를 1920×1080 PNG로 캡처.
// investor-pitch/capture.js 패턴 재활용.

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const OUT_DIR = path.join(__dirname, 'out');
const HTML_PATH = 'file://' + path.join(__dirname, 'templates', 'slides.html');
const SLIDES = ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','s12','s13','s14','s15','s16','s17'];
const W = 1920, H = 1080;

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async () => {
    ensureDir(OUT_DIR);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(HTML_PATH, { waitUntil: 'networkidle0' });
    await page.evaluate(async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready; });
    await page.evaluate(() => {
        document.body.style.background = '#fff';
        document.body.style.margin = '0';
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
        }, { id, w: W, h: H });
        await new Promise((r) => setTimeout(r, 250));
        const el = await page.$(`#${id}`);
        if (!el) { console.warn(`✗ ${id} 못 찾음`); continue; }
        await el.screenshot({ path: path.join(OUT_DIR, `${id}.png`), omitBackground: false });
        console.log(`✓ ${id}.png  (${W}×${H})`);
    }
    await page.close();
    await browser.close();
    console.log('\n완료. marketing/ga-proposal/out/ 확인.');
})().catch((err) => { console.error(err); process.exit(1); });
