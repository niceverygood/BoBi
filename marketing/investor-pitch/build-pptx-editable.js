// marketing/investor-pitch/build-pptx-editable.js
//
// 텍스트·도형 모두 PowerPoint에서 직접 편집 가능한 네이티브 PPTX 생성.
// pptxgenjs API로 슬라이드별 도형·텍스트 박스를 직접 그림.
// PNG 배경 X — 100% 네이티브 도형.
//
// 실행:
//   node marketing/investor-pitch/build-pptx-editable.js
//
// 산출:
//   out/bobi-pitch-deck-editable.pptx
//
// 사용법:
//   PowerPoint에서 열고 텍스트 박스를 클릭하면 카피 즉시 수정 가능.
//   색상·폰트·도형도 PowerPoint 기본 도구로 자유롭게 편집.

const path = require('path');
const PptxGenJS = require('pptxgenjs');

// ────────────────────────────────────────
// 디자인 토큰 (보비 디자인시스템 §11.3)
// ────────────────────────────────────────
const COLOR = {
    brand50:  'EFF6FF',
    brand100: 'DBEAFE',
    brand500: '3B82F6',
    brand600: '1A56DB',
    brand700: '1E40AF',
    brand800: '1E3A8A',
    ink900:   '0B1220',
    ink700:   '1F2937',
    ink500:   '4B5563',
    ink400:   '6B7280',
    ink300:   '9CA3AF',
    ink200:   'E5E7EB',
    bg:       'F8FAFC',
    white:    'FFFFFF',
    danger:   'DC2626',
    warn:     'D97706',
    yellow:   'FFEB00',
};
// 폰트 — Apple SD Gothic Neo (macOS), Malgun Gothic (Windows). PowerPoint가 OS에 따라 fallback.
const FONT = '맑은 고딕';
const FONT_HEAVY = '맑은 고딕';

// 슬라이드 사이즈 (LAYOUT_WIDE = 13.333" × 7.5" = 1920×1080 비율)
const W = 13.333;
const H = 7.5;

// ────────────────────────────────────────
// 헬퍼 — 자주 쓰는 패턴
// ────────────────────────────────────────

/** 슬라이드 헤더 (번호 + 제목 + 서브) */
function addHeader(slide, num, titleParts, sub) {
    slide.addText(num, {
        x: 0.7, y: 0.6, w: 6, h: 0.3,
        fontSize: 12, fontFace: FONT, color: COLOR.brand600,
        bold: true, charSpacing: 4,
    });
    slide.addText(titleParts, {
        x: 0.7, y: 0.95, w: 12, h: 1.3,
        fontSize: 44, fontFace: FONT_HEAVY, color: COLOR.ink900,
        bold: true,
    });
    if (sub) {
        slide.addText(sub, {
            x: 0.7, y: 2.25, w: 12, h: 0.5,
            fontSize: 18, fontFace: FONT, color: COLOR.ink500,
        });
    }
}

/** 페이지 푸터 (보비 + 페이지 번호) */
function addFooter(slide, page, total) {
    slide.addText('보비', {
        x: 0.7, y: 7.05, w: 2, h: 0.3,
        fontSize: 14, fontFace: FONT_HEAVY, color: COLOR.brand700, bold: true,
    });
    slide.addText(`${page} / ${total}`, {
        x: W - 1.7, y: 7.05, w: 1, h: 0.3,
        fontSize: 11, fontFace: FONT, color: COLOR.ink400,
        align: 'right',
    });
}

/** 둥근 사각형 카드 (선택) */
function addCard(slide, opts) {
    slide.addShape('roundRect', {
        x: opts.x, y: opts.y, w: opts.w, h: opts.h,
        fill: { color: opts.fill || COLOR.white },
        line: { color: opts.border || COLOR.ink200, width: 1 },
        rectRadius: opts.radius ?? 0.15,
    });
}

/** 칩 (둥근 모서리 작은 박스) */
function addChip(slide, x, y, w, h, text, opts = {}) {
    slide.addShape('roundRect', {
        x, y, w, h,
        fill: { color: opts.fill || COLOR.brand100 },
        line: { type: 'none' },
        rectRadius: 0.5,
    });
    slide.addText(text, {
        x, y, w, h,
        fontSize: opts.fontSize || 12, fontFace: FONT, bold: true,
        color: opts.color || COLOR.brand700,
        align: 'center', valign: 'middle',
    });
}

const TOTAL = 20;

// ────────────────────────────────────────
// 빌드 시작
// ────────────────────────────────────────
const pptx = new PptxGenJS();
pptx.author = '주식회사 바틀 / 한승수';
pptx.company = 'Bottle Inc.';
pptx.title = '보비 BoBi — Investor Pitch Deck v3 (Editable)';
pptx.subject = 'Seed Round 2 / 10억 / Pre 100억';
pptx.layout = 'LAYOUT_WIDE';

// ──── SLIDE 1 — Cover ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.brand50 };

    // 보비 로고 (큰 텍스트)
    s.addText('보비', {
        x: 0, y: 1.5, w: W, h: 2.4,
        fontSize: 220, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
        align: 'center', charSpacing: -10,
    });
    // 태그라인
    s.addText([
        { text: '보험 설계사 1인을 위한\n', options: { color: COLOR.ink900 } },
        { text: 'AI 컨설팅 도구', options: { color: COLOR.brand600 } },
    ], {
        x: 0, y: 4.0, w: W, h: 1.2,
        fontSize: 40, fontFace: FONT_HEAVY, bold: true,
        align: 'center',
    });
    // 서브
    s.addText('진료 데이터로 5분 만에 고객 분석 · 매일 새벽 자동 영업 기회', {
        x: 0, y: 5.1, w: W, h: 0.4,
        fontSize: 18, fontFace: FONT, color: COLOR.ink500,
        align: 'center',
    });
    // 라운드 박스 (3 정보)
    const boxY = 5.85;
    const boxW = 8.0;
    const boxX = (W - boxW) / 2;
    s.addShape('roundRect', {
        x: boxX, y: boxY, w: boxW, h: 0.85,
        fill: { color: COLOR.white },
        line: { type: 'none' },
        rectRadius: 0.15,
    });
    const items = [
        { l: 'ROUND', v: 'Seed Round 2' },
        { l: 'RAISE', v: '10억원' },
        { l: 'PRE-MONEY', v: '100억원' },
    ];
    const itemW = boxW / 3;
    items.forEach((it, i) => {
        const ix = boxX + i * itemW;
        s.addText(it.l, {
            x: ix, y: boxY + 0.1, w: itemW, h: 0.25,
            fontSize: 10, fontFace: FONT, color: COLOR.ink500, bold: true,
            align: 'center', charSpacing: 2,
        });
        s.addText(it.v, {
            x: ix, y: boxY + 0.32, w: itemW, h: 0.5,
            fontSize: 22, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
            align: 'center',
        });
    });
    s.addText('주식회사 바틀 · 한승수 대표 · 2026.05 · support@bobi.co.kr', {
        x: 0, y: 6.95, w: W, h: 0.3,
        fontSize: 10, fontFace: FONT, color: COLOR.ink500,
        align: 'center',
    });
}

// ──── SLIDE 2 — Problem ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '02 · PROBLEM', '한국 보험 설계사 60만 명, 매일 똑같은 고통');

    const pains = [
        { n: '1', t: '고객 분석에 시간이 너무 오래 걸린다', d: '1명당 보장 분석 평균 3시간(수기 정리). 고지 누락 점검도 직접 → 보험금 거절 리스크.' },
        { n: '2', t: '클로징 무기가 부족하다', d: '"왜 이 보험이 필요한가" 설계사 말로만 설득. 보장 갭을 숫자로 보여주기 어려움.' },
        { n: '3', t: '영업 기회를 놓친다', d: '갱신·면책·생일 등 컨택 타이밍을 수기 관리. 1명 놓치면 평생 LTV 수백만원 손실.' },
        { n: '4', t: '데이터·시스템 파편화', d: 'HIRA 진료내역, 건강검진, 보험 가입 정보가 각각 따로. 통합 분석 도구 부재.' },
    ];
    const cardW = 5.7;
    const cardH = 2.0;
    const gap = 0.35;
    pains.forEach((p, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.7 + col * (cardW + gap);
        const y = 3.0 + row * (cardH + gap);
        addCard(s, { x, y, w: cardW, h: cardH, radius: 0.18 });
        // 번호 동그라미
        s.addShape('ellipse', {
            x: x + 0.3, y: y + 0.3, w: 0.6, h: 0.6,
            fill: { color: COLOR.brand100 }, line: { type: 'none' },
        });
        s.addText(p.n, {
            x: x + 0.3, y: y + 0.3, w: 0.6, h: 0.6,
            fontSize: 22, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
            align: 'center', valign: 'middle',
        });
        s.addText(p.t, {
            x: x + 1.05, y: y + 0.3, w: cardW - 1.3, h: 0.6,
            fontSize: 18, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
            valign: 'middle',
        });
        s.addText(p.d, {
            x: x + 0.3, y: y + 1.0, w: cardW - 0.6, h: 0.9,
            fontSize: 13, fontFace: FONT, color: COLOR.ink500,
        });
    });
    addFooter(s, 2, TOTAL);
}

