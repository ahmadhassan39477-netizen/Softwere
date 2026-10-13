import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { boot, label, makeButton } from '../ui/widgets';
import { INK } from '../ui/layout';

export class FailScene extends Phaser.Scene {
  private pip!: Pip;
  private reduced = false;

  constructor() {
    super('Fail');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    this.reduced = services.save.settings.reducedMotion;
    services.audio.play('fail');
    if (this.textures.exists('bg-meadow')) this.add.image(360, 640, 'bg-meadow').setDisplaySize(720, 1280);
    label(this, 360, 180, t('soClose', lang), 60, INK);
    label(this, 360, 270, t('tryAgain', lang), 36, INK);
    label(this, 360, 330, t('gettingBetter', lang), 32, INK);
    if (runtime.lastResult) label(this, 360, 410, `${t('score', lang)} ${runtime.lastResult.score}`, 30, INK);
    this.pip = new Pip(this, 360, 640, 1.05);
    this.pip.setMood('encourage');
    makeButton(this, 360, 980, 460, 96, t('retry', lang), () => this.scene.start('Game'), 0xff5c8a);
    makeButton(this, 360, 1110, 360, 84, t('map', lang), () => this.scene.start('Map'), 0x6d4cb5);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }
}
