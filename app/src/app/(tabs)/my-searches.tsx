import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../components';

/**
 * Saved searches, and the alerts they send. Wired to GET /saved-searches in
 * phase 9.
 */
export default function MySearchesTab() {
  const { t } = useTranslation(['tabs', 'home']);

  return (
    <Screen>
      <EmptyState glyph="☆" title={t('tabs:my_searches')} description={t('home:search_hint')} />
    </Screen>
  );
}
