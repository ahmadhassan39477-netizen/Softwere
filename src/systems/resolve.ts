import type { Rng } from '../utils/rng';
import {
  getCell,
  inBounds,
  isNormalKind,
  mintCandy,
  orthogonal,
  placeNormalAvoiding,
  posKey,
} from './board';
import { applyGravity } from './gravity';
import { findMatchGroups } from './match';
import { refill } from './refill';
import { waveScore } from './score';
import { chooseSpawnCell, classifyGroup, shapeToSpecial } from './specials';
import { hasLegalMove } from './swap';
import { NORMAL_KINDS, type Board, type CandyKind, type ClearEffects, type MatchGroup, type Pos, type ResolveResult, type ScriptStep, type SpawnedCandy, type Special, type SwapPlan, type Underlay } from './types';

const MAX_WAVES = 40;

function emptyEffects(): ClearEffects {
  return {
    collected: {},
    jelly: 0,
    wheels: 0,
    obstacles: 0,
    stars: 0,
    rescues: 0,
    specialsCreated: 0,
  };
}

function addKind(effects: ClearEffects, kind: CandyKind): void {
  effects.collected[kind] = (effects.collected[kind] ?? 0) + 1;
}

function cellsInRadius(board: Board, origin: Pos, radius: number): Pos[] {
  const cells: Pos[] = [];
  for (let r = origin.r - radius; r <= origin.r + radius; r += 1) {
    for (let c = origin.c - radius; c <= origin.c + radius; c += 1) {
      const pos = { r, c };
      if (inBounds(board, pos)) cells.push(pos);
    }
  }
  return cells;
}

function addLine(board: Board, set: Set<string>, horizontal: boolean, index: number): void {
  if (horizontal) {
    if (index < 0 || index >= board.rows) return;
    for (let c = 0; c < board.cols; c += 1) set.add(posKey({ r: index, c }));
    return;
  }
  if (index < 0 || index >= board.cols) return;
  for (let r = 0; r < board.rows; r += 1) set.add(posKey({ r, c: index }));
}

function expandSpecials(board: Board, set: Set<string>, suppressRainbow: boolean): void {
  const queue = [...set];
  const seen = new Set<string>();
  let rainbowUsed = false;
  while (queue.length > 0) {
    const key = queue.pop()!;
    if (seen.has(key)) continue;
    seen.add(key);
    const [rs, cs] = key.split(',');
    const pos = { r: Number(rs), c: Number(cs) };
    const cell = getCell(board, pos);
    const candy = cell?.candy;
    if (!candy) continue;
    let extra: Pos[] = [];
    if (candy.special === 'stripedH') {
      extra = Array.from({ length: board.cols }, (_, c) => ({ r: pos.r, c }));
    } else if (candy.special === 'stripedV') {
      extra = Array.from({ length: board.rows }, (_, r) => ({ r, c: pos.c }));
    } else if (candy.special === 'wrapped') {
      extra = cellsInRadius(board, pos, 1);
    } else if (candy.kind === 'rainbow' && !suppressRainbow && !rainbowUsed) {
      rainbowUsed = true;
      extra = cellsOfMostCommon(board);
    }
    for (const next of extra) {
      const nextKey = posKey(next);
      if (!set.has(nextKey)) {
        set.add(nextKey);
        queue.push(nextKey);
      }
    }
  }
}

function cellsOfMostCommon(board: Board): Pos[] {
  const counts = new Map<string, number>();
  for (const kind of NORMAL_KINDS) counts.set(kind, 0);
  for (const row of board.cells) {
    for (const cell of row) {
      const kind = cell.candy && isNormalKind(cell.candy.kind) ? cell.candy.kind : null;
      if (!kind) continue;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  let best: (typeof NORMAL_KINDS)[number] = 'strawberry';
  let bestCount = -1;
  for (const kind of NORMAL_KINDS) {
    const count = counts.get(kind) ?? 0;
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return cellsOfKind(board, best);
}

function cellsOfKind(board: Board, kind: CandyKind): Pos[] {
  const found: Pos[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      if (board.cells[r]![c]!.candy?.kind === kind) found.push({ r, c });
    }
  }
  return found;
}

function applyCombo(board: Board, plan: SwapPlan, set: Set<string>): void {
  if (!plan.combo) return;
  const [first, second] = plan.forced;
  if (!first || !second) return;
  if (plan.combo === 'striped-striped') {
    for (const pos of [first, second]) {
      addLine(board, set, true, pos.r);
      addLine(board, set, false, pos.c);
    }
    return;
  }
  if (plan.combo === 'wrapped-wrapped') {
    for (const pos of [first, second]) {
      for (const cell of cellsInRadius(board, pos, 2)) set.add(posKey(cell));
    }
    return;
  }
  const wrappedPos =
    getCell(board, first)?.candy?.special === 'wrapped'
      ? first
      : getCell(board, second)?.candy?.special === 'wrapped'
        ? second
        : first;
  for (let delta = -1; delta <= 1; delta += 1) {
    addLine(board, set, true, wrappedPos.r + delta);
    addLine(board, set, false, wrappedPos.c + delta);
  }
}

function applyTransform(board: Board, plan: SwapPlan, set: Set<string>): void {
  if (!plan.transform) return;
  const { kind, special } = plan.transform;
  let stripeFlip = 0;
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const candy = board.cells[r]![c]!.candy;
      if (!candy || candy.kind !== kind) continue;
      if (special === 'stripedH' || special === 'stripedV') {
        candy.special = stripeFlip % 2 === 0 ? 'stripedH' : 'stripedV';
        stripeFlip += 1;
      } else if (special === 'wrapped') {
        candy.special = 'wrapped';
      }
      set.add(posKey({ r, c }));
    }
  }
}

