import { createEmptyBoard, fillBoard, mintCandy } from '../src/systems/board';
import { hasLegalMove } from '../src/systems/swap';
import { mulberry32 } from '../src/utils/rng';
import { NORMAL_KINDS, type Board, type CandyKind, type NormalKind, type Special } from '../src/systems/types';

const CHAR_KIND: Record<string, CandyKind> = {
  S: 'strawberry',
  L: 'lemon',
  M: 'mint',
  G: 'grape',
  B: 'blueberry',
  P: 'peach',
  R: 'rainbow',
  '*': 'star',
};

export function boardFromRows(rows: string[]): Board {
  const board = createEmptyBoard(rows.length, rows[0]?.length ?? 0);
  rows.forEach((row, r) => {
    [...row].forEach((char, c) => {
      const cell = board.cells[r]![c]!;
      if (char === '.' || char === ' ') return;
      if (char === '#') {
        cell.blocker = true;
        return;
      }
      const kind = CHAR_KIND[char];
      if (!kind) throw new Error(`Unknown cell ${char}`);
      cell.candy = mintCandy(board, kind);
    });
  });
  return board;
}

/** A match-free board with no legal color swaps. Useful for reshuffle tests. */
export function patternBoard(rows = 8, cols = 8): Board {
  const board = createEmptyBoard(rows, cols);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const kind = NORMAL_KINDS[(c + r * 2) % NORMAL_KINDS.length]!;
      board.cells[r]![c]!.candy = mintCandy(board, kind);
    }
  }
  return board;
}

/** A normal starting board that already has something to swap. */
export function playableBoard(seed = 7): Board {
  for (let extra = 0; extra < 30; extra += 1) {
    const board = createEmptyBoard(8, 8);
    fillBoard(board, mulberry32(seed + extra));
    if (hasLegalMove(board)) return board;
  }
  throw new Error('Could not build a playable board');
}

export function setCandy(board: Board, r: number, c: number, kind: CandyKind, special: Special = 'none'): void {
  const cell = board.cells[r]![c]!;
  cell.blocker = false;
  cell.candy = mintCandy(board, kind, special);
}

export function kindsOf(board: Board): string[] {
  return board.cells.map((row) => row.map((cell) => (cell.blocker ? '#' : (cell.candy?.kind ?? '.'))).join(''));
}

export type { NormalKind };
