import { Card, Suit, Rank } from '@louie/shared';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// ─────────────────────────────────────────────
//  Deck building
// ─────────────────────────────────────────────

/** Build an unshuffled standard 52-card deck. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}_of_${suit}` });
    }
  }
  return deck;
}

// ─────────────────────────────────────────────
//  Seeded RNG (Mulberry32)
// ─────────────────────────────────────────────

/**
 * Returns a deterministic PRNG seeded with the given value.
 * Mulberry32 — fast, high quality, 32-bit output.
 */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to an unsigned 32-bit integer. */
export function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned
}

// ─────────────────────────────────────────────
//  Shuffle
// ─────────────────────────────────────────────

/** Fisher-Yates shuffle using the provided RNG. Mutates and returns the array. */
export function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a freshly shuffled 52-card deck.
 * The shuffle is deterministic: same gameId + roundNumber always produces the same deck.
 */
export function buildShuffledDeck(gameId: string, roundNumber: number): Card[] {
  const seed = hashStr(`${gameId}::round::${roundNumber}`);
  const rng = mulberry32(seed);
  return shuffleInPlace(buildDeck(), rng);
}
