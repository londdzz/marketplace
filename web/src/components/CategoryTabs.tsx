import { useTranslation } from 'react-i18next';

import type { VehicleType } from '../api/types';

export type CategoryTabsProps = {
  value: VehicleType;
  onChange: (type: VehicleType) => void;
  /** The kinds to offer, in order. Whatever the API says it has. */
  types?: readonly VehicleType[];
  className?: string;
};

/**
 * Which catalogue is being read: cars or motorcycles.
 *
 * It is a switch rather than a filter, and the difference decides where it
 * goes. A filter narrows what is already on the page; this changes what
 * "everything" means — a different set of makes, a different set of shapes, a
 * different set of cars. So it sits on top of the search panel as a tab row
 * rather than inside it as another dropdown, which is where every marketplace
 * that sells more than one kind of vehicle puts it, and where a visitor looks
 * for it before reading a word.
 *
 * The chosen tab joins the panel below it: no gap, no border between them, and
 * the panel's own background running up into the tab. That join is the whole
 * reason this reads as two catalogues rather than two buttons.
 */
export function CategoryTabs({ value, onChange, types = ['car', 'motorcycle'], className }: CategoryTabsProps) {
  const { t } = useTranslation('search');

  return (
    <div className={['cat-tabs', className].filter(Boolean).join(' ')} role="tablist">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={type === value}
          className={`cat-tab${type === value ? ' cat-tab--on' : ''}`}
          onClick={() => onChange(type)}
          data-testid={`category-${type}`}
        >
          <CategoryIcon type={type} />
          {t(`category.${type}`)}
        </button>
      ))}
    </div>
  );
}

/** One mark per kind, so the row reads at a glance rather than by its words. */
function CategoryIcon({ type }: { type: VehicleType }) {
  return type === 'motorcycle' ? (
    <svg viewBox="0 0 64 26" width="26" height="12" fill="none" aria-hidden="true">
      <path
        d="M12.5 18.8 18.5 8.2M18.5 8.2 23.5 6.6M20 10.8 27 9.8 34 10.6 44 10.6 52.5 9.4 51 12.2M50.5 18.8 42 14.8 35 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="18.8" r="5.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="50.5" cy="18.8" r="5.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 64 26" width="26" height="12" fill="none" aria-hidden="true">
      <path
        d="M4 17.5c-.4-3.2.2-4.6 1.6-5l6.6-1.2 6.4-4.4c1.3-.9 2.6-1.3 4.2-1.3h11.4c1.7 0 3 .4 4.3 1.3l6.6 4.6 10.6.8c1.6.1 2.1 1.6 1.9 5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="17.6" r="3.4" stroke="currentColor" strokeWidth="2" />
      <circle cx="48" cy="17.6" r="3.4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
