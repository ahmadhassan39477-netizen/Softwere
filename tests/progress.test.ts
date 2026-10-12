import { describe, expect, it } from 'vitest';
import { FITTING_CHALLENGES } from '../src/config/fittingChallenges';
import { LEVELS } from '../src/config/levels';
import { CARS } from '../src/config/cars';
import { mulberry32 } from '../src/utils/rng';
import {
  addCoins,
  canPlayLevel,
  claimFittingReward,
  purchaseCar,
  recordLevelResult,
  viewMap,
} from '../src/systems/economy';
import { evaluatePlacement, isFittingComplete } from '../src/systems/fitting';
import { hasAnyMatch } from '../src/systems/match';
import { createSession, trySwap } from '../src/systems/session';
import { firstLegalMove, hasLegalMove } from '../src/systems/swap';
import { defaultSave, loadSave, memoryStore, normalizeSave, SAVE_KEY, writeSave } from '../src/systems/save';
import { reshuffleUntilPlayable } from '../src/systems/setupBoard';

describe('levels', () => {
  it('ships 20 data-driven levels with playable seeded boards', () => {
    expect(LEVELS).toHaveLength(20);
    const numbers = LEVELS.map((level) => level.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(new Set(numbers).size).toBe(20);
    for (const level of LEVELS) {
      expect(level.moves).toBeGreaterThanOrEqual(20);
      expect(level.objectives.length).toBeGreaterThan(0);
      expect(level.stars[0]).toBeLessThan(level.stars[1]);
      expect(level.stars[1]).toBeLessThan(level.stars[2]);
      expect(level.coinReward).toBeGreaterThan(0);
      expect(level.strategy.length).toBeGreaterThan(10);
      expect(level.difficulty).toBeGreaterThan(0);
      const board = reshuffleUntilPlayable(level, mulberry32(level.seed));
      expect(board.rows).toBe(8);
      expect(board.cols).toBe(8);
      expect(hasAnyMatch(board)).toBe(false);
      expect(hasLegalMove(board)).toBe(true);
      const again = reshuffleUntilPlayable(level, mulberry32(level.seed));
      expect(again.cells.map((row) => row.map((cell) => cell.candy?.kind))).toEqual(
        board.cells.map((row) => row.map((cell) => cell.candy?.kind)),
      );
    }
    expect(LEVELS.filter((level) => level.region === 'meadow').map((level) => level.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(LEVELS[6]?.region).toBe('bay');
    expect(LEVELS[13]?.region).toBe('mountain');
  });

  it('can win level 1 by taking legal swaps', () => {
    const session = createSession(LEVELS[0]!);
    let guard = 0;
    while (session.status === 'playing' && guard < 40) {
      const move = firstLegalMove(session.board);
      expect(move).not.toBeNull();
      trySwap(session, move!.from, move!.to);
      guard += 1;
    }
    expect(session.status).toBe('won');
  });
});

describe('currency, unlocks, and fitting', () => {
  it('keeps coins non-negative and refuses a purchase without enough coins', () => {
    expect(addCoins(5, -3)).toBe(5);
    expect(addCoins(5, 2.9)).toBe(7);
    const save = defaultSave();
    save.coins = 10;
    const mint = CARS.find((car) => car.id === 'mint-mini')!;
    expect(mint.price).toBeGreaterThan(10);
    const denied = purchaseCar(save, mint.id);
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe('funds');
    expect(denied.save.coins).toBe(10);
    expect(denied.save.ownedCars).not.toContain(mint.id);

    const rich = defaultSave();
    rich.coins = mint.price;
    const bought = purchaseCar(rich, mint.id);
    expect(bought.ok).toBe(true);
    expect(bought.save.coins).toBe(0);
    expect(bought.save.ownedCars).toContain(mint.id);
  });

  it('unlocks the next level only after a win and pays the first-completion reward once', () => {
    const start = defaultSave();
    expect(viewMap(start)).toBe(start);
    expect(start.highestUnlocked).toBe(1);
    expect(canPlayLevel(start, 2)).toBe(false);

    const skipped = recordLevelResult(start, LEVELS[4]!, { score: 99999, won: true });
    expect(skipped.save.highestUnlocked).toBe(1);
    expect(skipped.coinsAwarded).toBe(0);

    const failed = recordLevelResult(start, LEVELS[0]!, { score: 120, won: false });
    expect(failed.save.highestUnlocked).toBe(1);
    expect(failed.coinsAwarded).toBe(0);
    expect(failed.save.levels['1']?.completed).not.toBe(true);
    expect(failed.save.levels['1']?.bestScore).toBe(120);

    const first = recordLevelResult(start, LEVELS[0]!, { score: 1000, won: true });
    expect(first.coinsAwarded).toBe(LEVELS[0]!.coinReward);
    expect(first.save.coins).toBe(LEVELS[0]!.coinReward);
    expect(first.save.highestUnlocked).toBe(2);
    expect(canPlayLevel(first.save, 2)).toBe(true);
    expect(first.stars).toBeGreaterThanOrEqual(1);

    const replay = recordLevelResult(first.save, LEVELS[0]!, { score: 1800, won: true });
    expect(replay.coinsAwarded).toBe(0);
    expect(replay.save.coins).toBe(first.save.coins);
    expect(replay.save.highestUnlocked).toBe(2);
    expect(replay.save.levels['1']?.bestScore).toBe(1800);
  });

  it('validates fitting placements and grants the reward once', () => {
    const challenge = FITTING_CHALLENGES[0]!;
    expect(evaluatePlacement(challenge, 'wheels', 'wheels-strawberry')).toBe('snap');
    expect(evaluatePlacement(challenge, 'wheels', 'wheels-mint')).toBe('return');
    expect(evaluatePlacement(challenge, 'missing', 'wheels-strawberry')).toBe('unknown');
    expect(isFittingComplete(challenge, {})).toBe(false);
    expect(isFittingComplete(challenge, { wheels: 'wheels-strawberry' })).toBe(true);
    expect(FITTING_CHALLENGES).toHaveLength(5);
    expect(FITTING_CHALLENGES[4]!.slots).toHaveLength(3);

    const first = claimFittingReward(defaultSave(), challenge);
    expect(first.coinsAwarded).toBe(challenge.rewardCoins);
    expect(first.stickerAwarded).toBe(true);
    const second = claimFittingReward(first.save, challenge);
    expect(second.coinsAwarded).toBe(0);
    expect(second.stickerAwarded).toBe(false);
    expect(second.save.coins).toBe(first.save.coins);
    expect(second.save.stickers).toEqual([challenge.sticker]);
  });
});

describe('saves', () => {
  it('recovers from malformed data, migrates partial saves, and clamps coins', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, '{');
    const broken = loadSave(store);
    expect(broken.coins).toBe(0);
    expect(broken.highestUnlocked).toBe(1);
    expect(broken.ownedCars).toContain('strawberry-racer');

    const migrated = normalizeSave({ coins: -12, highestUnlocked: 4, ownedCars: ['nope', 'mint-mini'], version: 0 });
    expect(migrated.version).toBe(1);
    expect(migrated.coins).toBe(0);
    expect(migrated.highestUnlocked).toBe(4);
    expect(migrated.ownedCars).toContain('strawberry-racer');
    expect(migrated.ownedCars).toContain('mint-mini');
    expect(migrated.ownedCars).not.toContain('nope');
    expect(migrated.settings.music).toBeGreaterThan(0);

    const stored = writeSave(memoryStore(), migrated);
    expect(stored.coins).toBe(0);
    expect(normalizeSave({ version: 99, coins: 40.8 }).coins).toBe(40);
  });
});
