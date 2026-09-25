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

  // Wikidata's pick for each of these is a raster with a solid rectangle
  // behind it — Lancia's grey, Wartburg's blue, Polestar's navy, Triumph's
  // white — or, for Yugo, a flattened scan. Stripping a background that
  // reaches the edge of the file is automatic; these are vectors that carry
  // the box as artwork, which nothing can tell from the mark itself. So they
  // are named by hand instead.
  'Lancia': 'File:Lancia Logo 2023.svg',
  'Polestar': 'File:Polestar Logo.svg',
  'Triumph': 'File:Logo Triumph.svg',
  'Yugo': 'File:Yugo-logo.svg',
  'RAM': 'File:Ram Trucks 2025 wordmark.svg',

  // Nothing on Commons is both the right brand and free to serve. Bentley's
  // only free hit is Bentley Systems, a software company; Genesis's and
  // Fisker's are photographs of a car at a motor show; TVS's are Scooty model
  // badges; Zero's is its mark photographed on a fairing.
  // Wikidata's logo for each of these is a photograph of a badge on a car —
  // Alfa Romeo's is literally filed as "badge on a car (cropped)" — and a
  // photograph is not a mark: it brings its own lighting, its own bodywork
  // behind it and a background no flood fill can separate from the chrome.
  'Alfa Romeo': null,
  'GAZ': null,
  'UAZ': null,
  'Lotus': null,

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
 * Turn what came back into the mark the app draws: no background, no padding,
 * and light enough to read on the app's ground.
 *
 * Three steps, all in the browser because that is where the file is decoded,
 * so an SVG, a PNG and a photograph of a badge are all handled the same way.
 *
 * **Strip the background.** A JPEG has no alpha channel at all, so a logo
 * stored as one carries its studio white — or Wartburg's blue, or Polestar's
 * navy — baked in as pixels, and the tile then draws a box with a mark inside
 * it rather than a mark. Where all four corners agree on a colour, that
 * colour is flooded out from every edge. Flooding from the edge rather than
 * matching colours everywhere is what keeps the white knocked out of the
 * middle of Ford's oval: it is enclosed by the mark, so the flood never
 * reaches it.
 *
 * **Trim.** Files are authored with whatever margin their author liked, and an
 * untrimmed mark is drawn smaller than the one beside it for no reason.
 *
 * **Lift, keeping the colour.** Black on petrol is nothing at all — Ferrari's
 * wordmark and Ram's both measure a mean luminance of 0 against a ground of
 * 38, which is why they were invisible in the picker. So a mark too dark to
 * read has every pixel's lightness raised while its hue and saturation are
 * kept: Daelim's near-black blue becomes a blue you can see, and a mark in one
 * black ink, having no hue to keep, comes out white — which is what every
 * brand manual says to do with it on a dark ground anyway. How far it is
 * lifted follows how much colour it has, so a coloured mark stays saturated
 * instead of washing out to a pastel.
 *
 * A mark with light parts of its own is never touched, whatever its mean:
 * Ford's oval is dark blue with the name knocked out of it in white, and
 * lifting that fills the name in and leaves a blob.
 */
