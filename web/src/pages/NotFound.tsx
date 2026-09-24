import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/ui';

export function NotFound() {
  const { t } = useTranslation(['web']);

  return (
    <div className="page">
      <EmptyState
        title={t('web:not_found_title')}
        description={t('web:not_found_body')}
        actionLabel={t('web:nav_search')}
        to="/search"
      />
    </div>
  );
}
