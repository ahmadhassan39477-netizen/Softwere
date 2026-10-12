export const NORMAL_KINDS = ['strawberry', 'lemon', 'mint', 'grape', 'blueberry', 'peach'] as const;

export type NormalKind = (typeof NORMAL_KINDS)[number];
export type CandyKind = NormalKind | 'rainbow' | 'star';
export type Special = 'none' | 'stripedH' | 'stripedV' | 'wrapped';

export interface Candy {
  id: number;
  kind: CandyKind;
  special: Special;
}

export interface Cell {
  candy: Candy | null;
  jelly: number;
  wheel: boolean;
  blocker: boolean;
  trapped: boolean;
}

export interface Board {
  rows: number;
  cols: number;
  nextId: number;
  cells: Cell[][];
}

export interface Pos {
  r: number;
  c: number;
}

export type ObjectiveType =
  | 'score'
  | 'collect'
  | 'jelly'
  | 'wheels'
  | 'obstacles'
  | 'stars'
  | 'rescue'
  | 'specials';

export interface ObjectiveDef {
  type: ObjectiveType;
  /** Required for collect objectives. */
  candy?: NormalKind;
  /** Target count for every non-score objective. */
  count?: number;
  /** Score target. */
  target?: number;
}

export interface ObjectiveProgress {
  def: ObjectiveDef;
  current: number;
}

export interface ClearEffects {
  collected: Partial<Record<CandyKind, number>>;
  jelly: number;
  wheels: number;
  obstacles: number;
  stars: number;
  rescues: number;
  specialsCreated: number;
}

export interface RemovedCandy {
  id: number;
  r: number;
  c: number;
  kind: CandyKind | 'blocker';
  special: Special;
}

export interface SpawnedCandy {
  id: number;
  r: number;
  c: number;
  kind: CandyKind;
  special: Special;
}

export interface Underlay {
  r: number;
  c: number;
  jelly: number;
  wheel: boolean;
  trapped: boolean;
  blocker: boolean;
}

export type ScriptStep =
  | {
      type: 'wave';
      removed: RemovedCandy[];
      spawned: SpawnedCandy[];
      underlays: Underlay[];
      scoreGained: number;
      specialsCreated: number;
    }
  | { type: 'gravity'; moves: { id: number; toR: number; toC: number }[] }
  | { type: 'refill'; candies: SpawnedCandy[] }
  | { type: 'stars'; ids: number[] }
  | { type: 'reshuffle'; candies: SpawnedCandy[] };

export interface ResolveResult {
  score: number;
  effects: ClearEffects;
  script: ScriptStep[];
}

export type ComboKind = 'striped-striped' | 'wrapped-wrapped' | 'striped-wrapped';

/** What a swap should do once the candies have exchanged places. */
export interface SwapPlan {
  allowMatch: boolean;
  forced: Pos[];
  focus: Pos[];
  clearAll: boolean;
  /** Convert every candy of this kind into a special before the first wave. `none` means clear only. */
  transform?: { kind: NormalKind; special: Special };
  combo?: ComboKind;
  /** Positions of swapped candies that should detonate if they are not part of a color match. */
  loneSpecials: Pos[];
}

export type RegionId = 'meadow' | 'bay' | 'mountain';

export interface LevelBoardSetup {
  jelly: Pos[];
  wheels: Pos[];
  obstacles: Pos[];
  trapped: Pos[];
  stars: Pos[];
}

export interface LevelConfig {
  id: string;
  number: number;
  region: RegionId;
  moves: number;
  objectives: ObjectiveDef[];
  stars: [number, number, number];
  coinReward: number;
  intro?: string;
  difficulty: number;
  strategy: string;
  seed: number;
  board: LevelBoardSetup;
}

export interface Run {
  cells: Pos[];
  orientation: 'h' | 'v';
  kind: NormalKind;
  length: number;
}

export interface MatchGroup {
  cells: Pos[];
  runs: Run[];
  kind: NormalKind;
}

export type GroupShape = 'plain' | 'stripedH' | 'stripedV' | 'wrapped' | 'rainbow';
