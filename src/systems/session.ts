import { mulberry32, type Rng } from '../utils/rng';
import { isAdjacent, swapCandies } from './board';
import { hasAnyMatch } from './match';
import { applyEffects, createProgress, isObjectivesComplete } from './objectives';
import { resolveBoard } from './resolve';
import { reshuffleUntilPlayable } from './setupBoard';
import { canSwapCell } from './board';
import { planSwap } from './swap';
import type { Board, LevelConfig, ObjectiveDef, ObjectiveProgress, Pos, ScriptStep } from './types';

export type SessionStatus = 'playing' | 'won' | 'lost';

export interface Session {
  board: Board;
  movesLeft: number;
  score: number;
  objectives: ObjectiveProgress[];
  status: SessionStatus;
  rng: Rng;
  levelNumber: number;
}

export interface SwapResult {
  ok: boolean;
  reason?: 'over' | 'not-adjacent' | 'no-match' | 'blocked';
  moveConsumed: boolean;
  script: ScriptStep[];
  status: SessionStatus;
  scoreGained: number;
}

export function createSession(level: LevelConfig, rng?: Rng): Session {
  const random = rng ?? mulberry32(level.seed);
  return {
    board: reshuffleUntilPlayable(level, random),
    movesLeft: level.moves,
    score: 0,
    objectives: createProgress(level.objectives),
    status: 'playing',
    rng: random,
    levelNumber: level.number,
  };
}

export function createCustomSession(options: {
  board: Board;
  moves: number;
  objectives?: ObjectiveDef[];
  rng: Rng;
}): Session {
  return {
    board: options.board,
    movesLeft: options.moves,
    score: 0,
    objectives: createProgress(options.objectives ?? [{ type: 'score', target: 999999 }]),
    status: 'playing',
    rng: options.rng,
    levelNumber: 0,
  };
}

export function trySwap(session: Session, from: Pos, to: Pos): SwapResult {
  if (session.status !== 'playing') {
    return { ok: false, reason: 'over', moveConsumed: false, script: [], status: session.status, scoreGained: 0 };
  }
  if (!isAdjacent(from, to)) {
    return { ok: false, reason: 'not-adjacent', moveConsumed: false, script: [], status: session.status, scoreGained: 0 };
  }
  if (!canSwapCell(session.board, from) || !canSwapCell(session.board, to)) {
    return { ok: false, reason: 'blocked', moveConsumed: false, script: [], status: session.status, scoreGained: 0 };
  }
  const plan = planSwap(session.board, from, to);
  if (!plan) {
    return { ok: false, reason: 'no-match', moveConsumed: false, script: [], status: session.status, scoreGained: 0 };
  }
  swapCandies(session.board, from, to);
  session.movesLeft -= 1;
  const resolved = resolveBoard(session.board, session.rng, plan);
  session.score += resolved.score;
  applyEffects(session.objectives, resolved.effects);
  if (isObjectivesComplete(session.objectives, session.score)) session.status = 'won';
  else if (session.movesLeft <= 0) session.status = 'lost';
  return {
    ok: true,
    moveConsumed: true,
    script: resolved.script,
    status: session.status,
    scoreGained: resolved.score,
  };
}

export function boardIsStable(board: Board): boolean {
  return !hasAnyMatch(board);
}
