import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { messagingApi } from '../api/messaging';
import type { Conversation } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Button, EmptyState, ErrorState, Input, Spinner } from '../components/ui';
import { formatEur, listingTitle } from '../format';
import i18n from '../i18n';

/**
 * Messages, both panes at once.
 *
 * On a phone the list and a thread are two screens because there is no room
 * for both. A desktop has the room, so the threads sit on the left and the
 * open one fills the rest — which is the arrangement every mail client settled
 * on for the same reason.
 *
 * Polled, not pushed, exactly as the app does it: the open thread every five
 * seconds and the list every fifteen. Neither costs anything when the tab is
 * not the one being looked at, because the browser stops timers there.
 */
export function Messages() {
  const { t } = useTranslation(['messages', 'common', 'web', 'listing']);
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingApi.conversations(),
    enabled: Boolean(user),
    refetchInterval: 15_000,
  });

  if (!user) {
    return (
      <div className="page">
        <EmptyState
          title={t('messages:title')}
          description={t('web:sign_in_body')}
          actionLabel={t('common:sign_in')}
          onAction={() => navigate('/sign-in')}
        />
      </div>
    );
  }

  const threads = conversations.data?.data ?? [];

  return (
    <div className="page messages">
      <aside className="messages__list">
        <h1 className="messages__title">{t('messages:title')}</h1>

        {conversations.isLoading ? (
          <Spinner />
        ) : conversations.isError ? (
          <ErrorState
            title={t('common:error_loading')}
            actionLabel={t('common:retry')}
            onRetry={() => void conversations.refetch()}
          />
        ) : threads.length === 0 ? (
          <EmptyState title={t('messages:empty_title')} description={t('messages:empty_body')} />
        ) : (
          <div className="stack">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to={`/messages/${thread.id}`}
                className={`thread ${thread.id === id ? 'is-on' : ''}`}
              >
                <div className="thread__photo">
                  {thread.listing?.photos[0] ? (
                    <img src={thread.listing.photos[0].thumb_url ?? thread.listing.photos[0].url} alt="" />
                  ) : null}
                </div>
                <div className="thread__body">
                  <p className="thread__who">
                    {thread.counterpart?.display_name ?? t('listing:private')}
                  </p>
                  <p className="subtle thread__car">
                    {thread.listing ? listingTitle(thread.listing) : ''}
                  </p>
                  <p className="muted thread__last">{thread.last_message?.body ?? ''}</p>
                </div>
                {thread.unread_count ? <span className="thread__dot" /> : null}
              </Link>
            ))}
          </div>
        )}
      </aside>

      <section className="messages__pane">
        {id ? (
          <Thread
            id={id}
            conversation={threads.find((thread) => thread.id === id)}
            onSent={() => queryClient.invalidateQueries({ queryKey: ['conversations'] })}
          />
        ) : (
          <EmptyState title={t('messages:title')} description={t('web:pick_thread')} />
        )}
      </section>
    </div>
  );
}

function Thread({
  id,
  conversation,
  onSent,
}: {
  id: string;
  conversation?: Conversation;
  onSent: () => void;
}) {
  const { t } = useTranslation(['messages', 'common']);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagingApi.messages(id),
    refetchInterval: 5_000,
  });

  // Marked read once on opening, not on every poll.
  useEffect(() => {
    void messagingApi.markRead(id).catch(() => undefined);
  }, [id]);

  const rows = messages.data?.data ?? [];

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [rows.length]);

  const send = useMutation({
    mutationFn: (text: string) => messagingApi.send(id, text),
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      onSent();
    },
  });

  return (
    <div className="chat">
      {conversation?.listing ? (
        <Link to={`/listing/${conversation.listing.id}`} className="chat__head">
          {conversation.listing.photos[0] ? (
            <img
              src={conversation.listing.photos[0].thumb_url ?? conversation.listing.photos[0].url}
              alt=""
            />
          ) : null}
          <div>
            <p className="chat__car">{listingTitle(conversation.listing)}</p>
            <p className="subtle">{formatEur(conversation.listing.price_eur)}</p>
          </div>
        </Link>
      ) : null}

      <div className="chat__scroll">
        {messages.isLoading ? (
          <Spinner />
        ) : (
          rows.map((message) => (
            <div key={message.id} className={`bubble ${message.is_mine ? 'bubble--mine' : ''}`}>
              <p className="bubble__text">{message.body}</p>
              <span className="bubble__when">
                {message.created_at
                  ? new Date(message.created_at).toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();

          if (body.trim()) {
            send.mutate(body.trim());
          }
        }}
      >
        <Input
          value={body}
          placeholder={t('messages:write')}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button type="submit" loading={send.isPending} disabled={!body.trim()}>
          {t('messages:send')}
        </Button>
      </form>
    </div>
  );
}
