import Phaser from 'phaser';
import type { Services } from '../game/services';
import { CREAM, FONT, INK, VIEW_W } from './layout';

export interface UiButton {
  root: Phaser.GameObjects.Container;
  setLabel(label: string): void;
  setEnabled(enabled: boolean): void;
  focus(): void;
  blur(): void;
  activate(): void;
}

export function boot(scene: Phaser.Scene): Services {
  const services = scene.registry.get('services') as Services;
  scene.input.on('pointerdown', () => services.audio.unlock());
  return services;
}

export function addBackground(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) {
    scene.add.image(VIEW_W / 2, 640, key).setDisplaySize(VIEW_W, 1280);
    return;
  }
  scene.add.rectangle(VIEW_W / 2, 640, VIEW_W, 1280, 0xfff6e8);
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = 0xfff6e8): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x3d2c6b, 0.12);
  graphics.fillRoundedRect(x - w / 2 + 6, y - h / 2 + 8, w, h, 28);
  graphics.fillStyle(fill, 1);
  graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, 28);
  graphics.lineStyle(4, 0xffffff, 0.9);
  graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 28);
  return graphics;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  fill = 0x6d4cb5,
): UiButton {
  const root = scene.add.container(x, y);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x2a1d4a, 0.18);
  shadow.fillRoundedRect(-width / 2 + 3, -height / 2 + 6, width, height, 22);
  const bg = scene.add.graphics();
  const focusRing = scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontSize: height >= 84 ? '32px' : '26px',
      color: CREAM,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  text.setStroke('#2A1D4A', 4);
  const draw = (color: number) => {
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 22);
    bg.fillStyle(0xffffff, 0.22);
    bg.fillRoundedRect(-width / 2 + 12, -height / 2 + 8, width - 24, height * 0.38, 16);
    bg.lineStyle(4, 0xffffff, 0.85);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 22);
  };
  draw(fill);
  root.add([shadow, bg, text, focusRing]);
  root.setSize(width, height);
  root.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
  let enabled = true;
  let pressed = false;
  const fire = () => {
    if (!enabled) return;
    pressed = false;
    root.setScale(1);
    const services = scene.registry.get('services') as Services | undefined;
    services?.audio.unlock();
    services?.audio.play('button');
    onClick();
  };
  const release = () => {
    if (!pressed) return;
    fire();
  };
  root.on('pointerover', () => {
    if (enabled && !pressed) root.setScale(1.03);
  });
  root.on('pointerout', () => {
    if (!pressed) root.setScale(1);
  });
  root.on('pointerdown', () => {
    if (!enabled) return;
    pressed = true;
    root.setScale(0.98);
  });
  root.on('pointerup', release);
  root.on('pointerupoutside', release);
  return {
    root,
    setLabel(next) {
      text.setText(next);
    },
    setEnabled(value) {
      enabled = value;
      root.setAlpha(value ? 1 : 0.45);
    },
    focus() {
      focusRing.clear();
      focusRing.lineStyle(4, 0xffe566, 1);
      focusRing.strokeRoundedRect(-width / 2 - 6, -height / 2 - 6, width + 12, height + 12, 26);
    },
    blur() {
      focusRing.clear();
    },
    activate: fire,
  };
}

export function bindMenu(scene: Phaser.Scene, buttons: UiButton[]): void {
  if (buttons.length === 0 || !scene.input.keyboard) return;
  let index = 0;
  buttons[0]?.focus();
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      buttons[index]?.blur();
      index = (index + 1) % buttons.length;
      buttons[index]?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      buttons[index]?.blur();
      index = (index - 1 + buttons.length) % buttons.length;
      buttons[index]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      buttons[index]?.activate();
    }
  };
  scene.input.keyboard.on('keydown', onKey);
  scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', onKey));
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 28, color = INK): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 640 },
    })
    .setOrigin(0.5);
}

let activeToast: Phaser.GameObjects.Container | null = null;

export function toast(scene: Phaser.Scene, message: string, reduced: boolean): void {
  activeToast?.destroy();
  const width = Math.min(640, 64 + message.length * 14);
  const root = scene.add.container(VIEW_W / 2, 230);
  const bg = panel(scene, 0, 0, width, 88, 0x3d2c6b);
  bg.setPosition(0, 0);
  const text = label(scene, 0, 0, message, 26, CREAM);
  root.add([bg, text]);
  root.setDepth(40);
  activeToast = root;
  scene.time.delayedCall(reduced ? 700 : 1400, () => {
    if (activeToast === root) activeToast = null;
    root.destroy();
  });
}

export function burst(scene: Phaser.Scene, x: number, y: number, reduced: boolean): void {
  if (reduced) return;
  const colors = [0xff5c8a, 0xffe14a, 0x7ddfc3, 0x7ec8ff, 0xc9b6ff, 0xffb084];
  for (let i = 0; i < 14; i += 1) {
    const dot = scene.add.circle(x, y, 7, colors[i % colors.length]!, 0.95).setDepth(30);
    const angle = (i / 14) * Math.PI * 2;
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * 120,
      y: y + Math.sin(angle) * 90,
      alpha: 0,
      duration: 650,
      onComplete: () => dot.destroy(),
    });
  }
}

export function confirmDialog(scene: Phaser.Scene, message: string, onYes: () => void, onNo: () => void): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(50);
  const dim = scene.add.rectangle(VIEW_W / 2, 640, VIEW_W, 1280, 0x2a1d4a, 0.45);
  const card = panel(scene, VIEW_W / 2, 640, 620, 420);
  const text = label(scene, VIEW_W / 2, 540, message, 32);
  const yes = makeButton(scene, VIEW_W / 2, 680, 420, 84, 'Yes, reset', () => {
    root.destroy();
    onYes();
  }, 0xc81e4a);
  const no = makeButton(scene, VIEW_W / 2, 790, 420, 84, 'Keep playing', () => {
    root.destroy();
    onNo();
  }, 0x14967a);
  root.add([dim, card, text, yes.root, no.root]);
  return root;
}
