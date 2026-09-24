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
 */
export function Layout() {
  const { t } = useTranslation(['web', 'common', 'search', 'profile', 'auth']);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <header className="header">
        <div className="page header__inner">
          <Link to="/" className="header__brand">
            <Wordmark size={22} />
          </Link>

          <nav className="header__nav">
            <NavLink to="/search" className={({ isActive }) => (isActive ? 'is-on' : '')}>
              {t('web:nav_search')}
            </NavLink>
            <NavLink to="/saved" className={({ isActive }) => (isActive ? 'is-on' : '')}>
              {t('web:nav_saved')}
            </NavLink>
          </nav>

          <div className="header__right">
            <select
              className="header__lang"
              value={i18n.language}
              aria-label={t('profile:language')}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {SUPPORTED_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {t(`profile:language_${code}`, code.toUpperCase())}
                </option>
              ))}
            </select>

            {user ? (
              <button
                type="button"
                className="header__account"
                onClick={() => void signOut()}
                title={user.display_name ?? user.phone ?? ''}
              >
                {t('profile:sign_out')}
              </button>
            ) : (
              <button type="button" className="header__account" onClick={() => navigate('/sign-in')}>
                {t('auth:sign_in')}
              </button>
            )}
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
            <Link to="/delete-account">{t('web:delete_account')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
