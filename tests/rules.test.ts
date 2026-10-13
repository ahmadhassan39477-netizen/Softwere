import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/utils/rng';
import { cloneBoard, signature } from '../src/systems/board';
import { applyGravity } from '../src/systems/gravity';
import { InputGate } from '../src/systems/inputGate';
import { findMatchGroups } from '../src/systems/match';
import { isObjectivesComplete } from '../src/systems/objectives';
import { refill } from '../src/systems/refill';
import { resolveBoard } from '../src/systems/resolve';
import { POINTS_PER_CANDY, SPECIAL_CREATE_BONUS, starsForScore, waveScore } from '../src/systems/score';
import { boardIsStable, createCustomSession, trySwap } from '../src/systems/session';
import { classifyGroup } from '../src/systems/specials';
import { firstLegalMove, hasLegalMove, isValidSwap } from '../src/systems/swap';
import { boardFromRows, patternBoard, playableBoard, setCandy } from './helpers';

describe('matches', () => {
  it('finds a horizontal match', () => {
    const board = boardFromRows(['SSSLM', 'MLPBG', 'GBPSM', 'PLMGS', 'SMGLB']);
    const groups = findMatchGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.cells).toHaveLength(3);
    expect(groups[0]?.runs[0]?.orientation).toBe('h');
  });

  it('finds a vertical match', () => {
    const board = boardFromRows(['SMLGP', 'SBLMP', 'SGBPM', 'MLGBP', 'PMSLB']);
    const groups = findMatchGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.runs[0]?.orientation).toBe('v');
    expect(groups[0]?.cells).toHaveLength(3);
  });

  it('unions an overlapping L into one wrapped group', () => {
    const board = boardFromRows(['SLMGB', 'SPLMG', 'SSSPL', 'MGBPS', 'LMGBP']);
    const groups = findMatchGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.cells).toHaveLength(5);
    expect(classifyGroup(groups[0]!)).toBe('wrapped');
  });

  it('classifies four in a row, four in a column, and a straight five', () => {
    const horizontal = boardFromRows(['SSSSM', 'LGBPM', 'PSMLG', 'BMLGP', 'GLPSB']);
    expect(classifyGroup(findMatchGroups(horizontal)[0]!)).toBe('stripedH');
    const vertical = boardFromRows(['GMBPL', 'GSPLM', 'GLBMP', 'GSMLB', 'PBLMS']);
    expect(classifyGroup(findMatchGroups(vertical)[0]!)).toBe('stripedV');
    const rainbow = boardFromRows(['SSSSSL', 'MLGBPM', 'PBGMLS', 'LMPBGS', 'GBPSML']);
    expect(classifyGroup(findMatchGroups(rainbow)[0]!)).toBe('rainbow');
  });
});