// ──── SLIDE 3 — Solution ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '03 · SOLUTION', '진료 데이터 + AI = 5분 컨설팅',
        '설계사 1인 도구 — 진료 데이터·AI 위험도·카카오 알림톡 통합');

    const feats = [
        { name: '진료정보 분석', desc: '5년치 진료내역\n자동 정리·고지 누락 점검', tech: 'HIRA 진료 (CODEF) + LLM' },
        { name: '위험도 리포트', desc: '일반인 대비\n개인 질환 위험 배율', tech: '진료+건검 통계 모델' },
        { name: '가상 사고영수증', desc: '"만약 그 질환 생기면"\n보장 갭 시각화', tech: '의료비 시뮬레이션' },
        { name: 'CRM 자동 알림톡', desc: '갱신·면책·생일\n매일 새벽 자동 카톡', tech: 'ALIGO + 자체 cron' },
        { name: '미래의 나', desc: '연령대별\n의료비 변화 시뮬레이션', tech: '통계청 + 시나리오' },
    ];
    const cardW = 2.35;
    const cardH = 2.7;
    const gap = 0.15;
    feats.forEach((f, i) => {
        const x = 0.7 + i * (cardW + gap);
        const y = 3.1;
        s.addShape('roundRect', {
            x, y, w: cardW, h: cardH,
            fill: { color: COLOR.brand50 },
            line: { color: COLOR.brand100, width: 2 },
            rectRadius: 0.15,
        });
        s.addText(f.name, {
            x: x + 0.2, y: y + 0.25, w: cardW - 0.4, h: 0.55,
            fontSize: 16, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
        });
        s.addText(f.desc, {
            x: x + 0.2, y: y + 0.85, w: cardW - 0.4, h: 1.3,
            fontSize: 12, fontFace: FONT, color: COLOR.ink700,
        });
        s.addShape('line', {
            x: x + 0.2, y: y + 2.15, w: cardW - 0.4, h: 0,
            line: { color: COLOR.brand100, width: 1 },
        });
        s.addText(f.tech, {
            x: x + 0.2, y: y + 2.2, w: cardW - 0.4, h: 0.4,
            fontSize: 10, fontFace: FONT, color: COLOR.ink500,
        });
    });
    s.addShape('roundRect', {
        x: 0.7, y: 6.0, w: W - 1.4, h: 0.85,
        fill: { color: COLOR.bg }, line: { type: 'none' }, rectRadius: 0.1,
    });
    s.addText([
        { text: '핵심 차별점:  ', options: { color: COLOR.brand700, bold: true } },
        { text: 'CODEF API 본인 동의 연동 · 카카오 알림톡 발신자 = 설계사 본인 이름 · 특허 6건 출원 (마이데이터 사업자 연계는 Phase 2)', options: { color: COLOR.ink700 } },
    ], {
        x: 0.95, y: 6.0, w: W - 1.9, h: 0.85,
        fontSize: 13, fontFace: FONT, valign: 'middle',
    });
    addFooter(s, 3, TOTAL);
}

// ──── SLIDE 4 — Why Now ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '04 · WHY NOW', '3가지 변곡점이 동시에 왔다');

    const points = [
        { y: '2022~', n: '진료 데이터', d: '진료내역·건강검진\n합법적 조회 가능' },
        { y: '2023~', n: 'LLM', d: '의료 텍스트 분석\n실용 수준 도달' },
        { y: '2024~', n: '카카오 알림톡', d: '설계사·고객 컨택\n채널 표준화' },
    ];
    const cardW = 3.85;
    const gap = 0.25;
    points.forEach((p, i) => {
        const x = 0.7 + i * (cardW + gap);
        const y = 3.0;
        s.addShape('roundRect', {
            x, y, w: cardW, h: 2.4,
            fill: { color: COLOR.brand50 },
            line: { color: COLOR.brand100, width: 2 },
            rectRadius: 0.15,
        });
        s.addText(p.y, {
            x, y: y + 0.35, w: cardW, h: 0.5,
            fontSize: 18, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand600,
            align: 'center',
        });
        s.addText(p.n, {
            x, y: y + 0.85, w: cardW, h: 0.7,
            fontSize: 26, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
            align: 'center',
        });
        s.addText(p.d, {
            x, y: y + 1.6, w: cardW, h: 0.7,
            fontSize: 13, fontFace: FONT, color: COLOR.ink500,
            align: 'center',
        });
    });

    s.addShape('roundRect', {
        x: 0.7, y: 5.7, w: W - 1.4, h: 1.15,
        fill: { color: COLOR.brand700 }, line: { type: 'none' }, rectRadius: 0.15,
    });
    s.addText('지금 진입 안 하면, 5년 안에 빅테크가 시장 잠식.', {
        x: 1.0, y: 5.85, w: W - 2.0, h: 0.4,
        fontSize: 18, fontFace: FONT_HEAVY, bold: true, color: COLOR.white,
    });
    s.addText('설계사 1인 도구는 빅테크가 외면하는 영역 → 스타트업 기회. 보비 선점 효과: CODEF 연동·HIRA 통합 6-12개월 + 이종인 13년 채널 + 특허 6건.', {
        x: 1.0, y: 6.25, w: W - 2.0, h: 0.55,
        fontSize: 12, fontFace: FONT, color: COLOR.white,
    });
    addFooter(s, 4, TOTAL);
}

