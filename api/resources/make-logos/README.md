# Manufacturer marks

A real logo for each maker, 256px square, trimmed to its own edges, on a
transparent background. **Nothing is tinted and nothing sits on a plate**: a
single-ink glyph tints cleanly and a real logo does not — a flattened BMW
roundel is just a filled circle — and a plate behind it is a white box on a
dark page.

So each one is measured instead, in `scripts/fetch-make-logos.js`, and given
the one treatment that suits it:

- **A background that came with the file is stripped.** A JPEG has no alpha
  channel, so a logo stored as one carries its studio white baked in as pixels;
  where all four corners agree on a *neutral* colour it is flooded out from the
  edges. Neutral only, because Aprilia's red field and KTM's orange box are the
  mark, not a background — the first pass flooded Aprilia's away and left white
  letters standing on nothing.
- **A mark too dark to read on the app's ground is lifted, keeping its hue.**
  Ferrari's wordmark and Ram's measured a luminance of 0 against a ground of
  38, so they were invisible. Lifting raises lightness and leaves hue and
  saturation alone: Toyota's and Honda's stay red, Škoda's stays green, Daelim's
  near-black blue becomes a blue you can see, and a mark in one black ink,
  having no hue to keep, comes out white — which is what every brand manual asks
  for on a dark ground anyway.
- **Everything else is left exactly as its owner drew it.** Ford's blue oval,
  BMW's roundel, Ducati's shield, Harley's orange bar and shield, KTM's box.

138 of the 167 makes have a mark. The rest fall back to a monogram, and that is
permanent rather than a gap waiting to be filled: nothing on Commons is both the
right brand and free to serve for Alpina, Bentley, Genesis, Norton, Polaris,
Ural or most of the small Chinese scooter marques. Four more — Alfa Romeo, GAZ,
UAZ and Lotus — are refused by hand, because Wikidata's logo for each is a
photograph of a badge on a car, which brings its own lighting and its own
bodywork behind it and is not a mark.

## Where they come from

**Wikidata, not a search.** Every manufacturer has an item carrying property
P154, "logo image", which names the exact file on Wikimedia Commons. Searching
Commons for "<make> logo" instead returns the Ferrari World Abu Dhabi logo for
Ferrari, a map of Clapham for Brixton and the Biden Victory Fund for Victory —
this directory was built that way once and it was worthless.

`CREDITS.json` records the file, its licence, its author and its Commons page
for every mark here. The licences:

| Licence | Marks |
| --- | --- |
| Public domain | 125 |
| CC BY-SA 4.0 | 11 |
| CC BY 2.0 | 1 |
| CC BY 3.0 | 1 |

Every one of those permits commercial use, with attribution where the licence
asks for it. **The trademark is a separate question from the file's copyright.**
These marks remain their owners' trademarks; showing one to identify the car
being sold is nominative use, which is what every marketplace in the region
does. Confirm it with your own lawyer before launch.

## Why they are committed

So a deploy needs no Node and no network. `php artisan makes:logos` mirrors
this directory onto the storage disk — the `public` disk in development, the S3
bucket in production — and attaches each file to the make whose normalised name
matches it, so `skoda.png` finds "Škoda". It runs from `deploy/deploy.sh` on
every deploy and is safe to repeat.

**Mirrors, not fills in.** A mark already on the disk is compared and replaced
if it has changed, and one this directory no longer carries is taken down and
unhooked from its make. The marks are redrawn from time to time — every
background came off them at once — and a copy that only filled in the gaps
would have left every server that had run it once serving the old ones for
good, with the deploy reporting success either way.

## To change one

Either drop a PNG in here named after the make, or edit `OVERRIDES` in
`api/scripts/fetch-make-logos.js` to name the Commons file you want and re-run:

```
node scripts/fetch-make-logos.js --only="Mercedes-Benz"
php artisan makes:logos
```

That script needs `playwright-core` and a headless browser, which is exactly
the dependency this directory exists to spare everybody else.

**Look at what it chose before believing it.** The overrides in that file were
all found by rendering a contact sheet of the whole set and going through it by
eye, which is the only way the Bentley Systems wordmark and a photograph of a
Genesis parked at a motor show were caught.
