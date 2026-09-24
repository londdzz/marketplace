import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthProvider';
import { Button, Card } from '../components/ui';
import { useState } from 'react';

/**
 * Where to write when something is wrong.
 *
 * Both stores want a support URL that a person can actually reach, and a page
 * that lists an address is the least it can be. The address itself is in the
 * policies, so it is named once here and not invented a second time.
 */
export function Support() {
  const { t } = useTranslation(['web', 'profile']);

  return (
    <div className="page legal">
      <h1>{t('web:support')}</h1>
      <p>
        <a href="mailto:support@autevo.mk">support@autevo.mk</a>
      </p>
      <p className="muted">{t('web:footer_line')}</p>
      <p>
        <Link to="/privacy">{t('web:privacy')}</Link> · <Link to="/terms">{t('web:terms')}</Link>
      </p>
    </div>
  );
}

/**
 * Deleting an account, from the web.
 *
 * Apple requires the path to exist and to be reachable — the app has it two
 * taps inside the profile, and this is the same thing for somebody who would
 * rather do it at a keyboard. It is the same endpoint, so it deletes
 * everything the app's does: the account, its listings, its messages.
 */
export function DeleteAccount() {
  const { t } = useTranslation(['web', 'profile', 'common']);
  const { user, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function remove() {
    setBusy(true);

    try {
      await authApi.deleteAccount();
      await signOut();
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page legal">
      <h1>{t('profile:delete_account')}</h1>
      <p>{t('profile:delete_body')}</p>

      {done ? (
        <Card className="legal__card">
          <p>{t('profile:delete_account')} ✓</p>
        </Card>
      ) : user ? (
        <Card className="legal__card">
          {confirming ? (
            <>
              <p>{t('profile:delete_title')}</p>
              <div className="legal__actions">
                <Button variant="danger" loading={busy} onClick={() => void remove()}>
                  {t('profile:delete_confirm')}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  {t('common:cancel', { defaultValue: t('common:back') })}
                </Button>
              </div>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {t('profile:delete_account')}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="legal__card">
          <p className="muted">{t('web:sign_in_body')}</p>
          <Link to="/sign-in">
            <Button variant="secondary">{t('profile:account')}</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
