import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { generateTextures } from '../art/textures';
import { t } from '../config/text';
import { boot, label, makeButton } from '../ui/widgets';
import { INK } from '../ui/layout';

export class LoadingScene extends Phaser.Scene {
  private pip!: Pip;
  private reduced = false;
  private bar!: Phaser.GameObjects.Graphics;
  private progress = 0;

  constructor() {
    super('Loading');
  }

  create(): void {
    const services = boot(this);
    this.reduced = services.save.settings.reducedMotion;
    this.cameras.main.fadeIn(this.reduced ? 1 : 180, 255, 246, 232);
    this.add.rectangle(360, 640, 720, 1280, 0xfff6e8);
    label(this, 360, 280, t('title', services.save.settings.language), 52, INK);
    this.pip = new Pip(this, 360, 520, 1.1);
    this.bar = this.add.graphics();
    label(this, 360, 760, t('loading', services.save.settings.language), 28, INK);
    void this.run(services.save.settings.language);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
    this.drawBar();
  }

  private drawBar(): void {
    this.bar.clear();
    this.bar.fillStyle(0xffffff, 1);
    this.bar.fillRoundedRect(120, 820, 480, 36, 18);
    this.bar.fillStyle(0xff5c8a, 1);
    this.bar.fillRoundedRect(126, 826, Math.max(12, 468 * this.progress), 24, 12);
  }

  private async run(language: string): Promise<void> {
    const steps = [0.2, 0.45, 0.7, 0.9, 1];
    let errors: string[] = [];
    for (let i = 0; i < steps.length; i += 1) {
      if (i === 2) {
        try {
          errors = generateTextures(this);
        } catch {
          errors = ['artwork'];
        }
      }
      this.progress = steps[i] ?? 1;
      await this.wait(this.reduced ? 30 : 140);
    }
    if (errors.length > 0) {
      label(this, 360, 900, t('loadError', language), 28, '#C81E4A');
      makeButton(this, 360, 1020, 320, 84, t('retryLoad', language), () => this.scene.restart(), 0xc81e4a);
      return;
    }
    this.cameras.main.fadeOut(this.reduced ? 1 : 180, 255, 246, 232);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Welcome'));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, () => resolve());
    });
  }
}
