import { mintCandy, randomNormalKind } from './board';
import type { Rng } from '../utils/rng';
import type { Board, SpawnedCandy } from './types';

/** Fill holes above blockers with ordinary candies. Cascades resolve any new matches. */
export function refill(board: Board, rng: Rng): SpawnedCandy[] {
  const spawned: SpawnedCandy[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r]![c]!;
      if (cell.blocker || cell.candy) continue;
      const kind = randomNormalKind(rng);
      const candy = mintCandy(board, kind);
      cell.candy = candy;
      spawned.push({ id: candy.id, r, c, kind, special: 'none' });
    }
  }
  return spawned;
}
