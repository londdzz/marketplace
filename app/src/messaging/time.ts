/**
 * Times as a messaging list writes them: the clock today, the weekday this
 * week, the date before that. Nothing here needs a date library.
 */
export function shortTime(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const at = new Date(iso);
  const now = new Date();
  const sameDay = at.toDateString() === now.toDateString();

  if (sameDay) {
    return at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const days = Math.floor((now.getTime() - at.getTime()) / 86_400_000);

  if (days < 7) {
    return at.toLocaleDateString(undefined, { weekday: 'short' });
  }

  return at.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}

/** The full stamp under a message bubble. */
export function messageTime(iso: string | null): string {
  if (!iso) {
    return '';
  }

  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** The separator between days in a thread. */
export function dayLabel(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const at = new Date(iso);
  const now = new Date();

  if (at.toDateString() === now.toDateString()) {
    return '';
  }

  return at.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}