describe('swaps, gravity, refill, cascades', () => {
  it('does not consume a move or change the board on an invalid swap', () => {
    const board = patternBoard();
    const session = createCustomSession({ board, moves: 10, rng: mulberry32(4) });
    let invalid: { r: number; c: number } | null = null;
    let other: { r: number; c: number } | null = null;
    for (let r = 0; r < 8 && !invalid; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const from = { r, c };
        const to = { r, c: c + 1 };
        if (!isValidSwap(session.board, from, to)) {
          invalid = from;
          other = to;
          break;
        }
      }
    }
    expect(invalid && other).toBeTruthy();
    const before = signature(session.board);
    const result = trySwap(session, invalid!, other!);
    expect(result.ok).toBe(false);
    expect(result.moveConsumed).toBe(false);
    expect(session.movesLeft).toBe(10);
    expect(signature(session.board)).toBe(before);
  });

  it('consumes exactly one move for a valid swap, even if a cascade follows', () => {
    const board = playableBoard();
    const session = createCustomSession({ board, moves: 12, objectives: [{ type: 'score', target: 999999 }], rng: mulberry32(9) });
    const move = firstLegalMove(session.board);
    expect(move).not.toBeNull();
    const result = trySwap(session, move!.from, move!.to);
    expect(result.ok).toBe(true);
    expect(result.moveConsumed).toBe(true);
    expect(session.movesLeft).toBe(11);
    expect(boardIsStable(session.board)).toBe(true);
    expect(hasLegalMove(session.board)).toBe(true);
  });

  it('drops candies into holes and stops at blockers', () => {
    const board = boardFromRows(['S', '.', '#', 'L', '.']);
    applyGravity(board);
    expect(board.cells[0]![0]!.candy).toBeNull();
    expect(board.cells[1]![0]!.candy?.kind).toBe('strawberry');
    expect(board.cells[2]![0]!.blocker).toBe(true);
    expect(board.cells[3]![0]!.candy).toBeNull();
    expect(board.cells[4]![0]!.candy?.kind).toBe('lemon');
  });

  it('refills empty cells deterministically and leaves blockers empty', () => {
    const make = () => {
      const board = boardFromRows(['..', '.#']);
      return refill(board, mulberry32(42));
    };
    const first = make();
    const second = make();
    expect(first.map((candy) => candy.kind)).toEqual(second.map((candy) => candy.kind));
    expect(first).toHaveLength(3);
  });

  it('cascades a falling match and refills the holes', () => {
    const board = patternBoard();
    setCandy(board, 7, 0, 'lemon');
    setCandy(board, 7, 1, 'lemon');
    setCandy(board, 7, 2, 'mint');
    setCandy(board, 7, 3, 'lemon');
    setCandy(board, 5, 0, 'blueberry');
    setCandy(board, 5, 1, 'peach');
    setCandy(board, 5, 2, 'strawberry');
    setCandy(board, 6, 0, 'grape');
    setCandy(board, 6, 1, 'grape');
    setCandy(board, 6, 2, 'grape');
    setCandy(board, 6, 3, 'blueberry');
    const session = createCustomSession({ board, moves: 5, rng: mulberry32(3) });
    const result = trySwap(session, { r: 7, c: 2 }, { r: 7, c: 3 });
    expect(result.ok).toBe(true);
    const waves = result.script.filter((step) => step.type === 'wave');
    expect(waves.length).toBeGreaterThanOrEqual(2);
    const refills = result.script.filter((step) => step.type === 'refill');
    expect(refills.some((step) => step.type === 'refill' && step.candies.length > 0)).toBe(true);
    expect(boardIsStable(session.board)).toBe(true);
    for (const row of session.board.cells) {
      for (const cell of row) {
        if (!cell.blocker) expect(cell.candy).not.toBeNull();
      }
    }
  });

  it('blocks a second move while the first is in progress', () => {
    const gate = new InputGate();
    expect(gate.tryBegin()).toBe(true);
    expect(gate.tryBegin()).toBe(false);
    gate.end();
    expect(gate.tryBegin()).toBe(true);
  });
});

