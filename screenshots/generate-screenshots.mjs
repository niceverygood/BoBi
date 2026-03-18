import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZES = {
  'iphone-6.7': { width: 1284, height: 2778 },
  'iphone-6.5': { width: 1284, height: 2778 },
  'android-phone': { width: 1080, height: 1920 },
};

const BASE_URL = 'https://bo-bi.vercel.app';

const PAGES = [
  { name: '1_landing', path: '/' },
  { name: '2_dashboard', path: '/dashboard' },
  { name: '3_analyze', path: '/dashboard/analyze' },
  { name: '4_pricing', path: '/pricing' },
  { name: '5_subscribe', path: '/dashboard/subscribe?plan=basic' },
  { name: '6_history', path: '/dashboard/history' },
];

// 테스트 계정
const TEST_EMAIL = 'test@bobi.kr';
const TEST_PASSWORD = 'test1234!';

async function login(page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', TEST_EMAIL);
  await page.type('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  // 쿠키가 설정될 때까지 대기
  await new Promise(r => setTimeout(r, 2000));
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });

  for (const [sizeName, size] of Object.entries(SIZES)) {
    const outDir = join(__dirname, 'output', sizeName);
    mkdirSync(outDir, { recursive: true });

    console.log(`\n📱 ${sizeName} (${size.width}x${size.height})`);

    const page = await browser.newPage();
    await page.setViewport({
      width: size.width,
      height: size.height,
      deviceScaleFactor: 1,
    });

    // 로그인
    console.log('  🔐 로그인 중...');
    await login(page);

    for (const { name, path } of PAGES) {
      console.log(`  📸 ${name}...`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      // Safari 하단바 없이 전체 뷰포트 캡처
      await page.screenshot({
        path: join(outDir, `${name}.png`),
        type: 'png',
        clip: { x: 0, y: 0, width: size.width, height: size.height },
      });
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✅ 모든 스크린샷 생성 완료!');
  console.log(`📁 출력: ${join(__dirname, 'output')}`);
}

main().catch(console.error);
