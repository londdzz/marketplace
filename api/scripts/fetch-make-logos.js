#!/usr/bin/env node
/**
 * Fetch a real manufacturer mark for every make, and render it for the picker.
 *
 * **The marks come from Wikidata, not from a search.** Every manufacturer has
 * an item carrying property P154, "logo image", which names the exact file on
 * Wikimedia Commons. Searching Commons for "<make> logo" instead — which this
 * script did first — returns the Ferrari World Abu Dhabi logo for Ferrari, a
 * map of Clapham for Brixton and the Biden Victory Fund for Victory. P154 is
 * the brand's own mark or nothing.
 *
 * Wikidata is also what makes the ambiguous names safe. A make that is an
 * ordinary word — Victory, Hero, Beta, Indian, Brixton — matches a political
 * party, a television series and two universities, and every one of those
 * scores zero here because its description does not say manufacturer. Zero is
 * refused, so those makes get a monogram rather than somebody else's logo,
 * unless HINTS gives the search a better name to look for.
 *
 * The file itself still has to be free: PD-textlogo or CC0 for most of them,
 * because a mark made of simple geometry is below the threshold of
 * originality. Anything else is refused and reported. The *trademark* belongs
 * to its owner either way — showing it to identify the car being sold is
 * nominative use, which is what every marketplace in the region does. Confirm
 * that with your own lawyer before launch. Title, licence and author of every
 * file are written to CREDITS.json beside the images.
 *
 * **Nothing sits on a plate and nothing is tinted at the drawing end.** Each
 * mark is measured here and given the one treatment that suits it: a mark in
 * one flat dark ink is redrawn white, because its shape lives in the alpha
 * channel and white costs it nothing; a mark with real colours is left exactly
 * as its owner drew it. Both then sit straight on the app's dark ground.
 *
 * Usage, from /api:  node scripts/fetch-make-logos.js [--only=BMW,KTM]
 * Then:              php artisan makes:logos
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');

const OUT = path.join(__dirname, '..', 'storage', 'app', 'public', 'makes');
const DATA = path.join(__dirname, '..', 'database', 'data');
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const AGENT = 'AutevoLogoFetch/1.0 (marketplace make picker; contact: dev@autevo.mk)';
const SIZE = 256;
/** A pause between API calls, so a run of 167 makes is not taken for a flood. */
const THROTTLE_MS = 350;

/**
 * Licences that leave the file free to serve, including commercially, with
 * attribution where the licence asks for it — which CREDITS.json records.
 * Anything else is refused and reported rather than quietly used.
 */
const FREE = /^(public domain|cc0|cc by [234](\.\d)?|cc by-sa [234](\.\d)?|pd|no restrictions|copyrighted free use|attribution)/i;

/**
 * What to look Wikidata up by, where the make's own name is not enough.
 *
 * Every one of these is a name that means something else more famous, or a
 * brand whose item is filed under its full company name.
 */
const HINTS = {
  'Beta': 'Beta Motor',
  'Brixton': 'Brixton Motorcycles',
  'Hero': 'Hero MotoCorp',
  'Indian': 'Indian Motorcycle',
  'Victory': 'Victory Motorcycles',
  'Mash': 'Mash Motors',
  'Zero Motorcycles': 'Zero Motorcycles',
  'Smart': 'Smart automobile',
  'Mini': 'Mini marque',
  'RAM': 'Ram Trucks',
  'MG': 'MG Motor',
  'Lada': 'Lada',
  'Ural': 'Ural motorcycles',
  'Jawa': 'Jawa Moto',
  'Polaris': 'Polaris Inc',
  'Tata': 'Tata Motors',
  'Genesis': 'Genesis Motor',
  'Great Wall': 'Great Wall Motor',
  'Alpine': 'Alpine cars',
  'Alpina': 'Alpina company',
  'Aro': 'ARO vehicle',
  'Rover': 'Rover Company',
  'Lotus': 'Lotus Cars',
  'Abarth': 'Abarth',
  'Acura': 'Acura',
  'Cupra': 'Cupra marque',
  'Segway': 'Segway Ninebot',
  'Energica': 'Energica Motor Company',
  'Can-Am': 'Can-Am motorcycles',
};

