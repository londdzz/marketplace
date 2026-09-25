#!/usr/bin/env node
/**
 * Copies the app's translations and its API layer into the website.
 *
 * One source of truth on purpose. Two copies of the same strings drift, and
 * the first anyone notices is a screen in Macedonian with one English word on
 * it. The app owns them because it has the most screens; the website takes
 * what it needs and adds nothing of its own — anything web-only goes in the
 * app's files too, under a `web` namespace.
 *
 * The same goes for the API layer. types.ts, listings.ts, reference.ts,
 * auth.ts, messaging.ts and blocks.ts touch no platform API at all — they are
 * request shapes and response types — so the website takes them rather than
 * writing a second description of the same endpoints that can disagree with
 * the first. Only the transport differs, and that is web/src/api/client.ts.
 *
 * Copies are read-only: edit them in /app and run this.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `new URL(import.meta.url).pathname` is a URL path, not a file path: on
// Windows it comes back as /C:/laragon/... and joining that yields
// \C:\laragon\..., which no Windows API will open. fileURLToPath is the
// conversion, and it is a no-op on Linux and macOS.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FROM = path.join(HERE, '..', '..', 'app', 'src', 'i18n', 'locales');
const TO = path.join(HERE, '..', 'src', 'i18n', 'locales');

if (!fs.existsSync(FROM)) {
  console.error(`[sync-locales] No translations at ${FROM}.`);
  process.exit(1);
}

fs.mkdirSync(TO, { recursive: true });

let copied = 0;

for (const file of fs.readdirSync(FROM).filter((name) => name.endsWith('.json'))) {
  fs.copyFileSync(path.join(FROM, file), path.join(TO, file));
  copied++;
}

console.log(`[sync-locales] ${copied} languages copied from the app.`);

// The platform-free half of the API layer. client.ts, config.ts and storage.ts
// are deliberately absent: those are the transport, and the web has its own.
const API_FROM = path.join(HERE, '..', '..', 'app', 'src', 'api');
const API_TO = path.join(HERE, '..', 'src', 'api');
const SHARED = ['types.ts', 'listings.ts', 'reference.ts', 'auth.ts', 'messaging.ts', 'blocks.ts'];

fs.mkdirSync(API_TO, { recursive: true });

let shared = 0;

for (const file of SHARED) {
  const from = path.join(API_FROM, file);

  if (!fs.existsSync(from)) {
    console.error(`[sync-locales] Expected ${file} in the app's API layer.`);
    process.exit(1);
  }

  const header = `// Copied from app/src/api/${file} by scripts/sync-locales.js.\n// Edit it there, not here: this file is overwritten on every build.\n\n`;

  fs.writeFileSync(path.join(API_TO, file), header + fs.readFileSync(from, 'utf8'), 'utf8');
  shared++;
}

console.log(`[sync-locales] ${shared} API files copied from the app.`);

// How a price and a distance are written. Shared for the same reason: a car
// priced "8.950 €" in the app and "8,950 EUR" on the website is one product
// that does not look like one.
const FORMAT_FROM = path.join(HERE, '..', '..', 'app', 'src', 'format', 'index.ts');
const FORMAT_TO = path.join(HERE, '..', 'src', 'format', 'index.ts');

fs.mkdirSync(path.dirname(FORMAT_TO), { recursive: true });
fs.writeFileSync(
  FORMAT_TO,
  '// Copied from app/src/format/index.ts by scripts/sync-locales.js.\n' +
    '// Edit it there, not here: this file is overwritten on every build.\n\n' +
    fs.readFileSync(FORMAT_FROM, 'utf8'),
  'utf8',
);

console.log('[sync-locales] formatters copied from the app.');

// The policies, which the site serves and the App Store requires to be
// reachable at a public URL. /docs is where they are written and reviewed.
const DOCS_FROM = path.join(HERE, '..', '..', 'docs');
const DOCS_TO = path.join(HERE, '..', 'src', 'docs');
const DOCS = ['privacy-policy.en.md', 'privacy-policy.mk.md', 'terms.en.md', 'terms.mk.md'];

fs.mkdirSync(DOCS_TO, { recursive: true });

for (const file of DOCS) {
  const from = path.join(DOCS_FROM, file);

  if (!fs.existsSync(from)) {
    console.error(`[sync-locales] Expected ${file} in /docs.`);
    process.exit(1);
  }

  fs.copyFileSync(from, path.join(DOCS_TO, file));
}

console.log(`[sync-locales] ${DOCS.length} policy documents copied from /docs.`);
