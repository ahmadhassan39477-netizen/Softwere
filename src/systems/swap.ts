import { canSwapCell, cloneBoard, getCell, isAdjacent, isNormalKind, swapCandies } from './board';
import { findMatchGroups } from './match';
import type { Board, Candy, ComboKind, Pos, Special, SwapPlan } from './types';

export function isValidSwap(board: Board, a: Pos, b: Pos): boolean {
  if (!isAdjacent(a, b)) return false;
  if (!canSwapCell(board, a) || !canSwapCell(board, b)) return false;
  const candyA = getCell(board, a)!.candy!;
  const candyB = getCell(board, b)!.candy!;
  if (candyA.kind === 'rainbow' || candyB.kind === 'rainbow') return true;
  if (candyA.special !== 'none' || candyB.special !== 'none') return true;
  const copy = cloneBoard(board);
  swapCandies(copy, a, b);
  return findMatchGroups(copy).length > 0;
}

function comboOf(a: Special, b: Special): ComboKind | null {
  const striped = (special: Special) => special === 'stripedH' || special === 'stripedV';
  if (striped(a) && striped(b)) return 'striped-striped';
  if (a === 'wrapped' && b === 'wrapped') return 'wrapped-wrapped';
  if ((striped(a) && b === 'wrapped') || (striped(b) && a === 'wrapped')) return 'striped-wrapped';
  return null;
}

/**
 * Plan the effect of a swap without mutating the board.
 * `from` is the candy the player moved; it lands on `to`.
 */
export function planSwap(board: Board, from: Pos, to: Pos): SwapPlan | null {
  if (!isValidSwap(board, from, to)) return null;
  const moving = getCell(board, from)!.candy!;
  const other = getCell(board, to)!.candy!;
  return planAfterSwap(moving, other, to, from);
}

function planAfterSwap(landedOnTo: Candy, landedOnFrom: Candy, to: Pos, from: Pos): SwapPlan {
  const focus = [to, from];
  const rainbowOnTo = landedOnTo.kind === 'rainbow';
  const rainbowOnFrom = landedOnFrom.kind === 'rainbow';
  if (rainbowOnTo || rainbowOnFrom) {
    if (rainbowOnTo && rainbowOnFrom) {
      return { allowMatch: false, forced: [], focus, clearAll: true, loneSpecials: [] };
    }
    const colorCandy = rainbowOnTo ? landedOnFrom : landedOnTo;
    const rainbowPos = rainbowOnTo ? to : from;
    if (isNormalKind(colorCandy.kind) && colorCandy.special !== 'none') {
      return {
        allowMatch: false,
        forced: [rainbowPos],
        focus,
        clearAll: false,
        transform: { kind: colorCandy.kind, special: colorCandy.special },
        loneSpecials: [],
      };
    }
    if (isNormalKind(colorCandy.kind)) {
      return {
        allowMatch: false,
        forced: [rainbowPos],
        focus,
        clearAll: false,
        transform: { kind: colorCandy.kind, special: 'none' },
        loneSpecials: [],
      };
    }
    return { allowMatch: false, forced: [rainbowPos, rainbowOnTo ? from : to], focus, clearAll: true, loneSpecials: [] };
  }

  const combo = comboOf(landedOnTo.special, landedOnFrom.special);
  if (combo && landedOnTo.special !== 'none' && landedOnFrom.special !== 'none') {
    return { allowMatch: false, forced: [to, from], focus, clearAll: false, combo, loneSpecials: [] };
  }

  const loneSpecials: Pos[] = [];
  if (landedOnTo.special !== 'none') loneSpecials.push(to);
  if (landedOnFrom.special !== 'none') loneSpecials.push(from);
  return { allowMatch: true, forced: [], focus, clearAll: false, loneSpecials };
}

export interface LegalMove {
  from: Pos;
  to: Pos;
}

/** First legal swap in reading order. Useful for hints and solvability checks. */
export function firstLegalMove(board: Board): LegalMove | null {
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const from = { r, c };
      const neighbors = [
        { r, c: c + 1 },
        { r: r + 1, c },
      ];
      for (const to of neighbors) {
        if (to.r >= board.rows || to.c >= board.cols) continue;
        if (isValidSwap(board, from, to)) return { from, to };
      }
    }
  }
  return null;
}

export function hasLegalMove(board: Board): boolean {
  return firstLegalMove(board) !== null;
}
