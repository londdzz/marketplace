import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { blocksApi } from '../../api/blocks';
import { messagingApi } from '../../api/messaging';
import type { Message } from '../../api/types';
import { Button, ConfirmDialog, Text } from '../../components';
import { formatEur, listingTitle } from '../../format';
import { dayLabel, messageTime } from '../../messaging/time';
import { useTheme } from '../../theme';

/** How often an open thread asks for anything new. */
const POLL_MS = 5000;

export default function ConversationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['messages', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [draft, setDraft] = useState('');
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const markedRead = useRef<string | null>(null);

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingApi.conversations,
  });

  const thread = conversations.data?.data.find((candidate) => candidate.id === id) ?? null;

  const messages = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagingApi.messages(id),
    enabled: Boolean(id),
    refetchInterval: POLL_MS,
  });

  // The API pages newest first; a thread reads oldest first.
  const items = [...(messages.data?.data ?? [])].reverse();

  const block = useMutation({
    mutationFn: (userId: number) => blocksApi.block(userId),
    onSuccess: () => {
      // The thread closes for both sides at once, so there is nothing left
      // here to come back to.
      void queryClient.invalidateQueries();
      router.replace('/(tabs)/messages');
    },
    onError: (error) => setFailure(error instanceof Error ? error.message : String(error)),
  });

  const send = useMutation({
    mutationFn: (body: string) => messagingApi.send(id, body),
    onSuccess: () => {
      setDraft('');
      setFailure(null);
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => setFailure(error instanceof Error ? error.message : String(error)),
  });

  // Opening a thread is reading it. Done once per thread rather than on every
  // poll, so the API is not told the same thing every five seconds.
  useEffect(() => {
    if (!id || messages.data === undefined || markedRead.current === id) {
      return;
    }

    markedRead.current = id;

    void messagingApi
      .markRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {
        // Reading is not worth interrupting anyone over.
      });
  }, [id, messages.data, queryClient]);

  const bubble = (message: Message, index: number) => {
    const previous = items[index - 1];
    const day = dayLabel(message.created_at);
    const showDay = day !== '' && dayLabel(previous?.created_at ?? null) !== day;

    return (
      <View>
        {showDay ? (
          <View style={[styles.dayRow, { marginVertical: theme.spacing.md }]}>
            <View
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 4,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.surfaceMuted,
              }}
            >
              <Text variant="caption" tone="muted">
                {day}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.bubble,
            {
              alignSelf: message.is_mine ? 'flex-end' : 'flex-start',
              backgroundColor: message.is_mine ? theme.colors.accent : theme.colors.surface,
              borderColor: message.is_mine ? theme.colors.accent : theme.colors.border,
              borderRadius: 20,
              borderBottomRightRadius: message.is_mine ? 6 : 20,
              borderBottomLeftRadius: message.is_mine ? 20 : 6,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md - 2,
            },
          ]}
        >
          <Text
            variant="body"
            style={{ color: message.is_mine ? theme.colors.textOnAccent : theme.colors.text }}
          >
            {message.body}
          </Text>

          <View style={[styles.stamp, { marginTop: 2, gap: 4 }]}>
            <Text
              variant="caption"
              style={{
                color: message.is_mine ? theme.colors.textOnAccent : theme.colors.textSubtle,
                opacity: message.is_mine ? 0.7 : 1,
                fontSize: 10.5,
              }}
            >
              {messageTime(message.created_at)}
            </Text>

            {/* Read receipts on what I sent, from the read_at the API keeps. */}
            {message.is_mine ? (
              <Ionicons
                name={message.read_at ? 'checkmark-done' : 'checkmark'}
                size={13}
                color={theme.colors.textOnAccent}
                style={{ opacity: message.read_at ? 0.95 : 0.6 }}
              />
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const counterpart =
    thread?.counterpart?.dealer_name ?? thread?.counterpart?.display_name ?? t('messages:someone');

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.screenPadding,
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.md,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()} testID="thread-back" hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!thread?.listing}
          onPress={() => router.push({ pathname: '/listing/[id]', params: { id: thread?.listing_id ?? '' } })}
          testID="thread-listing"
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
        >
          {thread?.listing ? (
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: theme.radius.md,
                overflow: 'hidden',
                backgroundColor: theme.colors.surfaceMuted,
              }}
            >
              {thread.listing.photos?.[0] ? (
                <Image
                  source={{ uri: thread.listing.photos[0].thumb_url }}
                  style={{ width: 42, height: 42 }}
                  contentFit="cover"
                />
              ) : null}
            </View>
          ) : null}

          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {counterpart}
            </Text>
            {thread?.listing ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {listingTitle(thread.listing)}
                {thread.listing.price_eur ? ` · ${formatEur(thread.listing.price_eur)}` : ''}
              </Text>
            ) : null}
          </View>

          {thread?.listing ? (
            <Ionicons name="chevron-forward" size={17} color={theme.colors.textSubtle} />
          ) : null}
        </Pressable>

        {thread?.counterpart ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('messages:block')}
            onPress={() => setConfirmingBlock((value) => !value)}
            hitSlop={8}
            testID="thread-block"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ConfirmDialog
        open={confirmingBlock}
        title={t('messages:block_title', { name: counterpart })}
        body={t('messages:block_body')}
        confirmLabel={t('messages:block')}
        cancelLabel={t('common:cancel')}
        destructive
        loading={block.isPending}
        onCancel={() => setConfirmingBlock(false)}
        onConfirm={() => thread?.counterpart && block.mutate(thread.counterpart.id)}
        testID="thread-block-confirm"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {messages.isLoading ? (
          <View style={[styles.flex, styles.centre]}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : messages.isError ? (
          <View style={[styles.flex, styles.centre, { gap: theme.spacing.md, padding: theme.screenPadding }]}>
            <Text variant="body" tone="danger">
              {t('common:error_loading')}
            </Text>
            <Button label={t('common:retry')} variant="secondary" onPress={() => void messages.refetch()} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(message) => message.id}
            renderItem={({ item, index }) => bubble(item, index)}
            contentContainerStyle={{
              padding: theme.screenPadding,
              gap: theme.spacing.sm,
              flexGrow: 1,
              justifyContent: 'flex-end',
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.centre, { paddingVertical: theme.spacing.huge }]}>
                <Text variant="meta" tone="muted" style={{ textAlign: 'center', maxWidth: 260 }}>
                  {t('messages:thread_empty')}
                </Text>
              </View>
            }
          />
        )}

        {failure ? (
          <Text
            variant="meta"
            tone="danger"
            style={{ paddingHorizontal: theme.screenPadding, paddingBottom: theme.spacing.sm }}
          >
            {failure}
          </Text>
        ) : null}

        <View
          style={[
            styles.composer,
            {
              paddingHorizontal: theme.screenPadding,
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.sm,
              gap: theme.spacing.sm,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('messages:write')}
            placeholderTextColor={theme.colors.textSubtle}
            multiline
            testID="message-input"
            style={[
              theme.typography.body,
              {
                flex: 1,
                maxHeight: 120,
                minHeight: 46,
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: 23,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
              },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            ]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('messages:send')}
            disabled={draft.trim() === '' || send.isPending}
            onPress={() => send.mutate(draft.trim())}
            testID="message-send"
            style={{
              width: 46,
              height: 46,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: draft.trim() === '' || send.isPending ? 0.45 : 1,
              backgroundColor: theme.colors.accent,
            }}
          >
            {send.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.textOnAccent} />
            ) : (
              <Ionicons name="send" size={18} color={theme.colors.textOnAccent} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '80%',
    borderWidth: 1,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  dayRow: {
    alignItems: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
});
