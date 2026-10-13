import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { levelByNumber } from '../config/levels';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { canPlayLevel } from '../systems/economy';
import { boot, burst, label, makeButton } from '../ui/widgets';
import { INK } from '../ui/layout';

export class VictoryScene extends Phaser.Scene {
  private pip!: Pip;
  private reduced = false;

  constructor() {
    super('Victory');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    this.reduced = services.save.settings.reducedMotion;
    const result = runtime.lastResult;
    if (!result || !result.won) {
      this.scene.start('Map');
      return;
    }
    services.audio.play('victory');
    if (this.textures.exists('bg-sky')) this.add.image(360, 640, 'bg-sky').setDisplaySize(720, 1280);
    label(this, 360, 150, t('youDidIt', lang), 60, INK);
    label(this, 360, 220, t('proud', lang), 30, INK);
    label(this, 360, 300, `${t('score', lang)} ${result.score}`, 36, INK);
    for (let i = 0; i < 3; i += 1) {
      const star = this.add.circle(280 + i * 80, 400, 24, i < result.stars ? 0xffe14a : 0xffffff);
      star.setStrokeStyle(5, 0xe0a800);
      if (!this.reduced && i < result.stars) {
        star.setScale(0.2);
        this.tweens.add({ targets: star, scale: 1, delay: 150 * i, duration: 280, ease: 'Back.easeOut' });
      }
    }
    if (result.coinsAwarded > 0) {
      if (this.textures.exists('coin')) this.add.image(300, 490, 'coin').setDisplaySize(48, 48);
      label(this, 390, 490, `${t('coinsEarned', lang)} +${result.coinsAwarded}`, 30, INK);
    } else {
      label(this, 360, 490, t('scoreSaved', lang), 30, INK);
    }
    const level = levelByNumber(result.levelNumber);
    if (level?.number === 20) label(this, 360, 570, t('finale', lang), 28, INK);
    this.pip = new Pip(this, 360, 760, 1);
    this.pip.setMood('celebrate');
    burst(this, 360, 700, this.reduced);
    const nextLevel = result.levelNumber + 1;
    if (nextLevel <= 20 && canPlayLevel(services.save, nextLevel)) {
      makeButton(this, 360, 980, 460, 90, t('next', lang), () => {
        runtime.levelNumber = nextLevel;
        this.scene.start('LevelPrep');
      }, 0xff5c8a);
    }
    makeButton(this, 360, 1090, 460, 80, t('retry', lang), () => this.scene.start('Game'), 0x6d4cb5);
    makeButton(this, 360, 1190, 300, 72, t('map', lang), () => this.scene.start('Map'), 0x4c8dff);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }
}
