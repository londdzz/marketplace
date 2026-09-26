# Selling the three sponsor slots

Three places on the home screen carry an advertiser, in the app and on the
website both. A booking is a picture, a slot and a link — there is nothing to
design per sponsor and nothing to translate, because the artwork is theirs.

**There is no way to create one from inside the app or the website**, by
design. No endpoint writes to the table and no screen offers a form. An
advertisement anybody could submit is an advertisement nobody is checking, and
the specification rules out an admin interface. Bookings are added on the
server by whoever sold them.

---

## The slots

| Slot | Where | Shape | How many |
|---|---|---|---|
| `home_top` | The wide card under the search bar | **358 × 104**, roughly 3.4:1 | 1 |
| `home_feed` | The carousel under the first cars | **16:9** | up to 6 |
| `home_partners` | The row of marks at the foot | Square-ish, drawn `contain` | up to 8 |

**`home_top` is shared with the card explaining how selling works**, which is
the only place a new seller in the app learns that listing costs a credit. A
sponsor replaces it while the booking runs and it returns the moment the
booking ends — so the slot is never an empty box, and the explainer is
displaced rather than lost.

**`home_feed` is the one people notice.** One card at a time, swiped sideways,
with the next peeking at the right edge; it advances every five seconds and
stops for good once touched. One booking there draws as a plain banner with no
dots and no timer, because a carousel of one overstates how much is in it.

**`home_partners` is the quiet tier**: presence beside the product rather than
a click. Three things happen to a mark here that do not happen to a banner:

- **A transparent file stays transparent.** Everything went to JPEG at first,
  and JPEG has no alpha channel, so a logo's transparent canvas came out white
  and a white logo on it vanished. The pixels decide now, not the slot: a mark
  with transparency is stored as PNG, a photograph as JPEG.
- **It is trimmed to its own edges.** Designers export onto whatever canvas the
  brand guide uses, and a file that is two thirds empty draws a third the size
  of the one beside it.
- **Every mark is drawn to the same height**, taking the width its proportions
  ask for. Given an equal share of the row each, a short mark scales up and
  ends up twice the size of the long one next to it — which is most of what
  makes a partner row look amateur.

## Booking one

Get the artwork onto the server, then:

```bash
cd /home/forge/api.autevo.mk/api

php artisan sponsors:add "Gumi Skopje" /home/forge/artwork/tyres.jpg \
  --slot=home_feed \
  --alt="Gumi Skopje: winter tyres fitted while you wait" \
  --link=https://gumiskopje.mk \
  --position=0 \
  --until=2026-12-31
```

Every option, and what happens without it:

| Option | Leave it out and |
|---|---|
| `--slot` | it asks |
| `--alt` | it asks, and **refuses an empty one** |
| `--link` | the card is not tappable — a sponsor who bought presence only |
| `--type=car` / `motorcycle` | it shows beside both catalogues, which is what most want |
| `--position` | 0. Lowest first within the slot |
| `--from` | it starts at once |
| `--until` | it runs until you stop it |

`--alt` is not a formality. It is what a screen reader reads out and what is
drawn when the picture fails, and the command refuses a blank one because a
description derived from a filename is worse than none — it reads as though
somebody wrote it, and a blind buyer is told "banner-final-v3".

The artwork is re-encoded on the way in, the same as a listing's photographs:
oriented from its EXIF, scaled to 1600 across, stripped. A designer's
6000-pixel export should not cost every buyer the download.

## Seeing and removing

```bash
php artisan sponsors:list              # what is booked, and what is live now
php artisan sponsors:list --all        # including the finished ones

php artisan sponsors:remove 4          # switch it off, keep the row and artwork
php artisan sponsors:remove 4 --purge  # delete both
```

"Live" is its own column because booked and live are not the same thing — a
booking can be switched off, waiting to start, or finished.

## When it appears

Within **half an hour**, and at once for anybody opening the app fresh. The
slots are cached like the rest of the reference data, since a booking changes
when one is sold rather than when somebody scrolls. `sponsors:add` and
`sponsors:remove` both clear it, so a sponsor who paid this morning is on
screen this morning.

## What a sponsor should send

- **`home_feed`**: 1600 × 900. Their message has to survive being 340 points
  wide on a phone, so one line of large type, not a poster.
- **`home_top`**: 1600 × 465.
- **`home_partners`**: their logo as a **transparent PNG**, in a light colour —
  it sits directly on a dark page with no tile behind it, so a dark mark
  disappears and a white or coloured one works. Margin does not matter; it is
  trimmed off. A mark wider than about 6:1 will be drawn shorter than the
  others so it fits, so a stacked or square lockup reads better than a long
  wordmark.

Tell them the card is **cropped to fill** in the first two slots, so nothing
important belongs in the last few per cent at any edge.

## Two things to hold to

**Every slot is labelled.** The carousel and the partner strip say SPONSORED
or OUR PARTNERS above them; the wide card carries a tag on the artwork. Both
stores require an advertisement to be marked as one, and a marketplace that
blurs advertisements into listings loses trust faster than it earns the money.

**Nobody is tracked.** These are our own rows served from our own API: no
third-party SDK, no identifier, no impression beacon. That is why the App
Privacy answers and the Play Data Safety form do not change, and why the app
can still say plainly that it does not track. **An ad network would undo all
of that** — it would be the first thing in this codebase we do not control,
it would need an ATT prompt on iOS, and it would make those answers false.

There is no impression or click count for the same reason. If a sponsor asks
for numbers, that is a conversation about what to build and what to disclose,
not something to add quietly.
