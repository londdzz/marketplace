#!/usr/bin/env node
/**
 * Photographs of real vehicles for the development seeder.
 *
 * DevListingSeeder draws coloured panels when these are absent, which is
 * honest but makes every screen look like a wireframe. This pulls freely
 * licensed photographs of the fourteen vehicles it seeds from Wikimedia Commons
 * and writes them beside a credits file naming the photographer and the
 * licence.
 *
 * These are DEVELOPMENT photographs. In production a listing's pictures are
 * the seller's own and none of this runs. A CC BY-SA photograph carries
 * attribution and share-alike obligations, so anything that leaves the
 * development database — a store screenshot above all — needs either a real
 * seller's photograph or art we have licensed. PLACEHOLDERS.md says so too.
 *
 * Run from /api:  node scripts/fetch-car-photos.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', 'storage', 'app', 'dev-photos');
const AGENT = 'AutevoDevSeeder/1.0 (development seed data; contact: dev@autevo.mk)';

/** What the seeder publishes, and the search that finds each one. */
const CARS = [
  { slug: 'passat', query: 'Volkswagen Passat B8 sedan', must: [/passat/i] },
  { slug: 'a4', query: 'Audi A4 B9 Avant', must: [/audi/i, /\bA4\b/] },
  { slug: 'octavia', query: 'Škoda Octavia car', must: [/octavia/i] },
  { slug: 'series-3', query: 'BMW 3 Series F31 Touring', must: [/bmw/i] },
  { slug: 'c-class', query: 'Mercedes-Benz C-Class W205', must: [/mercedes/i, /c-class|c\s?class|W205/i] },
  { slug: 'golf', query: 'Volkswagen Golf VII hatchback', must: [/golf/i] },
  { slug: 'astra', query: 'Opel Astra K hatchback', must: [/astra/i] },
  { slug: 'corolla', query: 'Toyota Corolla E210 sedan', must: [/corolla/i] },

  // The six motorcycles the seeder publishes beside them.
  { slug: 'mt-07', query: 'Yamaha MT-07 motorcycle', must: [/mt[- ]?07|mt07/i] },
  { slug: 'pcx-125', query: 'Honda PCX 125 scooter', must: [/pcx/i] },
  { slug: 'r1250gs', query: 'BMW R 1250 GS motorcycle', must: [/r\s?125\d\s?gs|r1250gs/i] },
  { slug: 'ninja-400', query: 'Kawasaki Ninja 400 motorcycle', must: [/ninja/i] },
  { slug: 'iron-883', query: 'Harley-Davidson Sportster Iron 883', must: [/sportster|883|iron/i] },
  { slug: 'primavera', query: 'Vespa Primavera scooter', must: [/vespa|primavera/i] },
];

/**
 * Commons is full of engine bays, dashboards and badges. A card wants the car,
 * three-quarters on if possible, so anything naming a part of one is skipped.
 */
const NOT_THE_CAR =
  /engine|interior|dashboard|cockpit|instrument|badge|logo|emblem|wheel|headlamp|headlight|taillight|tail light|rear light|seat|boot|trunk|steering|gearbox|detail|plate|chassis|cutaway|diagram|\bM\d{3}\b|\bEA\d{3}\b|\bOM\d{3}\b/;

/** Licences we will use, best first. Anything else is left alone. */
const ACCEPTED = [/^cc0/i, /^public domain/i, /^cc by 4/i, /^cc by 3/i, /^cc by-sa 4/i, /^cc by-sa 3/i];

const rank = (licence) => {
  const at = ACCEPTED.findIndex((pattern) => pattern.test(licence));

  return at === -1 ? Number.MAX_SAFE_INTEGER : at;
};

function get(url, binary = false) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': AGENT } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return resolve(get(response.headers.location, binary));
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve(binary ? body : JSON.parse(body.toString()));
        });
      })
      .on('error', reject);
  });
}

const plain = (html) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function bestPhoto(query, must) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=40` +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1800';

  const pages = Object.values((await get(url)).query?.pages ?? {});

  const usable = pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const licence = plain(meta.LicenseShortName?.value);

      return {
        title: page.title,
        licence,
        author: plain(meta.Artist?.value),
        descriptionUrl: info?.descriptionurl,
        thumbUrl: info?.thumburl,
        width: info?.width ?? 0,
        height: info?.height ?? 0,
        score: rank(licence),
      };
    })
    .filter(
      (row) =>
        row.score !== Number.MAX_SAFE_INTEGER &&
        row.thumbUrl &&
        // Landscape only: a card crops to a wide box, and a portrait shot of a
        // car loses the car.
        row.width > row.height &&
        !NOT_THE_CAR.test(row.title) &&
        // The search engine is generous; a photograph that does not name the
        // car in its title is usually a photograph of something else.
        must.every((pattern) => pattern.test(row.title)),
    )
    .sort((a, b) => a.score - b.score || b.width - a.width);

  return usable[0] ?? null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const credits = [];

  for (const car of CARS) {
    process.stdout.write(`${car.slug.padEnd(10)} `);

    try {
      const photo = await bestPhoto(car.query, car.must);

      if (!photo) {
        console.log('no freely licensed photograph found');
        continue;
      }

      const bytes = await get(photo.thumbUrl, true);
      fs.writeFileSync(path.join(OUT, `${car.slug}.jpg`), bytes);

      credits.push({
        file: `${car.slug}.jpg`,
        title: photo.title,
        author: photo.author,
        licence: photo.licence,
        source: photo.descriptionUrl,
      });

      console.log(`${photo.licence} — ${Math.round(bytes.length / 1024)} KB`);
    } catch (error) {
      console.log(`failed: ${error.message}`);
    }
  }

  fs.writeFileSync(path.join(OUT, 'CREDITS.json'), `${JSON.stringify(credits, null, 2)}\n`);
  console.log(`\n${credits.length} photographs in ${OUT}`);
  console.log('Licences and photographers are recorded in CREDITS.json.');
})();
