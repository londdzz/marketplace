import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { STORE, canContinueInBrowser, keepBrowsing, shouldGate } from '../app-gate';
import i18n, { SUPPORTED_LANGUAGES, setLanguage, type Language } from '../i18n';
import { Mark } from './Wordmark';

/**
 * The Apple mark and the Play triangle, drawn rather than fetched.
 *
 * Both stores publish badge artwork with rules about its size, its clear space
 * and the words beside it, and both require their own file rather than a
 * redrawing of it. These stand in until that artwork is dropped into
 * web/public — see PLACEHOLDERS.md — and they are deliberately plain so that
 * nobody mistakes one for the real badge and ships it.
 */
function AppleGlyph() {
  return (
    <svg viewBox="0 0 26 28" width="24" height="26" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.4 1.5c0 1.2-.5 2.4-1.3 3.2-.9.9-2.3 1.7-3.5 1.6-.2-1.2.4-2.4 1.2-3.2.9-.9 2.4-1.6 3.6-1.6zM22.1 8.8c-2-.1-3.7 1.1-4.7 1.1s-2.4-1.1-4-1.1c-2 0-3.9 1.2-5 3-2.1 3.7-.5 9.2 1.5 12.2 1 1.5 2.2 3.1 3.8 3.1 1.5-.1 2.1-1 3.9-1s2.4 1 4 1c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.6-3.4 1.7-3.4-.1 0-3.2-1.3-3.3-4.9 0-3.1 2.5-4.6 2.6-4.7-1.4-2.1-3.6-2.3-4.2-2.3z"
      />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path fill="#00C853" d="M4.9 2 16.9 8.7l-3.5 3.5L3.3 2.1c.4-.4 1-.5 1.6-.1z" />
      <path fill="#00B0FF" d="M2.6 3a1.6 1.6 0 0 1 .7-.9l10.1 10.1L3.3 22.3a1.6 1.6 0 0 1-.7-1.4V3z" />
      <path fill="#FFCE00" d="M16.9 15.9l-3.5-3.6 3.5-3.6 4.1 2.3c1.1.6 1.1 2 0 2.6l-4.1 2.3z" />
      <path fill="#FF3D00" d="M16.9 15.9l-12 6.7c-.6.3-1.2.3-1.6-.2l10.1-10.1 3.5 3.6z" />
    </svg>
  );
}

/**
 * One store badge.
 *
 * With no URL configured it is dimmed and takes no click, in the same language
 * the home screen uses for a category with nothing in it — rather than a live
 * button that goes nowhere. The line beneath says which it is waiting on, so
 * the screen is never telling anybody something that is not true.
 */
function StoreBadge({ href, glyph, lead, name, soon }: {
  href: string;
  glyph: ReactNode;
  lead: string;
  name: string;
  soon: string;
}) {
  const content = (
    <>
      <span className="gate__glyph">{glyph}</span>
      <span className="gate__badgetext">
        <small>{href ? lead : soon}</small>
        <strong>{name}</strong>
      </span>
    </>
  );

  if (!href) {
    return (
      <span className="gate__badge gate__badge--soon" aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <a className="gate__badge" href={href} rel="noreferrer">
      {content}
    </a>
  );
}

/**
 * The site declares `width=1280` so that a phone which reaches the website
 * proper gets the desktop layout zoomed out rather than a half-collapsed one
 * nobody designed. This screen is the opposite case — it is drawn for a phone
 * — and at 1280 it renders at a third of its size, which is how the first
 * build of it looked. So the gate takes the viewport over while it is up and
 * hands it back the moment somebody continues to the site.
 */
function usePhoneViewport(on: boolean) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');

    if (!meta) {
      return;
    }

    const was = meta.getAttribute('content') ?? 'width=1280';

    if (on) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }

    return () => meta.setAttribute('content', was);
  }, [on]);
}

/**
 * What a phone gets instead of the website.
 *
 * The reasoning, and everything that passes through it, is in app-gate.ts.
 */
export function MobileGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['web', 'profile']);
  const { pathname } = useLocation();
  // Re-read on the click rather than on every render: the decision only
  // changes when somebody asks it to.
  const [asked, setAsked] = useState(false);
  const gated = !asked && shouldGate(pathname);

  usePhoneViewport(gated);

  if (!gated) {
    return <>{children}</>;
  }

  return (
    <main className="gate">
      <div className="gate__inner">
        <div className="gate__brand">
          <Mark size={72} />
          <span className="gate__word">AUTEVO</span>
        </div>

        <h1 className="gate__title">{t('web:gate_title')}</h1>
        <p className="gate__body">{t('web:gate_body')}</p>

        <div className="gate__badges">
          <StoreBadge
            href={STORE.ios}
            glyph={<AppleGlyph />}
            lead={t('web:gate_ios_lead')}
            name="App Store"
            soon={t('web:gate_soon')}
          />
          <StoreBadge
            href={STORE.android}
            glyph={<PlayGlyph />}
            lead={t('web:gate_android_lead')}
            name="Google Play"
            soon={t('web:gate_soon')}
          />
        </div>

        {canContinueInBrowser() ? (
          <button
            type="button"
            /*
              Quiet once there is something to download, and the page's one
              real action until then: with neither store published, a screen
              whose only live control is a grey text link is a dead end.
            */
            className={STORE.ios || STORE.android ? 'gate__continue' : 'gate__continue gate__continue--only'}
            onClick={() => {
              keepBrowsing();
              setAsked(true);
            }}
          >
            {t('web:gate_continue')}
          </button>
        ) : null}

        <p className="gate__desktop">{t('web:gate_desktop')}</p>

        <label className="gate__lang">
          <span className="visually-hidden">{t('profile:language')}</span>
          <select
            value={i18n.language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        {/* Kept so the legal pages are reachable from here too: a store
            reviewer opening the policy on a phone must not meet this screen,
            and neither must anybody looking for it. */}
        <p className="gate__legal">
          <Link to="/privacy">{t('web:privacy')}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/terms">{t('web:terms')}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/support">{t('web:support')}</Link>
        </p>
      </div>
    </main>
  );
}
