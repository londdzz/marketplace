import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/ui';

export function NotFound() {
  const { t } = useTranslation(['web']);

  return (
    <div className="page">
      {/* Off-screen, because the panel below says the same thing in the middle
          of the page — but a page with no heading at all is one nothing can
          describe. */}
      <h1 className="visually-hidden">{t('web:not_found_title')}</h1>
      <EmptyState
        title={t('web:not_found_title')}
        description={t('web:not_found_body')}
        actionLabel={t('web:nav_search')}
        to="/search"
      />
    </div>
  );
}
