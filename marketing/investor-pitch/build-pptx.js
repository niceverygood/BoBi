// marketing/investor-pitch/build-pptx.js
//
// out/s1.png ~ s15.png 를 PPTX (PowerPoint) 파일로 패키징.
// 각 PNG를 16:9 슬라이드에 풀블리드(전체 채움)로 삽입.
//
// 사전 조건:
//   1. capture.js를 먼저 실행해서 out/ 에 PNG 15장이 있어야 함
//   2. pptxgenjs 설치됨 (npm install --save-dev pptxgenjs)
//
// 실행:
//   node marketing/investor-pitch/build-pptx.js
//
// 산출:
//   out/bobi-pitch-deck.pptx (PowerPoint·Keynote·Google Slides 모두 호환)

const path = require('path');
const fs = require('fs');
const PptxGenJS = require('pptxgenjs');

const OUT_DIR = path.join(__dirname, 'out');
const SLIDES = [
    's1', 's2', 's3', 's4',
    's4a', 's4b', 's4c', 's4d', 's4e',  // 제품 데모 5장 (폰 모킹)
    's5', 's6', 's7', 's8',
    's9', 's10', 's11', 's12', 's13', 's14', 's15',
];

(async () => {
    // PNG 존재 확인
    const missing = SLIDES.filter((id) => !fs.existsSync(path.join(OUT_DIR, `${id}.png`)));
    if (missing.length > 0) {
        console.error(`✗ 다음 PNG가 없습니다: ${missing.join(', ')}`);
        console.error('먼저 capture.js를 실행하세요: node marketing/investor-pitch/capture.js');
        process.exit(1);
    }

    const pptx = new PptxGenJS();

    // 메타데이터
    pptx.author = '주식회사 바틀 / 한승수';
    pptx.company = 'Bottle Inc.';
    pptx.title = '보비 BoBi — Investor Pitch Deck v3';
    pptx.subject = 'Seed Round 2 / 10억 / Pre 100억';

    // 16:9 슬라이드 사이즈 (PowerPoint 표준 와이드)
    pptx.layout = 'LAYOUT_WIDE';  // 13.333" × 7.5" = 1920×1080 비율

    for (const id of SLIDES) {
        const slide = pptx.addSlide();
        const imgPath = path.join(OUT_DIR, `${id}.png`);

        // PNG를 슬라이드 전체에 풀블리드로 배치
        // LAYOUT_WIDE 기준: 13.333" (가로) × 7.5" (세로)
        slide.addImage({
            path: imgPath,
            x: 0, y: 0,
            w: 13.333, h: 7.5,
        });
    }

    const outPath = path.join(OUT_DIR, 'bobi-pitch-deck.pptx');
    await pptx.writeFile({ fileName: outPath });
    console.log(`✓ ${path.relative(process.cwd(), outPath)} 생성 완료`);
    console.log(`  ${SLIDES.length}장 / 16:9 / ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)}MB`);
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