// ──── SLIDE 4a~4e — Product Demo (폰 모킹) ────
const demoSlides = [
    {
        page: 5, num: '04A · PRODUCT DEMO', title: ['진료정보 분석 — ', '3시간 → 5분'],
        phoneTitle: '5년치 진료내역,\n한 화면에', phoneEyebrow: '진료정보 분석',
        cardTitle: '홍길동님 진료내역 요약', cardSub: '조회 기간: 2021~2026 (5년) · 84건',
        rows: [
            ['주요 진단', '고혈압 · 고지혈증', null],
            ['총 진료 건수', '84건', null],
            ['복용 약물', '아토르바스타틴 외 3종', 'brand'],
            ['최근 진료', '2026.04.18', null],
            ['고지 사항 점검', '2건 확인 필요', 'warn-pill'],
        ],
        rightTitle: '5년치 진료내역,\n5분에 정리',
        rightLead: '설계사 1명당 분석 시간 3시간 → 5분.\n고지 누락 사전 점검으로 청약 거절·보험금 분쟁 사전 차단.',
        chips: ['HIRA 진료 (CODEF)', '5년 통합 분석', 'AI 자동 정리'],
        quote: '"고객 한 명당 30분이면 충분. 청약 전에 고지 누락 위험도 미리 잡힙니다."',
    },
    {
        page: 6, num: '04B · PRODUCT DEMO', title: ['위험도 리포트 — ', '데이터로 설득'],
        phoneTitle: '일반인 대비\n몇 배 위험한지', phoneEyebrow: '위험도 리포트',
        cardTitle: '홍길동님 위험도 분석', cardSub: '근거 수준: 높음',
        bars: [
            { name: '심혈관 질환', ratio: '3.2배', color: COLOR.danger, w: 0.9 },
            { name: '당뇨', ratio: '1.9배', color: COLOR.warn, w: 0.6 },
            { name: '암 (위)', ratio: '1.4배', color: COLOR.brand500, w: 0.4 },
            { name: '뇌혈관 질환', ratio: '1.2배', color: COLOR.brand500, w: 0.3 },
        ],
        rightTitle: '"왜 보험이 필요한가"를\n데이터로 설명',
        rightLead: '진료 + 건강검진 데이터로 개인화된 질환 위험 배율 자동 산출.\n설계사 말이 아니라 숫자가 설득합니다.',
        chips: ['개인화 모델', '진료+건검 통합', '근거 수준 표기'],
        quote: '"고객님이 심혈관 일반인 대비 3.2배입니다 — 클로징이 빨라집니다."',
    },
    {
        page: 7, num: '04C · PRODUCT DEMO', title: ['가상 사고영수증 — ', '보장 갭 시각화'],
        phoneTitle: '보장 갭,\n숫자로 보여드립니다', phoneEyebrow: '가상 사고영수증',
        cardTitle: '심근경색 가상영수증', cardSub: '3차 종합병원 · 입원 14일 기준',
        receipts: [
            ['예상 총 의료비', '3,840만원', null],
            ['현재 보장 추정', '1,200만원', COLOR.brand500],
            ['자기부담 예상', '2,640만원', COLOR.danger],
        ],
        gapLabel: '보장 부족분', gapValue: '2,640만',
        rightTitle: '"만약 그 질환이 생기면"\n한 장으로 답한다',
        rightLead: '예상 의료비 × 현재 보장 추정 × 자기부담 = 보장 갭 자동 산출.\n추가 가입 제안 클로징의 가장 강력한 무기.',
        chips: ['의료비 시뮬레이션', '약관 매칭', 'PDF 발송'],
        quote: '"2,640만원 부족합니다" — 고객이 추가 가입을 거절할 수 없는 한 장.',
    },
    {
        page: 8, num: '04D · PRODUCT DEMO', title: ['CRM 자동 알림톡 — ', '영업 기회 0% 미스'],
        phoneTitle: '갱신·면책·생일\n자동으로 보냅니다', phoneEyebrow: 'CRM 자동 알림톡',
        kakaoMsgs: [
            '[보비] 박철수님, 실손의료보험 갱신일이 일주일 남았습니다.\n갱신일: 2026-05-14',
            '[보비] 김영희님, 90일 면책 기간이 3일 뒤 종료됩니다.\n면책 종료: 2026-05-10',
            '[보비] 이도경님, 생일을 진심으로 축하드립니다.\n설계사 한승수 드림',
        ],
        rightTitle: '한 번 입력 →\n매일 새벽 자동 발송',
        rightLead: '갱신 D-30/D-7/당일 · 90일 면책 종료 · 1년 감액 종료 · 생일.\n설계사 본인 이름으로 발송 = 자연스러운 브랜딩.',
        chips: ['매일 새벽 cron', '중복 발송 차단', '설계사 브랜딩'],
        quote: '"갱신·면책 미스 = 평생 LTV 손실. 보비는 0% 미스를 약속합니다."',
    },
    {
        page: 9, num: '04E · PRODUCT DEMO', title: ['미래의 나 — ', '젊은 고객 클로징'],
        phoneTitle: '연령대별\n의료비 변화', phoneEyebrow: '미래의 나',
        cardTitle: '홍길동님 미래 의료비', cardSub: '연령대별 예상 의료비',
        ageBars: [
            { age: '30대', val: '120만', h: 0.35 },
            { age: '40대', val: '280만', h: 0.55 },
            { age: '50대', val: '540만', h: 0.75 },
            { age: '60대', val: '920만', h: 0.95 },
            { age: '70대', val: '1,400만', h: 1.0 },
        ],
        rightTitle: '"지금 가입해야 하는\n이유"를 보여준다',
        rightLead: '30대 → 40대 → 50대 → 60대 의료비 곡선 시각화.\n젊은 고객에게 가장 강력한 설득 무기.',
        chips: ['통계청 데이터', '연령별 시나리오', '고객용 PDF'],
        quote: '"30대는 120만 → 70대 1,400만. 지금 가입하지 않을 이유가 없습니다."',
    },
];

