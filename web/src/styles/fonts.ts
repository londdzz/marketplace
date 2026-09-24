/**
 * The typefaces, served from our own domain.
 *
 * They were hotlinked from Google Fonts, which meant every visitor's address
 * went to a third party on every page load — a thing the privacy policy does
 * not say we do, and a thing German courts have held unlawful without
 * consent. It also cost two DNS lookups and two TLS handshakes before a word
 * could be drawn.
 *
 * Only the subsets the site is written in: Latin, and the basic Cyrillic
 * block, which holds every letter Macedonian, Serbian and Bulgarian use —
 * Ѓ, Ќ, Љ, Њ and Џ are all inside U+0400–045F, so the extended Cyrillic
 * subset is 8 kB nobody would ever read.
 *
 * Each carries its own `unicode-range`, so a browser fetches only the ranges a
 * page actually draws. On this site that is usually both: the language
 * switcher names each language in its own script, so an English page has
 * "Македонски" in it and a Macedonian page has "English". About 40 kB in
 * total, from our own domain, against 350 kB if the family were one file.
 *
 * Onest sets the app and covers both scripts. Sora is the wordmark alone,
 * which is always Latin, so it needs one weight and one subset. See
 * app/src/theme/fonts.ts, which explains why the two are split that way.
 */
import '@fontsource/onest/latin-400.css';
import '@fontsource/onest/latin-500.css';
import '@fontsource/onest/latin-600.css';
import '@fontsource/onest/cyrillic-400.css';
import '@fontsource/onest/cyrillic-500.css';
import '@fontsource/onest/cyrillic-600.css';
import '@fontsource/sora/latin-600.css';