describe('specials and scoring', () => {
  it('creates striped, wrapped, and rainbow candies from matches', () => {
    const horizontal = patternBoard();
    for (let c = 0; c < 4; c += 1) setCandy(horizontal, 4, c, 'strawberry');
    setCandy(horizontal, 4, 4, 'lemon');
    setCandy(horizontal, 3, 0, 'lemon');
    setCandy(horizontal, 5, 0, 'mint');
    setCandy(horizontal, 3, 1, 'grape');
    setCandy(horizontal, 5, 1, 'peach');
    setCandy(horizontal, 3, 2, 'blueberry');
    setCandy(horizontal, 5, 2, 'mint');
    setCandy(horizontal, 3, 3, 'grape');
    setCandy(horizontal, 5, 3, 'lemon');
    const horizontalResolved = resolveBoard(horizontal, mulberry32(1));
    const horizontalWave = horizontalResolved.script.find((step) => step.type === 'wave');
    expect(horizontalWave?.type === 'wave' && horizontalWave.spawned.some((candy) => candy.special === 'stripedH')).toBe(true);

    const vertical = patternBoard();
    for (let r = 0; r < 4; r += 1) setCandy(vertical, r, 2, 'lemon');
    setCandy(vertical, 0, 1, 'grape');
    setCandy(vertical, 0, 3, 'peach');
    const verticalResolved = resolveBoard(vertical, mulberry32(2));
    const verticalWave = verticalResolved.script.find((step) => step.type === 'wave');
    expect(verticalWave?.type === 'wave' && verticalWave.spawned.some((candy) => candy.special === 'stripedV')).toBe(true);

    const wrapped = boardFromRows(['SLMGB', 'SPLMG', 'SSSPL', 'MGBPS', 'LMGBP']);
    const wrappedResolved = resolveBoard(wrapped, mulberry32(3));
    const wrappedWave = wrappedResolved.script.find((step) => step.type === 'wave');
    expect(wrappedWave?.type === 'wave' && wrappedWave.spawned.some((candy) => candy.special === 'wrapped')).toBe(true);

    const rainbow = patternBoard();
    for (let c = 0; c < 5; c += 1) setCandy(rainbow, 2, c, 'grape');
    setCandy(rainbow, 1, 0, 'lemon');
    setCandy(rainbow, 3, 0, 'mint');
    setCandy(rainbow, 1, 4, 'peach');
    setCandy(rainbow, 3, 4, 'blueberry');
    const rainbowResolved = resolveBoard(rainbow, mulberry32(4));
    const rainbowWave = rainbowResolved.script.find((step) => step.type === 'wave');
    expect(rainbowWave?.type === 'wave' && rainbowWave.spawned.some((candy) => candy.kind === 'rainbow')).toBe(true);
  });

  it('activates striped, wrapped, and rainbow candies', () => {
    const striped = patternBoard();
    for (let c = 0; c < 8; c += 1) setCandy(striped, 3, c, 'mint');
    setCandy(striped, 3, 3, 'strawberry', 'stripedH');
    setCandy(striped, 3, 4, 'lemon');
    setCandy(striped, 2, 3, 'grape');
    setCandy(striped, 4, 3, 'peach');
    const stripedSession = createCustomSession({ board: striped, moves: 3, rng: mulberry32(8) });
    const stripedResult = trySwap(stripedSession, { r: 3, c: 3 }, { r: 3, c: 4 });
    const stripedWave = stripedResult.script.find((step) => step.type === 'wave');
    expect(stripedWave?.type === 'wave' && stripedWave.removed.some((cell) => cell.r === 3 && cell.c === 0)).toBe(true);
    expect(stripedWave?.type === 'wave' && stripedWave.removed.some((cell) => cell.r === 3 && cell.c === 7)).toBe(true);

    const wrapped = patternBoard();
    setCandy(wrapped, 4, 4, 'mint', 'wrapped');
    setCandy(wrapped, 4, 5, 'lemon');
    const wrappedSession = createCustomSession({ board: wrapped, moves: 3, rng: mulberry32(8) });
    const wrappedResult = trySwap(wrappedSession, { r: 4, c: 4 }, { r: 4, c: 5 });
    const wrappedWave = wrappedResult.script.find((step) => step.type === 'wave');
    const wrappedCells = new Set(
      wrappedWave?.type === 'wave' ? wrappedWave.removed.map((cell) => `${cell.r},${cell.c}`) : [],
    );
    expect(wrappedCells.has('3,4')).toBe(true);
    expect(wrappedCells.has('5,5')).toBe(true);

    const rainbow = patternBoard();
    setCandy(rainbow, 4, 4, 'rainbow');
    setCandy(rainbow, 4, 5, 'lemon');
    const lemonCells: string[] = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if (rainbow.cells[r]![c]!.candy?.kind === 'lemon') lemonCells.push(`${r},${c}`);
      }
    }
    const rainbowSession = createCustomSession({ board: rainbow, moves: 3, rng: mulberry32(8) });
    const rainbowResult = trySwap(rainbowSession, { r: 4, c: 4 }, { r: 4, c: 5 });
    const rainbowWave = rainbowResult.script.find((step) => step.type === 'wave');
    const removed = new Set(rainbowWave?.type === 'wave' ? rainbowWave.removed.map((cell) => `${cell.r},${cell.c}`) : []);
    for (const key of lemonCells) expect(removed.has(key)).toBe(true);
    expect(rainbowWave?.type === 'wave' && rainbowWave.removed.some((cell) => cell.kind === 'mint')).toBe(false);
  });

  it('resolves striped, wrapped, and rainbow combos without looping', () => {
    const crosses = patternBoard();
    setCandy(crosses, 3, 3, 'strawberry', 'stripedH');
    setCandy(crosses, 3, 4, 'lemon', 'stripedV');
    const crossSession = createCustomSession({ board: crosses, moves: 2, rng: mulberry32(5) });
    const cross = trySwap(crossSession, { r: 3, c: 3 }, { r: 3, c: 4 });
    const crossWave = cross.script.find((step) => step.type === 'wave');
    const crossSet = new Set(crossWave?.type === 'wave' ? crossWave.removed.map((cell) => `${cell.r},${cell.c}`) : []);
    expect(crossSet.has('3,0')).toBe(true);
    expect(crossSet.has('0,3')).toBe(true);
    expect(crossSet.has('0,4')).toBe(true);

    const areas = patternBoard();
    setCandy(areas, 4, 4, 'mint', 'wrapped');
    setCandy(areas, 4, 5, 'grape', 'wrapped');
    const areaSession = createCustomSession({ board: areas, moves: 2, rng: mulberry32(5) });
    const area = trySwap(areaSession, { r: 4, c: 4 }, { r: 4, c: 5 });
    const areaWave = area.script.find((step) => step.type === 'wave');
    const areaSet = new Set(areaWave?.type === 'wave' ? areaWave.removed.map((cell) => `${cell.r},${cell.c}`) : []);
    expect(areaSet.has('2,2')).toBe(true);
    expect(areaSet.has('0,0')).toBe(false);

    const mixed = patternBoard();
    setCandy(mixed, 4, 3, 'peach', 'stripedH');
    setCandy(mixed, 4, 4, 'blueberry', 'wrapped');
    const mixedSession = createCustomSession({ board: mixed, moves: 2, rng: mulberry32(5) });
    const mixedResult = trySwap(mixedSession, { r: 4, c: 3 }, { r: 4, c: 4 });
    const mixedWave = mixedResult.script.find((step) => step.type === 'wave');
    const mixedSet = new Set(mixedWave?.type === 'wave' ? mixedWave.removed.map((cell) => `${cell.r},${cell.c}`) : []);
    expect(mixedSet.has('3,0')).toBe(true);
    expect(mixedSet.has('5,7')).toBe(true);
    expect(mixedSet.has('0,4')).toBe(true);

    const converted = patternBoard();
    setCandy(converted, 1, 1, 'rainbow');
    setCandy(converted, 1, 2, 'lemon', 'stripedH');
    const convertedSession = createCustomSession({ board: converted, moves: 2, rng: mulberry32(6) });
    const beforeLemons = converted.cells.flat().filter((cell) => cell.candy?.kind === 'lemon').length;
    const convertedResult = trySwap(convertedSession, { r: 1, c: 1 }, { r: 1, c: 2 });
    const convertedWave = convertedResult.script.find((step) => step.type === 'wave');
    const lemonRemoved = convertedWave?.type === 'wave' ? convertedWave.removed.filter((cell) => cell.kind === 'lemon').length : 0;
    const otherRemoved = convertedWave?.type === 'wave' ? convertedWave.removed.some((cell) => cell.kind !== 'lemon' && cell.kind !== 'rainbow' && cell.kind !== 'blocker') : false;
    expect(lemonRemoved).toBe(beforeLemons);
    expect(otherRemoved).toBe(true);
    expect(boardIsStable(convertedSession.board)).toBe(true);
  });

  it('scores each candy in an L once', () => {
    const board = boardFromRows(['SLMGB', 'SPLMG', 'SSSPL', 'MGBPS', 'LMGBP']);
    const resolved = resolveBoard(board, mulberry32(7));
    const wave = resolved.script.find((step) => step.type === 'wave');
    expect(wave?.type).toBe('wave');
    if (wave?.type !== 'wave') return;
    const ids = wave.removed.map((cell) => cell.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(wave.removed.filter((cell) => cell.kind === 'strawberry')).toHaveLength(5);
    expect(wave.scoreGained).toBe(waveScore(5, 1, 1));
    expect(waveScore(5, 1, 1)).toBe(5 * POINTS_PER_CANDY + SPECIAL_CREATE_BONUS);
  });

  it('uses star thresholds and always gives one star for a win', () => {
    const thresholds: [number, number, number] = [500, 1000, 1600];
    expect(starsForScore(2000, thresholds, false)).toBe(0);
    expect(starsForScore(100, thresholds, true)).toBe(1);
    expect(starsForScore(500, thresholds, true)).toBe(1);
    expect(starsForScore(1000, thresholds, true)).toBe(2);
    expect(starsForScore(1600, thresholds, true)).toBe(3);
  });
});

