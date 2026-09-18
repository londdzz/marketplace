import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { SearchFilters } from '../api/types';

type FiltersState = {
  filters: SearchFilters;
  /** Merge a change into what is already chosen. */
  set: (patch: Partial<SearchFilters>) => void;
  /** Add or remove one value from a list filter, such as fuel or countries. */
  toggle: <K extends 'fuel' | 'countries'>(key: K, value: string) => void;
  /** Swap the whole search out, which is what running a saved one does. */
  replace: (next: SearchFilters) => void;
  reset: () => void;
  /** How many filters are set, for the badge on the More filters button. */
  count: number;
};

const FiltersContext = createContext<FiltersState | undefined>(undefined);

/**
 * The search a buyer is building.
 *
 * Held above both the builder and the results so that going back from the
 * results returns to the same search rather than an empty one, and so the offer
 * count on the builder is counting the same thing the results will show.
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<SearchFilters>({});

  const set = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };

      // An empty value means "no filter" rather than a filter for nothing.
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          delete next[key as keyof SearchFilters];
        }
      }

      return next;
    });
  }, []);

  const toggle = useCallback(<K extends 'fuel' | 'countries'>(key: K, value: string) => {
    setFilters((current) => {
      const list = (current[key] ?? []) as string[];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      const updated = { ...current, [key]: next };

      if (next.length === 0) {
        delete updated[key];
      }

      return updated;
    });
  }, []);

  const replace = useCallback((next: SearchFilters) => setFilters(next), []);

  const reset = useCallback(() => setFilters({}), []);

  const count = useMemo(
    () => Object.keys(filters).filter((key) => key !== 'sort' && key !== 'q').length,
    [filters],
  );

  const value = useMemo<FiltersState>(
    () => ({ filters, set, toggle, replace, reset, count }),
    [filters, set, toggle, replace, reset, count],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersState {
  const context = useContext(FiltersContext);

  if (!context) {
    throw new Error('useFilters was called outside FiltersProvider.');
  }

  return context;
}
