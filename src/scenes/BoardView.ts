import Phaser from 'phaser';
import { candyTextureKey } from '../art/textures';
import { posKey } from '../systems/board';
import type { Board, Candy, Pos, ScriptStep } from '../systems/types';
import { BOARD_X, BOARD_Y, CELL, cellCenter } from '../ui/layout';

interface Mods {
  jelly: number;
  wheel: boolean;
  trapped: boolean;
  blocker: boolean;
}

export class BoardView {
  private tiles: Phaser.GameObjects.Image[] = [];
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private at = new Map<string, number>();
  private mods: Mods[][] = [];
  private selection: Phaser.GameObjects.Graphics;
  private hint: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private reduced: boolean,
  ) {
    this.selection = scene.add.graphics().setDepth(4);
    this.hint = scene.add.graphics().setDepth(3);
  }

  sync(board: Board): void {
    this.mods = board.cells.map((row) =>
      row.map((cell) => ({ jelly: cell.jelly, wheel: cell.wheel, trapped: cell.trapped, blocker: cell.blocker })),
    );
    this.drawTiles();
    const keep = new Set<number>();
    for (let r = 0; r < board.rows; r += 1) {
      for (let c = 0; c < board.cols; c += 1) {
        const candy = board.cells[r]![c]!.candy;
        if (!candy) continue;
        keep.add(candy.id);
        this.ensure(candy, r, c, false);
      }
    }
    for (const [id, sprite] of this.sprites) {
      if (!keep.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
    this.rebuildIndex();
  }

  showSelection(pos: Pos | null, armed: boolean): void {
    this.selection.clear();
    if (!pos) return;
    const center = cellCenter(pos.r, pos.c);
    this.selection.lineStyle(armed ? 6 : 4, armed ? 0xffe566 : 0xffffff, 1);
    this.selection.strokeRoundedRect(center.x - CELL / 2 + 4, center.y - CELL / 2 + 4, CELL - 8, CELL - 8, 16);
  }

  showHint(from: Pos, to: Pos): void {
    this.scene.tweens.killTweensOf(this.hint);
    this.hint.clear();
    this.hint.setAlpha(1);
    for (const pos of [from, to]) {
      const center = cellCenter(pos.r, pos.c);
      this.hint.lineStyle(6, 0x14967a, 1);
      this.hint.strokeRoundedRect(center.x - CELL / 2 + 2, center.y - CELL / 2 + 2, CELL - 4, CELL - 4, 18);
    }
    if (!this.reduced) {
      this.scene.tweens.add({ targets: this.hint, alpha: 0.4, yoyo: true, repeat: 6, duration: 320 });
    }
  }

  async playSwap(from: Pos, to: Pos, revert: boolean): Promise<void> {
    this.scene.tweens.killTweensOf(this.hint);
    this.hint.clear();
    const spriteA = this.spriteAt(from);
    const spriteB = this.spriteAt(to);
    if (!spriteA || !spriteB) return;
    const ax = spriteA.x;
    const ay = spriteA.y;
    const bx = spriteB.x;
    const by = spriteB.y;
    await Promise.all([
      this.tween(spriteA, { x: bx, y: by }, 140),
      this.tween(spriteB, { x: ax, y: ay }, 140),
    ]);
    if (revert) {
      await Promise.all([
        this.tween(spriteA, { x: ax, y: ay }, 140),
        this.tween(spriteB, { x: bx, y: by }, 140),
      ]);
      return;
    }
    const idA = this.at.get(posKey(from));
    const idB = this.at.get(posKey(to));
    if (idA !== undefined) this.at.set(posKey(to), idA);
    if (idB !== undefined) this.at.set(posKey(from), idB);
  }

  async playScript(script: ScriptStep[], finalBoard: Board): Promise<void> {
    if (this.reduced) {
      this.sync(finalBoard);
      return;
    }
    for (const step of script) {
      if (!this.alive()) return;
      if (step.type === 'wave') await this.playWave(step);
      if (step.type === 'gravity') await this.playGravity(step.moves);
      if (step.type === 'refill') await this.playRefill(step.candies);
      if (step.type === 'stars') await this.removeIds(step.ids);
      if (step.type === 'reshuffle') this.rebuild(step.candies);
    }
    if (this.alive()) this.sync(finalBoard);
  }

  cellAt(x: number, y: number): Pos | null {
    const col = Math.floor((x - BOARD_X) / CELL);
    const row = Math.floor((y - BOARD_Y) / CELL);
    if (row < 0 || col < 0 || row >= 8 || col >= 8) return null;
    return { r: row, c: col };
  }

  private async playWave(step: Extract<ScriptStep, { type: 'wave' }>): Promise<void> {
    for (const under of step.underlays) {
      this.mods[under.r]![under.c] = { jelly: under.jelly, wheel: under.wheel, trapped: under.trapped, blocker: under.blocker };
    }
    this.drawTiles();
    const pops = step.removed.filter((entry) => entry.id >= 0).map((entry) => this.pop(entry.id, entry.r, entry.c));
    await Promise.all(pops);
    for (const spawned of step.spawned) {
      this.ensure(spawned, spawned.r, spawned.c, true);
    }
  }

  private async playGravity(moves: { id: number; toR: number; toC: number }[]): Promise<void> {
    await Promise.all(
      moves.map(async (move) => {
        const sprite = this.sprites.get(move.id);
        if (!sprite) return;
        const target = cellCenter(move.toR, move.toC);
        await this.tween(sprite, { x: target.x, y: target.y }, 180);
        this.at.set(posKey({ r: move.toR, c: move.toC }), move.id);
      }),
    );
  }

  private async playRefill(candies: { id: number; r: number; c: number; kind: Candy['kind']; special: Candy['special'] }[]): Promise<void> {
    const jobs = candies.map(async (candy) => {
      const sprite = this.ensure(candy, candy.r, candy.c, false);
      const targetY = sprite.y;
      sprite.y = targetY - 90;
      sprite.setAlpha(0.2);
      await this.tween(sprite, { y: targetY, alpha: 1 }, 200);
    });
    await Promise.all(jobs);
  }

  private rebuild(candies: { id: number; r: number; c: number; kind: Candy['kind']; special: Candy['special'] }[]): void {
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
    this.at.clear();
    for (const candy of candies) this.ensure(candy, candy.r, candy.c, false);
  }

  private async removeIds(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => this.pop(id, 0, 0)));
  }

  private async pop(id: number, r: number, c: number): Promise<void> {
    const sprite = this.sprites.get(id);
    if (!sprite) return;
    if (!this.reduced) this.spark(sprite.x, sprite.y);
    await this.tween(sprite, { scale: 0.1, alpha: 0 }, 140);
    sprite.destroy();
    this.sprites.delete(id);
    if (this.at.get(posKey({ r, c })) === id) this.at.delete(posKey({ r, c }));
    void r;
    void c;
  }

  private spark(x: number, y: number): void {
    for (let i = 0; i < 4; i += 1) {
      const dot = this.scene.add.circle(x, y, 5, 0xffffff, 0.9).setDepth(6);
      this.scene.tweens.add({
        targets: dot,
        x: x + (i - 1.5) * 18,
        y: y - 20 - i * 6,
        alpha: 0,
        duration: 220,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private ensure(candy: Pick<Candy, 'id' | 'kind' | 'special'>, r: number, c: number, popIn: boolean): Phaser.GameObjects.Image {
    const existing = this.sprites.get(candy.id);
    const center = cellCenter(r, c);
    if (existing) {
      existing.setPosition(center.x, center.y);
      existing.setTexture(this.key(candy));
      this.at.set(posKey({ r, c }), candy.id);
      return existing;
    }
    const key = this.key(candy);
    const sprite = this.scene.add.image(center.x, center.y, key).setDisplaySize(64, 64).setDepth(5);
    if (popIn && !this.reduced) sprite.setScale(0.1);
    this.sprites.set(candy.id, sprite);
    this.at.set(posKey({ r, c }), candy.id);
    if (popIn && !this.reduced) {
      this.scene.tweens.add({ targets: sprite, scale: 64 / 128, duration: 160 });
    }
    return sprite;
  }

  private key(candy: Pick<Candy, 'kind' | 'special'>): string {
    const name = candyTextureKey(candy.kind, candy.special);
    return this.scene.textures.exists(name) ? name : 'candy-strawberry';
  }

  private spriteAt(pos: Pos): Phaser.GameObjects.Image | undefined {
    const id = this.at.get(posKey(pos));
    return id === undefined ? undefined : this.sprites.get(id);
  }

  private rebuildIndex(): void {
    this.at.clear();
    for (const [id, sprite] of this.sprites) {
      const c = Math.round((sprite.x - BOARD_X - CELL / 2) / CELL);
      const r = Math.round((sprite.y - BOARD_Y - CELL / 2) / CELL);
      this.at.set(posKey({ r, c }), id);
    }
  }

  private drawTiles(): void {
    this.tiles.forEach((tile) => tile.destroy());
    this.tiles = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const center = cellCenter(r, c);
        const bgKey = (r + c) % 2 === 0 ? 'cell' : 'cell-b';
        this.tile(bgKey, center.x, center.y, 70);
        const mod = this.mods[r]?.[c];
        if (!mod) continue;
        if (mod.jelly > 0) this.tile('jelly', center.x, center.y, 64);
        if (mod.wheel) this.tile('wheel', center.x, center.y + 8, 40);
        if (mod.trapped) this.tile('trapped', center.x, center.y, 64);
        if (mod.blocker) this.tile('blocker', center.x, center.y, 66);
      }
    }
  }

  private tile(key: string, x: number, y: number, size: number): void {
    if (!this.scene.textures.exists(key)) return;
    this.tiles.push(this.scene.add.image(x, y, key).setDisplaySize(size, size).setDepth(1));
  }

  private tween(target: Phaser.GameObjects.Image, props: Record<string, number>, duration: number): Promise<void> {
    if (!this.alive()) return Promise.resolve();
    if (this.reduced || duration <= 0) {
      if (props.x !== undefined) target.x = props.x;
      if (props.y !== undefined) target.y = props.y;
      if (props.alpha !== undefined) target.alpha = props.alpha;
      if (props.scale !== undefined) target.setScale(props.scale);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: target,
        ...props,
        duration,
        ease: 'Quad.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  private alive(): boolean {
    return this.scene.scene.isActive() || this.scene.scene.isPaused();
  }
}
