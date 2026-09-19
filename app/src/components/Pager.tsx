import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type PagerProps = {
  page: number;
  lastPage: number;
  /** Shown between the two buttons, already translated. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** Dims the controls while the page being asked for is still coming. */
  busy?: boolean;
  onChange: (page: number) => void;
};

/**
 * Previous, where you are, next.
 *
 * Both controls take the quiet fill: the screen's one filled button is Save
 * search, and a pager that shouts competes with it. The buttons keep their
 * place when they cannot be used rather than disappearing, so the row does not
 * reshuffle between the first page and the second.
 */
export function Pager({
  page,
  lastPage,
  label,
  previousLabel,
  nextLabel,
  busy = false,
  onChange,
}: PagerProps) {
  const theme = useTheme();

  if (lastPage <= 1) {
    return null;
  }

  return (
    <View style={[styles.row, { gap: theme.spacing.md, paddingTop: theme.spacing.lg }]}>
      <Button
        label={previousLabel}
        variant="secondary"
        icon="chevron-back"
        disabled={busy || page <= 1}
        onPress={() => onChange(page - 1)}
        testID="pager-previous"
      />

      <Text variant="label" tone="muted" style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <Button
        label={nextLabel}
        variant="secondary"
        disabled={busy || page >= lastPage}
        onPress={() => onChange(page + 1)}
        testID="pager-next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
