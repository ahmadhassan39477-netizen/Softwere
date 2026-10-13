import Phaser from 'phaser';
import { Pip } from '../art/Pip';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { boot, bindMenu, label, makeButton, type UiButton } from '../ui/widgets';
import { INK } from '../ui/layout';

export class WelcomeScene extends Phaser.Scene {
  private pip!: Pip;
  private reduced = false;

  constructor() {
    super('Welcome');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    this.reduced = services.save.settings.reducedMotion;
    this.cameras.main.fadeIn(this.reduced ? 1 : 200, 255, 246, 232);
    if (this.textures.exists('bg-sky')) this.add.image(360, 640, 'bg-sky').setDisplaySize(720, 1280);
    else this.add.rectangle(360, 640, 720, 1280, 0xfff6e8);
    this.floatCandies();
    label(this, 360, 150, t('title', lang), 52, INK);
    label(this, 360, 210, t('subtitle', lang), 28, INK);
    this.pip = new Pip(this, 360, 430, 1.15);
    this.pip.setMood('happy');

    const buttons: UiButton[] = [];
    const play = makeButton(this, 360, 760, 460, 96, t('play', lang), () => {
      services.save.hasProgress = true;
      services.persist();
      runtime.levelNumber = services.save.highestUnlocked;
      this.scene.start('LevelPrep');
    }, 0xff5c8a);
    buttons.push(play);
    const showContinue =
      services.save.hasProgress || services.save.highestUnlocked > 1 || Object.values(services.save.levels).some((level) => level.completed);
    if (showContinue) {
      buttons.push(
        makeButton(this, 360, 880, 460, 88, t('continue', lang), () => this.scene.start('Map'), 0x6d4cb5),
      );
    }
    buttons.push(
      makeButton(this, 360, showContinue ? 990 : 880, 460, 84, t('settings', lang), () => {
        runtime.returnScene = 'Welcome';
        this.scene.start('Settings', { from: 'Welcome' });
      }, 0x4c8dff),
    );
    buttons.push(
      makeButton(this, 360, showContinue ? 1090 : 990, 320, 72, t('howTo', lang), () => this.showTips(lang), 0x14967a),
    );
    bindMenu(this, buttons);
    if (!services.save.tutorialSeen) this.showTips(lang);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }

  private showTips(lang: string): void {
    const tips = [t('tutorial1', lang), t('tutorial2', lang), t('tutorial3', lang)];
    let step = 0;
    const card = this.add.container(0, 0).setDepth(20);
    const dim = this.add.rectangle(360, 430, 640, 220, 0xfff6e8, 0.96);
    const text = label(this, 360, 400, tips[0]!, 28, INK);
    const next = makeButton(this, 250, 500, 200, 72, t('nextTip', lang), () => {
      step += 1;
      if (step >= tips.length) {
        this.finishTutorial();
        card.destroy();
        return;
      }
      text.setText(tips[step]!);
      if (step === tips.length - 1) next.setLabel(t('letsPlay', lang));
    }, 0xff5c8a);
    const skip = makeButton(this, 490, 500, 180, 72, t('skip', lang), () => {
      this.finishTutorial();
      card.destroy();
    }, 0x6d4cb5);
    const frame = this.add.graphics();
    frame.lineStyle(4, 0xff8fb8, 1);
    frame.strokeRoundedRect(40, 320, 640, 230, 28);
    card.add([frame, dim, text, next.root, skip.root]);
  }

  private finishTutorial(): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    services.save.tutorialSeen = true;
    services.persist();
  }

  private floatCandies(): void {
    if (this.reduced) return;
    const keys = ['candy-strawberry', 'candy-lemon', 'candy-mint', 'candy-grape', 'candy-blueberry', 'candy-peach'];
    keys.forEach((key, index) => {
      if (!this.textures.exists(key)) return;
      const image = this.add.image(80 + index * 110, 1180, key).setDisplaySize(54, 54).setAlpha(0.9);
      this.tweens.add({
        targets: image,
        y: 1120 + (index % 2) * 30,
        duration: 1400 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }
}
