import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { levelByNumber } from '../config/levels';
import { t } from '../config/text';
import type { Services } from '../game/services';
import { runtime } from '../game/runtime';
import { noteMilestones, recordLevelResult } from '../systems/economy';
import { InputGate } from '../systems/inputGate';
import { objectiveLabel } from '../systems/objectives';
import { createSession, trySwap, type Session } from '../systems/session';
import { firstLegalMove } from '../systems/swap';
import type { Pos, ScriptStep } from '../systems/types';
import { isAdjacent } from '../systems/board';
import { BOARD_X, BOARD_Y, CELL, FONT, INK } from '../ui/layout';
import { boot, label, makeButton, toast } from '../ui/widgets';
import { BoardView } from './BoardView';

export class GameScene extends Phaser.Scene {
  private session!: Session;
  private view!: BoardView;
  private gate = new InputGate();
  private pip!: Pip;
  private reduced = false;
  private lang = 'en';
  private scoreText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private cursor: Pos = { r: 3, c: 3 };
  private armed = false;
  private dragFrom: Pos | null = null;
  private dragged = false;
  private recorded = false;

  constructor() {
    super('Game');
  }

  create(): void {
    const services = boot(this);
    this.lang = services.save.settings.language;
    this.reduced = services.save.settings.reducedMotion;
    this.gate = new InputGate();
    this.recorded = false;
    const level = levelByNumber(runtime.levelNumber) ?? levelByNumber(1)!;
    this.session = createSession(level);
    this.cameras.main.fadeIn(this.reduced ? 1 : 140, 255, 246, 232);
    const bg = level.region === 'mountain' ? 'bg-mountain' : level.region === 'bay' ? 'bg-bay' : 'bg-meadow';
    if (this.textures.exists(bg)) this.add.image(360, 640, bg).setDisplaySize(720, 1280);
    const frame = this.add.graphics();
    frame.fillStyle(0xffffff, 0.45);
    frame.fillRoundedRect(BOARD_X - 18, BOARD_Y - 18, CELL * 8 + 36, CELL * 8 + 36, 28);
    frame.lineStyle(6, 0xffffff, 0.95);
    frame.strokeRoundedRect(BOARD_X - 18, BOARD_Y - 18, CELL * 8 + 36, CELL * 8 + 36, 28);
    this.view = new BoardView(this, this.reduced);
    this.view.sync(this.session.board);
    this.view.showSelection(this.cursor, false);

    makeButton(this, 96, 64, 148, 72, t('pause', this.lang), () => this.openPause(), 0x6d4cb5);
    this.scoreText = label(this, 330, 58, '', 26, INK);
    this.movesText = label(this, 560, 58, '', 26, INK);
    this.goalText = this.add
      .text(360, 150, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: INK,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5, 0);
    this.refreshHud();
    this.pip = new Pip(this, 110, 1088, 0.5);
    if (level.intro) {
      this.add
        .text(470, 1060, level.intro, {
          fontFamily: FONT,
          fontSize: '22px',
          color: INK,
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 420 },
        })
        .setOrigin(0.5);
      this.pip.setMood('happy');
    }
    makeButton(this, 520, 1190, 280, 80, t('hint', this.lang), () => this.showHint(), 0x14967a);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragFrom = this.view.cellAt(pointer.worldX, pointer.worldY);
      this.dragged = false;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.dragFrom || this.dragged || this.gate.isLocked) return;
      const cell = this.view.cellAt(pointer.worldX, pointer.worldY);
      if (!cell || !isAdjacent(this.dragFrom, cell)) return;
      this.dragged = true;
      const from = this.dragFrom;
      void this.commit(from, cell);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.dragged || this.gate.isLocked) return;
      const cell = this.view.cellAt(pointer.worldX, pointer.worldY);
      if (!cell) return;
      if (this.armed && isAdjacent(this.cursor, cell)) {
        void this.commit(this.cursor, cell);
        return;
      }
      if (this.armed && cell.r === this.cursor.r && cell.c === this.cursor.c) {
        this.armed = false;
        this.view.showSelection(this.cursor, false);
        return;
      }
      this.cursor = cell;
      this.armed = true;
      this.view.showSelection(cell, true);
    });
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey, this));
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }

  private onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.openPause();
      return;
    }
    if (this.gate.isLocked) return;
    const dir = direction(event.key);
    if (dir) {
      if (!this.armed) {
        this.cursor = {
          r: Phaser.Math.Clamp(this.cursor.r + dir.r, 0, 7),
          c: Phaser.Math.Clamp(this.cursor.c + dir.c, 0, 7),
        };
        this.view.showSelection(this.cursor, false);
        return;
      }
      const next = { r: this.cursor.r + dir.r, c: this.cursor.c + dir.c };
      if (next.r < 0 || next.c < 0 || next.r > 7 || next.c > 7) return;
      void this.commit(this.cursor, next);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      this.armed = !this.armed;
      this.view.showSelection(this.cursor, this.armed);
    }
    if (event.key === 'h' || event.key === 'H') this.showHint();
  }

  private openPause(): void {
    runtime.returnScene = 'Pause';
    this.scene.pause();
    this.scene.launch('Pause');
  }

  private showHint(): void {
    if (this.gate.isLocked || this.session.status !== 'playing') return;
    const move = firstLegalMove(this.session.board);
    if (!move) {
      toast(this, t('shuffle', this.lang), this.reduced);
      return;
    }
    this.view.showHint(move.from, move.to);
    this.pip.setMood('happy');
  }

  private async commit(from: Pos, to: Pos): Promise<void> {
    if (!this.gate.tryBegin()) return;
    const result = trySwap(this.session, from, to);
    this.armed = false;
    if (!result.ok) {
      (this.registry.get('services') as Services).audio.play('invalid');
      await this.view.playSwap(from, to, true);
      if (this.alive()) {
        this.pip.setMood('encourage');
        toast(this, t('tryAnother', this.lang), this.reduced);
        this.view.showSelection(this.cursor, false);
      }
      this.gate.end();
      return;
    }
    const services = this.registry.get('services') as Services;
    services.audio.play('swap');
    await this.view.playSwap(from, to, false);
    const firstWave = result.script.find((step) => step.type === 'wave');
    if (firstWave?.type === 'wave') services.audio.play(firstWave.specialsCreated > 0 ? 'special' : 'match');
    await this.view.playScript(result.script, this.session.board);
    if (!this.alive()) return;
    this.cursor = to;
    this.view.showSelection(this.cursor, false);
    this.refreshHud();
    this.pip.setMood(result.status === 'lost' ? 'encourage' : 'happy');
    if (result.status !== 'playing') {
      this.store(result.status === 'won', result.script);
      this.scene.start(result.status === 'won' ? 'Victory' : 'Fail');
      return;
    }
    this.gate.end();
  }

  private store(won: boolean, script: ScriptStep[]): void {
    if (this.recorded) return;
    this.recorded = true;
    const services = this.registry.get('services') as Services;
    const level = levelByNumber(this.session.levelNumber)!;
    const outcome = recordLevelResult(services.save, level, { score: this.session.score, won });
    const made = script.some((step) => step.type === 'wave' && step.specialsCreated > 0);
    const used = script.some(
      (step) => step.type === 'wave' && step.removed.some((candy) => candy.special !== 'none' || candy.kind === 'rainbow'),
    );
    const save = noteMilestones(outcome.save, made, used);
    services.replace(save);
    runtime.lastResult = {
      levelNumber: level.number,
      score: this.session.score,
      stars: outcome.stars,
      won,
      coinsAwarded: outcome.coinsAwarded,
      bestScore: save.levels[String(level.number)]?.bestScore ?? this.session.score,
    };
  }

  private refreshHud(): void {
    this.scoreText.setText(`${t('score', this.lang)} ${this.session.score}`);
    this.movesText.setText(`${t('moves', this.lang)} ${this.session.movesLeft}`);
    this.goalText.setText(this.session.objectives.map((item) => objectiveLabel(item, this.session.score)).join('\n'));
  }

  private alive(): boolean {
    return this.scene.isActive() || this.scene.isPaused();
  }
}

function direction(key: string): Pos | null {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return { r: -1, c: 0 };
  if (key === 'ArrowDown' || key === 's' || key === 'S') return { r: 1, c: 0 };
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return { r: 0, c: -1 };
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return { r: 0, c: 1 };
  return null;
}