/**
 * Where Wikidata is wrong or empty, the exact Commons file, chosen by eye
 * against a contact sheet of everything the run produced.
 *
 * A make set to null has nothing usable on Commons under a licence we can
 * serve. It draws a monogram, which is what that fallback is for, and naming
 * it here stops the next run hunting for it again and settling for something
 * that only shares its name.
 */
const OVERRIDES = {
  // Wikidata pointed at KTM's mark, which owns part of Bajaj but is not it.
  'Bajaj': 'File:Bajaj Auto logo.svg',
  'Aixam': 'File:Aixam logo detail.svg',
  'Keeway': 'File:Keeway logo.svg',
  'Lifan': 'File:Logo Chongqing Lifan.svg',
  'Royal Enfield': 'File:Royal Enfield logo new.svg',
  'Simson': 'File:Simson logo.svg',
  // The mark Wikidata gives is Volvo Trucks', a different company since 1999.
  'Volvo': 'File:Volvo logo.svg',
  // Škoda Transportation builds trams. This is Škoda Auto.
  'Škoda': 'File:Škoda Auto 2022 text logo.svg',
  'Zastava': 'File:Zastava logo.png',
  'Seat': 'File:SEAT Logo from 2017.svg',
  'Alpine': 'File:Alpine logo.png',
  'Aro': 'File:ARO logo.svg',
  'Cupra': 'File:Cupra symbol.svg',
  'JAC': 'File:New Jac motors logo.png',
  'Lincoln': 'File:Lincoln logo.svg',
  'Microcar': 'File:Logo Microcar 2022.png',
  'Mini': 'File:MINI logo.svg',
  'Nio': 'File:NIO logo.svg',
  'Smart': 'File:Smart logo.svg',
  'Trabant': 'File:IFA Trabant Logo.svg',
  'AJP': 'File:Ajp.svg',
  'Niu': 'File:Niu Technologies Logo.png',
  'Segway': 'File:Logo-Ninebot (1).png',

  // An emblem reads at forty-four pixels and a wordmark does not, and the
  // tile carries the make's name underneath anyway. Where a free emblem
  // exists it wins; Peugeot's modern lion and Škoda's winged arrow are not
  // free, so those two keep their wordmarks rather than wearing a lion last
  // drawn in 1910.
  'Mercedes-Benz': 'File:Mercedes-Benz Star 2022.svg',
  // The mark Wikidata gives carries the yellow square of the 2009 lockup
  // baked into it, which on a tile reads as a background rather than a logo.
  // This is the losange on its own.
  'Renault': 'File:Renault 2021.svg',
  'Piaggio': 'File:Piaggio-logo.svg',

  // Nothing on Commons is both the right brand and free to serve. Bentley's
  // only free hit is Bentley Systems, a software company; Genesis's and
  // Fisker's are photographs of a car at a motor show; TVS's are Scooty model
  // badges; Zero's is its mark photographed on a fairing.
  'Bentley': null,
  'Genesis': null,
  'Fisker': null,
  'TVS': null,
  'Zero Motorcycles': null,
};

/** The makes the seeders publish, read from the same files they read. */
function makes() {
  const names = new Map();

  for (const [file, kind] of [['cars.php', 'automobile'], ['motorcycles.php', 'motorcycle']]) {
    const body = fs.readFileSync(path.join(DATA, file), 'utf8');

    for (const match of body.matchAll(/^ {4}'([^']+)' => \[$/gm)) {
      // A make selling both is looked up once, as a car maker: that is the
      // better-documented half of BMW, Honda, Peugeot, Piaggio and Suzuki.
      if (!names.has(match[1])) {
        names.set(match[1], kind);
      }
    }
  }

  return names;
}

const slug = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Ask an API, politely.
 *
 * Wikidata rate-limits a run of 167 makes about a third of the way through
 * and answers 429 for the rest, which the first run recorded as "no mark" for
 * a hundred makes that have perfectly good ones. A pause between calls and a
 * backing-off retry is the difference between a catalogue of monograms and a
 * catalogue of marks.
 */
