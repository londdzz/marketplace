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
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  to?: string;
}) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
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
