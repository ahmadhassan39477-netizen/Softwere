import Phaser from 'phaser';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { boot, label, makeButton, panel } from '../ui/widgets';
import { INK } from '../ui/layout';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    this.add.rectangle(360, 640, 720, 1280, 0x2a1d4a, 0.45);
    panel(this, 360, 640, 560, 760);
    label(this, 360, 360, t('pause', lang), 52, INK);
    makeButton(this, 360, 500, 400, 88, t('resume', lang), () => {
      this.scene.stop();
      this.scene.resume('Game');
    }, 0x14967a);
    makeButton(this, 360, 610, 400, 88, t('restart', lang), () => {
      this.scene.stop('Game');
      this.scene.stop();
      this.scene.start('Game');
    }, 0xff5c8a);
    makeButton(this, 360, 720, 400, 88, t('settings', lang), () => {
      runtime.returnScene = 'Pause';
      this.scene.start('Settings', { from: 'Pause' });
    }, 0x4c8dff);
    makeButton(this, 360, 830, 400, 88, t('map', lang), () => {
      this.scene.stop('Game');
      this.scene.stop();
      this.scene.start('Map');
    }, 0x6d4cb5);
  }
}
