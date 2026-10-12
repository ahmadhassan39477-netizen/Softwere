import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { REGIONS } from '../config/collection';
import { LEVELS } from '../config/levels';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { regionUnlocked } from '../systems/economy';
import { boot, label, makeButton, toast } from '../ui/widgets';
import { FONT, INK } from '../ui/layout';

export class MapScene extends Phaser.Scene {
  private pip!: Pip;
  private reduced = false;
  private moved = false;

  constructor() {
    super('Map');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    this.reduced = services.save.settings.reducedMotion;
    this.cameras.main.fadeIn(this.reduced ? 1 : 180, 255, 246, 232);
    const bg = services.save.highestUnlocked >= 14 ? 'bg-mountain' : services.save.highestUnlocked >= 7 ? 'bg-bay' : 'bg-meadow';
    if (this.textures.exists(bg)) this.add.image(360, 640, bg).setDisplaySize(720, 1280);
    label(this, 360, 64, t('title', lang), 36, INK);
    const coins = this.add.image(250, 118, 'coin').setDisplaySize(42, 42);
    if (!this.textures.exists('coin')) coins.setVisible(false);
    label(this, 320, 118, `${services.save.coins}`, 28, INK).setOrigin(0, 0.5);

    const world = this.add.container(0, 160);
    const path = this.add.graphics();
    world.add(path);
    const positions = LEVELS.map((_, index) => ({
      x: 360 + Math.sin(index * 0.9) * 170,
      y: 50 + index * 98,
    }));
    path.lineStyle(22, 0xffc4a3, 1);
    path.beginPath();
    positions.forEach((pos, index) => {
      if (index === 0) path.moveTo(pos.x, pos.y);
      else path.lineTo(pos.x, pos.y);
    });
    path.strokePath();
    path.lineStyle(8, 0xfff6e8, 1);
    path.beginPath();
    positions.forEach((pos, index) => {
      if (index === 0) path.moveTo(pos.x, pos.y);
      else path.lineTo(pos.x, pos.y);
    });
    path.strokePath();

    REGIONS.forEach((region) => {
      const pos = positions[region.start - 1];
      if (!pos) return;
      const tag = this.add
        .text(pos.x, pos.y - 48, region.name, { fontFamily: FONT, fontSize: '22px', color: INK, fontStyle: 'bold' })
        .setOrigin(0.5);
      world.add(tag);
    });

    LEVELS.forEach((level, index) => {
      const pos = positions[index]!;
      const unlocked = level.number <= services.save.highestUnlocked;
      const record = services.save.levels[String(level.number)];
      const current = level.number === services.save.highestUnlocked;
      const node = this.add.container(pos.x, pos.y);
      const circle = this.add.circle(0, 0, 34, unlocked ? (current ? 0xffe566 : 0xfff6e8) : 0xd9d0e6);
      circle.setStrokeStyle(5, unlocked ? 0x6d4cb5 : 0x8d84a3);
      const number = this.add
        .text(0, unlocked ? -2 : -8, String(level.number), {
          fontFamily: FONT,
          fontSize: unlocked ? '28px' : '22px',
          color: INK,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setAlpha(unlocked ? 1 : 0.7);
      node.add([circle, number]);
      if (!unlocked) {
        const lock = this.add.graphics();
        lock.lineStyle(3, 0x3d2c6b, 1);
        lock.strokeRoundedRect(-8, 8, 16, 12, 3);
        lock.strokeCircle(0, 6, 5);
        node.add(lock);
      } else if (record && record.stars > 0) {
        for (let star = 0; star < 3; star += 1) {
          node.add(this.add.circle(-16 + star * 16, 28, 5, star < record.stars ? 0xffe14a : 0xffffff).setStrokeStyle(2, 0xe0a800));
        }
      }
      node.setSize(80, 80);
      node.setInteractive(new Phaser.Geom.Circle(0, 0, 36), Phaser.Geom.Circle.Contains);
      node.on('pointerup', () => {
        if (this.moved) return;
        if (!unlocked) {
          const region = REGIONS.find((item) => level.number >= item.start && level.number <= item.end);
          const message = region && !regionUnlocked(services.save, region.start) ? t('regionLocked', lang) : t('locked', lang);
          toast(this, message, this.reduced);
          return;
        }
        runtime.levelNumber = level.number;
        this.scene.start('LevelPrep');
      });
      world.add(node);
      if (current && !this.reduced) {
        this.tweens.add({ targets: circle, scale: 1.08, yoyo: true, repeat: -1, duration: 700 });
      }
    });

    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff);
    mask.fillRect(0, 150, 720, 900);
    world.setMask(mask.createGeometryMask());

    const contentHeight = 50 + 19 * 98 + 80;
    const minY = 150 + 900 - contentHeight;
    const focus = positions[services.save.highestUnlocked - 1] ?? positions[0]!;
    world.y = Phaser.Math.Clamp(150 + 420 - focus.y, minY, 150);
    let startY = 0;
    let startOffset = world.y;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < 150 || pointer.y > 1050) return;
      startY = pointer.y;
      startOffset = world.y;
      this.moved = false;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || pointer.y < 120) return;
      if (Math.abs(pointer.y - startY) > 14) this.moved = true;
      if (this.moved) world.y = Phaser.Math.Clamp(startOffset + (pointer.y - startY), minY, 150);
    });
    this.input.on('pointerup', () => {
      this.time.delayedCall(40, () => {
        this.moved = false;
      });
    });
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (pointer.y < 150 || pointer.y > 1050) return;
      world.y = Phaser.Math.Clamp(world.y - dy * 0.5, minY, 150);
    });

    this.pip = new Pip(this, 78, 90, 0.36);
    makeButton(this, 210, 1116, 300, 80, t('garage', lang), () => this.scene.start('Garage'), 0xff5c8a);
    makeButton(this, 520, 1116, 300, 80, t('workshop', lang), () => this.scene.start('Fitting'), 0xc47b12);
    makeButton(this, 210, 1210, 300, 80, t('stickers', lang), () => this.scene.start('Collection'), 0x6d4cb5);
    makeButton(this, 520, 1210, 300, 80, t('settings', lang), () => {
      runtime.returnScene = 'Map';
      this.scene.start('Settings', { from: 'Map' });
    }, 0x4c8dff);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }
}
