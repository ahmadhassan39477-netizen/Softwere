import Phaser from 'phaser';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { resetProgress } from '../systems/save';
import { boot, confirmDialog, label, makeButton } from '../ui/widgets';
import { INK } from '../ui/layout';

export class SettingsScene extends Phaser.Scene {
  private from = 'Welcome';

  constructor() {
    super('Settings');
  }

  init(data: { from?: string }): void {
    if (data?.from) this.from = data.from;
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    if (this.textures.exists('bg-sky')) this.add.image(360, 640, 'bg-sky').setDisplaySize(720, 1280);
    label(this, 360, 90, t('settings', lang), 52, INK);
    this.slider(360, 230, services.save.settings.music, t('music', lang), (value) => {
      services.save.settings.music = value;
      services.persist();
    });
    this.slider(360, 360, services.save.settings.sfx, t('sfx', lang), (value) => {
      services.save.settings.sfx = value;
      services.persist();
    });
    makeButton(this, 360, 500, 420, 80, services.save.settings.mute ? t('unmute', lang) : t('mute', lang), () => {
      services.save.settings.mute = !services.save.settings.mute;
      services.persist();
      this.scene.restart();
    }, 0x6d4cb5);
    makeButton(
      this,
      360,
      610,
      420,
      80,
      services.save.settings.reducedMotion ? t('motionOn', lang) : t('motion', lang),
      () => {
        services.save.settings.reducedMotion = !services.save.settings.reducedMotion;
        services.persist();
        this.scene.restart();
      },
      0x4c8dff,
    );
    label(this, 360, 720, `${t('language', lang)}: ${t('languageValue', lang)}`, 28, INK);
    makeButton(this, 360, 840, 420, 80, t('reset', lang), () => {
      confirmDialog(
        this,
        t('resetAsk', lang),
        () => {
          services.replace(resetProgress(services.save));
          runtime.levelNumber = 1;
          runtime.lastResult = null;
          this.scene.start('Welcome');
        },
        () => undefined,
      );
    }, 0xc81e4a);
    makeButton(this, 360, 1120, 280, 80, t('back', lang), () => {
      const target = this.from || runtime.returnScene || 'Welcome';
      if (target === 'Pause') this.scene.start('Pause');
      else this.scene.start(target);
    }, 0x14967a);
  }

  private slider(x: number, y: number, value: number, caption: string, onChange: (value: number) => void): void {
    label(this, x, y - 50, caption, 28, INK);
    const left = x - 210;
    this.add.rectangle(x, y, 420, 18, 0xc9b6ff).setInteractive().on('pointerdown', (pointer: Phaser.Input.Pointer) => apply(pointer.worldX));
    const handle = this.add.circle(left + value * 420, y, 24, 0x6d4cb5).setInteractive({ draggable: true, useHandCursor: true });
    handle.setStrokeStyle(4, 0xffffff);
    this.input.setDraggable(handle);
    const apply = (worldX: number) => {
      const next = Phaser.Math.Clamp((worldX - left) / 420, 0, 1);
      handle.x = left + next * 420;
      onChange(next);
    };
    handle.on('drag', (pointer: Phaser.Input.Pointer) => apply(pointer.worldX));
  }
}
