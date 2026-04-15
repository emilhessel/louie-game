'use client';

import { Suit } from '@louie/shared';

interface SuitIconProps {
  suit: Suit;
  /** Width/height as a CSS string (e.g. '1em', '16px') or pixel number. Default '1em'. */
  size?: string | number;
  className?: string;
}

/**
 * Inline SVG suit icon with shapes that are visually distinct from each other.
 * Uses fill="currentColor" so it inherits the parent's CSS color.
 */
export function SuitIcon({ suit, size = '1em', className }: SuitIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {suit === 'hearts' && (
        /* Two bumps on top, pointed at the bottom */
        <path d="M12 21.6C6.4 16.1 1 11.4 1 7.2a5.2 5.2 0 0 1 11-1.5 5.2 5.2 0 0 1 11 1.5c0 4.2-5.4 8.9-11 14.4z" />
      )}
      {suit === 'diamonds' && (
        /* Classic rhombus — four sharp points */
        <polygon points="12,2 22,12 12,22 2,12" />
      )}
      {suit === 'spades' && (
        /* Pointed top, wide sweep, two rounded base lobes, short stem */
        <path d="M12 2C4 8 1.5 11 1.5 14.5a5 5 0 0 0 9 3L9 21h6l-1.5-3.5a5 5 0 0 0 9-3C22.5 11 20 8 12 2z" />
      )}
      {suit === 'clubs' && (
        /* Three distinct circles (trefoil) + stem — unmistakably different from spade */
        <>
          <circle cx="12" cy="8"  r="4" />
          <circle cx="7"  cy="14" r="4" />
          <circle cx="17" cy="14" r="4" />
          <rect x="10.5" y="15.5" width="3" height="6" rx="1" />
        </>
      )}
    </svg>
  );
}