async function prepare(page, size) {
  return page.evaluate((SIZE) => {
    const image = document.querySelector('img');

    // A mark that never decoded has nothing to measure, and asking a canvas
    // for a zero-wide region throws and takes the whole run with it.
    if (!image?.naturalWidth) {
      return null;
    }

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const work = document.createElement('canvas');
    work.width = width;
    work.height = height;

    const context = work.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);

    const picture = context.getImageData(0, 0, width, height);
    const data = picture.data;
    const index = (x, y) => (y * width + x) * 4;

    // --- the background, if the file brought one ------------------------
    const corner = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
      .map(([x, y]) => index(x, y))
      .map((at) => [data[at], data[at + 1], data[at + 2], data[at + 3]]);

    // 90 across the three channels together, which is loose enough for the
    // noise JPEG leaves in a flat field and tight enough that a mark sitting
    // on its own colour is never eaten.
    const same = (at, colour) =>
      Math.abs(data[at] - colour[0]) + Math.abs(data[at + 1] - colour[1]) + Math.abs(data[at + 2] - colour[2]) < 90;

    let stripped = 0;

    // Neutral only. A studio background is white, off-white, grey or black;
    // a coloured field is the mark itself — Aprilia's red, KTM's orange,
    // Derbi's red — and flooding that out leaves white letters standing on
    // nothing. The first pass did exactly that to Aprilia.
    const flat = Math.max(corner[0][0], corner[0][1], corner[0][2]);
    const neutral = flat === 0 ? true : (flat - Math.min(corner[0][0], corner[0][1], corner[0][2])) / flat < 0.25;

    if (neutral && corner.every((pixel) => pixel[3] > 200) && corner.every((pixel) =>
      Math.abs(pixel[0] - corner[0][0]) + Math.abs(pixel[1] - corner[0][1]) + Math.abs(pixel[2] - corner[0][2]) < 90
    )) {
      const seen = new Uint8Array(width * height);
      const stack = [];

      for (let x = 0; x < width; x++) {
        stack.push(x, x + (height - 1) * width);
      }

      for (let y = 0; y < height; y++) {
        stack.push(y * width, y * width + width - 1);
      }

      while (stack.length > 0) {
        const pixel = stack.pop();

        if (seen[pixel]) {
          continue;
        }

        seen[pixel] = 1;

        const at = pixel * 4;

        if (data[at + 3] >= 40) {
          if (!same(at, corner[0])) {
            continue;
          }

          data[at + 3] = 0;
          stripped++;
        }

        const x = pixel % width;
        const y = (pixel - x) / width;

        if (x > 0) stack.push(pixel - 1);
        if (x < width - 1) stack.push(pixel + 1);
        if (y > 0) stack.push(pixel - width);
        if (y < height - 1) stack.push(pixel + width);
      }
    }

    // --- what is left, and how dark it is -------------------------------
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    let total = 0;
    let light = 0;
    let luminance = 0;
    let saturation = 0;
    let lightness = 0;

    for (let at = 0; at < data.length; at += 4) {
      if (data[at + 3] < 40) {
        continue;
      }

      const pixel = at / 4;
      const x = pixel % width;
      const y = (pixel - x) / width;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const value = 0.2126 * data[at] + 0.7152 * data[at + 1] + 0.0722 * data[at + 2];

      if (value > 170) {
        light++;
      }

      const high = Math.max(data[at], data[at + 1], data[at + 2]);
      const low = Math.min(data[at], data[at + 1], data[at + 2]);

      saturation += high === 0 ? 0 : (high - low) / high;
      lightness += (high + low) / 510;
      luminance += value;
      total++;
    }

    if (total === 0 || maxX < minX) {
      return null;
    }

    const mean = luminance / total;
    const colour = saturation / total;

    // Luminance decides whether a mark is lost; lightness decides how far to
    // lift it, and the two are not the same number. Pure red has a luminance
    // of 54 and a lightness of 0.5: lifting by the difference between a target
    // and its luminance moved Toyota's and Honda's red most of the way to
    // white, and the picker showed two pink wordmarks.
    const level = lightness / total;

    // Two thresholds, because a mark with no colour has nothing to lose and a
    // mark with colour has everything to lose.
    //
    // A grey or black mark — Chrysler's hairline wordmark, Geely's, Haval's —
    // is lifted whenever it is anything short of light, since its only
    // "colour" is how dark its ink is and white is what every brand manual
    // asks for on a dark ground. A coloured one is only lifted once it has
    // genuinely stopped reading against petrol's own luminance of 38, so
    // Harley's orange shield at 80, Ford's blue oval and KTM's box are left
    // exactly as their owners drew them.
    //
    // Either way a mark carrying light of its own is never touched: Ford's
    // oval has its name knocked out of it in white, and lifting that fills
    // the name in and leaves a blob. That guard is also what keeps BMW's
    // roundel and Mercedes' star, both of which read as near-neutral.
    //
    // 73 is where the coloured line was finally drawn, and it was drawn by
    // looking: Harley-Davidson's orange bar and shield measures 74 and is the
    // brightest thing on its tile as drawn, while Brixton's thin gold measures
    // 71 and is barely there. One unit either way moves exactly those two.
    const lifted = light / total < 0.15 && mean < (colour < 0.25 ? 170 : 73);

    if (lifted) {
      // A mark with no colour goes almost to white; a saturated one stops
      // short of it, because a fully lifted red is pink.
      const target = 0.95 - 0.33 * Math.min(1, colour);

      for (let at = 0; at < data.length; at += 4) {
        if (data[at + 3] < 40) {
          continue;
        }

        const red = data[at] / 255;
        const green = data[at + 1] / 255;
        const blue = data[at + 2] / 255;
        const high = Math.max(red, green, blue);
        const low = Math.min(red, green, blue);
        const own = (high + low) / 2;
        const spread = high - low;

        let hue = 0;
        let intensity = 0;

        if (spread !== 0) {
          intensity = spread / (1 - Math.abs(2 * own - 1));

          if (high === red) hue = ((green - blue) / spread) % 6;
          else if (high === green) hue = (blue - red) / spread + 2;
          else hue = (red - green) / spread + 4;

          hue *= 60;

          if (hue < 0) hue += 360;
        }

        const raised = Math.min(1, Math.max(0, own + (target - level)));
        const chroma = (1 - Math.abs(2 * raised - 1)) * intensity;
        const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
        const floor = raised - chroma / 2;
        const sextant = Math.floor(hue / 60) % 6;
        const wheel = [
          [chroma, second, 0],
          [second, chroma, 0],
          [0, chroma, second],
          [0, second, chroma],
          [second, 0, chroma],
          [chroma, 0, second],
        ][sextant];

        data[at] = Math.round((wheel[0] + floor) * 255);
        data[at + 1] = Math.round((wheel[1] + floor) * 255);
        data[at + 2] = Math.round((wheel[2] + floor) * 255);
      }
    }

    context.putImageData(picture, 0, 0);

    // --- draw it into the square the app is given -----------------------
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const scale = Math.min(SIZE / cropWidth, SIZE / cropHeight);
    const drawWidth = Math.max(1, Math.round(cropWidth * scale));
    const drawHeight = Math.max(1, Math.round(cropHeight * scale));

    const out = document.createElement('canvas');
    out.width = SIZE;
    out.height = SIZE;

    const paint = out.getContext('2d');
    paint.imageSmoothingQuality = 'high';
    paint.drawImage(
      work,
      minX, minY, cropWidth, cropHeight,
      Math.round((SIZE - drawWidth) / 2), Math.round((SIZE - drawHeight) / 2), drawWidth, drawHeight,
    );

    return { data: out.toDataURL('image/png'), lifted, stripped, mean: Math.round(mean) };
  }, size);
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
  let boxed = 0;

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

    // Background stripped, margins trimmed, and lifted out of the dark only
    // where it has to be. The canvas is written straight out rather than
    // screenshotted: the screenshot could only ever capture what the page
    // showed, and every one of these steps happens to the pixels.
    const mark = await prepare(page, SIZE);

    if (!mark) {
      console.error(`${make.padEnd(20)} decoded to nothing — ${logo.title}`);
      missing.push(make);
      forget(make, credits);
      continue;
    }

    fs.writeFileSync(target, Buffer.from(mark.data.split(',')[1], 'base64'));

    if (mark.lifted) {
      inked++;
    }

    if (mark.stripped > 0) {
      boxed++;
    }

    credits[make] = logo;

    const note = [`lum ${String(mark.mean).padStart(3)}`, mark.lifted ? 'lifted' : '', mark.stripped > 0 ? 'unboxed' : '']
      .filter(Boolean)
      .join(' ');
    console.log(`${make.padEnd(20)} ${logo.licence.padEnd(18)} ${logo.title.replace(/^File:/, '').padEnd(44)} ${note}`);
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
  console.log(`${boxed} arrived with a background baked in, which has been stripped.`);
  console.log(`${inked} were too dark to read on the app's ground and have been lifted, keeping their colour.`);

  if (refused.length > 0) {
    console.log(`\n${refused.length} refused — the file is not freely licensed:`);
    console.log(refused.join(', '));
  }

  if (missing.length > 0) {
    console.log(`\n${missing.length} with no mark — these draw a monogram:`);
    console.log(missing.join(', '));
  }
})();
