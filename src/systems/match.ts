import { matchKind, posKey } from './board';
import type { Board, MatchGroup, Pos, Run } from './types';

export function findRuns(board: Board): Run[] {
  const runs: Run[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    let start = 0;
    while (start < board.cols) {
      const kind = matchKind(board.cells[r]![start]!);
      if (!kind) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < board.cols && matchKind(board.cells[r]![end]!) === kind) end += 1;
      if (end - start >= 3) {
        const cells: Pos[] = [];
        for (let c = start; c < end; c += 1) cells.push({ r, c });
        runs.push({ cells, orientation: 'h', kind, length: cells.length });
      }
      start = end;
    }
  }
  for (let c = 0; c < board.cols; c += 1) {
    let start = 0;
    while (start < board.rows) {
      const kind = matchKind(board.cells[start]![c]!);
      if (!kind) {
        start += 1;
        continue;
      }
      let end = start + 1;
      while (end < board.rows && matchKind(board.cells[end]![c]!) === kind) end += 1;
      if (end - start >= 3) {
        const cells: Pos[] = [];
        for (let r = start; r < end; r += 1) cells.push({ r, c });
        runs.push({ cells, orientation: 'v', kind, length: cells.length });
      }
      start = end;
    }
  }
  return runs;
}

export function groupRuns(runs: Run[]): MatchGroup[] {
  if (runs.length === 0) return [];
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => {
    let cursor = i;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]!]!;
      cursor = parent[cursor]!;
    }
    return cursor;
  };
  const union = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };
  const cellOwners = new Map<string, number[]>();
  runs.forEach((run, index) => {
    for (const cell of run.cells) {
      const key = posKey(cell);
      const list = cellOwners.get(key);
      if (list) list.push(index);
      else cellOwners.set(key, [index]);
    }
  });
  for (const owners of cellOwners.values()) {
    for (let i = 1; i < owners.length; i += 1) union(owners[0]!, owners[i]!);
  }
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < runs.length; i += 1) {
    const root = find(i);
    const list = buckets.get(root);
    if (list) list.push(i);
    else buckets.set(root, [i]);
  }
  const groups: MatchGroup[] = [];
  for (const indexes of buckets.values()) {
    const grouped = indexes.map((i) => runs[i]!);
    const seen = new Set<string>();
    const cells: Pos[] = [];
    for (const run of grouped) {
      for (const cell of run.cells) {
        const key = posKey(cell);
        if (seen.has(key)) continue;
        seen.add(key);
        cells.push(cell);
      }
    }
    groups.push({ cells, runs: grouped, kind: grouped[0]!.kind });
  }
  return groups;
}

export function findMatchGroups(board: Board): MatchGroup[] {
  return groupRuns(findRuns(board));
}

export function hasAnyMatch(board: Board): boolean {
  return findRuns(board).length > 0;
}
