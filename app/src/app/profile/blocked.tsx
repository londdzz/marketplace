import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { blocksApi, type BlockedUser } from '../../api/blocks';
import { Button, EmptyState, StackHeader, Text } from '../../components';
import { useTheme } from '../../theme';

/**
 * Everyone this account has blocked, and the way back.
 *
 * Blocking is reversible and has to look reversible: the stores require the
 * block, and a person who blocked someone in anger deserves a way to undo it
 * without support tickets.
 */
export default function BlockedUsersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['profile', 'common']);

  const blocked = useQuery({ queryKey: ['blocks'], queryFn: blocksApi.list });

  const unblock = useMutation({
    mutationFn: (userId: number) => blocksApi.unblock(userId),
    // Their listings and any thread come back, so everything is stale.
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const people = blocked.data?.data ?? [];

  const row = (person: BlockedUser) => (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: theme.screenPadding,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.md,
        },
      ]}
      testID={`blocked-${person.id}`}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceMuted,
        }}
      >
        <Ionicons name="person" size={20} color={theme.colors.textMuted} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {person.dealer_name ?? person.display_name ?? t('profile:blocked_someone')}
        </Text>
        <Text variant="caption" tone="muted">
          {person.seller_type === 'dealer' ? t('listing:dealer') : t('listing:private')}
        </Text>
      </View>

      <Button
        label={t('profile:unblock')}
        size="sm"
        variant="secondary"
        loading={unblock.isPending && unblock.variables === person.id}
        onPress={() => unblock.mutate(person.id)}
        testID={`unblock-${person.id}`}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <StackHeader
        fallback="/(tabs)/profile"
        backTestID="blocked-back"
        backLabel={t('common:back')}
      />

      <Text
        variant="title"
        style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.md }}
      >
        {t('profile:blocked')}
      </Text>

      {blocked.isLoading ? (
        <View style={[styles.flex, styles.centre]}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : blocked.isError ? (
        <View style={[styles.flex, styles.centre, { gap: theme.spacing.md, padding: theme.screenPadding }]}>
          <Text variant="body" tone="danger">
            {t('common:error_loading')}
          </Text>
          <Button label={t('common:retry')} variant="secondary" onPress={() => void blocked.refetch()} />
        </View>
      ) : people.length === 0 ? (
        <View style={[styles.flex, styles.centre]}>
          <EmptyState
            glyph="🚫"
            title={t('profile:blocked_empty')}
            description={t('profile:blocked_empty_body')}
          />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(person) => String(person.id)}
          renderItem={({ item }) => row(item)}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                marginLeft: theme.screenPadding + 42 + theme.spacing.md,
                backgroundColor: theme.colors.border,
              }}
            />
          )}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
          refreshing={blocked.isFetching}
          onRefresh={() => void blocked.refetch()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