demoSlides.forEach((d) => {
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, d.num, [
        { text: d.title[0], options: { color: COLOR.ink900 } },
        { text: d.title[1], options: { color: COLOR.brand600 } },
    ]);

    // 폰 모킹 (좌측)
    const phoneX = 0.9;
    const phoneY = 2.95;
    const phoneW = 2.6;
    const phoneH = 4.0;
    s.addShape('roundRect', {
        x: phoneX, y: phoneY, w: phoneW, h: phoneH,
        fill: { color: COLOR.ink900 },
        line: { type: 'none' },
        rectRadius: 0.35,
    });
    // 화면
    const scrX = phoneX + 0.1;
    const scrY = phoneY + 0.1;
    const scrW = phoneW - 0.2;
    const scrH = phoneH - 0.2;
    s.addShape('roundRect', {
        x: scrX, y: scrY, w: scrW, h: scrH,
        fill: { color: COLOR.brand50 },
        line: { type: 'none' },
        rectRadius: 0.3,
    });
    // 노치
    s.addShape('roundRect', {
        x: phoneX + phoneW / 2 - 0.45, y: phoneY + 0.18,
        w: 0.9, h: 0.18,
        fill: { color: COLOR.ink900 }, line: { type: 'none' },
        rectRadius: 0.09,
    });
    // 폰 eyebrow
    addChip(s, scrX + scrW / 2 - 0.6, scrY + 0.5, 1.2, 0.25, d.phoneEyebrow, { fontSize: 9 });
    // 폰 헤드라인
    s.addText(d.phoneTitle, {
        x: scrX, y: scrY + 0.85, w: scrW, h: 0.7,
        fontSize: 16, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
        align: 'center',
    });

    // 폰 카드 (각 데모별 컨텐츠)
    const cardX = scrX + 0.15;
    const cardY = scrY + 1.7;
    const cardW = scrW - 0.3;
    const cardH = scrH - 1.85;

    if (d.rows) {
        s.addShape('roundRect', {
            x: cardX, y: cardY, w: cardW, h: cardH,
            fill: { color: COLOR.white }, line: { type: 'none' }, rectRadius: 0.15,
        });
        s.addText(d.cardTitle, {
            x: cardX + 0.15, y: cardY + 0.12, w: cardW - 0.3, h: 0.3,
            fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
        });
        s.addText(d.cardSub, {
            x: cardX + 0.15, y: cardY + 0.37, w: cardW - 0.3, h: 0.25,
            fontSize: 8, fontFace: FONT, color: COLOR.ink500,
        });
        const rowStart = cardY + 0.7;
        const rowH = (cardH - 0.8) / d.rows.length;
        d.rows.forEach((row, i) => {
            const ry = rowStart + i * rowH;
            s.addText(row[0], {
                x: cardX + 0.15, y: ry, w: cardW * 0.4, h: rowH - 0.05,
                fontSize: 9, fontFace: FONT, color: COLOR.ink500,
                valign: 'middle',
            });
            const valColor = row[2] === 'brand' ? COLOR.brand600 :
                row[2] === 'warn-pill' ? COLOR.warn : COLOR.ink900;
            s.addText(row[1], {
                x: cardX + cardW * 0.4, y: ry, w: cardW * 0.55, h: rowH - 0.05,
                fontSize: 9, fontFace: FONT_HEAVY, bold: true, color: valColor,
                align: 'right', valign: 'middle',
            });
        });
    }

    if (d.bars) {
        s.addShape('roundRect', {
            x: cardX, y: cardY, w: cardW, h: cardH,
            fill: { color: COLOR.white }, line: { type: 'none' }, rectRadius: 0.15,
        });
        s.addText(d.cardTitle, {
            x: cardX + 0.15, y: cardY + 0.12, w: cardW - 0.3, h: 0.3,
            fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
        });
        s.addText(d.cardSub, {
            x: cardX + 0.15, y: cardY + 0.37, w: cardW - 0.3, h: 0.25,
            fontSize: 8, fontFace: FONT, color: COLOR.ink500,
        });
        const barStart = cardY + 0.75;
        const barAreaH = cardH - 0.85;
        const barH = barAreaH / d.bars.length;
        d.bars.forEach((b, i) => {
            const by = barStart + i * barH;
            s.addText(b.name, {
                x: cardX + 0.15, y: by, w: cardW * 0.55, h: 0.25,
                fontSize: 9, fontFace: FONT, bold: true, color: COLOR.ink900,
            });
            s.addText(b.ratio, {
                x: cardX + cardW * 0.55, y: by, w: cardW * 0.4, h: 0.25,
                fontSize: 9, fontFace: FONT_HEAVY, bold: true, color: b.color,
                align: 'right',
            });
            // 트랙
            s.addShape('roundRect', {
                x: cardX + 0.15, y: by + 0.3, w: cardW - 0.3, h: 0.1,
                fill: { color: 'F1F5F9' }, line: { type: 'none' }, rectRadius: 0.05,
            });
            // 채움
            s.addShape('roundRect', {
                x: cardX + 0.15, y: by + 0.3, w: (cardW - 0.3) * b.w, h: 0.1,
                fill: { color: b.color }, line: { type: 'none' }, rectRadius: 0.05,
            });
        });
    }

    if (d.receipts) {
        s.addShape('roundRect', {
            x: cardX, y: cardY, w: cardW, h: cardH,
            fill: { color: COLOR.white }, line: { type: 'none' }, rectRadius: 0.15,
        });
        s.addText(d.cardTitle, {
            x: cardX + 0.15, y: cardY + 0.12, w: cardW - 0.3, h: 0.3,
            fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
        });
        s.addText(d.cardSub, {
            x: cardX + 0.15, y: cardY + 0.37, w: cardW - 0.3, h: 0.25,
            fontSize: 8, fontFace: FONT, color: COLOR.ink500,
        });
        const rcStart = cardY + 0.75;
        d.receipts.forEach((r, i) => {
            const ry = rcStart + i * 0.42;
            s.addShape('roundRect', {
                x: cardX + 0.15, y: ry, w: cardW - 0.3, h: 0.36,
                fill: { color: COLOR.bg }, line: { type: 'none' }, rectRadius: 0.08,
            });
            s.addText(r[0], {
                x: cardX + 0.3, y: ry, w: cardW * 0.5, h: 0.36,
                fontSize: 9, fontFace: FONT, color: COLOR.ink500, valign: 'middle',
            });
            s.addText(r[1], {
                x: cardX + cardW * 0.5, y: ry, w: cardW * 0.45, h: 0.36,
                fontSize: 9, fontFace: FONT_HEAVY, bold: true,
                color: r[2] || COLOR.ink900, align: 'right', valign: 'middle',
            });
        });
        // gap pill
        const gapY = rcStart + d.receipts.length * 0.42 + 0.1;
        s.addShape('roundRect', {
            x: cardX + 0.15, y: gapY, w: cardW - 0.3, h: 0.5,
            fill: { color: COLOR.brand700 }, line: { type: 'none' }, rectRadius: 0.1,
        });
        s.addText(d.gapLabel, {
            x: cardX + 0.3, y: gapY, w: cardW * 0.5, h: 0.5,
            fontSize: 9, fontFace: FONT, color: COLOR.white, valign: 'middle',
        });
        s.addText(d.gapValue, {
            x: cardX + cardW * 0.5, y: gapY, w: cardW * 0.45, h: 0.5,
            fontSize: 16, fontFace: FONT_HEAVY, bold: true, color: COLOR.white,
            align: 'right', valign: 'middle',
        });
    }

    if (d.kakaoMsgs) {
        d.kakaoMsgs.forEach((msg, i) => {
            const ky = cardY + i * 0.78;
            s.addShape('roundRect', {
                x: cardX, y: ky, w: cardW, h: 0.7,
                fill: { color: COLOR.yellow }, line: { type: 'none' }, rectRadius: 0.12,
            });
            s.addText(msg, {
                x: cardX + 0.15, y: ky + 0.05, w: cardW - 0.3, h: 0.6,
                fontSize: 8, fontFace: FONT, color: COLOR.ink900,
            });
        });
    }

    if (d.ageBars) {
        s.addShape('roundRect', {
            x: cardX, y: cardY, w: cardW, h: cardH,
            fill: { color: COLOR.white }, line: { type: 'none' }, rectRadius: 0.15,
        });
        s.addText(d.cardTitle, {
            x: cardX + 0.15, y: cardY + 0.12, w: cardW - 0.3, h: 0.3,
            fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
        });
        s.addText(d.cardSub, {
            x: cardX + 0.15, y: cardY + 0.37, w: cardW - 0.3, h: 0.25,
            fontSize: 8, fontFace: FONT, color: COLOR.ink500,
        });
        const chartStart = cardY + 0.75;
        const chartH = cardH - 0.9;
        const barAreaW = cardW - 0.3;
        const oneBarW = barAreaW / d.ageBars.length;
        d.ageBars.forEach((b, i) => {
            const bx = cardX + 0.15 + i * oneBarW;
            const bh = chartH * b.h * 0.7;
            const by = chartStart + (chartH * 0.75 - bh);
            s.addShape('roundRect', {
                x: bx + 0.05, y: by, w: oneBarW - 0.1, h: bh,
                fill: { color: COLOR.brand700 }, line: { type: 'none' }, rectRadius: 0.05,
            });
            s.addText(b.age, {
                x: bx, y: chartStart + chartH * 0.78, w: oneBarW, h: 0.2,
                fontSize: 8, fontFace: FONT, color: COLOR.ink500, align: 'center',
            });
            s.addText(b.val, {
                x: bx, y: chartStart + chartH * 0.95, w: oneBarW, h: 0.2,
                fontSize: 8, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700, align: 'center',
            });
        });
    }

    // 우측 텍스트 영역
    const rX = 4.2;
    s.addText(d.rightTitle, {
        x: rX, y: 3.0, w: W - rX - 0.7, h: 1.2,
        fontSize: 32, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
    });
    s.addText(d.rightLead, {
        x: rX, y: 4.3, w: W - rX - 0.7, h: 0.9,
        fontSize: 14, fontFace: FONT, color: COLOR.ink500,
    });
    // 칩 3개
    let chipX = rX;
    const chipY = 5.3;
    d.chips.forEach((c) => {
        const w = 0.15 + c.length * 0.18;
        addChip(s, chipX, chipY, w, 0.4, c, { fontSize: 11 });
        chipX += w + 0.12;
    });
    // 인용구
    s.addShape('rect', {
        x: rX, y: 5.95, w: W - rX - 0.7, h: 0.7,
        fill: { color: COLOR.bg }, line: { type: 'none' },
    });
    s.addShape('rect', {
        x: rX, y: 5.95, w: 0.05, h: 0.7,
        fill: { color: COLOR.brand600 }, line: { type: 'none' },
    });
    s.addText(d.quote, {
        x: rX + 0.2, y: 5.95, w: W - rX - 0.9, h: 0.7,
        fontSize: 13, fontFace: FONT, italic: true, color: COLOR.ink700, valign: 'middle',
    });

    addFooter(s, d.page, TOTAL);
});

