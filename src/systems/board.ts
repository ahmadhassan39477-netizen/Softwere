import { randomInt, shuffle, type Rng } from '../utils/rng';
import {
  NORMAL_KINDS,
  type Board,
  type Candy,
  type CandyKind,
  type Cell,
  type LevelBoardSetup,
  type NormalKind,
  type Pos,
  type Special,
} from './types';

export function emptyCell(): Cell {
  return { candy: null, jelly: 0, wheel: false, blocker: false, trapped: false };
}

export function createEmptyBoard(rows: number, cols: number): Board {
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c += 1) row.push(emptyCell());
    cells.push(row);
  }
  return { rows, cols, nextId: 1, cells };
}

export function inBounds(board: Board, pos: Pos): boolean {
  return pos.r >= 0 && pos.c >= 0 && pos.r < board.rows && pos.c < board.cols;
}

export function posKey(pos: Pos): string {
  return `${pos.r},${pos.c}`;
}

export function parseKey(key: string): Pos {
  const [r, c] = key.split(',');
  return { r: Number(r), c: Number(c) };
}

export function getCell(board: Board, pos: Pos): Cell | null {
  if (!inBounds(board, pos)) return null;
  return board.cells[pos.r]![pos.c]!;
}

export function cloneBoard(board: Board): Board {
  return {
    rows: board.rows,
    cols: board.cols,
    nextId: board.nextId,
    cells: board.cells.map((row) =>
      row.map((cell) => ({
        candy: cell.candy ? { ...cell.candy } : null,
        jelly: cell.jelly,
        wheel: cell.wheel,
        blocker: cell.blocker,
        trapped: cell.trapped,
      })),
    ),
  };
}

export function mintCandy(board: Board, kind: CandyKind, special: Special = 'none'): Candy {
  const candy: Candy = { id: board.nextId, kind, special };
  board.nextId += 1;
  return candy;
}

export function isNormalKind(kind: CandyKind): kind is NormalKind {
  return (NORMAL_KINDS as readonly string[]).includes(kind);
}

/** Candies that can join a color match. Striped and wrapped still match by color. */
export function matchKind(cell: Cell): NormalKind | null {
  const candy = cell.candy;
  if (!candy || !isNormalKind(candy.kind)) return null;
  return candy.kind;
}

export function canSwapCell(board: Board, pos: Pos): boolean {
  const cell = getCell(board, pos);
  if (!cell || cell.blocker || !cell.candy) return false;
  if (cell.candy.kind === 'star') return false;
  return true;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function swapCandies(board: Board, a: Pos, b: Pos): void {
  const cellA = getCell(board, a);
  const cellB = getCell(board, b);
  if (!cellA || !cellB) return;
  const tmp = cellA.candy;
  cellA.candy = cellB.candy;
  cellB.candy = tmp;
}

export function orthogonal(pos: Pos): Pos[] {
  return [
    { r: pos.r - 1, c: pos.c },
    { r: pos.r + 1, c: pos.c },
    { r: pos.r, c: pos.c - 1 },
    { r: pos.r, c: pos.c + 1 },
  ];
}

function wouldMatchAt(board: Board, pos: Pos, kind: NormalKind): boolean {
  const left1 = pos.c >= 1 ? matchKind(board.cells[pos.r]![pos.c - 1]!) : null;
  const left2 = pos.c >= 2 ? matchKind(board.cells[pos.r]![pos.c - 2]!) : null;
  if (left1 === kind && left2 === kind) return true;
  const up1 = pos.r >= 1 ? matchKind(board.cells[pos.r - 1]![pos.c]!) : null;
  const up2 = pos.r >= 2 ? matchKind(board.cells[pos.r - 2]![pos.c]!) : null;
  return up1 === kind && up2 === kind;
}

export function placeNormalAvoiding(board: Board, pos: Pos, rng: Rng): Candy {
  const order = shuffle(NORMAL_KINDS, rng);
  for (const kind of order) {
    if (!wouldMatchAt(board, pos, kind)) {
      const candy = mintCandy(board, kind);
      board.cells[pos.r]![pos.c]!.candy = candy;
      return candy;
    }
  }
  const fallback = mintCandy(board, order[0] ?? 'strawberry');
  board.cells[pos.r]![pos.c]!.candy = fallback;
  return fallback;
}

export function fillBoard(board: Board, rng: Rng): void {
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r]![c]!;
      if (cell.blocker || cell.candy) continue;
      placeNormalAvoiding(board, { r, c }, rng);
    }
  }
}

export function applySetup(board: Board, setup: LevelBoardSetup): void {
  for (const pos of setup.obstacles) {
    const cell = getCell(board, pos);
    if (!cell) continue;
    cell.blocker = true;
    cell.candy = null;
    cell.jelly = 0;
    cell.wheel = false;
    cell.trapped = false;
  }
  for (const pos of setup.jelly) {
    const cell = getCell(board, pos);
    if (cell && !cell.blocker) cell.jelly = 1;
  }
  for (const pos of setup.wheels) {
    const cell = getCell(board, pos);
    if (cell && !cell.blocker) cell.wheel = true;
  }
  for (const pos of setup.trapped) {
    const cell = getCell(board, pos);
    if (cell && !cell.blocker) cell.trapped = true;
  }
}

export function placeStars(board: Board, positions: Pos[]): void {
  for (const pos of positions) {
    const cell = getCell(board, pos);
    if (!cell || cell.blocker) continue;
    cell.candy = mintCandy(board, 'star');
  }
}

export function signature(board: Board): string {
  const parts: string[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r]![c]!;
      if (cell.blocker) {
        parts.push('#');
        continue;
      }
      const candy = cell.candy;
      if (!candy) {
        parts.push('.');
        continue;
      }
      parts.push(`${candy.kind}:${candy.special}`);
    }
    parts.push('/');
  }
  return parts.join(',');
}

export function countKind(board: Board, kind: CandyKind): number {
  let n = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.candy?.kind === kind) n += 1;
    }
  }
  return n;
}

export function randomNormalKind(rng: Rng): NormalKind {
  return NORMAL_KINDS[randomInt(rng, NORMAL_KINDS.length)] ?? 'strawberry';
}