describe('objectives and reshuffle', () => {
  it('wins on the last move when the objective is met and loses otherwise', () => {
    const winBoard = playableBoard(21);
    const win = createCustomSession({
      board: winBoard,
      moves: 1,
      objectives: [{ type: 'score', target: 100 }],
      rng: mulberry32(11),
    });
    const winMove = firstLegalMove(win.board)!;
    expect(trySwap(win, winMove.from, winMove.to).status).toBe('won');
    expect(win.movesLeft).toBe(0);

    const loseBoard = playableBoard(22);
    const lose = createCustomSession({
      board: loseBoard,
      moves: 1,
      objectives: [{ type: 'score', target: 999999 }],
      rng: mulberry32(11),
    });
    const loseMove = firstLegalMove(lose.board)!;
    expect(trySwap(lose, loseMove.from, loseMove.to).status).toBe('lost');
    expect(isObjectivesComplete(lose.objectives, lose.score)).toBe(false);
  });

  it('tracks jelly, wheels, obstacles, stars, rescues, and created specials', () => {
    const board = patternBoard();
    setCandy(board, 7, 0, 'strawberry');
    setCandy(board, 7, 1, 'strawberry');
    setCandy(board, 7, 2, 'mint');
    setCandy(board, 7, 3, 'strawberry');
    for (let c = 0; c < 3; c += 1) {
      board.cells[7]![c]!.jelly = 1;
      board.cells[7]![c]!.wheel = true;
    }
    board.cells[6]![2]!.blocker = true;
    board.cells[6]![2]!.candy = null;
    board.cells[7]![1]!.trapped = true;
    const session = createCustomSession({
      board,
      moves: 4,
      objectives: [
        { type: 'jelly', count: 1 },
        { type: 'wheels', count: 1 },
        { type: 'obstacles', count: 1 },
        { type: 'rescue', count: 1 },
      ],
      rng: mulberry32(15),
    });
    const result = trySwap(session, { r: 7, c: 2 }, { r: 7, c: 3 });
    expect(result.ok).toBe(true);
    expect(session.objectives.find((item) => item.def.type === 'jelly')!.current).toBeGreaterThanOrEqual(1);
    expect(session.objectives.find((item) => item.def.type === 'wheels')!.current).toBeGreaterThanOrEqual(1);
    expect(session.objectives.find((item) => item.def.type === 'obstacles')!.current).toBeGreaterThanOrEqual(1);
    expect(session.objectives.find((item) => item.def.type === 'rescue')!.current).toBeGreaterThanOrEqual(1);

    const specials = patternBoard();
    for (let c = 0; c < 4; c += 1) setCandy(specials, 4, c, 'peach');
    setCandy(specials, 3, 0, 'lemon');
    setCandy(specials, 5, 0, 'mint');
    const created = resolveBoard(specials, mulberry32(16));
    expect(created.effects.specialsCreated).toBeGreaterThanOrEqual(1);

    const stars = patternBoard();
    setCandy(stars, 7, 0, 'star');
    setCandy(stars, 4, 4, 'mint', 'stripedH');
    setCandy(stars, 4, 5, 'lemon');
    const starSession = createCustomSession({
      board: stars,
      moves: 2,
      objectives: [{ type: 'stars', count: 1 }],
      rng: mulberry32(17),
    });
    trySwap(starSession, { r: 4, c: 4 }, { r: 4, c: 5 });
    expect(starSession.objectives[0]?.current).toBeGreaterThanOrEqual(1);
  });

  it('reshuffles a dead board without adding score', () => {
    const board = patternBoard();
    expect(hasLegalMove(board)).toBe(false);
    const scoreBefore = 0;
    const resolved = resolveBoard(cloneBoard(board), mulberry32(99));
    expect(resolved.script.some((step) => step.type === 'reshuffle')).toBe(true);
    expect(resolved.score).toBe(scoreBefore);
    const reshuffled = cloneBoard(board);
    resolveBoard(reshuffled, mulberry32(99));
    expect(hasLegalMove(reshuffled)).toBe(true);
    expect(boardIsStable(reshuffled)).toBe(true);
  });
});
