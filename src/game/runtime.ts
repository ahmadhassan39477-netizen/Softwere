export interface LastResult {
  levelNumber: number;
  score: number;
  stars: number;
  won: boolean;
  coinsAwarded: number;
  bestScore: number;
}

export const runtime = {
  levelNumber: 1,
  lastResult: null as LastResult | null,
  returnScene: 'Welcome',
};
