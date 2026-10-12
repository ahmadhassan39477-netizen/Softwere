import type { SaveSettings } from '../systems/save';

type SfxName = 'button' | 'swap' | 'invalid' | 'match' | 'special' | 'reward' | 'victory' | 'fail' | 'cascade';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private started = false;
  private timer = 0;
  private settings: SaveSettings = { music: 0.45, sfx: 0.8, mute: false, reducedMotion: false, language: 'en' };

  apply(settings: SaveSettings): void {
    this.settings = settings;
    this.updateGains();
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.updateGains();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.started) {
      this.started = true;
      this.scheduleMusic();
    }
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.sfxGain || this.settings.mute || this.settings.sfx <= 0) return;
    const now = this.ctx.currentTime;
    const tone = (freq: number, delay: number, dur: number, type: OscillatorType, gain: number) => {
      this.blip(freq, now + delay, dur, type, this.sfxGain!, gain);
    };
    if (name === 'button') tone(620, 0, 0.07, 'sine', 0.08);
    if (name === 'swap') {
      tone(480, 0, 0.06, 'triangle', 0.06);
      tone(640, 0.05, 0.06, 'triangle', 0.05);
    }
    if (name === 'invalid') tone(220, 0, 0.1, 'sine', 0.05);
    if (name === 'match') {
      tone(523, 0, 0.08, 'sine', 0.07);
      tone(659, 0.07, 0.1, 'sine', 0.06);
    }
    if (name === 'cascade') {
      tone(698, 0, 0.08, 'sine', 0.06);
      tone(880, 0.06, 0.1, 'sine', 0.05);
    }
    if (name === 'special') {
      tone(523, 0, 0.08, 'triangle', 0.07);
      tone(784, 0.07, 0.1, 'triangle', 0.06);
      tone(1046, 0.14, 0.14, 'sine', 0.05);
    }
    if (name === 'reward') {
      tone(880, 0, 0.08, 'sine', 0.07);
      tone(1174, 0.08, 0.12, 'sine', 0.06);
    }
    if (name === 'victory') {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, index * 0.1, 0.16, 'sine', 0.07));
    }
    if (name === 'fail') {
      tone(392, 0, 0.12, 'sine', 0.05);
      tone(330, 0.12, 0.16, 'sine', 0.04);
    }
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicGain || !this.started) return;
    const notes = [262, 330, 392, 330, 294, 392, 440, 392];
    const start = this.ctx.currentTime + 0.05;
    notes.forEach((freq, index) => {
      this.blip(freq, start + index * 0.42, 0.36, 'sine', this.musicGain!, 0.045);
    });
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.scheduleMusic(), 3600);
  }

  private blip(freq: number, when: number, duration: number, type: OscillatorType, destination: GainNode, amount: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amount), when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private updateGains(): void {
    const music = this.settings.mute ? 0 : this.settings.music;
    const sfx = this.settings.mute ? 0 : this.settings.sfx;
    this.musicGain?.gain.setValueAtTime(music, this.ctx?.currentTime ?? 0);
    this.sfxGain?.gain.setValueAtTime(sfx, this.ctx?.currentTime ?? 0);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
