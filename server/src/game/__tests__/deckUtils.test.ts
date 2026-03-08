import { buildDeck, buildShuffledDeck, mulberry32, hashStr } from '../deckUtils';

describe('buildDeck', () => {
  it('produces exactly 52 cards', () => {
    expect(buildDeck()).toHaveLength(52);
  });

  it('has 13 cards per suit', () => {
    const deck = buildDeck();
    const suits = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
    for (const suit of suits) {
      expect(deck.filter(c => c.suit === suit)).toHaveLength(13);
    }
  });

  it('has 4 cards per rank', () => {
    const deck = buildDeck();
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
    for (const rank of ranks) {
      expect(deck.filter(c => c.rank === rank)).toHaveLength(4);
    }
  });

  it('gives every card a unique id', () => {
    const deck = buildDeck();
    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(52);
  });
});

describe('buildShuffledDeck', () => {
  it('still has 52 cards', () => {
    expect(buildShuffledDeck('TESTGAME', 1)).toHaveLength(52);
  });

  it('is deterministic — same seed → same order', () => {
    const d1 = buildShuffledDeck('GAME01', 3);
    const d2 = buildShuffledDeck('GAME01', 3);
    expect(d1.map(c => c.id)).toEqual(d2.map(c => c.id));
  });

  it('different rounds produce different orders', () => {
    const d1 = buildShuffledDeck('GAME01', 1).map(c => c.id).join(',');
    const d2 = buildShuffledDeck('GAME01', 2).map(c => c.id).join(',');
    expect(d1).not.toBe(d2);
  });

  it('different gameIds produce different orders', () => {
    const d1 = buildShuffledDeck('AAAA', 1).map(c => c.id).join(',');
    const d2 = buildShuffledDeck('BBBB', 1).map(c => c.id).join(',');
    expect(d1).not.toBe(d2);
  });
});

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashStr', () => {
  it('is deterministic', () => {
    expect(hashStr('hello')).toBe(hashStr('hello'));
  });

  it('returns a non-negative number', () => {
    expect(hashStr('test')).toBeGreaterThanOrEqual(0);
  });
});
