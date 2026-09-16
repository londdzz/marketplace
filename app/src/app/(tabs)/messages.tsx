import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../components';

/**
 * Filled in by a later phase. The tab exists now so the shape of the app is
 * real and navigable.
 */
export default function MessagesTab() {
  const { t } = useTranslation(['tabs', 'home']);

  return (
    <Screen>
      <EmptyState glyph="💬" title={t('tabs:messages')} description={t('home:search_hint')} />
    </Screen>
  );
}
