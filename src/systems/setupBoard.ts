import type { Rng } from '../utils/rng';
import { applySetup, createEmptyBoard, fillBoard, placeStars } from './board';
import { hasAnyMatch } from './match';
import { hasLegalMove } from './swap';
import type { Board, LevelConfig } from './types';

export const BOARD_SIZE = 8;

/** Build an 8x8 level board with no starting matches and at least one legal swap. */
export function reshuffleUntilPlayable(level: LevelConfig, rng: Rng): Board {
  let board = createEmptyBoard(BOARD_SIZE, BOARD_SIZE);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    board = createEmptyBoard(BOARD_SIZE, BOARD_SIZE);
    applySetup(board, level.board);
    fillBoard(board, rng);
    placeStars(board, level.board.stars);
    if (!hasAnyMatch(board) && hasLegalMove(board)) return board;
  }
  return board;
}