async function ask(api, params, attempt = 1) {
  await wait(THROTTLE_MS);

  const response = await fetch(`${api}?${new URLSearchParams({ format: 'json', ...params })}`, {
    headers: { 'User-Agent': AGENT },
  });

  if (response.status === 429 || response.status >= 500) {
    if (attempt > 5) {
      throw new Error(`${api} kept answering ${response.status}`);
    }

    await wait(2000 * 2 ** attempt);

    return ask(api, params, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`${api} answered ${response.status}`);
  }

  return response.json();
}

/**
 * How likely a Wikidata item is to be the vehicle maker we mean.
 *
 * Read off its description, which is the one field these items reliably have
 * and the one that separates Hero MotoCorp from the television series. A make
 * whose best candidate scores nothing gets no mark at all.
 */
function score(entity, make, kind) {
  const description = (entity.descriptions?.en?.value ?? '').toLowerCase();
  const label = (entity.labels?.en?.value ?? '').toLowerCase();
  let points = 0;

  if (/manufacturer|marque|brand|automaker|carmaker|company|make of/.test(description)) points += 3;
  if (/car|automobile|automotive|vehicle/.test(description)) points += kind === 'automobile' ? 4 : 1;
  if (/motorcycle|motorbike|moped|scooter/.test(description)) points += kind === 'motorcycle' ? 4 : 1;
  if (label === make.toLowerCase()) points += 2;
  // A model, a race team or a museum is not the marque.
  if (/model of|racing team|museum|circuit|engine|album|film|series|party|university/.test(description)) points -= 6;

  return points;
}

