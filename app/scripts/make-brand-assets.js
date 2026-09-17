#!/usr/bin/env node
/**
 * Draw the app's icons and splash mark from the brand colours.
 *
 * The mark is a "v" cut as a chevron with round joins: it reads at 48px on a
 * home screen, works in one flat colour for Android's themed icons and for a
 * notification silhouette, and needs no font to be installed to render.
 *
 * Usage, from /app:  node scripts/make-brand-assets.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');

const OUT = path.join(__dirname, '..', 'assets');

const BLUE = '#1E4FD8';
const BLUE_DEEP = '#152B66';

/** The chevron, as an SVG path on a 1024 grid. */
function mark(color, scale = 1) {
  const stroke = 132 * scale;

  return `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M318 360 L512 700 L706 360"
            stroke="${color}" stroke-width="${stroke}"
            stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}

function page(body, { size = 1024, background = 'transparent' } = {}) {
  return `<html><body style="margin:0;width:${size}px;height:${size}px;background:${background};display:flex;align-items:center;justify-content:center;overflow:hidden">${body}</body></html>`;
}

const FILES = [
  {
    name: 'icon.png',
    size: 1024,
    html: page(
      `<div style="width:1024px;height:1024px;background:linear-gradient(160deg, ${BLUE} 0%, ${BLUE_DEEP} 100%);display:flex;align-items:center;justify-content:center">
         <div style="transform:scale(0.78)">${mark('#FFFFFF')}</div>
       </div>`,
      { size: 1024, background: BLUE },
    ),
  },
  {
    // Android draws its own mask, so the mark sits inside the safe circle.
    name: 'android-icon-foreground.png',
    size: 1024,
    html: page(`<div style="transform:scale(0.52)">${mark('#FFFFFF')}</div>`),
  },
  {
    name: 'android-icon-background.png',
    size: 1024,
    html: page('', { size: 1024, background: BLUE }),
  },
  {
    // Themed icons: one flat shape, the system supplies the colour.
    name: 'android-icon-monochrome.png',
    size: 1024,
    html: page(`<div style="transform:scale(0.52)">${mark('#FFFFFF')}</div>`),
  },
  {
    name: 'splash-icon.png',
    size: 1024,
    html: page(`<div style="transform:scale(0.62)">${mark('#FFFFFF')}</div>`),
  },
  {
    // Android status bar: a white silhouette, nothing else.
    name: 'notification-icon.png',
    size: 192,
    html: page(`<div style="transform:scale(0.16)">${mark('#FFFFFF')}</div>`, { size: 192 }),
  },
  {
    name: 'favicon.png',
    size: 96,
    html: page(
      `<div style="width:96px;height:96px;background:${BLUE};display:flex;align-items:center;justify-content:center">
         <div style="transform:scale(0.075)">${mark('#FFFFFF')}</div>
       </div>`,
      { size: 96, background: BLUE },
    ),
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const file of FILES) {
    const page_ = await browser.newPage({ viewport: { width: file.size, height: file.size } });
    await page_.setContent(file.html);
    await page_.screenshot({
      path: path.join(OUT, file.name),
      omitBackground: !file.html.includes('background:#'),
    });
    await page_.close();
    console.log('  ', file.name);
  }

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
