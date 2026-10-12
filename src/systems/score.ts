export const POINTS_PER_CANDY = 50;
export const SPECIAL_CREATE_BONUS = 150;

/** `waveIndex` starts at 1. Each candy is scored by the caller exactly once per wave. */
export function waveScore(candyCount: number, waveIndex: number, specialsCreated: number): number {
  const multiplier = Math.max(1, waveIndex);
  return candyCount * POINTS_PER_CANDY * multiplier + specialsCreated * SPECIAL_CREATE_BONUS;
}

/**
 * Winning always grants at least one star.
 * Higher thresholds add the second and third stars.
 */
export function starsForScore(score: number, thresholds: [number, number, number], won: boolean): number {
  if (!won) return 0;
  let stars = 1;
  if (score >= thresholds[1]) stars = 2;
  if (score >= thresholds[2]) stars = 3;
  if (score >= thresholds[0] && stars < 1) stars = 1;
  return stars;
}
