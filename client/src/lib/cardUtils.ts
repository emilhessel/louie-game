import { Card, Suit, Rank } from '@louie/shared';

// ─────────────────────────────────────────────
//  Display helpers
// ─────────────────────────────────────────────

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades:   '♠',
  hearts:   '♥',
  clubs:    '♣',
  diamonds: '♦',
};

export const SUIT_COLOR: Record<Suit, string> = {
  spades:   '#1a1a1a',
  clubs:    '#1a1a1a',
  hearts:   '#dc2626',
  diamonds: '#dc2626',
};

// ─────────────────────────────────────────────
//  Hand sorting
// ─────────────────────────────────────────────

/**
 * Suit order (spec): spades → hearts → clubs → diamonds
 */
const SUIT_ORDER: Record<Suit, number> = {
  spades: 0, hearts: 1, clubs: 2, diamonds: 3,
};

/**
 * Rank order: Ace high (0 = highest → 12 = lowest)
 */
const RANK_ORDER: Record<Rank, number> = {
  A: 0, K: 1, Q: 2, J: 3, '10': 4,
  '9': 5, '8': 6, '7': 7, '6': 8,
  '5': 9, '4': 10, '3': 11, '2': 12,
};

/**
 * Sort a hand by suit group (S → H → C → D), then by rank descending (A → 2).
 * Returns a new array; does not mutate the original.
 */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  });
}
