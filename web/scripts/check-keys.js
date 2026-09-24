#!/usr/bin/env node
/**
 * Every translation key the website asks for must exist.
 *
 * A missing key renders as its own name — `delete_account` sat in the footer
 * of the first build because nothing checked. i18next falls back silently by
 * design, so the only way this is caught is by looking, and looking is the
 * thing that stops happening. Run from `npm run build`.
 *
 * It reads en.json, which is the fullest file; a key missing only from a
 * translation falls back to English and is a different problem.
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(HERE, '..', 'src');
const EN = path.join(SRC, 'i18n', 'locales', 'en.json');

const strings = JSON.parse(fs.readFileSync(EN, 'utf8'));

/** Walks src for every t('ns:key') that is not built from a variable. */
function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'locales' || entry.name === 'docs' ? [] : sources(full);
    }

    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const missing = [];

for (const file of sources(SRC)) {
  const text = fs.readFileSync(file, 'utf8');

  for (const match of text.matchAll(/\bt\(\s*'([a-z]+):([a-zA-Z0-9_.]+)'/g)) {
    const [, namespace, key] = match;

    // A dotted key is a value inside a map: listing:fuel.diesel.
    const resolve = (name) =>
      name
        .split('.')
        .reduce((at, part) => (at && typeof at === 'object' ? at[part] : undefined), strings[namespace]);

    // i18next resolves a counted key through its plural forms, so `offers` is
    // present when `offers_one` and `offers_other` are and `offers` itself
    // never exists.
    const value =
      resolve(key) ??
      ['one', 'other', 'zero', 'few', 'many'].map((form) => resolve(`${key}_${form}`)).find((v) => v !== undefined);

    if (value === undefined) {
      missing.push(`${path.relative(SRC, file)}  ${namespace}:${key}`);
    }
  }
}

if (missing.length > 0) {
  console.error('[check-keys] Keys the website asks for and en.json does not have:\n');
  for (const line of [...new Set(missing)].sort()) {
    console.error(`  ${line}`);
  }
  console.error('\nAdd them to app/src/i18n/locales, which is where translations live.');
  process.exit(1);
}

console.log('[check-keys] every key resolves.');