// ──── SLIDE 5 — Market ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '05 · MARKET', [
        { text: '한국 설계사 60만 → ', options: { color: COLOR.ink900 } },
        { text: '연 90억 SOM', options: { color: COLOR.brand600 } },
    ]);

    // 좌측 동심원
    const cx = 2.8;
    const cy = 5.0;
    s.addShape('ellipse', { x: cx - 1.8, y: cy - 1.8, w: 3.6, h: 3.6,
        fill: { color: COLOR.brand50 }, line: { color: COLOR.brand100, width: 2 } });
    s.addShape('ellipse', { x: cx - 1.3, y: cy - 1.3, w: 2.6, h: 2.6,
        fill: { color: COLOR.brand100 }, line: { color: COLOR.brand500, width: 2 } });
    s.addShape('ellipse', { x: cx - 0.5, y: cy - 0.5, w: 1.0, h: 1.0,
        fill: { color: COLOR.brand600 }, line: { color: COLOR.brand800, width: 2 } });
    s.addText('TAM\n60만 명', { x: cx - 1.0, y: cy - 1.7, w: 2.0, h: 0.7,
        fontSize: 12, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700, align: 'center' });
    s.addText('SAM\n20만 명', { x: cx - 1.0, y: cy - 1.2, w: 2.0, h: 0.6,
        fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand800, align: 'center' });
    s.addText('SOM\n3만 명', { x: cx - 0.5, y: cy - 0.3, w: 1.0, h: 0.6,
        fontSize: 9, fontFace: FONT_HEAVY, bold: true, color: COLOR.white, align: 'center' });

    // 우측 표
    const tx = 6.5;
    const headers = ['지표', '규모', '근거'];
    const rows = [
        ['TAM', '60만', '금감원 보험중개사 통계'],
        ['SAM', '20만', '30-50대 + 디지털 친화'],
        ['SOM', '3만',  '이종인 채널 + GA 무상배포'],
    ];
    headers.forEach((h, i) => {
        s.addText(h, {
            x: tx + i * 2.0, y: 3.0, w: 2.0, h: 0.4,
            fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink500,
        });
    });
    rows.forEach((r, ri) => {
        const y = 3.5 + ri * 0.5;
        r.forEach((cell, ci) => {
            const isBrand = ci === 1;
            s.addText(cell, {
                x: tx + ci * 2.0, y, w: 2.0, h: 0.4,
                fontSize: 13, fontFace: isBrand ? FONT_HEAVY : FONT, bold: isBrand,
                color: isBrand ? COLOR.brand600 : COLOR.ink900,
            });
        });
        s.addShape('line', {
            x: tx, y: y + 0.45, w: 6.0, h: 0,
            line: { color: COLOR.ink200, width: 1 },
        });
    });
    // 매출 박스
    s.addShape('roundRect', {
        x: tx, y: 5.4, w: 6.0, h: 1.4,
        fill: { color: COLOR.brand50 }, line: { type: 'none' }, rectRadius: 0.12,
    });
    s.addText('SOM 연 매출 가능성', {
        x: tx + 0.2, y: 5.5, w: 5.6, h: 0.3,
        fontSize: 12, fontFace: FONT, bold: true, color: COLOR.ink500,
    });
    s.addText('연 90억원', {
        x: tx + 0.2, y: 5.8, w: 5.6, h: 0.6,
        fontSize: 32, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
    });
    s.addText('3만 × ARPU 25,000원 × 12개월  ·  글로벌 (일본 2027 / 동남아 2028) → 추가 5~10x', {
        x: tx + 0.2, y: 6.4, w: 5.6, h: 0.35,
        fontSize: 10, fontFace: FONT, color: COLOR.ink500,
    });
    addFooter(s, 10, TOTAL);
}

// ──── SLIDE 6 — Product 시나리오 ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '06 · PRODUCT', [
        { text: '매일 30분, ', options: { color: COLOR.ink900 } },
        { text: '매출이 따라온다', options: { color: COLOR.brand600 } },
    ], '보비 설계사 사용 시나리오 — 분석 3시간 → 5분');

    const scenes = [
        { icon: '🌅', t: '오전 — 알림 확인', items: ['오늘 발송된 자동 알림톡 8건 확인', '갱신 D-7 고객 2명 직접 추가 컨택'] },
        { icon: '📊', t: '오후 — 신규 분석', items: ['진료내역 5년치 자동 분석 (5분)', '위험도 + 가상영수증 PDF', '알림톡으로 고객 발송 (본인 이름)'] },
        { icon: '🌙', t: '저녁 — 영업 다이어리', items: ['오늘 컨택 5건 자동 기록', '내일 알림 8건 미리보기'] },
    ];
    const cardW = 3.85;
    const gap = 0.25;
    scenes.forEach((sc, i) => {
        const x = 0.7 + i * (cardW + gap);
        const y = 3.1;
        addCard(s, { x, y, w: cardW, h: 2.6, radius: 0.15 });
        s.addText(sc.icon, { x: x + 0.3, y: y + 0.25, w: 0.6, h: 0.5, fontSize: 28 });
        s.addText(sc.t, {
            x: x + 0.3, y: y + 0.85, w: cardW - 0.6, h: 0.4,
            fontSize: 16, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
        });
        sc.items.forEach((it, j) => {
            s.addText(`• ${it}`, {
                x: x + 0.3, y: y + 1.3 + j * 0.35, w: cardW - 0.6, h: 0.32,
                fontSize: 12, fontFace: FONT, color: COLOR.ink700,
            });
        });
    });
    let cx = 1.5;
    const tags = ['Excel 수기 → 한 화면 자동화', '메신저 파편화 → 카톡 알림 집중', '분석 3시간 → 5분'];
    tags.forEach((t) => {
        const w = 0.3 + t.length * 0.13;
        addChip(s, cx, 6.3, w, 0.45, t, { fontSize: 12 });
        cx += w + 0.2;
    });
    addFooter(s, 11, TOTAL);
}

// ──── SLIDE 7 — Traction ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '07 · TRACTION', [
        { text: 'Seed 1 검증 완료 → ', options: { color: COLOR.ink900 } },
        { text: '매출·채널·제품 동시 성장', options: { color: COLOR.brand600 } },
    ]);

    const cards = [
        { t: '투자 검증 ✓', body: 'Seed 1: 4억 / Pre 40억\n본 라운드 (Seed 2): 10억 / Pre 100억\n2.5x Up Round (기존 + 신규 리드)' },
        { t: '영업 검증 ✓', body: '이종인 영업이사 13년차 · 1,200+ 채널\n4월 누적 4건 24시간 내 반영\nBOBI-CJ 영구 19,900원 Pro 4명' },
        { t: '제품 검증 ✓', body: '알림톡 12종 카카오 검수 통과\nCODEF API 연동 완료\n§11.3 디자인시스템 (정직 톤)' },
        { t: '파이프라인 ✓', body: '42개 보험사·GA 컨택 정보 정리\nBD 코워크 자동화 시스템\n2026 Q3 GA 무상배포 (4,000명)' },
    ];
    const cardW = 5.7;
    const gap = 0.25;
    cards.forEach((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.7 + col * (cardW + gap);
        const y = 2.95 + row * 1.7;
        s.addShape('roundRect', {
            x, y, w: cardW, h: 1.5,
            fill: { color: COLOR.brand50 },
            line: { color: COLOR.brand100, width: 2 },
            rectRadius: 0.15,
        });
        s.addText(c.t, {
            x: x + 0.25, y: y + 0.15, w: cardW - 0.5, h: 0.35,
            fontSize: 14, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
        });
        s.addText(c.body, {
            x: x + 0.25, y: y + 0.5, w: cardW - 0.5, h: 0.95,
            fontSize: 11, fontFace: FONT, color: COLOR.ink700,
        });
    });
    // 분기 타임라인
    const timeline = [
        { q: 'Q1', n: '200', d: '초기 세팅' },
        { q: 'Q2', n: '2,000', d: '구두전략' },
        { q: 'Q3', n: '6,000', d: 'GA 무상배포', active: true },
        { q: 'Q4', n: '10,000', d: '전환 집중' },
    ];
    const tlW = (W - 1.4) / 4;
    timeline.forEach((t, i) => {
        const x = 0.7 + i * tlW;
        const y = 6.3;
        s.addShape('roundRect', {
            x: x + 0.05, y, w: tlW - 0.1, h: 0.85,
            fill: { color: t.active ? COLOR.brand700 : COLOR.white },
            line: { color: t.active ? COLOR.brand700 : COLOR.ink200, width: 2 },
            rectRadius: 0.1,
        });
        const c = t.active ? COLOR.white : COLOR.ink900;
        s.addText(t.q, { x, y: y + 0.05, w: tlW, h: 0.25, fontSize: 10, fontFace: FONT, bold: true, color: c, align: 'center' });
        s.addText(t.n, { x, y: y + 0.25, w: tlW, h: 0.4, fontSize: 22, fontFace: FONT_HEAVY, bold: true, color: c, align: 'center' });
        s.addText(t.d, { x, y: y + 0.6, w: tlW, h: 0.25, fontSize: 9, fontFace: FONT, color: c, align: 'center' });
    });
    addFooter(s, 12, TOTAL);
}

