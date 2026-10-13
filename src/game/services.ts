import { AudioManager } from '../audio/AudioManager';
import { browserStore, loadSave, SAVE_KEY, writeSave, type SaveData } from '../systems/save';

export interface Services {
  save: SaveData;
  audio: AudioManager;
  persist(): void;
  replace(next: SaveData): void;
}

export function createServices(): Services {
  const store = browserStore();
  const hadSave = store.getItem(SAVE_KEY) !== null;
  let save = loadSave(store);
  if (!hadSave && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    save = { ...save, settings: { ...save.settings, reducedMotion: true } };
    save = writeSave(store, save);
  }
  const audio = new AudioManager();
  const services: Services = {
    save,
    audio,
    persist() {
      services.save = writeSave(store, services.save);
      audio.apply(services.save.settings);
    },
    replace(next) {
      services.save = writeSave(store, next);
      audio.apply(services.save.settings);
    },
  };
  audio.apply(save.settings);
  return services;
}
