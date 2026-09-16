import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '../../components';

/**
 * The cars a buyer kept. Wired to GET /favorites in phase 9.
 */
export default function SavedTab() {
  const { t } = useTranslation(['tabs', 'home']);

  return (
    <Screen>
      <EmptyState glyph="♡" title={t('home:empty_title')} description={t('home:empty_body')} />
    </Screen>
  );
}
