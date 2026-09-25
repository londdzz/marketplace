import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import i18n, { SUPPORTED_LANGUAGES, setLanguage, type Language } from '../i18n';
import { Wordmark } from './Wordmark';

/**
 * The frame every page sits in.
 *
 * A desktop header rather than the app's tab bar: the same destinations, laid
 * along the top where a wide screen has room, with the mark at the left as it
 * is on every screen of the app.
 *
 * **The left is where you look, the right is what you do.** Browsing lives in
 * the nav; selling, messages and the account sit apart on the right. It was
 * four identical bordered buttons in a row, which made signing out look as
 * important as reading your messages — sign out is in the profile now, where
 * the app keeps it, and the account chip is the way there.
 */
export function Layout() {
  const { t } = useTranslation(['web', 'common', 'search', 'profile', 'auth', 'sell', 'messages']);
  const { user } = useAuth();
  const navigate = useNavigate();

  const active = ({ isActive }: { isActive: boolean }) => (isActive ? 'is-on' : '');

  return (
    <div className="shell">
      <header className="header">
        <div className="page header__inner">
          <Link to="/" className="header__brand" aria-label="Autevo">
            <Wordmark size={22} />
          </Link>

          <nav className="header__nav">
            <NavLink to="/search" className={active}>
              {t('web:nav_search')}
            </NavLink>
            <NavLink to="/saved" className={active}>
              {t('web:nav_saved')}
            </NavLink>
            <NavLink to="/saved-searches" className={active}>
              {t('web:nav_searches')}
            </NavLink>
            {user ? (
              <NavLink to="/my-listings" className={active}>
                {t('sell:my_listings')}
              </NavLink>
            ) : null}
          </nav>

          <div className="header__right">
            <label className="header__lang">
              <span className="visually-hidden">{t('profile:language')}</span>
              <select
                value={i18n.language}
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                {SUPPORTED_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {t(`profile:language_${code}`)}
                  </option>
                ))}
              </select>
            </label>

            {user ? (
              <>
                <Link to="/messages" className="header__icon" title={t('messages:title')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 5.5h16v11H8.5L4 20V5.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="visually-hidden">{t('messages:title')}</span>
                </Link>

                <Link to="/profile" className="header__account" title={user.phone ?? ''}>
                  <span className="header__avatar" aria-hidden="true">
                    {(user.display_name ?? '?').trim().charAt(0).toUpperCase()}
                  </span>
                  {user.display_name ?? t('profile:account')}
                </Link>
              </>
            ) : (
              <button type="button" className="header__account" onClick={() => navigate('/sign-in')}>
                {t('auth:sign_in')}
              </button>
            )}

            {/* The money action, and the only bordered button up here. */}
            <Link to="/sell" className="header__sell">
              {t('sell:new_listing')}
            </Link>
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="page footer__inner">
          <div className="footer__brand">
            <Wordmark size={20} />
            <p className="subtle footer__line">{t('web:footer_line')}</p>
          </div>

          <nav className="footer__links">
            <Link to="/privacy">{t('web:privacy')}</Link>
            <Link to="/terms">{t('web:terms')}</Link>
            <Link to="/support">{t('web:support')}</Link>
            <Link to="/delete-account">{t('profile:delete_account')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
