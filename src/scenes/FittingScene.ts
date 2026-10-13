import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { FITTING_CHALLENGES } from '../config/fittingChallenges';
import { t } from '../config/text';
import { claimFittingReward } from '../systems/economy';
import { evaluatePlacement, isFittingComplete, type FittingChallenge, type FittingPiece } from '../systems/fitting';
import { boot, burst, label, makeButton, panel } from '../ui/widgets';
import { FONT, INK } from '../ui/layout';

interface PieceView {
  piece: FittingPiece;
  root: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
}

export class FittingScene extends Phaser.Scene {
  private challengeId: string | null = null;
  private pip!: Pip;
  private reduced = false;
  private selected: PieceView | null = null;
  private placements: Record<string, string> = {};
  private pieces: PieceView[] = [];
  private celebrated = false;

  constructor() {
    super('Fitting');
  }

  init(data: { id?: string | null }): void {
    this.challengeId = data?.id ? data.id : null;
  }

  create(): void {
    const services = boot(this);
    this.reduced = services.save.settings.reducedMotion;
    this.selected = null;
    this.placements = {};
    this.pieces = [];
    this.celebrated = false;
    if (this.textures.exists('bg-bay')) this.add.image(360, 640, 'bg-bay').setDisplaySize(720, 1280);
    this.pip = new Pip(this, 80, 160, 0.42);
    if (!this.challengeId) this.showList();
    else this.showPuzzle(FITTING_CHALLENGES.find((item) => item.id === this.challengeId) ?? FITTING_CHALLENGES[0]!);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }

  private showList(): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    const lang = services.save.settings.language;
    label(this, 360, 80, t('workshop', lang), 48, INK);
    FITTING_CHALLENGES.forEach((challenge, index) => {
      const done = services.save.fitting[challenge.id]?.completed;
      makeButton(
        this,
        360,
        280 + index * 140,
        560,
        110,
        `${challenge.title}${done ? '  ✓' : ''}`,
        () => this.scene.restart({ id: challenge.id }),
        done ? 0x14967a : 0x6d4cb5,
      );
    });
    makeButton(this, 360, 1180, 240, 76, t('map', lang), () => this.scene.start('Map'), 0x4c8dff);
  }

  private showPuzzle(challenge: FittingChallenge): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    const lang = services.save.settings.language;
    label(this, 430, 70, challenge.title, 36, INK);
    label(this, 360, 150, challenge.clue, 26, INK);
    const slots = slotLayout(challenge.slots.length);
    const slotViews = challenge.slots.map((slot, index) => {
      const pos = slots[index]!;
      const zone = this.add.rectangle(pos.x, pos.y, 150, 140, 0xfff6e8, 0.95).setStrokeStyle(4, 0x6d4cb5);
      zone.setInteractive();
      this.add.text(pos.x, pos.y + 54, slot.label, { fontFamily: FONT, fontSize: '22px', color: INK, fontStyle: 'bold' }).setOrigin(0.5);
      zone.on('pointerup', () => {
        if (!this.selected) return;
        this.tryPlace(challenge, slot.id, this.selected, pos.x, pos.y);
      });
      return { slot, zone, x: pos.x, y: pos.y };
    });
    challenge.pieces.forEach((piece, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const homeX = 140 + col * 220;
      const homeY = 860 + row * 150;
      const root = this.add.container(homeX, homeY);
      const art = this.add.graphics();
      drawPiece(art, piece);
      const name = this.add.text(0, 62, piece.label, { fontFamily: FONT, fontSize: '18px', color: INK, align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5);
      root.add([art, name]);
      root.setSize(130, 130);
      root.setInteractive(new Phaser.Geom.Rectangle(-65, -65, 130, 130), Phaser.Geom.Rectangle.Contains);
      this.input.setDraggable(root);
      const view: PieceView = { piece, root, homeX, homeY };
      root.on('pointerup', () => {
        this.selected = view;
        this.pieces.forEach((item) => item.root.setScale(item === view ? 1.08 : 1));
      });
      root.on('drag', (pointer: Phaser.Input.Pointer) => {
        root.setPosition(pointer.worldX, pointer.worldY);
      });
      root.on('dragend', () => {
        const hit = slotViews.find((slot) => Phaser.Math.Distance.Between(root.x, root.y, slot.x, slot.y) < 100);
        if (!hit) {
          this.returnHome(view);
          return;
        }
        this.tryPlace(challenge, hit.slot.id, view, hit.x, hit.y);
      });
      this.pieces.push(view);
    });
    makeButton(this, 180, 1180, 200, 72, t('back', lang), () => this.scene.restart({ id: null }), 0x6d4cb5);
    makeButton(this, 500, 1180, 240, 72, t('retry', lang), () => this.scene.restart({ id: challenge.id }), 0xff5c8a);
  }

  private tryPlace(challenge: FittingChallenge, slotId: string, view: PieceView, x: number, y: number): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    const lang = services.save.settings.language;
    const outcome = evaluatePlacement(challenge, slotId, view.piece.id);
    if (outcome !== 'snap') {
      services.audio.play('invalid');
      this.pip.setMood('encourage');
      this.returnHome(view);
      return;
    }
    Object.entries(this.placements).forEach(([key, pieceId]) => {
      if (pieceId === view.piece.id) delete this.placements[key];
    });
    const previous = this.placements[slotId];
    if (previous && previous !== view.piece.id) {
      const other = this.pieces.find((item) => item.piece.id === previous);
      if (other) this.returnHome(other);
    }
    this.placements[slotId] = view.piece.id;
    view.root.setPosition(x, y - 10);
    services.audio.play('match');
    this.pip.setMood('happy');
    if (!isFittingComplete(challenge, this.placements) || this.celebrated) return;
    this.celebrated = true;
    const reward = claimFittingReward(services.save, challenge);
    services.replace(reward.save);
    this.pip.setMood('celebrate');
    burst(this, 360, 520, this.reduced);
    services.audio.play('reward');
    this.showPrize(lang, reward.coinsAwarded);
  }

  private showPrize(lang: string, coins: number): void {
    const root = this.add.container(0, 0).setDepth(80);
    const dim = this.add.rectangle(360, 640, 720, 1280, 0x2a1d4a, 0.45).setInteractive();
    const card = panel(this, 360, 640, 600, 380);
    const title = label(this, 360, 540, coins > 0 ? t('prize', lang) : t('alreadyPrize', lang), 32, INK);
    const detail = label(this, 360, 640, coins > 0 ? `${t('coinsEarned', lang)} +${coins}` : t('yay', lang), 30, INK);
    const yay = makeButton(this, 360, 760, 320, 84, t('yay', lang), () => this.scene.restart({ id: null }), 0xff5c8a);
    root.add([dim, card, title, detail, yay.root]);
  }

  private returnHome(view: PieceView): void {
    Object.entries(this.placements).forEach(([key, pieceId]) => {
      if (pieceId === view.piece.id) delete this.placements[key];
    });
    if (this.reduced) view.root.setPosition(view.homeX, view.homeY);
    else this.tweens.add({ targets: view.root, x: view.homeX, y: view.homeY, duration: 180 });
  }
}

