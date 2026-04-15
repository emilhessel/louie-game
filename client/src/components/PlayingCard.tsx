'use client';

import { Card, Suit } from '@louie/shared';
import { SUIT_SYMBOL, SUIT_COLOR } from '@/lib/cardUtils';

// ─────────────────────────────────────────────
//  Size presets
// ─────────────────────────────────────────────

type CardSize = 'sm' | 'md' | 'lg';

const DIMS: Record<CardSize, { w: number; h: number; rankFs: string; suitFs: string; centerFs: string }> = {
  sm:  { w: 38,  h: 54,  rankFs: '0.65rem', suitFs: '0.55rem', centerFs: '1.1rem'  },
  md:  { w: 54,  h: 78,  rankFs: '0.8rem',  suitFs: '0.65rem', centerFs: '1.6rem'  },
  lg:  { w: 72,  h: 104, rankFs: '1rem',    suitFs: '0.8rem',  centerFs: '2.2rem'  },
};

// ─────────────────────────────────────────────
//  Face-up card
// ─────────────────────────────────────────────

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  /** When true, the card is dimmed and non-interactive */
  disabled?: boolean;
  onClick?: () => void;
}

export function PlayingCard({ card, size = 'md', selected, disabled, onClick }: PlayingCardProps) {
  const { w, h, rankFs, suitFs, centerFs } = DIMS[size];
  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  const clickable = !!onClick && !disabled;

  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        width: w,
        height: h,
        background: disabled ? '#e8e8e0' : '#fefef9',
        borderRadius: 7,
        border: selected
          ? '2px solid #c9a84c'
          : '1px solid #d1d5db',
        boxShadow: selected
          ? '0 4px 16px rgba(201,168,76,0.45), 0 2px 6px rgba(0,0,0,0.2)'
          : '0 2px 6px rgba(0,0,0,0.28)',
        cursor: clickable ? 'pointer' : 'default',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
        transform: selected ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Top-left corner */}
      <div style={{
        position: 'absolute', top: 3, left: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        lineHeight: 1.1, color,
      }}>
        <span style={{ fontSize: rankFs, fontWeight: 700, fontFamily: 'var(--font-inter)' }}>{card.rank}</span>
        <span style={{ fontSize: suitFs }}>{symbol}</span>
      </div>

      {/* Center suit symbol */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: centerFs,
      }}>
        {symbol}
      </div>

      {/* Bottom-right corner (rotated 180°) */}
      <div style={{
        position: 'absolute', bottom: 3, right: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        lineHeight: 1.1, color, transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize: rankFs, fontWeight: 700, fontFamily: 'var(--font-inter)' }}>{card.rank}</span>
        <span style={{ fontSize: suitFs }}>{symbol}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Face-down card
// ─────────────────────────────────────────────

interface FaceDownCardProps {
  size?: CardSize;
  /** Optional count label shown below the pattern */
  count?: number;
}

export function FaceDownCard({ size = 'md', count }: FaceDownCardProps) {
  const { w, h } = DIMS[size];

  return (
    <div style={{
      width: w,
      height: h,
      background: 'linear-gradient(145deg, #1e3254 0%, #0d1a2e 100%)',
      borderRadius: 7,
      border: '1px solid rgba(100,149,237,0.22)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* Hatched inner border pattern */}
      <div style={{
        width: '74%', height: '74%',
        border: '1px solid rgba(100,149,237,0.3)',
        borderRadius: 4,
        background: 'repeating-linear-gradient(45deg, rgba(100,149,237,0.06), rgba(100,149,237,0.06) 3px, transparent 3px, transparent 8px)',
      }} />
      {count !== undefined && (
        <span style={{ color: '#90cdf4', fontSize: '0.65rem', fontWeight: 600, marginTop: 3 }}>
          {count}
        </span>
      )}
    </div>
  );
}
