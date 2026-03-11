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
 * Rank order: Ace high (0 = highest → 12 = lowest)
 */
const RANK_ORDER: Record<Rank, number> = {
  A: 0, K: 1, Q: 2, J: 3, '10': 4,
  '9': 5, '8': 6, '7': 7, '6': 8,
  '5': 9, '4': 10, '3': 11, '2': 12,
};

/** Default suit order */
export const DEFAULT_SUIT_ORDER: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];

/** Player-configurable sort preferences */
export interface SortPrefs {
  suitOrder: Suit[];
  rankDirection: 'high-to-low' | 'low-to-high';
}

export const DEFAULT_SORT_PREFS: SortPrefs = {
  suitOrder: DEFAULT_SUIT_ORDER,
  rankDirection: 'high-to-low',
};

/**
 * Sort a hand by suit group, then by rank.
 * Uses SortPrefs if provided, otherwise uses defaults.
 * Returns a new array; does not mutate the original.
 */
export function sortHand(hand: Card[], prefs?: SortPrefs): Card[] {
  const suitOrder = prefs?.suitOrder ?? DEFAULT_SUIT_ORDER;
  const rankDesc = !prefs || prefs.rankDirection === 'high-to-low';

  const suitIndexMap = Object.fromEntries(suitOrder.map((s, i) => [s, i])) as Record<Suit, number>;

  return [...hand].sort((a, b) => {
    const suitDiff = suitIndexMap[a.suit] - suitIndexMap[b.suit];
    if (suitDiff !== 0) return suitDiff;
    const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    return rankDesc ? rankDiff : -rankDiff;
  });
}
