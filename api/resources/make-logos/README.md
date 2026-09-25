# Manufacturer marks

A real logo for each maker, in its own colours, 256px square on a transparent
background. **They are not tinted.** A single-ink glyph tints cleanly and a
real logo does not — a flattened BMW roundel is a filled circle — so `MakeTile`
and `OptionRow` draw them on a light plate instead, which is what a mark drawn
for paper needs.

143 of the 167 makes have one. The rest fall back to a monogram, and
that is permanent rather than a gap waiting to be filled: nothing on Commons is
both the right brand and free to serve for Alpina, Bentley, Genesis, Norton,
Polaris, Ural or most of the small Chinese scooter marques.

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
| CC BY-SA 4.0 | 12 |
| CC BY 2.0 | 2 |
| CC BY 3.0 | 2 |
| Copyrighted free use | 1 |
| CC0 | 1 |

Every one of those permits commercial use, with attribution where the licence
asks for it. **The trademark is a separate question from the file's copyright.**
These marks remain their owners' trademarks; showing one to identify the car
being sold is nominative use, which is what every marketplace in the region
does. Confirm it with your own lawyer before launch.

## Why they are committed

So a deploy needs no Node and no network. `php artisan makes:logos` copies
everything here onto the storage disk — the `public` disk in development, the
S3 bucket in production — and attaches each file to the make whose normalised
name matches it, so `skoda.png` finds "Škoda". It runs from `deploy/deploy.sh`
on every deploy and is safe to repeat.

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