/** The Commons file a title names: its URL, its licence and who made it. */
async function commonsFile(title) {
  const answer = await ask(COMMONS, {
    action: 'query',
    titles: title.startsWith('File:') ? title : `File:${title}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
  });

  const page = Object.values(answer?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];

  if (!info?.url) {
    return null;
  }

  const meta = (key) => info.extmetadata?.[key]?.value?.replace(/<[^>]*>/g, '').trim() ?? '';

  return {
    title: page.title,
    url: info.url,
    licence: meta('LicenseShortName') || 'unknown',
    author: meta('Artist') || 'unknown',
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
  };
}

async function findLogo(make, kind) {
  if (make in OVERRIDES) {
    return OVERRIDES[make] === null ? null : commonsFile(OVERRIDES[make]);
  }

  const term = HINTS[make] ?? make;
  const found = await ask(WIKIDATA, {
    action: 'wbsearchentities',
    language: 'en',
    type: 'item',
    limit: '12',
    search: term,
  });

  const ids = (found.search ?? []).map((hit) => hit.id);

  if (ids.length === 0) {
    return null;
  }

  const entities = await ask(WIKIDATA, {
    action: 'wbgetentities',
    props: 'claims|labels|descriptions',
    ids: ids.join('|'),
  });

  const ranked = ids
    .map((id) => entities.entities?.[id])
    .filter(Boolean)
    .map((entity) => ({
      entity,
      logo: entity.claims?.P154?.[0]?.mainsnak?.datavalue?.value,
      points: score(entity, make, kind),
    }))
    // Nothing without a logo, and nothing that does not read as a maker: a
    // zero here is an ordinary word matching something else entirely.
    .filter((row) => row.logo && row.points > 0)
    .sort((a, b) => b.points - a.points);

  return ranked.length > 0 ? commonsFile(ranked[0].logo) : null;
}

/**
 * Give the SVG a size it will actually draw at.
 *
 * A logo file is usually authored with a viewBox alone, for something else to
 * size. Told to fill a box it fits inside it and keeps its proportions; told
 * nothing it collapses, which is how the first run wrote a hundred empty PNGs.
 */
function fit(markup) {
  return markup.replace(/<svg\b[^>]*>/i, (tag) => {
    let out = tag;

    if (!/\bviewBox=/i.test(out)) {
      const width = /\bwidth="([\d.]+)/i.exec(out)?.[1];
      const height = /\bheight="([\d.]+)/i.exec(out)?.[1];

      if (width && height) {
        out = out.replace(/<svg/i, `<svg viewBox="0 0 ${width} ${height}"`);
      }
    }

    out = out.replace(/\s(width|height)="[^"]*"/gi, '');

    if (!/preserveAspectRatio=/i.test(out)) {
      out = out.replace(/<svg/i, '<svg preserveAspectRatio="xMidYMid meet"');
    }

    return out;
  });
}

/**
 * Whether the mark would be lost on the app's dark ground, and can be rescued
 * by redrawing it white.
 *
 * Two conditions, and the second is the one that matters. Dark is easy: a mean
 * luminance under 120 disappears against petrol, whatever colour it is — Honda's
 * wordmark is dark red and Škoda's is dark green, and both vanish as surely as
 * Audi's black rings.
 *
 * The second asks whether the mark has light parts of its own. Ford's oval is
 * dark blue with its name knocked out of it in white; invert that and the
 * script fills in and the whole thing becomes a white blob. So a mark that
 * already carries light pixels is left alone — it has its own contrast — and
 * only a mark that is dark all the way through is redrawn.
 *
 * The third asks whether it is line art at all. Harley-Davidson's bar and
 * shield and KTM's name in its orange box are solid slabs: most of their own
 * bounding box is filled, so turning them white turns them into white slabs.
 * A wordmark or an outlined emblem covers a fraction of its box, and that is
 * the difference between something worth inverting and something that must be
 * left alone whatever its luminance.
 *
 * Read off the pixels in the page rather than the file, so it works the same
 * for an SVG and for a photograph of a badge.
 */
async function needsWhitening(page) {
  return page.evaluate(() => {
    const image = document.querySelector('img');

    // A mark that never decoded has nothing to measure, and asking a canvas
    // for a zero-wide region throws and takes the whole run with it.
    if (!image?.naturalWidth) {
      return false;
    }

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);

    let total = 0;
    let light = 0;
    let luminance = 0;
    let minX = canvas.width;
    let maxX = -1;
    let minY = canvas.height;
    let maxY = -1;

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

    for (let at = 0; at < data.length; at += 4) {
      if (data[at + 3] < 40) {
        continue;
      }

      const pixel = at / 4;
      const x = pixel % canvas.width;
      const y = (pixel - x) / canvas.width;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const value = 0.2126 * data[at] + 0.7152 * data[at + 1] + 0.0722 * data[at + 2];

      if (value > 170) {
        light++;
      }

      luminance += value;
      total++;
    }

    if (total === 0) {
      return false;
    }

    const area = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));

    // 0.62 is measured, not picked: wordmarks and outlined emblems fill 40 to
    // 58 per cent of their own box — Audi 42, Toyota 40, Honda 58 — and the
    // filled shapes start at Harley-Davidson's shield on 65 and run to KTM's
    // and Aprilia's solid boxes on 100.
    return luminance / total < 120 && light / total < 0.15 && total / area < 0.62;
  });
}

/** Drop a mark this run will not stand behind, file and credit together. */
function forget(make, credits) {
  const file = path.join(OUT, `${slug(make)}.png`);

  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }

  credits[make] = null;
}

(async () => {
  const only = (process.argv.find((argument) => argument.startsWith('--only=')) ?? '').slice(7);
  const wanted = only ? new Set(only.split(',')) : null;

  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  // 256 square, at one device pixel each. These are committed to the
  // repository so a deploy can copy them onto the production disk without
  // anybody fetching anything, and 143 marks at twice this size is six
  // megabytes of git history for detail no tile is ever large enough to show.
  const page = await browser.newPage({
    viewport: { width: SIZE, height: SIZE },
    deviceScaleFactor: 1,
  });

  const credits = {};
  const missing = [];
  const refused = [];
  let inked = 0;

  for (const [make, kind] of makes()) {
    if (wanted && !wanted.has(make)) {
      continue;
    }

    let logo = null;

    try {
      logo = await findLogo(make, kind);
    } catch (problem) {
      console.error(`${make.padEnd(20)} lookup failed: ${problem.message}`);
    }

    if (!logo) {
      missing.push(make);
      // A mark this run has decided against has to go, or a wrong one from an
      // earlier run stays on disk and keeps being served.
      forget(make, credits);
      continue;
    }

    if (!FREE.test(logo.licence)) {
      refused.push(`${make} (${logo.licence})`);
      forget(make, credits);
      continue;
    }

    const file = await fetch(logo.url, { headers: { 'User-Agent': AGENT } });

    if (!file.ok) {
      missing.push(make);
      continue;
    }

    const target = path.join(OUT, `${slug(make)}.png`);

    // Everything goes through an <img>, SVG included.
    //
    // The format is read off the file's TITLE, not its URL. Commons hangs
    // tracking parameters on the end of the url it gives you —
    // "...Audi-Logo_2016.svg?utm_source=commons.wikimedia.org&..." — so a test
    // anchored at the end of the string never matches, every SVG was handed to
    // the browser labelled image/jpeg, and a hundred marks came out as empty
    // 3,720-byte squares that read as makes Wikidata had no logo for.
    const format = /\.svg$/i.test(logo.title) ? 'svg' : /\.png$/i.test(logo.title) ? 'png' : 'jpeg';

    const source = format === 'svg'
      ? `data:image/svg+xml;base64,${Buffer.from(fit(await file.text())).toString('base64')}`
      : `data:image/${format};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;

    await page.setContent(
      `<style>html,body{margin:0;background:transparent}
       .box{width:${SIZE}px;height:${SIZE}px;display:grid;place-items:center}
       img{max-width:100%;max-height:100%;object-fit:contain}</style>
       <div class="box"><img src="${source}"></div>`,
      { waitUntil: 'load' },
    );

    // `load` fires before a data-URI image has finished decoding, and the
    // screenshot then catches an empty page. This is the whole reason a
    // hundred marks came out as blank transparent squares that read as
    // misses; waiting for the decode is what actually fixed them.
    await page
      .waitForFunction(
        () => {
          const image = document.querySelector('img');

          return image?.complete && image.naturalWidth > 0;
        },
        { timeout: 8000 },
      )
      .catch(() => undefined);

    // A mark that would be lost on the app's dark ground is redrawn white; a
    // mark with light of its own, or colours bright enough to carry, is left
    // exactly as its owner drew it. Neither gets a plate behind it.
    //
    // Measured rather than assumed, because the two need opposite treatment
    // and one rule for both gets half of them wrong. Force every mark white
    // and Ford becomes a white blob, Ducati a white shield, Renault a white
    // square. Leave every mark alone and Audi, Peugeot, Škoda, Toyota and
    // Honda disappear into the background entirely.
    if (await needsWhitening(page)) {
      await page.evaluate(() => {
        document.querySelector('img').style.filter = 'brightness(0) invert(1)';
      });
      inked++;
    }

    await page.screenshot({ path: target, omitBackground: true });

    credits[make] = logo;
    console.log(`${make.padEnd(20)} ${logo.licence.padEnd(18)} ${logo.title.replace(/^File:/, '')}`);
  }

  await browser.close();

  const creditsPath = path.join(OUT, 'CREDITS.json');
  const existing = fs.existsSync(creditsPath) ? JSON.parse(fs.readFileSync(creditsPath, 'utf8')) : {};
  const merged = { ...existing, ...credits };

  for (const [make, entry] of Object.entries(merged)) {
    if (entry === null) {
      delete merged[make];
    }
  }

  fs.writeFileSync(creditsPath, JSON.stringify(merged, null, 2) + '\n');

  console.log(`\n${Object.values(credits).filter(Boolean).length} marks written to ${OUT}`);
  console.log(`${inked} of them were too dark for the app's ground and have been redrawn in white.`);

  if (refused.length > 0) {
    console.log(`\n${refused.length} refused — the file is not freely licensed:`);
    console.log(refused.join(', '));
  }

  if (missing.length > 0) {
    console.log(`\n${missing.length} with no mark — these draw a monogram:`);
    console.log(missing.join(', '));
  }
})();
