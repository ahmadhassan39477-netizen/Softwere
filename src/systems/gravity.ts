import type { Board } from './types';

export interface GravityMove {
  id: number;
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

function compactColumnSegment(board: Board, col: number, top: number, bottom: number, moves: GravityMove[]): void {
  if (top > bottom) return;
  const stack: { id: number; candy: NonNullable<(typeof board.cells)[number][number]['candy']>; fromR: number }[] = [];
  for (let r = bottom; r >= top; r -= 1) {
    const cell = board.cells[r]![col]!;
    if (cell.candy) stack.push({ id: cell.candy.id, candy: cell.candy, fromR: r });
    cell.candy = null;
  }
  for (let i = 0; i < stack.length; i += 1) {
    const item = stack[i]!;
    const toR = bottom - i;
    board.cells[toR]![col]!.candy = item.candy;
    if (item.fromR !== toR) {
      moves.push({ id: item.id, fromR: item.fromR, fromC: col, toR, toC: col });
    }
  }
}

/** Candies fall straight down. Blockers stay put and split a column into segments. */
export function applyGravity(board: Board): GravityMove[] {
  const moves: GravityMove[] = [];
  for (let c = 0; c < board.cols; c += 1) {
    let bottom = board.rows - 1;
    for (let r = board.rows - 1; r >= -1; r -= 1) {
      const blocked = r >= 0 && board.cells[r]![c]!.blocker;
      if (r === -1 || blocked) {
        compactColumnSegment(board, c, r + 1, bottom, moves);
        bottom = r - 1;
      }
    }
  }
  return moves;
}
