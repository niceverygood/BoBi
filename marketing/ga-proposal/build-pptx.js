// marketing/ga-proposal/build-pptx.js
// PNG 17장 → PPTX 패키징

const path = require('path');
const fs = require('fs');
const PptxGenJS = require('pptxgenjs');

const OUT_DIR = path.join(__dirname, 'out');
const SLIDES = ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','s12','s13','s14','s15','s16','s17'];

(async () => {
    const missing = SLIDES.filter((id) => !fs.existsSync(path.join(OUT_DIR, `${id}.png`)));
    if (missing.length > 0) {
        console.error(`✗ 다음 PNG 없음: ${missing.join(', ')}`);
        console.error('먼저 capture.js 실행: node marketing/ga-proposal/capture.js');
        process.exit(1);
    }
    const pptx = new PptxGenJS();
    pptx.author = '주식회사 바틀 / 한승수';
    pptx.company = 'Bottle Inc.';
    pptx.title = '보비 BoBi — GA Proposal Deck v1.0';
    pptx.subject = 'GA 영업조직을 위한 AI 보험 컨설팅 플랫폼';
    pptx.layout = 'LAYOUT_WIDE';

    for (const id of SLIDES) {
        const s = pptx.addSlide();
        s.addImage({ path: path.join(OUT_DIR, `${id}.png`), x: 0, y: 0, w: 13.333, h: 7.5 });
    }
    const outPath = path.join(OUT_DIR, 'bobi-ga-proposal.pptx');
    await pptx.writeFile({ fileName: outPath });
    const size = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
    console.log(`✓ ${path.relative(process.cwd(), outPath)} 생성 완료`);
    console.log(`  ${SLIDES.length}장 / 16:9 / ${size}MB`);
})().catch((err) => { console.error(err); process.exit(1); });
