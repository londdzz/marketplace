/**
 * The Autevo mark: a leaning A with three motion wedges running into it.
 *
 * The same flattened paths the app draws, copied from app/src/components/
 * Wordmark.tsx. The letter already carries its nine degrees, so nothing here
 * rotates it, and the wedges' uneven lengths come from the letterform — they
 * are never evened up and a fourth is never added.
 */
const VIEW_BOX = '-6 -8 132 110';
const ASPECT = 1.2;

const WEDGES = [
  'M10.0 36 H51.3 L43.1 50 H7.8 Z',
  'M6.5 58 H53.4 L43.9 74 H4.0 Z',
  'M3.1 80 H25.4 L18.3 92 H1.2 Z',
];

const LETTER =
  'M74.05 6 L92.05 6 L116.11 94 L93.11 94 L88.28 74 ' +
  'L56.28 74 L45.11 94 L22.11 94 Z ' +
  'M79.25 30 L65.81 58 L83.81 58 Z';

export function Mark({ size = 22 }: { size?: number }) {
  // The wedges thin out as it shrinks, as they do in the app: all three at 32
  // and above, two from 20, the letter alone below that.
  const wedges = size >= 32 ? 3 : size >= 20 ? 2 : 0;

  return (
    <svg width={size * ASPECT} height={size} viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      {WEDGES.slice(0, wedges).map((d) => (
        <path key={d} d={d} fill="var(--accent)" />
      ))}
      <path d={LETTER} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" aria-label="Autevo">
      <Mark size={size} />
      <span className="wordmark__text">AUTEVO</span>
    </span>
  );
}
