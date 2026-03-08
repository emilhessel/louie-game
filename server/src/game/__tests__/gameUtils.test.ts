import { HAND_SIZES } from '@louie/shared';

describe('HAND_SIZES', () => {
  it('has exactly 17 rounds', () => {
    expect(HAND_SIZES).toHaveLength(17);
  });

  it('is symmetric (rounds mirror each other)', () => {
    for (let i = 0; i < 8; i++) {
      expect(HAND_SIZES[i]).toBe(HAND_SIZES[16 - i]);
    }
  });

  it('peaks at 9 cards for rounds 1 and 17', () => {
    expect(HAND_SIZES[0]).toBe(9);
    expect(HAND_SIZES[16]).toBe(9);
  });

  it('has a 1-card round in the middle (round 9)', () => {
    expect(HAND_SIZES[8]).toBe(1);
  });
});

describe('Scoring logic', () => {
  function calcRoundScore(bid: number, tricksWon: number): number {
    const base = tricksWon; // +1 per trick
    const bonus = tricksWon === bid ? 10 : 0;
    return base + bonus;
  }

  it('gives 10 bonus when bid matches tricks', () => {
    expect(calcRoundScore(3, 3)).toBe(13); // 3 tricks + 10 bonus
    expect(calcRoundScore(0, 0)).toBe(10); // 0 tricks + 10 bonus
  });

  it('gives no bonus when bid does not match', () => {
    expect(calcRoundScore(3, 2)).toBe(2); // just tricks
    expect(calcRoundScore(0, 1)).toBe(1);
  });

  it('scores zero tricks correctly', () => {
    expect(calcRoundScore(1, 0)).toBe(0);
    expect(calcRoundScore(2, 0)).toBe(0);
  });
});
