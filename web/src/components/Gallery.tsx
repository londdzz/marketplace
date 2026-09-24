import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ListingPhoto } from '../api/types';

/**
 * A car's photographs, with a full-size viewer.
 *
 * Big picture with thumbnails beneath, which is what a desktop's width is
 * for — on a phone the same photographs are a swipeable carousel. Opening one
 * draws it `contain` on black, because the reason to open a photograph is the
 * part the card cropped off.
 *
 * Arrow keys move between shots and Escape closes, since a desktop visitor
 * has a keyboard and expects it to work.
 */
export function Gallery({ photos }: { photos: ListingPhoto[] }) {
  const { t } = useTranslation(['listing', 'common']);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const current = photos[index];

  const step = useCallback(
    (by: number) => setIndex((at) => (at + by + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }

      if (event.key === 'ArrowRight') {
        step(1);
      }

      if (event.key === 'ArrowLeft') {
        step(-1);
      }
    };

    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while a photograph is over it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, step]);

  if (photos.length === 0) {
    return <div className="gallery__empty" aria-hidden="true" />;
  }

  return (
    <div className="gallery">
      <button
        type="button"
        className="gallery__main"
        onClick={() => setOpen(true)}
        aria-label={t('listing:view_photo')}
      >
        <img src={current.url} alt="" />
        {photos.length > 1 ? (
          <span className="gallery__count">
            {index + 1} / {photos.length}
          </span>
        ) : null}
      </button>

      {photos.length > 1 ? (
        <div className="gallery__strip">
          {photos.map((photo, at) => (
            <button
              key={photo.id}
              type="button"
              className={`gallery__thumb ${at === index ? 'is-on' : ''}`}
              onClick={() => setIndex(at)}
              aria-label={`${at + 1} / ${photos.length}`}
              aria-current={at === index}
            >
              <img src={photo.thumb_url ?? photo.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <img className="lightbox__img" src={current.url} alt="" onClick={(e) => e.stopPropagation()} />

          <button type="button" className="lightbox__close" onClick={() => setOpen(false)} aria-label={t('common:close')}>
            ✕
          </button>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="lightbox__nav lightbox__nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="←"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox__nav lightbox__nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="→"
              >
                ›
              </button>
              <span className="lightbox__count">
                {index + 1} / {photos.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