// ──── SLIDE 8 — Business Model ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '08 · BUSINESS MODEL', [
        { text: '3-Layer 매출 — ', options: { color: COLOR.ink900 } },
        { text: 'SaaS · 팀 · API', options: { color: COLOR.brand600 } },
    ]);

    const layers = [
        { tag: 'Layer 1 — B2C', name: '개인 SaaS (검증)',
            items: ['베이직 — 19,900원/월', '프로 (인기) — 39,900원/월'], featured: false },
        { tag: 'Layer 2 — B2B Mid', name: '팀 / GA (진행 중)',
            items: ['팀 (5명) — 99,000원', '비즈니스 (30명) — 390,000원', '엔터프라이즈 (100+) — 890,000원'], featured: true },
        { tag: 'Layer 3 — B2B Enterprise', name: 'API 라이선싱 (2027)',
            items: ['핀테크 GA (보맵·토스인슈)', '보험사 자회사 GA', 'MAU 기반 라이선스'], featured: false },
    ];
    const cardW = 3.85;
    const gap = 0.25;
    layers.forEach((l, i) => {
        const x = 0.7 + i * (cardW + gap);
        const y = 3.0;
        addCard(s, { x, y, w: cardW, h: 2.6, border: l.featured ? COLOR.brand600 : COLOR.ink200, radius: 0.15 });
        addChip(s, x + 0.25, y + 0.25, 1.7, 0.32, l.tag,
            { fill: l.featured ? COLOR.brand700 : COLOR.brand100, color: l.featured ? COLOR.white : COLOR.brand700, fontSize: 9 });
        s.addText(l.name, {
            x: x + 0.25, y: y + 0.7, w: cardW - 0.5, h: 0.4,
            fontSize: 16, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
        });
        l.items.forEach((it, j) => {
            s.addText(`• ${it}`, {
                x: x + 0.25, y: y + 1.2 + j * 0.35, w: cardW - 0.5, h: 0.32,
                fontSize: 11, fontFace: FONT, color: COLOR.ink700,
            });
        });
    });
    const stats = [
        { l: 'ARPU', v: '25,000원' },
        { l: '운영 마진', v: '90%+' },
        { l: 'LTV/CAC 목표', v: '5:1+' },
    ];
    stats.forEach((st, i) => {
        const x = 2.5 + i * 3.0;
        s.addText(st.l, {
            x, y: 6.0, w: 3.0, h: 0.3,
            fontSize: 11, fontFace: FONT, color: COLOR.ink500, align: 'center',
        });
        s.addText(st.v, {
            x, y: 6.3, w: 3.0, h: 0.55,
            fontSize: 26, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700, align: 'center',
        });
    });
    addFooter(s, 13, TOTAL);
}

// ──── SLIDE 9 — GTM ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '09 · GO-TO-MARKET', [
        { text: '설계사 → GA → 보험사 — ', options: { color: COLOR.ink900 } },
        { text: '3 Phase', options: { color: COLOR.brand600 } },
    ]);

    const phases = [
        { p: 'Phase 1', q: '2026 Q1-Q2', d: '설계사 1:1 (이종인 채널)\n1,200+ 직접 컨택 → 무료체험 → 베이직 전환', active: true },
        { p: 'Phase 2', q: '2026 Q3', d: '대형 GA 5-10곳 무상 배포\n본사 차원 도구 채택 → 100~500명 일괄 가입', active: false },
        { p: 'Phase 3', q: '2026 Q4 ~ 2027', d: '보험사 자회사 GA + API 라이선싱\n삼성생명금융서비스·한화생명금융서비스 협상', active: false },
    ];
    const tlW = (W - 1.4) / 3;
    phases.forEach((ph, i) => {
        const x = 0.7 + i * tlW;
        const y = 3.0;
        s.addShape('roundRect', {
            x: x + 0.1, y, w: tlW - 0.2, h: 1.5,
            fill: { color: ph.active ? COLOR.brand700 : COLOR.white },
            line: { color: ph.active ? COLOR.brand700 : COLOR.ink200, width: 2 },
            rectRadius: 0.12,
        });
        const c = ph.active ? COLOR.white : COLOR.ink900;
        s.addText(ph.p, { x, y: y + 0.15, w: tlW, h: 0.3, fontSize: 12, fontFace: FONT, bold: true, color: c, align: 'center', transparency: 30 });
        s.addText(ph.q, { x, y: y + 0.45, w: tlW, h: 0.4, fontSize: 22, fontFace: FONT_HEAVY, bold: true, color: c, align: 'center' });
        s.addText(ph.d, { x, y: y + 0.95, w: tlW, h: 0.5, fontSize: 11, fontFace: FONT, color: c, align: 'center' });
    });
    s.addText('Acquisition 채널', {
        x: 0.7, y: 5.0, w: 12, h: 0.4, fontSize: 18, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
    });
    const ch = ['1차 — 이종인 채널', '2차 — BD 코워크 자동화', '3차 — 알림톡 → 추천', '4차 — 친구초대 인센티브'];
    const chW = (W - 1.4) / 4;
    ch.forEach((c, i) => {
        const x = 0.7 + i * chW;
        addCard(s, { x: x + 0.1, y: 5.6, w: chW - 0.2, h: 0.9, radius: 0.12 });
        s.addText(c, {
            x: x + 0.1, y: 5.6, w: chW - 0.2, h: 0.9,
            fontSize: 13, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
            align: 'center', valign: 'middle',
        });
    });
    addFooter(s, 14, TOTAL);
}

// ──── SLIDE 10 — Competition ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '10 · COMPETITION', [
        { text: '4개 카테고리 — 보비만 ', options: { color: COLOR.ink900 } },
        { text: '통합 도구', options: { color: COLOR.brand600 } },
    ]);

    const headers = ['경쟁사', '강점', '약점'];
    const rows = [
        ['굿리치 (리치플래닛)', '보험 통합관리 앱·라운지', '고객용, 설계사 도구 X', false],
        ['보맵', '보험 비교 핀테크', '진료분석 X, 설계사용 X', false],
        ['토스인슈어런스', '토스 트래픽·자체 GA', '설계사 도구 미제공', false],
        ['카카오페이손보', '카카오톡 통합', '보험 가입만, 컨설팅 X', false],
        ['CODEF / Owl Pay', '데이터 API 제공', 'B2B 인프라, 직접 도구 X', false],
        ['★ 보비', '진료 데이터 + AI + 알림톡 통합', '설계사 1인 도구 (TAM 60만)', true],
    ];
    const cols = [3.5, 5.0, 4.4];
    let cx = 0.7;
    headers.forEach((h, i) => {
        s.addShape('rect', { x: cx, y: 2.85, w: cols[i], h: 0.45,
            fill: { color: COLOR.bg }, line: { type: 'none' } });
        s.addText(h, {
            x: cx + 0.2, y: 2.85, w: cols[i], h: 0.45,
            fontSize: 12, fontFace: FONT, bold: true, color: COLOR.ink500, valign: 'middle',
        });
        cx += cols[i];
    });
    rows.forEach((r, ri) => {
        const y = 3.3 + ri * 0.55;
        let cx2 = 0.7;
        if (r[3]) {
            s.addShape('rect', { x: 0.7, y, w: 12.93, h: 0.55,
                fill: { color: COLOR.brand50 }, line: { type: 'none' } });
        }
        for (let i = 0; i < 3; i++) {
            const isBobi = r[3];
            const isWeak = i === 2 && !isBobi;
            s.addText(r[i], {
                x: cx2 + 0.2, y, w: cols[i], h: 0.55,
                fontSize: 12, fontFace: i === 0 || isBobi ? FONT_HEAVY : FONT,
                bold: i === 0 || isBobi,
                color: isBobi ? COLOR.brand600 : (isWeak ? COLOR.danger : COLOR.ink900),
                valign: 'middle',
            });
            cx2 += cols[i];
        }
        if (!r[3]) {
            s.addShape('line', { x: 0.7, y: y + 0.55, w: 12.93, h: 0,
                line: { color: COLOR.ink200, width: 1 } });
        }
    });
    addFooter(s, 15, TOTAL);
}

