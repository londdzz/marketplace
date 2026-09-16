import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { messagingApi } from '../../api/messaging';
import type { Conversation } from '../../api/types';
import { Button, EmptyState, Screen, Text } from '../../components';
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
    const unread = thread.unread_count ?? 0;
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
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            gap: theme.spacing.md,
            borderWidth: 1,
            borderColor: unread > 0 ? theme.colors.accentBorder : theme.colors.border,
            backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
          },
        ]}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: 56, height: 56 }} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centre]}>
              <Ionicons name="car-outline" size={22} color={theme.colors.textSubtle} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            <Text variant="caption" tone="muted">
              {shortTime(thread.last_message_at)}
            </Text>
          </View>

          <Text variant="meta" tone="muted" numberOfLines={1}>
            {thread.listing ? listingTitle(thread.listing) : ''}
            {thread.listing?.price_eur ? ` · ${formatEur(thread.listing.price_eur)}` : ''}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text
              variant="meta"
              tone={unread > 0 ? 'default' : 'muted'}
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {thread.last_message
                ? `${thread.last_message.is_mine ? t('messages:you') : ''}${thread.last_message.body}`
                : t('messages:no_messages_yet')}
            </Text>

            {unread > 0 ? (
              <View
                style={[
                  styles.unread,
                  { backgroundColor: theme.colors.accent, borderRadius: theme.radius.full },
                ]}
              >
                <Text variant="caption" style={{ color: theme.colors.textOnAccent, fontWeight: '700' }}>
                  {unread}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen flush edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingHorizontal: theme.screenPadding,
          paddingVertical: theme.spacing.md,
        }}
      >
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} testID="messages-back" hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text variant="title">{t('messages:title')}</Text>
      </View>

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
          contentContainerStyle={{
            paddingHorizontal: theme.screenPadding,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.sm,
          }}
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
