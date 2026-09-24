# Manufacturer marks

Flat PNGs of each maker's mark, drawn in white so the app can tint them to
whatever the text colour is — one file works in light and dark.

**They are in the repository on purpose.** They come from
[Simple Icons](https://simpleicons.org), whose files are **CC0**: no
attribution, no share-alike, nothing to honour when they are redistributed.
That is what separates them from the car photographs in
`storage/app/dev-photos`, which are fetched rather than committed because some
are CC BY-SA and carry obligations a store screenshot would breach.

Committing them means a fresh checkout needs one command and no Node:

```
php artisan makes:logos
```

which copies anything here onto the storage disk and attaches it to the make
whose normalised name matches the filename — so `skoda.png` finds "Škoda".

To add or refresh one, either drop a white PNG in here named after the make,
or re-run `node scripts/fetch-make-logos.js`, which pulls from Simple Icons and
renders the PNGs. That script needs `playwright-core` and a headless browser,
which is exactly the dependency this directory exists to spare everybody.

A make with no file here falls back to a monogram, so the set does not have to
be complete.
