import { Children, type ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';

export type ListGroupProps = {
  children: ReactNode;
  /** Indents the divider, so it starts under the text rather than the edge. */
  inset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A long list of choices as one card with dividers, rather than a stack of
 * separate cards with air between them.
 *
 * Forty makes drawn as forty floating cards is forty borders and thirty-nine
 * gaps to read past. One card with hairlines reads as a single list, which is
 * what it is, and fits half again as many rows on a screen.
 */
export function ListGroup({ children, inset = 0, style, testID }: ListGroupProps) {
  const theme = useTheme();
  const rows = Children.toArray(children);

  return (
    <View
      testID={testID}
      style={[
        styles.group,
        {
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      {rows.map((row, index) => (
        <View key={index}>
          {row}
          {/* The divider is drawn beside the row rather than on it, so
              indenting it never indents the row itself. */}
          {index === rows.length - 1 ? null : (
            <View
              style={{ height: 1, marginLeft: inset, backgroundColor: theme.colors.border }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
