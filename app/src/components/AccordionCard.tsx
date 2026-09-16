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
  children,
  testID,
}: AccordionCardProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={testID}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.header,
          { padding: theme.spacing.lg, gap: theme.spacing.md },
          pressed && { backgroundColor: theme.colors.surfaceMuted },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md },
          ]}
        >
          <Ionicons name={icon} size={22} color={theme.colors.text} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="title">{title}</Text>
          {subtitle && !open ? (
            <Text variant="meta" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={theme.colors.textMuted}
        />
      </Pressable>

      {open ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
