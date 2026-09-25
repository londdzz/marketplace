import { useTranslation } from 'react-i18next';

import type { BrowseCollection } from '../api/reference';
import type { SearchFilters } from '../api/types';
import { formatEur, formatKm } from '../format';
import { BodyShape } from './BodyShape';

/**
 * Art commissioned for a collection: the scene a car like this is used in, and
 * the car itself cut out to stand on the join.
 *
 * The files are the app's own, copied into public/ by sync-locales on every
 * build, so the two show the same pictures rather than two sets that drift.
 * `carRatio` travels with the art because a low saloon drawn at an SUV's
 * proportions is a squashed saloon — the numbers are hand-copied from
 * `app/src/hooks/useBrowse.ts` and have to be carried across if they change
 * there, like the design tokens.
 */
const ART: Record<string, { background: string; car: string; carRatio: number }> = {
  family: { background: '/collections/family-bg.jpg', car: '/collections/family-car.png', carRatio: 0.616 },
  first_car: { background: '/collections/first-car-bg.jpg', car: '/collections/first-car.png', carRatio: 0.503 },
  premium: { background: '/collections/premium-bg.jpg', car: '/collections/premium-car.png', carRatio: 0.453 },
  city: { background: '/collections/city-bg.jpg', car: '/collections/city-car.png', carRatio: 0.59 },
};

/** At most four, two to a row, as the card draws them. */
const MAX_CHIPS = 4;

/**
 * A collection's own filters, written out as a buyer would read them.
 *
 * Drawn from the filters the API sent rather than from a second list of words
 * kept beside them, so a collection can never say one thing and search for
 * another. The same rules as the app's `useCollectionChips`.
 */
function useCollectionChips() {
  const { t } = useTranslation(['home', 'listing']);

  return (filters: SearchFilters | undefined): string[] => {
    const on = filters ?? {};
    const chips: string[] = [];

    if (on.yearMin) {
      chips.push(t('home:filter_from_year', { year: on.yearMin }));
    }

    if (on.yearMax) {
      chips.push(t('home:filter_to_year', { year: on.yearMax }));
    }

    if (on.priceMin) {
      chips.push(t('home:filter_from_price', { price: formatEur(on.priceMin) }));
    }

    if (on.priceMax) {
      chips.push(t('home:filter_to_price', { price: formatEur(on.priceMax) }));
    }

    if (on.mileageMax) {
      chips.push(t('home:filter_to_mileage', { mileage: formatKm(on.mileageMax).replace(/\s*km$/i, '') }));
    }

    if (on.transmission) {
      chips.push(t(`home:filter_${on.transmission}`));
    }

    if (on.bodyType?.length) {
      chips.push(...on.bodyType.map((shape) => t(`listing:body_type.${shape}`)));
    }

    if (on.fuel?.length) {
      chips.push(...on.fuel.map((fuel) => t(`listing:fuel.${fuel}`)));
    }

    return chips.slice(0, MAX_CHIPS);
  };
}

/**
 * One way in by need, built as the app builds it: a scene across the top, the
 * car standing on the join between the scene and the card, then the name and
 * what it filters on.
 *
 * A collection with no art shows the newest live car in it instead,
 * photographed by whoever is selling it. The card is the same height either
 * way — without a car standing on it the scene simply takes the space the car
 * would have overlapped — so a row never comes out ragged.
 */
export function CollectionCard({
  collection,
  onOpen,
}: {
  collection: BrowseCollection;
  onOpen: () => void;
}) {
  const { t } = useTranslation(['home', 'search']);
  const chipsFor = useCollectionChips();
  const art = ART[collection.key] ?? null;
  const title = t(`home:collection_${collection.key}`);

  // A chip that only repeats the name above it says nothing.
  const chips = chipsFor(collection.filters).filter((chip) => chip !== title);

  return (
    <button
      type="button"
      className={`coll ${art ? 'coll--art' : ''}`}
      disabled={collection.count === 0}
      onClick={onOpen}
    >
      <span className="coll__scene">
        {art ? (
          <img className="coll__bg" src={art.background} alt="" loading="lazy" />
        ) : collection.photoUrl ? (
          <img className="coll__bg" src={collection.photoUrl} alt="" loading="lazy" />
        ) : (
          <span className="coll__bg coll__bg--none">
            <BodyShape shape="sedan" width={110} />
          </span>
        )}

        {/* The number the card promises, over the picture, so the words below
            are only the name and what it filters on. */}
        <span className="coll__count">{t('search:offers', { count: collection.count })}</span>
      </span>

      {art ? (
        <img
          className="coll__car"
          src={art.car}
          alt=""
          loading="lazy"
          style={{ aspectRatio: `1 / ${art.carRatio}` }}
        />
      ) : null}

      <span className="coll__body">
        <span className="coll__name">{title}</span>

        {/* Held open even when empty, so a collection whose only filter is its
            own name does not make a shorter card than its neighbours. */}
        <span className="coll__chips">
          {chips.map((chip) => (
            <span key={chip} className="coll__chip">
              {chip}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
