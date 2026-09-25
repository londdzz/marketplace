import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { SearchFilters, VehicleType } from '../api/types';

type FiltersState = {
  filters: SearchFilters;
  /** Cars or motorcycles. Never absent here, so no screen has to guess. */
  vehicleType: VehicleType;
  /**
   * Switch category, dropping the filters that cannot survive the move.
   *
   * A make id, a model id and a shape all name something that only exists in
   * one of the two catalogues: Volkswagen sells no motorcycles and "estate"
   * means nothing on two wheels. Everything else — price, year, kilometres,
   * fuel, gearbox, where — asks the same question of both and is kept, so
   * switching does not throw away a search somebody has been building.
   */
  setVehicleType: (type: VehicleType) => void;
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
  const [filters, setFilters] = useState<SearchFilters>({ vehicleType: 'car' });

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

  const setVehicleType = useCallback((type: VehicleType) => {
    setFilters((current) => {
      if ((current.vehicleType ?? 'car') === type) {
        return current;
      }

      const next = { ...current, vehicleType: type };
      delete next.makeId;
      delete next.modelId;
      delete next.bodyType;

      return next;
    });
  }, []);

  // A saved search, or a browse collection, carries its own category, and one
  // saved before motorcycles existed carries none — which means cars.
  const replace = useCallback(
    (next: SearchFilters) => setFilters({ vehicleType: 'car', ...next }),
    [],
  );

  const reset = useCallback(
    () => setFilters((current) => ({ vehicleType: current.vehicleType ?? 'car' })),
    [],
  );

  // The category is not a filter: it is which catalogue is being read, and
  // counting it would mean the More filters button always read "(1)".
  const count = useMemo(
    () =>
      Object.keys(filters).filter(
        (key) => key !== 'sort' && key !== 'q' && key !== 'vehicleType',
      ).length,
    [filters],
  );

  const value = useMemo<FiltersState>(
    () => ({
      filters,
      vehicleType: filters.vehicleType ?? 'car',
      setVehicleType,
      set,
      toggle,
      replace,
      reset,
      count,
    }),
    [filters, setVehicleType, set, toggle, replace, reset, count],
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
