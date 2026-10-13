import { posKey } from './board';
import type { GroupShape, MatchGroup, Pos, Special } from './types';

export function classifyGroup(group: MatchGroup): GroupShape {
  const hasH = group.runs.some((run) => run.orientation === 'h');
  const hasV = group.runs.some((run) => run.orientation === 'v');
  if (group.runs.some((run) => run.length >= 5)) return 'rainbow';
  if (hasH && hasV && group.cells.length >= 5) return 'wrapped';
  const longest = group.runs.reduce((best, run) => (run.length > best.length ? run : best));
  if (longest.length >= 4) return longest.orientation === 'h' ? 'stripedH' : 'stripedV';
  return 'plain';
}

export function chooseSpawnCell(group: MatchGroup, focus: Pos[]): Pos {
  for (const candidate of focus) {
    if (group.cells.some((cell) => cell.r === candidate.r && cell.c === candidate.c)) return candidate;
  }
  const horizontal = new Set<string>();
  for (const run of group.runs) {
    if (run.orientation !== 'h') continue;
    for (const cell of run.cells) horizontal.add(posKey(cell));
  }
  for (const run of group.runs) {
    if (run.orientation !== 'v') continue;
    for (const cell of run.cells) {
      if (horizontal.has(posKey(cell))) return cell;
    }
  }
  const longest = group.runs.reduce((best, run) => (run.length > best.length ? run : best));
  return longest.cells[Math.floor((longest.cells.length - 1) / 2)]!;
}

export function shapeToSpecial(shape: GroupShape): { kind: 'rainbow' | 'keep'; special: Special } | null {
  if (shape === 'plain') return null;
  if (shape === 'rainbow') return { kind: 'rainbow', special: 'none' };
  if (shape === 'wrapped') return { kind: 'keep', special: 'wrapped' };
  if (shape === 'stripedH') return { kind: 'keep', special: 'stripedH' };
  return { kind: 'keep', special: 'stripedV' };
}
