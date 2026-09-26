import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SponsorRow } from '../api/types';

/**
 * A sponsor's artwork, and where tapping it goes.
 *
 * Outside the site deliberately — `rel="noopener noreferrer sponsored"`. The
 * last of those is the one search engines read: a paid link that does not say
 * it is paid is what gets a site penalised, and this is a marketplace that
 * lives on search traffic.
 *
 * A booking with no link is not a link at all. It renders as a plain image
 * rather than an anchor with nowhere to go.
 */
function Artwork({
  sponsor,
  className,
  style,
}: {
  sponsor: SponsorRow;
  className: string;
  style?: CSSProperties;
}) {
  const image = <img src={sponsor.image_url} alt={sponsor.alt} loading="lazy" />;

  if (!sponsor.link_url) {
    return (
      <div className={className} style={style}>
        {image}
      </div>
    );
  }

  return (
    <a
      className={className}
      style={style}
      href={sponsor.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
    >
      {image}
    </a>
  );
}

/** The wide card, when a sponsor has it rather than the sell explainer. */
export function SponsorBanner({ sponsor }: { sponsor: SponsorRow }) {
  const { t } = useTranslation(['home']);

  return (
    <div className="sponsor-banner">
      <Artwork sponsor={sponsor} className="sponsor-banner__art" />
      <span className="sponsor-banner__tag">{t('home:sponsored')}</span>
    </div>
  );
}

/** Long enough to read one, short enough that a second is seen. */
const DWELL_MS = 5000;

/**
 * The carousel, under the first cars.
 *
 * Scroll-snap does the swiping, so a trackpad, a touchscreen and the scroll
 * bar all behave the same and none of it is animated by hand. The dots are a
 * readout of where the rail is, not a control: on a desktop the rail is
 * dragged or scrolled, and a row of tiny targets is a worse way to move it.
 *
 * It advances on its own and stops for good once touched, like the app's.
 */
export function SponsorCarousel({ sponsors }: { sponsors: SponsorRow[] }) {
  const { t } = useTranslation(['home']);
  const rail = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [steering, setSteering] = useState(false);
  const many = sponsors.length > 1;

  useEffect(() => {
    if (!many || steering) {
      return;
    }

    const timer = setTimeout(() => {
      const next = (at + 1) % sponsors.length;
      const card = rail.current?.children[next] as HTMLElement | undefined;

      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setAt(next);
    }, DWELL_MS);

    return () => clearTimeout(timer);
  }, [at, many, sponsors.length, steering]);

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className="home__section">
      {/*
        Said once above the rail. Both stores and every advertising standard
        want an advertisement marked as one, and a label on the section is
        what a person actually reads — a badge in the corner of artwork
        somebody else designed competes with the artwork.
      */}
      <p className="sponsor-label">{t('home:sponsored')}</p>

      <div
        className="sponsor-rail"
        ref={rail}
        onPointerDown={() => setSteering(true)}
        onScroll={(event) => {
          const el = event.currentTarget;
          const first = el.children[0] as HTMLElement | undefined;

          if (first) {
            setAt(Math.round(el.scrollLeft / (first.offsetWidth + 12)));
          }
        }}
      >
        {sponsors.map((sponsor) => (
          <Artwork key={sponsor.id} sponsor={sponsor} className="sponsor-card" />
        ))}
      </div>

      {many ? (
        <div className="sponsor-dots" aria-hidden="true">
          {sponsors.map((sponsor, index) => (
            <span key={sponsor.id} className={index === at ? 'sponsor-dot sponsor-dot--on' : 'sponsor-dot'} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The row of marks at the foot.
 *
 * **No box around each one**, and **one height for all of them.** A logo
 * inside a bordered tile reads as a picture that failed to load, and marks
 * given an equal width each come out at wildly different sizes — a short one
 * scales up to fill its share and dwarfs the long one beside it. So the
 * height is fixed and each takes the width its own proportions ask for,
 * shrinking rather than overflowing when the row cannot spare it.
 */
export function PartnerStrip({ partners }: { partners: SponsorRow[] }) {
  const { t } = useTranslation(['home']);

  if (partners.length === 0) {
    return null;
  }

  return (
    <section className="home__section partners">
      <p className="sponsor-label partners__label">{t('home:partners')}</p>
      <div className="partners__row">
        {partners.map((partner) => (
          <Artwork
            key={partner.id}
            sponsor={partner}
            className="partners__one"
            // The width its proportions want, given up when the row is full.
            style={
              partner.width && partner.height
                ? { flexBasis: `${(partner.width / partner.height) * 30}px` }
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
