# Store screenshots

`app/scripts/store-screenshots.js` drives the real app in a browser at store sizes and writes
the set into `docs/store/screenshots/`. It signs in, seeds nothing, and captures what is
actually on screen — no mock-ups, and nothing is drawn that the app does not do.

    cd app && node scripts/store-screenshots.js

The API and the Expo web build must be running, and `DevListingSeeder` provides the cars.

## Sizes the stores require

| Store | Size | How many | Notes |
|---|---|---|---|
| App Store, 6.7" (iPhone 15 Pro Max) | 1290 × 2796 | 3–10 | Required |
| App Store, 6.5" (iPhone 11 Pro Max) | 1242 × 2688 | 3–10 | Required if 6.7" is not accepted alone; Apple currently scales 6.7" down |
| App Store, 12.9" iPad | 2048 × 2732 | Only if tablet support is declared | `supportsTablet` is false, so not needed |
| Play, phone | 1080 × 1920 min, 16:9 or 9:16 | 2–8 | Required |
| Play, feature graphic | 1024 × 500 | 1 | Required, no screenshot: wordmark on brand blue |
| Play, tablet | 7" and 10" | Optional | Skip while phone-only |

## The six, in order, and what each has to show

1. **Search results** — a list of real cars with prices, so the first frame answers "what is
   this". Caption: *Find a car — Најди автомобил*
2. **Listing detail** — photographs, price, spec grid. Caption: *Everything about the car —
   Сè за автомобилот*
3. **Search builder** — the make grid with real manufacturer marks and the offers count.
   Caption: *Search the way you think — Барај како што размислуваш*
4. **Sell step** — the photo step with four pictures and the progress bar. Caption: *List a car
   in minutes — Објави оглас за минути*
5. **Credits sheet** — the three packs with prices. Caption: *One credit, one listing, two
   weeks — Еден кредит, еден оглас, две недели*
6. **Messages thread** — a real conversation. Caption: *Talk to the seller — Разговарај со
   продавачот*

## Rules that get screenshots rejected

- No device frames with a different phone's bezel, no "Download now" badges, no prices that are
  not the real ones, no fake status bars showing full signal on a competitor's carrier.
- The same language throughout one set. Upload the Macedonian set under `mk` and the English
  set under `en-US`; do not mix.
- Text in the screenshot must be legible at the size the store shows it — that is why each
  frame is one screen, not three shrunk side by side.
