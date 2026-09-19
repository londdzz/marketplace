#!/usr/bin/env node
/**
 * Draw the app's icons and splash mark from the Autevo identity.
 *
 * The mark is a leaning A with three motion wedges running into it. The letter
 * is drawn pre-skewed, so nothing here transforms it, and it needs no font to
 * render. The single-colour variants are the letter alone, which is what the
 * brand asks for wherever the platform flattens colour: Android's themed icon
 * and its notification icon.
 *
 * The paths are the same ones `src/components/Wordmark.tsx` draws. Change one
 * and change the other.
 *
 * Usage, from /app:  node scripts/make-brand-assets.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');

const OUT = path.join(__dirname, '..', 'assets');

const PETROL = '#0E2E2A';
const AZURE_LIGHT = '#4D94F0';
const PAPER = '#F7F6F3';

const WEDGES = [
  'M10.0 36 H51.3 L43.1 50 H7.8 Z',
  'M6.5 58 H53.4 L43.9 74 H4.0 Z',
  'M3.1 80 H25.4 L18.3 92 H1.2 Z',
];

const LETTER =
  'M74.05 6 L92.05 6 L116.11 94 L93.11 94 L88.28 74 ' +
  'L56.28 74 L45.11 94 L22.11 94 Z ' +
  'M79.25 30 L65.81 58 L83.81 58 Z';

/**
 * @param letter  the A
 * @param wedge   the three wedges — null draws the letter alone, for the
 *                platforms that strip colour
 */
function mark(letter, wedge) {
  return `
    <svg viewBox="-6 -8 132 110" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      ${wedge ? `<g fill="${wedge}">${WEDGES.map((d) => `<path d="${d}"/>`).join('')}</g>` : ''}
      <path d="${LETTER}" fill="${letter}" fill-rule="evenodd"/>
    </svg>`;
}

function page(inner, size, background = 'transparent') {
  return `<html><body style="margin:0;width:${size}px;height:${size}px;background:${background};display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}</body></html>`;
}

/** The mark at a share of the canvas, keeping its 1.2 : 1 ratio. */
function centred(svg, size, share) {
  const width = Math.round(size * share);

  return `<div style="width:${width}px;height:${Math.round(width / 1.2)}px">${svg}</div>`;
}

const FILES = [
  {
    // The store icon: a petrol tile, paper letter, azure wedges. The rounded
    // corners are Apple's job on iOS and the mask's on Android.
    name: 'icon.png',
    size: 1024,
    background: PETROL,
    inner: (size) => centred(mark(PAPER, AZURE_LIGHT), size, 0.66),
  },
  {
    // Android crops this to a circle or a squircle depending on the phone, so
    // the mark keeps well inside the central two thirds.
    name: 'android-icon-foreground.png',
    size: 1024,
    inner: (size) => centred(mark(PAPER, AZURE_LIGHT), size, 0.5),
  },
  {
    name: 'android-icon-background.png',
    size: 1024,
    background: PETROL,
    inner: () => '',
  },
  {
    // Themed icons are recoloured to one flat shape, so the wedges are dropped
    // and the letter stands alone.
    name: 'android-icon-monochrome.png',
    size: 1024,
    inner: (size) => centred(mark('#000000', null), size, 0.5),
  },
  {
    // The splash sits on the app's own ground, so the mark is reversed.
    name: 'splash-icon.png',
    size: 1024,
    inner: (size) => centred(mark(PAPER, AZURE_LIGHT), size, 0.55),
  },
  {
    // Android's status bar keeps the silhouette and throws the colour away.
    name: 'notification-icon.png',
    size: 192,
    inner: (size) => centred(mark('#FFFFFF', null), size, 0.68),
  },
  {
    name: 'favicon.png',
    size: 96,
    background: PETROL,
    inner: (size) => centred(mark(PAPER, AZURE_LIGHT), size, 0.7),
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const file of FILES) {
    const tab = await browser.newPage({ viewport: { width: file.size, height: file.size } });

    await tab.setContent(page(file.inner(file.size), file.size, file.background ?? 'transparent'));
    await tab.screenshot({
      path: path.join(OUT, file.name),
      omitBackground: file.background === undefined,
    });
    await tab.close();
    console.log('  ', file.name);
  }

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
