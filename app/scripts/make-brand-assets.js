#!/usr/bin/env node
/**
 * Draw the app's icons and splash mark from the Autevo identity.
 *
 * The mark is two mirrored chevrons woven into an A and a V: petrol in front,
 * azure behind. It needs no font to render, and the single-colour variants are
 * the same paths with one stroke dropped, which is what the brand asks for
 * below twenty pixels.
 *
 * Usage, from /app:  node scripts/make-brand-assets.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');

const OUT = path.join(__dirname, '..', 'assets');

const PETROL = '#0E2E2A';
const AZURE = '#1E6FD9';
const AZURE_LIGHT = '#4D94F0';
const PAPER = '#F7F6F3';

/**
 * @param up    the A, in front
 * @param down  the V, behind — null draws the single-colour mark
 */
function mark(up, down) {
  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      ${down ? `<path d="M14 36 L50 92 L86 36" fill="none" stroke="${down}" stroke-width="15" stroke-linejoin="miter"/>` : ''}
      <path d="M14 64 L50 8 L86 64" fill="none" stroke="${up}" stroke-width="15" stroke-linejoin="miter"/>
    </svg>`;
}

function page(inner, size, background = 'transparent') {
  return `<html><body style="margin:0;width:${size}px;height:${size}px;background:${background};display:flex;align-items:center;justify-content:center;overflow:hidden">${inner}</body></html>`;
}

/** A square of the mark at a share of the canvas. */
function centred(svg, size, share) {
  const box = Math.round(size * share);

  return `<div style="width:${box}px;height:${box}px">${svg}</div>`;
}

const FILES = [
  {
    // The store icon: a light tile, petrol A in front, azure V behind. The
    // rounded corners are Apple's job on iOS and the mask's on Android.
    name: 'icon.png',
    size: 1024,
    background: PAPER,
    inner: (size) => centred(mark(PETROL, AZURE), size, 0.66),
  },
  {
    name: 'android-icon-foreground.png',
    size: 1024,
    inner: (size) => centred(mark(PETROL, AZURE), size, 0.44),
  },
  {
    name: 'android-icon-background.png',
    size: 1024,
    background: PAPER,
    inner: () => '',
  },
  {
    // Themed icons are one flat shape, so the weave is dropped.
    name: 'android-icon-monochrome.png',
    size: 1024,
    inner: (size) => centred(mark('#000000', null), size, 0.44),
  },
  {
    // The splash sits on petrol, so the mark is reversed.
    name: 'splash-icon.png',
    size: 1024,
    inner: (size) => centred(mark(PAPER, AZURE_LIGHT), size, 0.5),
  },
  {
    // Android's status bar: a white silhouette, nothing else.
    name: 'notification-icon.png',
    size: 192,
    inner: (size) => centred(mark('#FFFFFF', null), size, 0.62),
  },
  {
    name: 'favicon.png',
    size: 96,
    background: PAPER,
    inner: (size) => centred(mark(PETROL, AZURE), size, 0.66),
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
