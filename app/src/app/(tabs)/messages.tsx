import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { messagingApi } from '../../api/messaging';
import type { Conversation } from '../../api/types';
import { Button, EmptyState, Screen, StackHeader, Text } from '../../components';
import { formatEur, listingTitle } from '../../format';
import { shortTime } from '../../messaging/time';
import { useTheme } from '../../theme';

/**
 * Every thread, most recently active first.
 *
 * Polled rather than pushed: the specification allows polling for v1, and a
 * list that is only correct when it is on screen costs nothing when it is not.
 */
export default function MessagesTab() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation(['messages', 'common']);

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.conversations,
    refetchInterval: 15_000,
  });

  const threads = conversations.data?.data ?? [];

  const row = (thread: Conversation) => {
    const unread = (thread.unread_count ?? 0) > 0;
    const photo = thread.listing?.photos?.[0]?.thumb_url;
    const name =
      thread.counterpart?.dealer_name ??
      thread.counterpart?.display_name ??
      t('messages:someone');

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: thread.id } })}
        testID={`thread-${thread.id}`}
        style={({ pressed }) => [
          styles.row,
          {
            paddingHorizontal: theme.screenPadding,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.md,
            backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
          },
        ]}
      >
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: 58, height: 58 }} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centre]}>
              <Ionicons name="car-outline" size={22} color={theme.colors.textSubtle} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            <Text variant="caption" tone={unread ? 'accent' : 'muted'}>
              {shortTime(thread.last_message_at)}
            </Text>
          </View>

          <Text variant="caption" tone="muted" numberOfLines={1}>
            {thread.listing ? listingTitle(thread.listing) : ''}
            {thread.listing?.price_eur ? ` · ${formatEur(thread.listing.price_eur)}` : ''}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text
              variant="meta"
              tone={unread ? 'default' : 'muted'}
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {thread.last_message
                ? `${thread.last_message.is_mine ? t('messages:you') : ''}${thread.last_message.body}`
                : t('messages:no_messages_yet')}
            </Text>

            {unread ? (
              <View
                style={{
                  minWidth: 8,
                  height: 8,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.accent,
                }}
              />
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen flush edges={['top']}>
      <StackHeader
        fallback="/(tabs)/home"
        backTestID="messages-back"
        backLabel={t('common:back')}
      />

      <Text
        variant="title"
        style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.md }}
      >
        {t('messages:title')}
      </Text>

      {conversations.isLoading ? (
        <View style={[styles.centre, { flex: 1 }]}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : conversations.isError ? (
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.md, paddingHorizontal: theme.screenPadding }}>
          <Text variant="body" tone="danger" style={{ textAlign: 'center' }}>
            {t('common:error_loading')}
          </Text>
          <Button label={t('common:retry')} variant="secondary" onPress={() => void conversations.refetch()} />
        </View>
      ) : threads.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            glyph="💬"
            title={t('messages:empty_title')}
            description={t('messages:empty_body')}
            actionLabel={t('messages:browse')}
            onAction={() => router.replace('/(tabs)/search')}
          />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(thread) => thread.id}
          renderItem={({ item }) => row(item)}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                marginLeft: theme.screenPadding + 58 + theme.spacing.md,
                backgroundColor: theme.colors.border,
              }}
            />
          )}
          refreshing={conversations.isFetching}
          onRefresh={() => void conversations.refetch()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