function addAdjacentBlockers(board: Board, matchCells: Pos[], set: Set<string>): void {
  for (const cell of matchCells) {
    for (const neighbor of orthogonal(cell)) {
      const target = getCell(board, neighbor);
      if (target?.blocker) set.add(posKey(neighbor));
    }
  }
}

function underlayOf(board: Board, pos: Pos): Underlay {
  const cell = board.cells[pos.r]![pos.c]!;
  return { r: pos.r, c: pos.c, jelly: cell.jelly, wheel: cell.wheel, trapped: cell.trapped, blocker: cell.blocker };
}

function reshufflePlayable(board: Board, rng: Rng): boolean {
  const normalCells: Pos[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r]![c]!;
      if (cell.blocker || !cell.candy) continue;
      if (cell.candy.kind === 'star') continue;
      normalCells.push({ r, c });
      cell.candy = null;
    }
  }
  const readingOrder = [...normalCells].sort((a, b) => a.r - b.r || a.c - b.c);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    for (const pos of normalCells) board.cells[pos.r]![pos.c]!.candy = null;
    for (const pos of readingOrder) placeNormalAvoiding(board, pos, rng);
    if (!hasAnyMatchSafe(board) && hasLegalMove(board)) return true;
  }
  return hasLegalMove(board);
}

function hasAnyMatchSafe(board: Board): boolean {
  return findMatchGroups(board).length > 0;
}

function snapshotCandies(board: Board): import('./types').SpawnedCandy[] {
  const candies: import('./types').SpawnedCandy[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const candy = board.cells[r]![c]!.candy;
      if (!candy) continue;
      candies.push({ id: candy.id, r, c, kind: candy.kind, special: candy.special });
    }
  }
  return candies;
}

function clearCell(board: Board, pos: Pos, effects: ClearEffects, waveRemoved: import('./types').RemovedCandy[]): void {
  const cell = board.cells[pos.r]![pos.c]!;
  if (cell.blocker) {
    cell.blocker = false;
    effects.obstacles += 1;
    waveRemoved.push({ id: -1, r: pos.r, c: pos.c, kind: 'blocker', special: 'none' });
    return;
  }
  if (cell.candy) {
    const candy = cell.candy;
    waveRemoved.push({ id: candy.id, r: pos.r, c: pos.c, kind: candy.kind, special: candy.special });
    if (candy.kind === 'star') effects.stars += 1;
    else addKind(effects, candy.kind);
    cell.candy = null;
  }
  if (cell.jelly > 0) {
    cell.jelly -= 1;
    effects.jelly += 1;
  }
  if (cell.wheel) {
    cell.wheel = false;
    effects.wheels += 1;
  }
  if (cell.trapped) {
    cell.trapped = false;
    effects.rescues += 1;
  }
}

/**
 * Resolve matches, specials, gravity, and refills until the board is stable.
 * Each candy is removed at most once per wave, so it cannot be scored twice in that step.
 */