function slotLayout(count: number): { x: number; y: number }[] {
  if (count <= 1) return [{ x: 360, y: 420 }];
  if (count === 2) return [{ x: 230, y: 430 }, { x: 500, y: 430 }];
  return [
    { x: 360, y: 340 },
    { x: 210, y: 520 },
    { x: 520, y: 520 },
  ];
}

function drawPiece(graphics: Phaser.GameObjects.Graphics, piece: FittingPiece): void {
  const color = Phaser.Display.Color.HexStringToColor(piece.color).color;
  graphics.fillStyle(color, 1);
  graphics.lineStyle(4, 0x3d2c6b, 1);
  if (piece.shape === 'wedge') {
    graphics.fillTriangle(-40, 30, 40, 30, 0, -40);
    graphics.strokeTriangle(-40, 30, 40, 30, 0, -40);
  } else if (piece.shape === 'dome' || piece.shape === 'bubble') {
    graphics.fillEllipse(0, 0, 90, 70);
    graphics.strokeEllipse(0, 0, 90, 70);
  } else if (piece.shape === 'cloud') {
    graphics.fillCircle(-16, 6, 22);
    graphics.fillCircle(16, 6, 22);
    graphics.fillCircle(0, -10, 24);
  } else if (piece.shape === 'star') {
    graphics.fillTriangle(0, -36, -14, 10, 14, 10);
    graphics.fillTriangle(0, 20, -28, -8, 28, -8);
  } else {
    graphics.fillCircle(0, 0, 36);
    graphics.strokeCircle(0, 0, 36);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(0, 0, 12);
  }
}
