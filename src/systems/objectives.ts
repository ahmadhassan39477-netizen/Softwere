import type { ClearEffects, ObjectiveDef, ObjectiveProgress } from './types';

export function createProgress(defs: ObjectiveDef[]): ObjectiveProgress[] {
  return defs.map((def) => ({ def, current: 0 }));
}

export function applyEffects(progress: ObjectiveProgress[], effects: ClearEffects): void {
  for (const item of progress) {
    switch (item.def.type) {
      case 'collect':
        if (item.def.candy) item.current += effects.collected[item.def.candy] ?? 0;
        break;
      case 'jelly':
        item.current += effects.jelly;
        break;
      case 'wheels':
        item.current += effects.wheels;
        break;
      case 'obstacles':
        item.current += effects.obstacles;
        break;
      case 'stars':
        item.current += effects.stars;
        break;
      case 'rescue':
        item.current += effects.rescues;
        break;
      case 'specials':
        item.current += effects.specialsCreated;
        break;
      case 'score':
        break;
      default:
        break;
    }
  }
}

export function objectiveGoal(def: ObjectiveDef): number {
  if (def.type === 'score') return def.target ?? 0;
  return def.count ?? 0;
}

export function objectiveCurrent(item: ObjectiveProgress, score: number): number {
  if (item.def.type === 'score') return score;
  return item.current;
}

export function isObjectivesComplete(progress: ObjectiveProgress[], score: number): boolean {
  return progress.every((item) => objectiveCurrent(item, score) >= objectiveGoal(item.def));
}

function candyName(kind: string | undefined): string {
  if (!kind) return 'Candy';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function objectiveLabel(item: ObjectiveProgress, score: number): string {
  const goal = objectiveGoal(item.def);
  if (item.def.type === 'score') return `Score ${score}/${goal}`;
  const current = Math.min(objectiveCurrent(item, score), goal);
  switch (item.def.type) {
    case 'collect':
      return `${candyName(item.def.candy)} ${current}/${goal}`;
    case 'jelly':
      return `Jelly ${current}/${goal}`;
    case 'wheels':
      return `Wheels ${current}/${goal}`;
    case 'obstacles':
      return `Locks ${current}/${goal}`;
    case 'stars':
      return `Stars ${current}/${goal}`;
    case 'rescue':
      return `Toy cars ${current}/${goal}`;
    case 'specials':
      return `Specials ${current}/${goal}`;
    default:
      return `${current}/${goal}`;
  }
}
