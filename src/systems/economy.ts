import { carById } from '../config/cars';
import { starsForScore } from './score';
import type { SaveData } from './save';
import { sanitizeCoins } from './save';
import type { FittingChallenge } from './fitting';
import type { LevelConfig } from './types';

export interface LevelOutcome {
  save: SaveData;
  coinsAwarded: number;
  stars: number;
  unlockedNext: boolean;
}

export function viewMap(save: SaveData): SaveData {
  return save;
}

export function canPlayLevel(save: SaveData, levelNumber: number): boolean {
  return levelNumber >= 1 && levelNumber <= 20 && levelNumber <= save.highestUnlocked;
}

export function recordLevelResult(
  save: SaveData,
  level: LevelConfig,
  outcome: { score: number; won: boolean },
): LevelOutcome {
  if (level.number > save.highestUnlocked || level.number < 1) {
    return { save, coinsAwarded: 0, stars: 0, unlockedNext: false };
  }
  const next: SaveData = structuredClone(save);
  const key = String(level.number);
  const previous = next.levels[key] ?? { bestScore: 0, stars: 0, completed: false, rewardClaimed: false };
  const stars = starsForScore(outcome.score, level.stars, outcome.won);
  previous.bestScore = Math.max(previous.bestScore, sanitizeCoins(outcome.score));
  if (outcome.won) {
    previous.completed = true;
    previous.stars = Math.max(previous.stars, stars);
  }
  let coinsAwarded = 0;
  if (outcome.won && !previous.rewardClaimed) {
    coinsAwarded = sanitizeCoins(level.coinReward);
    next.coins = sanitizeCoins(next.coins + coinsAwarded);
    previous.rewardClaimed = true;
  }
  next.levels[key] = previous;
  let unlockedNext = false;
  if (outcome.won && level.number === next.highestUnlocked && level.number < 20) {
    next.highestUnlocked += 1;
    unlockedNext = true;
  }
  if (outcome.won) next.hasProgress = true;
  next.stickers = collectStickers(next);
  next.achievements = mergeAchievements(next);
  return { save: next, coinsAwarded, stars: outcome.won ? Math.max(stars, previous.stars) : 0, unlockedNext };
}

export interface PurchaseResult {
  save: SaveData;
  ok: boolean;
  reason?: 'funds' | 'owned' | 'missing';
}

export function purchaseCar(save: SaveData, carId: string): PurchaseResult {
  const car = carById(carId);
  if (!car) return { save, ok: false, reason: 'missing' };
  if (save.ownedCars.includes(carId)) return { save, ok: false, reason: 'owned' };
  if (save.coins < car.price) return { save, ok: false, reason: 'funds' };
  const next: SaveData = structuredClone(save);
  next.coins = sanitizeCoins(next.coins - car.price);
  next.ownedCars = [...next.ownedCars, carId];
  next.customization[carId] = {
    paint: car.paints[0]?.id ?? 'berry',
    wheels: car.wheels[0]?.id ?? 'chunky',
  };
  next.hasProgress = true;
  next.achievements = mergeAchievements(next);
  return { save: next, ok: true };
}

export function selectCar(save: SaveData, carId: string): SaveData {
  if (!save.ownedCars.includes(carId)) return save;
  const next: SaveData = structuredClone(save);
  next.selectedCar = carId;
  return next;
}

export function customizeCar(save: SaveData, carId: string, paint: string, wheels: string): SaveData {
  const car = carById(carId);
  if (!car || !save.ownedCars.includes(carId)) return save;
  if (!car.paints.some((item) => item.id === paint)) return save;
  if (!car.wheels.some((item) => item.id === wheels)) return save;
  const next: SaveData = structuredClone(save);
  next.customization[carId] = { paint, wheels };
  return next;
}

export function addCoins(balance: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return sanitizeCoins(balance);
  return sanitizeCoins(balance + amount);
}

export interface FittingReward {
  save: SaveData;
  coinsAwarded: number;
  stickerAwarded: boolean;
}

export function claimFittingReward(save: SaveData, challenge: FittingChallenge): FittingReward {
  const previous = save.fitting[challenge.id];
  if (previous?.rewardClaimed) {
    return { save, coinsAwarded: 0, stickerAwarded: false };
  }
  const next: SaveData = structuredClone(save);
  const coinsAwarded = sanitizeCoins(challenge.rewardCoins);
  next.coins = sanitizeCoins(next.coins + coinsAwarded);
  next.fitting[challenge.id] = { completed: true, rewardClaimed: true };
  const stickerAwarded = !next.stickers.includes(challenge.sticker);
  if (stickerAwarded) next.stickers = [...next.stickers, challenge.sticker];
  next.hasProgress = true;
  next.stickers = collectStickers(next);
  next.achievements = mergeAchievements(next);
  return { save: next, coinsAwarded, stickerAwarded };
}

export function noteMilestones(save: SaveData, madeSpecial: boolean, usedSpecial: boolean): SaveData {
  if (!madeSpecial && !usedSpecial) return save;
  const next: SaveData = structuredClone(save);
  next.milestones.madeSpecial = next.milestones.madeSpecial || madeSpecial;
  next.milestones.usedSpecial = next.milestones.usedSpecial || usedSpecial;
  next.achievements = mergeAchievements(next);
  return next;
}

export function mergeAchievements(save: SaveData): string[] {
  const earned = new Set(save.achievements);
  if (Object.values(save.levels).some((level) => level.completed)) earned.add('first-win');
  if (Object.values(save.levels).some((level) => level.stars >= 3)) earned.add('star-trio');
  if (save.levels['6']?.completed) earned.add('meadow-done');
  if (save.levels['13']?.completed) earned.add('bay-done');
  if (save.levels['20']?.completed) earned.add('mountain-done');
  if (save.stickers.length > 0) earned.add('collector');
  if (save.ownedCars.length >= 3) earned.add('garage-owner');
  if (Object.values(save.fitting).some((entry) => entry.completed)) earned.add('fitter');
  if (save.milestones.madeSpecial) earned.add('special-maker');
  if (save.milestones.usedSpecial) earned.add('combo-kid');
  return [...earned];
}

export function regionUnlocked(save: SaveData, startLevel: number): boolean {
  return save.highestUnlocked >= startLevel;
}

export function collectStickers(save: SaveData): string[] {
  const stickers = new Set(save.stickers);
  const grant = (from: number, to: number, id: string) => {
    for (let number = from; number <= to; number += 1) {
      if ((save.levels[String(number)]?.stars ?? 0) >= 3) stickers.add(id);
    }
  };
  grant(1, 6, 'sticker-meadow-star');
  grant(7, 13, 'sticker-bay-star');
  grant(14, 20, 'sticker-mountain-star');
  if (save.levels['20']?.completed) stickers.add('sticker-finale');
  return [...stickers];
}
