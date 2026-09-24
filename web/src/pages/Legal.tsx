import { useTranslation } from 'react-i18next';

import privacyEn from '../docs/privacy-policy.en.md?raw';
import privacyMk from '../docs/privacy-policy.mk.md?raw';
import termsEn from '../docs/terms.en.md?raw';
import termsMk from '../docs/terms.mk.md?raw';
import { Markdown } from '../components/Markdown';

/**
 * The policies, served from the same files /docs holds.
 *
 * They are here because both stores require a privacy policy at a public URL
 * before they will review anything, and because a marketplace that takes
 * money should be able to point at its terms. The Macedonian is shown to a
 * Macedonian reader and the English to everyone else; only those two are
 * written, matching what launches.
 */
function pick(mk: string, en: string, language: string): string {
  return language.startsWith('mk') ? mk : en;
}

export function Privacy() {
  const { i18n } = useTranslation();

  return (
    <div className="page legal">
      <Markdown source={pick(privacyMk, privacyEn, i18n.language)} />
    </div>
  );
}

export function Terms() {
  const { i18n } = useTranslation();

  return (
    <div className="page legal">
      <Markdown source={pick(termsMk, termsEn, i18n.language)} />
    </div>
  );
}
