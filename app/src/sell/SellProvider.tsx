import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { sellApi, type ListingDraftInput } from '../api/sell';
import type { Listing, ListingPhoto } from '../api/types';

type SellState = {
  /** The draft on the server. Null before the first step has been saved. */
  draft: Listing | null;
  /** True while a step is being written, so the Continue button can wait. */
  saving: boolean;
  /** The last failure, so a step can say what went wrong rather than stalling. */
  error: string | null;
  /**
   * Write this step and keep going. Creates the draft on the first call and
   * updates it on every one after, which is what makes the flow resumable.
   */
  save: (input: ListingDraftInput) => Promise<Listing | null>;
  /** Pick up a draft the seller left unfinished. */
  resume: (listing: Listing) => void;
  /**
   * Photographs are written by their own endpoints rather than by save(), so
   * the photo step hands back what the API returned.
   */
  applyPhotos: (photos: ListingPhoto[]) => void;
  /** Start again, after publishing or abandoning. */
  clear: () => void;
};

const SellContext = createContext<SellState | undefined>(undefined);

export function SellProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (input: ListingDraftInput) => {
      setSaving(true);
      setError(null);

      try {
        const saved = draft
          ? await sellApi.updateDraft(draft.id, input)
          : await sellApi.createDraft(input);

        setDraft(saved);
        // My listings shows drafts, so it is stale the moment one is written.
        void queryClient.invalidateQueries({ queryKey: ['my-listings'] });

        return saved;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));

        return null;
      } finally {
        setSaving(false);
      }
    },
    [draft, queryClient],
  );

  const resume = useCallback((listing: Listing) => {
    setDraft(listing);
    setError(null);
  }, []);

  const applyPhotos = useCallback((photos: ListingPhoto[]) => {
    setDraft((current) =>
      current ? { ...current, photos, photo_count: photos.length } : current,
    );
  }, []);

  const clear = useCallback(() => {
    setDraft(null);
    setError(null);
  }, []);

  const value = useMemo<SellState>(
    () => ({ draft, saving, error, save, resume, applyPhotos, clear }),
    [draft, saving, error, save, resume, applyPhotos, clear],
  );

  return <SellContext.Provider value={value}>{children}</SellContext.Provider>;
}

export function useSell(): SellState {
  const context = useContext(SellContext);

  if (!context) {
    throw new Error('useSell was called outside SellProvider.');
  }

  return context;
}
