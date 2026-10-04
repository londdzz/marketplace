/**
 * Who gets the website, and who gets pointed at the app.
 *
 * On a phone the website is the worse product: the layout is built for a wide
 * screen, there is no keychain, no push and no in-app purchase, and every
 * screen the app has it has better. So a phone is met with the mark, the two
 * store badges and nothing else.
 *
 * Three things pass through regardless, and each for a reason that costs real
 * money if it is got wrong:
 *
 *  - **Crawlers and link unfurlers.** Google indexes mobile-first — its
 *    smartphone crawler's user agent says Android and Mobile — so a gate that
 *    did not check for a bot first would serve Google a download page as the
 *    content of every car we have, and search traffic is most of how a
 *    marketplace is found. The same goes for the preview card WhatsApp or
 *    Viber draws when somebody pastes a listing into a chat.
 *  - **The legal and support pages.** Apple and Google both open the privacy
 *    policy URL during review, and they open it on a phone. A download wall
 *    where the policy should be is a rejection.
 *  - **Anybody who asks.** The escape link below, and `?web=1` for a link you
 *    want to open on a phone yourself.
 */

/** Where the apps live. Empty until each store has actually published one. */
export const STORE = {
  ios: (import.meta.env.VITE_IOS_APP_URL as string | undefined)?.trim() || '',
  android: (import.meta.env.VITE_ANDROID_APP_URL as string | undefined)?.trim() || '',
} as const;

/** `VITE_MOBILE_GATE=off` serves the site to a phone, for testing on one. */
const ENABLED = (import.meta.env.VITE_MOBILE_GATE as string | undefined)?.trim() !== 'off';

/**
 * The escape link under the badges.
 *
 * It is here because neither store has published anything yet, so without it
 * a phone reaches a dead end; and because a car's link is the thing people
 * paste into a chat, which is read on a phone more often than not. Set this to
 * false once both apps are live and a shared link opens the app itself.
 */
const SHOW_CONTINUE = true;

/** Pages that open on any device, whatever else this file says. */
const ALWAYS_OPEN = ['/privacy', '/terms', '/support', '/delete-account'];

/**
 * Anything that is reading rather than browsing.
 *
 * Matched before the phone check, never after: Google's smartphone crawler and
 * the preview fetchers for WhatsApp, Viber, Telegram and Facebook all carry a
 * mobile user agent, and gating them would hide the whole catalogue from search
 * and turn every shared car into a bare link.
 */
const READERS =
  /bot|crawler|spider|slurp|facebookexternalhit|facebot|whatsapp|viber|telegram|discord|slackbot|linkedinbot|twitterbot|embedly|quora link preview|pinterest|redditbot|applebot|yandex|baiduspider|duckduckbot|petalbot|ia_archiver|headlesschrome|lighthouse|chrome-lighthouse|gtmetrix|pingdom/i;

const ESCAPED = 'autevo.web-on-phone';

function navigatorOf(): Navigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

/** True for a telephone. A tablet and a small desktop window are not one. */
export function isPhone(): boolean {
  const nav = navigatorOf();

  if (!nav) {
    return false;
  }

  // Chrome and Edge answer this outright and are never wrong about it.
  const hinted = (nav as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile;

  if (typeof hinted === 'boolean') {
    return hinted;
  }

  const ua = nav.userAgent ?? '';

  // An iPad on iPadOS 13 and later says Macintosh, and an Android tablet says
  // Android without saying Mobile. Both get the website: they have the screen
  // for it, and neither store ships a tablet build we could send them to.
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return false;
  }

  return /Android|iPhone|iPod|IEMobile|Opera Mini|Mobile Safari/i.test(ua);
}

/** True if this visit has already asked for the website on this phone. */
function escaped(): boolean {
  try {
    if (globalThis.sessionStorage?.getItem(ESCAPED) === '1') {
      return true;
    }
  } catch {
    // Private browsing throws rather than returning nothing.
  }

  return new URLSearchParams(globalThis.location?.search ?? '').get('web') === '1';
}

/** Remembers the escape for the rest of the visit, not for ever. */
export function keepBrowsing(): void {
  try {
    globalThis.sessionStorage?.setItem(ESCAPED, '1');
  } catch {
    // The click still works; it is only the next page that forgets.
  }
}

export function canContinueInBrowser(): boolean {
  return SHOW_CONTINUE;
}

/** Whether this visitor, on this page, sees the download screen instead. */
export function shouldGate(pathname: string): boolean {
  if (!ENABLED) {
    return false;
  }

  const ua = navigatorOf()?.userAgent ?? '';

  if (READERS.test(ua)) {
    return false;
  }

  if (ALWAYS_OPEN.some((open) => pathname === open || pathname.startsWith(`${open}/`))) {
    return false;
  }

  return isPhone() && !escaped();
}
