import { STARTER_CAR_ID, carById, type CarDef } from '../config/cars';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'candy-car-adventure-v1';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LevelRecord {
  bestScore: number;
  stars: number;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface CarCustomization {
  paint: string;
  wheels: string;
}

export interface SaveSettings {
  music: number;
  sfx: number;
  mute: boolean;
  reducedMotion: boolean;
  language: string;
}

export interface FittingRecord {
  completed: boolean;
  rewardClaimed: boolean;
}

export interface SaveData {
  version: number;
  hasProgress: boolean;
  tutorialSeen: boolean;
  highestUnlocked: number;
  coins: number;
  levels: Record<string, LevelRecord>;
  ownedCars: string[];
  selectedCar: string;
  customization: Record<string, CarCustomization>;
  stickers: string[];
  achievements: string[];
  fitting: Record<string, FittingRecord>;
  settings: SaveSettings;
  seenIntros: number[];
  milestones: { madeSpecial: boolean; usedSpecial: boolean };
}

export function defaultSettings(): SaveSettings {
  return { music: 0.45, sfx: 0.8, mute: false, reducedMotion: false, language: 'en' };
}

export function defaultCustomization(car: CarDef): CarCustomization {
  return { paint: car.paints[0]?.id ?? 'berry', wheels: car.wheels[0]?.id ?? 'chunky' };
}

export function defaultSave(): SaveData {
  const starter = carById(STARTER_CAR_ID)!;
  return {
    version: SAVE_VERSION,
    hasProgress: false,
    tutorialSeen: false,
    highestUnlocked: 1,
    coins: 0,
    levels: {},
    ownedCars: [STARTER_CAR_ID],
    selectedCar: STARTER_CAR_ID,
    customization: { [STARTER_CAR_ID]: defaultCustomization(starter) },
    stickers: [],
    achievements: [],
    fitting: {},
    settings: defaultSettings(),
    seenIntros: [],
    milestones: { madeSpecial: false, usedSpecial: false },
  };
}

export function sanitizeCoins(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.floor(number));
}

function clampUnit(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function sanitizeLevelRecord(value: unknown): LevelRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<LevelRecord>;
  return {
    bestScore: sanitizeCoins(record.bestScore),
    stars: Math.min(3, sanitizeCoins(record.stars)),
    completed: Boolean(record.completed),
    rewardClaimed: Boolean(record.rewardClaimed),
  };
}

function sanitizeCustomization(car: CarDef, value: unknown): CarCustomization {
  const fallback = defaultCustomization(car);
  if (!value || typeof value !== 'object') return fallback;
  const record = value as Partial<CarCustomization>;
  const paint = car.paints.some((item) => item.id === record.paint) ? record.paint! : fallback.paint;
  const wheels = car.wheels.some((item) => item.id === record.wheels) ? record.wheels! : fallback.wheels;
  return { paint, wheels };
}

export function normalizeSave(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<SaveData> & { version?: unknown };
  const version = typeof input.version === 'number' ? input.version : 0;

  const levels: Record<string, LevelRecord> = {};
  if (input.levels && typeof input.levels === 'object') {
    for (const [key, value] of Object.entries(input.levels)) {
      const number = Number(key);
      if (!Number.isInteger(number) || number < 1 || number > 40) continue;
      const record = sanitizeLevelRecord(value);
      if (record) levels[String(number)] = record;
    }
  }

  const owned = new Set<string>([STARTER_CAR_ID]);
  if (Array.isArray(input.ownedCars)) {
    for (const id of input.ownedCars) {
      if (typeof id === 'string' && carById(id)) owned.add(id);
    }
  }

  const customization: Record<string, CarCustomization> = {};
  for (const id of owned) {
    const car = carById(id);
    if (!car) continue;
    const rawCustom = input.customization && typeof input.customization === 'object' ? input.customization[id] : undefined;
    customization[id] = sanitizeCustomization(car, rawCustom);
  }

  const selected = typeof input.selectedCar === 'string' && owned.has(input.selectedCar) ? input.selectedCar : STARTER_CAR_ID;
  const highest = sanitizeCoins(input.highestUnlocked);
  const settingsInput = input.settings && typeof input.settings === 'object' ? input.settings : {};
  const settingsRecord = settingsInput as Partial<SaveSettings>;
  const fitting: Record<string, FittingRecord> = {};
  if (input.fitting && typeof input.fitting === 'object') {
    for (const [key, value] of Object.entries(input.fitting)) {
      if (!value || typeof value !== 'object') continue;
      const record = value as Partial<FittingRecord>;
      fitting[key] = { completed: Boolean(record.completed), rewardClaimed: Boolean(record.rewardClaimed) };
    }
  }

  const milestonesInput = input.milestones && typeof input.milestones === 'object' ? input.milestones : {};
  const milestones = milestonesInput as Partial<SaveData['milestones']>;

  return {
    version: SAVE_VERSION,
    hasProgress: Boolean(input.hasProgress),
    tutorialSeen: Boolean(input.tutorialSeen),
    highestUnlocked: Math.min(20, Math.max(1, highest || 1)),
    coins: sanitizeCoins(input.coins),
    levels,
    ownedCars: [...owned],
    selectedCar: selected,
    customization,
    stickers: uniqueStrings(input.stickers),
    achievements: uniqueStrings(input.achievements),
    fitting,
    settings: {
      music: clampUnit(settingsRecord.music, base.settings.music),
      sfx: clampUnit(settingsRecord.sfx, base.settings.sfx),
      mute: Boolean(settingsRecord.mute),
      reducedMotion: Boolean(settingsRecord.reducedMotion),
      language: typeof settingsRecord.language === 'string' && settingsRecord.language.length > 0 ? settingsRecord.language : 'en',
    },
    seenIntros: Array.isArray(input.seenIntros)
      ? input.seenIntros.filter((item) => Number.isInteger(item) && item >= 1 && item <= 40)
      : [],
    milestones: {
      madeSpecial: Boolean(milestones.madeSpecial),
      usedSpecial: Boolean(milestones.usedSpecial),
    },
  };
  void version;
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0 && item.length < 80) seen.add(item);
  }
  return [...seen];
}

export function memoryStore(initial?: Record<string, string>): KeyValueStore {
  const data = { ...initial };
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

export function loadSave(store: KeyValueStore, key = SAVE_KEY): SaveData {
  const raw = store.getItem(key);
  if (!raw) return defaultSave();
  try {
    return normalizeSave(JSON.parse(raw) as unknown);
  } catch {
    return defaultSave();
  }
}

export function writeSave(store: KeyValueStore, save: SaveData, key = SAVE_KEY): SaveData {
  const clean = normalizeSave(save);
  store.setItem(key, JSON.stringify(clean));
  return clean;
}

export function browserStore(): KeyValueStore {
  return {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Ignore private-mode storage failures. */
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* Ignore private-mode storage failures. */
      }
    },
  };
}

export function resetProgress(save: SaveData): SaveData {
  const fresh = defaultSave();
  fresh.settings = { ...save.settings };
  return fresh;
}
