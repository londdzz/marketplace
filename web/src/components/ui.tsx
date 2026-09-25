import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

/**
 * The base components, carrying the app's rules onto a desktop.
 *
 * One button language: only the primary is filled, and a secondary action
 * takes a soft neutral fill rather than a second outline shouting equally.
 * Only one thing on a view is azure, because azure means clickable and the
 * moment something azure is not, the colour stops meaning anything.
 */

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Chip({
  label,
  selected,
  onClick,
  title,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  if (!onClick) {
    return (
      <span className="chip" title={title}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`chip chip--button ${selected ? 'chip--on' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="field">
      {label ? <span className="field__label">{label}</span> : null}
      {children}
      {/* The API's own message, on the field that caused it. The site never
          invents an error the server did not give. */}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />;
}

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`input select ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'top' }) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}

/** Loading, empty and failed — every view that fetches has all three. */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="state__spinner" aria-hidden="true" />
      {label ? <span className="muted">{label}</span> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  to,
  heading,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  to?: string;
  /**
   * True where this panel *is* the page — a shortlist nobody has signed in to
   * see, a page that does not exist. Then its title is the page's heading, and
   * a page with no heading is one a screen reader and a search engine both
   * have to guess at. Inside a page that already has one, leave it off.
   */
  heading?: boolean;
}) {
  const Title = heading ? 'h1' : 'p';

  return (
    <div className="state">
      <Title className="state__title">{title}</Title>
      {description ? <p className="muted state__body">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      {actionLabel && to ? (
        <Link to={to}>
          <Button variant="secondary">{actionLabel}</Button>
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, actionLabel, onRetry }: { title: string; actionLabel: string; onRetry: () => void }) {
  return <EmptyState title={title} actionLabel={actionLabel} onAction={onRetry} />;
}

/**
 * A question the page has to stop for.
 *
 * Reporting an advert and blocking someone both deserve a deliberate second
 * press, and both are rare enough that a panel is the honest shape: a page
 * that grew a report form permanently would be a page mostly about reporting.
 *
 * It is the one thing on the site that sits above the page — the sheet
 * elevation the app keeps for exactly this — and it closes on Escape and on
 * the backdrop, because a dialogue you cannot dismiss without answering is a
 * dialogue people learn to dread.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKey);
    // Whatever was focused is behind the backdrop now and cannot be reached,
    // so focus moves in with the dialogue rather than staying out there.
    panel.current?.focus();

    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">{title}</h2>
        {description ? <p className="muted dialog__body">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
