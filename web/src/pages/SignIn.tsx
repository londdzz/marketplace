import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import { authApi } from '../api/auth';
import { referenceApi } from '../api/reference';
import { useAuth } from '../auth/AuthProvider';
import { Wordmark } from '../components/Wordmark';
import { Button, Card, Field, Input, Select } from '../components/ui';

/**
 * Phone sign-in, the same two steps the app uses.
 *
 * The code is checked when the sixth digit lands, as it is on the phone, so
 * nobody hunts for a button after typing something they just read. A refused
 * code clears the field; a connection that failed keeps it, because throwing
 * away six digits somebody typed correctly is not their mistake.
 */
export function SignIn() {
  const { t } = useTranslation(['auth', 'common', 'web']);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const countries = useQuery({ queryKey: ['countries'], queryFn: referenceApi.countries });
  const active = countries.data ?? [];

  const [prefix, setPrefix] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = prefix || active[0]?.phone_prefix || '';

  async function request() {
    setBusy(true);
    setError(null);

    try {
      await authApi.requestOtp(phone.trim(), chosen);
      setSent(true);
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t('common:error_loading'));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError(null);

    try {
      await signIn(phone.trim(), value, chosen);
      navigate('/');
    } catch (problem) {
      // A refused code is the user's to retype; a dropped connection is not.
      if (problem instanceof ApiError) {
        setError(problem.message);
        setCode('');
      } else {
        setError(t('common:error_loading'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page auth">
      <Card className="auth__card">
        <div className="auth__mark">
          <Wordmark size={26} />
        </div>

        <h1 className="auth__title">{sent ? t('auth:code_title') : t('auth:phone_title')}</h1>
        <p className="muted auth__sub">{sent ? t('auth:code_subtitle') : t('web:sign_in_body')}</p>

        {!sent ? (
          <>
            <div className="auth__row">
              <Field label={t('auth:country_label')}>
                <Select value={chosen} onChange={(event) => setPrefix(event.target.value)}>
                  {active.map((country) => (
                    <option key={country.code} value={country.phone_prefix}>
                      {country.code} {country.phone_prefix}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t('auth:phone_label')} error={error}>
                <Input
                  type="tel"
                  autoFocus
                  inputMode="tel"
                  placeholder={t('auth:phone_placeholder')}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && phone.trim()) {
                      void request();
                    }
                  }}
                />
              </Field>
            </div>

            <Button size="lg" block loading={busy} disabled={!phone.trim()} onClick={() => void request()}>
              {t('auth:send_code')}
            </Button>
          </>
        ) : (
          <>
            <Field label={t('auth:code_label')} error={error}>
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                className="auth__code"
                value={code}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 6);

                  setCode(digits);

                  // Checked the moment the sixth digit lands.
                  if (digits.length === 6) {
                    void verify(digits);
                  }
                }}
              />
            </Field>

            <Button variant="ghost" block onClick={() => { setSent(false); setCode(''); setError(null); }}>
              {t('auth:change_number')}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