// ──── SLIDE 11 — Team ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '11 · TEAM', [
        { text: '풀스택 대표 + 13년차 영업이사 + ', options: { color: COLOR.ink900 } },
        { text: '코어팀 6명', options: { color: COLOR.brand600 } },
    ]);

    const members = [
        { name: '한승수', role: 'Founder & CEO',
            items: ['서울대 경영대학원 (MBA)', '풀스택 개발 (Next.js · Supabase · AI)', '보비 제품 100% 직접 개발', '4월 PR 30+ 머지 (실행력 검증)'] },
        { name: '이종인', role: '영업이사 / Co-Founder급',
            items: ['보험 영업 13년차', '1,200+ 설계사 직접 채널', '커미션 기반 (인건비 0원)', '4건 요청 24시간 내 반영'] },
    ];
    const cardW = 5.95;
    const gap = 0.4;
    members.forEach((m, i) => {
        const x = 0.7 + i * (cardW + gap);
        const y = 3.0;
        s.addShape('roundRect', {
            x, y, w: cardW, h: 3.0,
            fill: { color: COLOR.brand50 },
            line: { color: COLOR.brand100, width: 2 },
            rectRadius: 0.15,
        });
        s.addText(m.name, {
            x: x + 0.4, y: y + 0.3, w: cardW - 0.8, h: 0.85,
            fontSize: 42, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
            charSpacing: -3,
        });
        s.addText(m.role, {
            x: x + 0.4, y: y + 1.15, w: cardW - 0.8, h: 0.35,
            fontSize: 14, fontFace: FONT, bold: true, color: COLOR.ink700,
        });
        m.items.forEach((it, j) => {
            s.addText(`• ${it}`, {
                x: x + 0.4, y: y + 1.6 + j * 0.32, w: cardW - 0.8, h: 0.3,
                fontSize: 13, fontFace: FONT, color: COLOR.ink700,
            });
        });
    });
    s.addShape('roundRect', {
        x: 0.7, y: 6.15, w: W - 1.4, h: 0.7,
        fill: { color: COLOR.bg }, line: { type: 'none' }, rectRadius: 0.1,
    });
    s.addText('코어팀 (총 6명) · 강점: 개발 속도 PR 30+/월 · 영업 신뢰 13년 · 마진 효율 인건비 0원', {
        x: 0.95, y: 6.15, w: W - 1.9, h: 0.7,
        fontSize: 13, fontFace: FONT, color: COLOR.ink700, valign: 'middle',
    });
    addFooter(s, 16, TOTAL);
}

// ──── SLIDE 12 — Financials & Ask ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '12 · FINANCIALS & THE ASK', [
        { text: '10억 Seed 2', options: { color: COLOR.brand600 } },
        { text: ' → 24개월 런웨이 → 2027 ARR 13.5억', options: { color: COLOR.ink900 } },
    ]);

    // 좌측 매출 추정
    addCard(s, { x: 0.7, y: 3.0, w: 5.8, h: 2.5, radius: 0.15 });
    s.addText('2026 매출 추정', {
        x: 0.95, y: 3.15, w: 5.3, h: 0.4,
        fontSize: 14, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
    });
    const fHeaders = ['시나리오', '전환율', '연 매출'];
    const fRows = [
        ['보수적', '8%', '1.48억', false],
        ['기본', '12%', '2.22억', true],
        ['낙관적', '18%', '3.33억', false],
    ];
    fHeaders.forEach((h, i) => {
        s.addText(h, {
            x: 0.95 + i * 1.9, y: 3.65, w: 1.8, h: 0.3,
            fontSize: 10, fontFace: FONT, bold: true, color: COLOR.ink500,
        });
    });
    fRows.forEach((r, ri) => {
        const y = 4.0 + ri * 0.4;
        if (r[3]) {
            s.addShape('rect', {
                x: 0.85, y, w: 5.5, h: 0.4,
                fill: { color: COLOR.brand50 }, line: { type: 'none' },
            });
        }
        for (let i = 0; i < 3; i++) {
            const c = r[3] ? COLOR.brand600 : COLOR.ink900;
            s.addText(r[i], {
                x: 0.95 + i * 1.9, y, w: 1.8, h: 0.4,
                fontSize: 12, fontFace: r[3] ? FONT_HEAVY : FONT, bold: r[3], color: c,
                valign: 'middle',
            });
        }
    });
    s.addText('2027 ARR 목표: 13.5억 (6x 성장)', {
        x: 0.95, y: 5.25, w: 5.3, h: 0.3,
        fontSize: 12, fontFace: FONT, color: COLOR.ink700,
    });

    // 우측 The Ask
    s.addShape('roundRect', {
        x: 6.8, y: 3.0, w: W - 7.5, h: 2.5,
        fill: { color: COLOR.brand700 }, line: { type: 'none' }, rectRadius: 0.15,
    });
    s.addText('THE ASK', {
        x: 7.05, y: 3.15, w: 5.5, h: 0.3,
        fontSize: 12, fontFace: FONT, bold: true, color: COLOR.white, charSpacing: 3,
    });
    s.addText('10억원', {
        x: 7.05, y: 3.4, w: 5.5, h: 1.0,
        fontSize: 60, fontFace: FONT_HEAVY, bold: true, color: COLOR.white, charSpacing: -3,
    });
    s.addText('Seed Round 2 / Pre-Money 100억', {
        x: 7.05, y: 4.4, w: 5.5, h: 0.35,
        fontSize: 16, fontFace: FONT, bold: true, color: COLOR.white,
    });
    s.addText([
        { text: '이전 Seed 4억 / Pre 40억 → 2.5x Up Round\n', options: { color: COLOR.white } },
        { text: '누적 Raise 14억 · 런웨이 24개월', options: { color: COLOR.white } },
    ], {
        x: 7.05, y: 4.8, w: 5.5, h: 0.7,
        fontSize: 11, fontFace: FONT, transparency: 15,
    });

    // 자금 사용 막대
    s.addText('자금 사용 (10억)', {
        x: 0.7, y: 5.7, w: 6, h: 0.3,
        fontSize: 14, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
    });
    const segments = [
        { l: '개발 5억 (50%)', w: 6.0, c: COLOR.brand700 },
        { l: '영업 3억 (30%)', w: 3.6, c: COLOR.brand600 },
        { l: 'API 1.5억 (15%)', w: 1.8, c: COLOR.brand500 },
        { l: '운영 0.5억 (5%)', w: 0.6, c: '93C5FD' },
    ];
    let bx = 0.7;
    const totalW = segments.reduce((a, b) => a + b.w, 0);
    const scale = (W - 1.4) / totalW;
    segments.forEach((sg) => {
        const w = sg.w * scale;
        s.addShape('rect', {
            x: bx, y: 6.05, w, h: 0.5,
            fill: { color: sg.c }, line: { type: 'none' },
        });
        s.addText(sg.l, {
            x: bx, y: 6.05, w, h: 0.5,
            fontSize: 11, fontFace: FONT, bold: true, color: COLOR.white,
            align: 'center', valign: 'middle',
        });
        bx += w;
    });
    s.addText('Pre 100억 정당화: ARR 2.2억 × 45x · 모트(CODEF·특허·이종인) · 마진 90%+ · Exit 한화·삼성생명 자회사 GA M&A (5~7년)', {
        x: 0.7, y: 6.65, w: W - 1.4, h: 0.4,
        fontSize: 11, fontFace: FONT, color: COLOR.ink500,
    });
    addFooter(s, 17, TOTAL);
}

