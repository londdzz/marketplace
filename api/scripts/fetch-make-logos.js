#!/usr/bin/env node
/**
 * Fetch manufacturer marks and render them as flat PNGs for the make picker.
 *
 * The marks come from Simple Icons, whose SVG files are CC0. The marks
 * themselves remain the trademarks of their owners; showing them to identify
 * the car being sold is nominative use, which is what every marketplace in the
 * region does. Confirm it with your own lawyer before launch.
 *
 * Each file is drawn in one flat colour and the app tints it to the text
 * colour, so a single file works in light and dark.
 *
 * Usage, from /api:  node scripts/fetch-make-logos.js
 * Then:              php artisan makes:logos
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');

const OUT = path.join(__dirname, '..', 'storage', 'app', 'public', 'makes');
const CDN = 'https://cdn.jsdelivr.net/npm/simple-icons@13/icons';
const SIZE = 256;

/** Make name as the seeder writes it, to the Simple Icons slug. */
const SLUGS = {
  'Audi': 'audi',
  'BMW': 'bmw',
  'Ford': 'ford',
  'Mercedes-Benz': 'mercedes',
  'Opel': 'opel',
  'Peugeot': 'peugeot',
  'Renault': 'renault',
  'Škoda': 'skoda',
  'Toyota': 'toyota',
  'Volkswagen': 'volkswagen',
  'Alfa Romeo': 'alfaromeo',
  'Chevrolet': 'chevrolet',
  'Chrysler': 'chrysler',
  'Citroën': 'citroen',
  'Dacia': 'dacia',
  'Dodge': 'dodge',
  'Fiat': 'fiat',
  'Honda': 'honda',
  'Hyundai': 'hyundai',
  'Infiniti': 'infiniti',
  'Iveco': 'iveco',
  'Jeep': 'jeep',
  'Kia': 'kia',
  'Lancia': 'lancia',
  'Land Rover': 'landrover',
  'Lexus': 'lexus',
  'Mazda': 'mazda',
  'Mini': 'mini',
  'Mitsubishi': 'mitsubishi',
  'Nissan': 'nissan',
  'Porsche': 'porsche',
  'Seat': 'seat',
  'Smart': 'smart',
  'Subaru': 'subaru',
  'Suzuki': 'suzuki',
  'Tesla': 'tesla',
  'Volvo': 'volvo',
};

/** The same normalisation the API uses to match a file to a make. */
function normalize(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });

  let written = 0;
  let missing = [];

  for (const [make, slug] of Object.entries(SLUGS)) {
    const response = await fetch(`${CDN}/${slug}.svg`);

    if (!response.ok) {
      missing.push(make);
      continue;
    }

    const svg = await response.text();

    // Drawn on a transparent page at a fixed size, with a little air around it
    // so marks of different proportions sit evenly in the grid.
    await page.setContent(
      `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:${SIZE}px;background:transparent">
         <div style="width:${SIZE * 0.82}px;height:${SIZE * 0.82}px;display:flex;align-items:center;justify-content:center;fill:#111111">
           ${svg.replace('<svg', `<svg width="100%" height="100%" style="fill:#111111"`)}
         </div>
       </body></html>`,
    );

    await page.screenshot({
      path: path.join(OUT, `${normalize(make)}.png`),
      omitBackground: true,
    });

    written += 1;
  }

  await browser.close();

  console.log(`Wrote ${written} marks to ${OUT}`);

  if (missing.length) {
    console.log(`No mark published for: ${missing.join(', ')}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
