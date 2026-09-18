import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type AccordionCardProps = {
  title: string;
  /** What this section covers, or what is currently chosen in it. */
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultOpen?: boolean;
  /**
   * Drops the card's own border and corners, for a section that sits inside a
   * `ListGroup` beside its neighbours rather than floating on its own.
   */
  bare?: boolean;
  children: ReactNode;
  testID?: string;
};

/**
 * One collapsible section of the search builder.
 *
 * Closed, it shows what it covers; open, it shows the controls. Only the one
 * being used is open, so the whole search stays on one screen instead of
 * becoming a sequence of pages.
 */
export function AccordionCard({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  bare = false,
  children,
  testID,
}: AccordionCardProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      style={
        bare
          ? { backgroundColor: theme.colors.surface }
          : {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              overflow: 'hidden',
            }
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={testID}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.header,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.md,
          },
          pressed && { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.sm },
          ]}
        >
          <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="heading">{title}</Text>
          {subtitle && !open ? (
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textMuted}
        />
      </Pressable>

      {/* A rule under the header, so the controls read as the section's own
          rather than as more of its title. */}
      {open ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