// ──── SLIDE 13 — Why BoBi Wins ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '13 · WHY BOBI WINS', [
        { text: '5개 모트', options: { color: COLOR.brand600 } },
        { text: '로 시장을 지킨다', options: { color: COLOR.ink900 } },
    ]);

    const moats = [
        { n: 1, name: '데이터 모트', d: 'CODEF API 본인 동의\nHIRA 진료 통합\n6-12개월 인허가' },
        { n: 2, name: '영업 모트', d: '이종인 13년\n1,200+ 설계사\n(사람 자산)' },
        { n: 3, name: '제품 모트', d: 'AI 분석\n알림톡 브랜딩\n특허 6건 출원' },
        { n: 4, name: '레귤레이션', d: '금융위 규제 사전\n약관 준수\n법무 검토' },
        { n: 5, name: '자본 효율', d: '마진 90%+\n인건비 0원\nSeed 1로 12개월 검증' },
    ];
    const cardW = 2.45;
    const gap = 0.15;
    moats.forEach((m, i) => {
        const x = 0.7 + i * (cardW + gap);
        const y = 3.0;
        addCard(s, { x, y, w: cardW, h: 2.6, border: COLOR.brand100, radius: 0.15 });
        s.addShape('ellipse', {
            x: x + cardW / 2 - 0.4, y: y + 0.3, w: 0.8, h: 0.8,
            fill: { color: COLOR.brand600 }, line: { type: 'none' },
        });
        s.addText(`${m.n}`, {
            x: x, y: y + 0.3, w: cardW, h: 0.8,
            fontSize: 28, fontFace: FONT_HEAVY, bold: true, color: COLOR.white,
            align: 'center', valign: 'middle',
        });
        s.addText(m.name, {
            x: x + 0.2, y: y + 1.25, w: cardW - 0.4, h: 0.4,
            fontSize: 16, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900,
            align: 'center',
        });
        s.addText(m.d, {
            x: x + 0.2, y: y + 1.7, w: cardW - 0.4, h: 0.85,
            fontSize: 11, fontFace: FONT, color: COLOR.ink500,
            align: 'center',
        });
    });
    s.addShape('roundRect', {
        x: 0.7, y: 5.85, w: W - 1.4, h: 1.0,
        fill: { color: COLOR.brand700 }, line: { type: 'none' }, rectRadius: 0.15,
    });
    s.addText('비대칭 BD 채널', {
        x: 1.0, y: 5.95, w: 4, h: 0.35,
        fontSize: 14, fontFace: FONT_HEAVY, bold: true, color: COLOR.white,
    });
    s.addText('이종인 13년 → 보험사 임원 직접 컨택 가능 · 1,200 설계사 → 즉시 베타 테스트·피드백·매출 · 빅테크는 못 하는 "사람 기반 신뢰" 자산', {
        x: 1.0, y: 6.3, w: W - 2.0, h: 0.55,
        fontSize: 12, fontFace: FONT, color: COLOR.white,
    });
    addFooter(s, 18, TOTAL);
}

// ──── SLIDE 14 — Closing ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.brand50 };

    s.addText([
        { text: '보험 설계사의\n', options: { color: COLOR.ink900 } },
        { text: '일하는 방식을 바꿉니다', options: { color: COLOR.brand600 } },
    ], {
        x: 0, y: 1.6, w: W, h: 2.5,
        fontSize: 64, fontFace: FONT_HEAVY, bold: true, align: 'center',
    });
    s.addText('매일 30분, 매출이 2배.', {
        x: 0, y: 4.2, w: W, h: 0.6,
        fontSize: 24, fontFace: FONT, color: COLOR.ink500, align: 'center',
    });
    s.addShape('roundRect', {
        x: W / 2 - 3.0, y: 5.0, w: 6.0, h: 0.7,
        fill: { color: COLOR.brand600 }, line: { type: 'none' }, rectRadius: 0.35,
    });
    s.addText('support@bobi.co.kr · bobi.co.kr', {
        x: W / 2 - 3.0, y: 5.0, w: 6.0, h: 0.7,
        fontSize: 18, fontFace: FONT_HEAVY, bold: true, color: COLOR.white,
        align: 'center', valign: 'middle',
    });
    // 라운드 박스
    const boxY = 6.1;
    s.addShape('roundRect', {
        x: W / 2 - 3.5, y: boxY, w: 7.0, h: 0.85,
        fill: { color: COLOR.white }, line: { type: 'none' }, rectRadius: 0.15,
    });
    const items = [
        { l: 'RAISE', v: '10억' },
        { l: 'PRE-MONEY', v: '100억' },
        { l: 'RUNWAY', v: '24개월' },
    ];
    items.forEach((it, i) => {
        const ix = W / 2 - 3.5 + i * (7.0 / 3);
        s.addText(it.l, {
            x: ix, y: boxY + 0.1, w: 7.0 / 3, h: 0.25,
            fontSize: 10, fontFace: FONT, color: COLOR.ink500, bold: true,
            align: 'center', charSpacing: 2,
        });
        s.addText(it.v, {
            x: ix, y: boxY + 0.32, w: 7.0 / 3, h: 0.5,
            fontSize: 22, fontFace: FONT_HEAVY, bold: true, color: COLOR.brand700,
            align: 'center',
        });
    });
}

// ──── SLIDE 15 — Q&A ────
{
    const s = pptx.addSlide();
    s.background = { color: COLOR.white };
    addHeader(s, '15 · Q&A', [
        { text: '예상 질문 — ', options: { color: COLOR.ink900 } },
        { text: '미리 답변', options: { color: COLOR.brand600 } },
    ]);

    const qa = [
        ['Pre 100억 근거?', '이전 Seed Pre 40억 + 6개월 검증 · 1,200 채널 · 특허 6건 · Series A Pre 디스카운트'],
        ['마이데이터 연계 일정?', 'CODEF로 본인 동의 진료 조회 중. 마이데이터 본허가 또는 인증 사업자 협업 2026.Q4 (Phase 2)'],
        ['보험사가 직접?', '설계사 1인 도구는 빅테크·보험사 외면 영역. 6-12개월 인허가 모트'],
        ['한승수 의존성?', '코어팀 6명 + Seed 2 자금으로 풀스택 2-3명 추가 → CTO 별도 영입'],
        ['이종인이 떠나면?', '보비 시스템 = 설계사가 떠나기 어려운 데이터 자산 (CRM·고객 이력)'],
        ['글로벌?', '일본 2027 (보험설계사 100만, 디지털 도구 부재) → 동남아 2028'],
        ['Exit?', '1순위 한화·삼성생명 자회사 GA M&A (5~7년) · 2순위 토스·카카오 · 3순위 코스닥 IPO'],
        ['Churn / CAC?', '출시 초기, 분기별 비공개 KPI 보고서 NDA 후 제공'],
    ];
    s.addShape('rect', { x: 0.7, y: 2.8, w: 4.0, h: 0.4,
        fill: { color: COLOR.bg }, line: { type: 'none' } });
    s.addShape('rect', { x: 4.7, y: 2.8, w: 8.93, h: 0.4,
        fill: { color: COLOR.bg }, line: { type: 'none' } });
    s.addText('질문', { x: 0.95, y: 2.8, w: 4.0, h: 0.4, fontSize: 11, fontFace: FONT, bold: true, color: COLOR.ink500, valign: 'middle' });
    s.addText('답변', { x: 4.95, y: 2.8, w: 8.93, h: 0.4, fontSize: 11, fontFace: FONT, bold: true, color: COLOR.ink500, valign: 'middle' });

    qa.forEach((row, ri) => {
        const y = 3.2 + ri * 0.42;
        s.addText(row[0], {
            x: 0.95, y, w: 3.7, h: 0.4,
            fontSize: 11, fontFace: FONT_HEAVY, bold: true, color: COLOR.ink900, valign: 'middle',
        });
        s.addText(row[1], {
            x: 4.95, y, w: 8.5, h: 0.4,
            fontSize: 10, fontFace: FONT, color: COLOR.ink700, valign: 'middle',
        });
        s.addShape('line', {
            x: 0.7, y: y + 0.4, w: W - 1.4, h: 0,
            line: { color: COLOR.ink200, width: 1 },
        });
    });
    s.addShape('roundRect', {
        x: 0.7, y: 6.65, w: W - 1.4, h: 0.45,
        fill: { color: COLOR.brand50 }, line: { type: 'none' }, rectRadius: 0.1,
    });
    s.addText([
        { text: 'Appendix (NDA 후 제공): ', options: { color: COLOR.brand700, bold: true } },
        { text: '분기별 KPI · 특허 6건 · 재무 모델 · 약관·법무 검토 · BD 파이프라인 42개사 · 이종인 채널 디테일', options: { color: COLOR.ink700 } },
    ], {
        x: 0.95, y: 6.65, w: W - 1.9, h: 0.45,
        fontSize: 10, fontFace: FONT, valign: 'middle',
    });
    addFooter(s, 20, TOTAL);
}

// 저장
const outPath = path.join(__dirname, 'out', 'bobi-pitch-deck-editable.pptx');
pptx.writeFile({ fileName: outPath }).then(() => {
    const fs = require('fs');
    const size = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
    console.log(`✓ ${path.relative(process.cwd(), outPath)} 생성 완료`);
    console.log(`  20장 / 16:9 / ${size}MB / 100% 네이티브 도형·텍스트 (PowerPoint에서 직접 편집 가능)`);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