export function resolveBoard(board: Board, rng: Rng, plan?: SwapPlan): ResolveResult {
  const effects = emptyEffects();
  const script: ScriptStep[] = [];
  let score = 0;
  let pending = plan;
  let guard = 0;
  let reshuffles = 0;

  while (guard < MAX_WAVES) {
    guard += 1;
    const set = new Set<string>();
    const matchCells: Pos[] = [];
    const spawnPlans: { pos: Pos; kind: CandyKind; special: Special }[] = [];

    if (pending?.clearAll) {
      for (let r = 0; r < board.rows; r += 1) {
        for (let c = 0; c < board.cols; c += 1) {
          const cell = board.cells[r]![c]!;
          if (cell.candy || cell.blocker) set.add(posKey({ r, c }));
        }
      }
    }
    if (pending?.transform) applyTransform(board, pending, set);
    if (pending) {
      for (const pos of pending.forced) set.add(posKey(pos));
      if (pending.combo) applyCombo(board, pending, set);
    }

    const groups: MatchGroup[] = pending && !pending.allowMatch ? [] : findMatchGroups(board);
    for (const group of groups) {
      for (const cell of group.cells) {
        set.add(posKey(cell));
        matchCells.push(cell);
      }
      const shape = classifyGroup(group);
      const made = shapeToSpecial(shape);
      if (made) {
        const pos = chooseSpawnCell(group, pending?.focus ?? []);
        spawnPlans.push({
          pos,
          kind: made.kind === 'rainbow' ? 'rainbow' : group.kind,
          special: made.special,
        });
      }
    }

    if (pending?.allowMatch) {
      const matched = new Set(matchCells.map(posKey));
      for (const pos of pending.loneSpecials) {
        if (!matched.has(posKey(pos))) set.add(posKey(pos));
      }
    }

    addAdjacentBlockers(board, matchCells, set);
    if (set.size > 0) expandSpecials(board, set, Boolean(pending?.transform));

    if (set.size === 0) {
      if (!hasLegalMove(board) && reshuffles < 3) {
        reshuffles += 1;
        const shuffledOk = reshufflePlayable(board, rng);
        script.push({ type: 'reshuffle', candies: snapshotCandies(board) });
        pending = undefined;
        if (!shuffledOk && !hasLegalMove(board)) break;
        continue;
      }
      break;
    }

    const waveRemoved: import('./types').RemovedCandy[] = [];
    const positions = [...set].map((key) => {
      const [r, c] = key.split(',');
      return { r: Number(r), c: Number(c) };
    });

    const candyIds = new Set<number>();
    for (const pos of positions) {
      const candy = getCell(board, pos)?.candy;
      if (candy && candyIds.has(candy.id)) continue;
      if (candy) candyIds.add(candy.id);
      clearCell(board, pos, effects, waveRemoved);
    }

    const spawned: SpawnedCandy[] = [];
    for (const spawn of spawnPlans) {
      const cell = getCell(board, spawn.pos);
      if (!cell || cell.blocker) continue;
      const candy = mintCandy(board, spawn.kind, spawn.special);
      cell.candy = candy;
      spawned.push({ id: candy.id, r: spawn.pos.r, c: spawn.pos.c, kind: spawn.kind, special: spawn.special });
      effects.specialsCreated += 1;
    }

    const candyCount = waveRemoved.filter((entry) => entry.kind !== 'blocker').length;
    const gained = waveScore(candyCount, script.filter((step) => step.type === 'wave').length + 1, spawned.length);
    score += gained;
    script.push({
      type: 'wave',
      removed: waveRemoved,
      spawned,
      underlays: positions.map((pos) => underlayOf(board, pos)),
      scoreGained: gained,
      specialsCreated: spawned.length,
    });

    const falls = applyGravity(board);
    script.push({ type: 'gravity', moves: falls.map((move) => ({ id: move.id, toR: move.toR, toC: move.toC })) });

    const starIds: number[] = [];
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[board.rows - 1]![c]!;
      if (cell.candy?.kind === 'star') {
        starIds.push(cell.candy.id);
        cell.candy = null;
        effects.stars += 1;
      }
    }
    if (starIds.length > 0) {
      script.push({ type: 'stars', ids: starIds });
      const moreFalls = applyGravity(board);
      script.push({
        type: 'gravity',
        moves: moreFalls.map((move) => ({ id: move.id, toR: move.toR, toC: move.toC })),
      });
    }

    const filled = refill(board, rng);
    script.push({ type: 'refill', candies: filled });
    pending = undefined;
  }

  breakResidualMatches(board);
  return { score, effects, script };
}

/** Last-resort stabilizer so a capped cascade cannot leave an active match. */
function breakResidualMatches(board: Board): void {
  for (let guard = 0; guard < 8 && hasAnyMatchSafe(board); guard += 1) {
    const groups = findMatchGroups(board);
    for (const group of groups) {
      const pos = group.cells[0];
      if (!pos) continue;
      const cell = getCell(board, pos);
      if (!cell?.candy || !isNormalKind(cell.candy.kind)) continue;
      const replacement = NORMAL_KINDS.find((kind) => kind !== cell.candy?.kind) ?? 'lemon';
      cell.candy.kind = replacement;
      cell.candy.special = 'none';
    }
  }
}
