#!/usr/bin/env node
/**
 * Capture the store screenshot set from the real app.
 *
 * Nothing here is a mock-up: it signs in, walks the app, and photographs what
 * is on screen at the sizes each store asks for. Run the API and the Expo web
 * build first, and seed the development listings.
 *
 * Usage, from /app:
 *   node scripts/store-screenshots.js            # both devices, both languages
 *   node scripts/store-screenshots.js ios mk     # one set
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');

const OUT = path.join(__dirname, '..', '..', 'docs', 'store', 'screenshots');
const LOG = '/home/user/marketplace/api/storage/logs/laravel.log';
const APP = process.env.APP_URL ?? 'http://localhost:8081';

/** 1290x2796 is the App Store's 6.7". 1080x2160 is Play's phone at exactly 2:1. */
const DEVICES = {
  ios: { width: 430, height: 932, scale: 3 },
  android: { width: 360, height: 720, scale: 3 },
};

const LANGUAGES = { en: 'en-GB', mk: 'mk-MK' };

function latestCode() {
  return execSync(`grep -o '"code":"[0-9]*"' ${LOG} | tail -1`).toString().replace(/\D/g, '');
}

async function capture(browser, device, language) {
  const { width, height, scale } = DEVICES[device];
  const dir = path.join(OUT, `${device}-${language}`);
  fs.mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    locale: LANGUAGES[language],
    colorScheme: 'dark',
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  const shot = async (name, wait = 2000) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
    console.log('  ', device, language, name);
  };

  await page.goto(APP, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(4000);

  const phone = '7' + String(Math.floor(1000000 + Math.random() * 8999999));
  await page.getByTestId('phone-input').fill(phone);
  await page.getByTestId('send-code').click();
  await page.waitForTimeout(4000);
  await page.getByTestId('code-input').fill(latestCode());
  await page.waitForTimeout(6000);

  // 1. Results: the first frame answers "what is this".
  await page.goto(`${APP}/results`, { waitUntil: 'networkidle' });
  await shot('1-results', 3000);

  // 2. A listing.
  const row = page.locator('[data-testid^="row-"]').first();
  if (await row.count()) {
    await row.click();
    await shot('2-listing', 3000);
  }

  // 3. The search builder, with the manufacturer marks.
  await page.goto(`${APP}/search`, { waitUntil: 'networkidle' });
  await shot('3-search', 3000);

  // 4. The sell flow, at the step that shows what it asks for.
  await page.goto(`${APP}/sell/make`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.locator('[data-testid^="make-"]').first().click();
  await page.getByTestId('sell-continue').last().click();
  await page.waitForTimeout(2000);
  await page.locator('[data-testid^="model-"]').last().click();
  await page.getByTestId('sell-continue').last().click();
  await shot('4-sell', 2500);

  // 5. The credit packs.
  await page.goto(`${APP}/sell`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.getByTestId('credits-balance').click();
  await shot('5-credits', 2500);

  await context.close();
}

async function featureGraphic(browser) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });

  await page.setContent(`
    <html><body style="margin:0;width:1024px;height:500px;background:linear-gradient(140deg,#1E4FD8 0%,#152B66 100%);
      display:flex;align-items:center;justify-content:center;gap:28px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
      <svg width="132" height="132" viewBox="0 0 1024 1024" fill="none">
        <path d="M318 360 L512 700 L706 360" stroke="#FFFFFF" stroke-width="132"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div>
        <div style="color:#fff;font-size:84px;font-weight:700;letter-spacing:-3px">Autevo</div>
        <div style="color:#D6E3FF;font-size:30px;margin-top:6px">Половни автомобили · Used cars</div>
      </div>
    </body></html>`);

  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, 'play-feature-graphic.png') });
  console.log('   play-feature-graphic');
  await page.close();
}

(async () => {
  const [device, language] = process.argv.slice(2);
  const devices = device ? [device] : Object.keys(DEVICES);
  const languages = language ? [language] : Object.keys(LANGUAGES);

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const d of devices) {
    for (const l of languages) {
      await capture(browser, d, l);
    }
  }

  await featureGraphic(browser);
  await browser.close();
})().catch((error) => {
  console.error('FAILED:', error.message);
  process.exit(1);
});
