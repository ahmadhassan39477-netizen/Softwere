import Phaser from 'phaser';
import { drawCar } from '../art/drawCar';
import { Pip } from '../art/Pip';
import { REGIONS } from '../config/collection';
import { levelByNumber } from '../config/levels';
import { t } from '../config/text';
import { runtime } from '../game/runtime';
import { createProgress, objectiveLabel } from '../systems/objectives';
import { carById } from '../config/cars';
import { boot, label, makeButton } from '../ui/widgets';
import { INK } from '../ui/layout';

export class LevelPrepScene extends Phaser.Scene {
  private pip!: Pip;
  private reduced = false;

  constructor() {
    super('LevelPrep');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    this.reduced = services.save.settings.reducedMotion;
    const level = levelByNumber(runtime.levelNumber) ?? levelByNumber(1)!;
    this.cameras.main.fadeIn(this.reduced ? 1 : 160, 255, 246, 232);
    const bg = level.region === 'mountain' ? 'bg-mountain' : level.region === 'bay' ? 'bg-bay' : 'bg-meadow';
    if (this.textures.exists(bg)) this.add.image(360, 640, bg).setDisplaySize(720, 1280);
    const region = REGIONS.find((item) => item.id === level.region);
    label(this, 360, 120, `${t('level', lang)} ${level.number}`, 56, INK);
    label(this, 360, 180, region?.name ?? '', 28, INK);
    label(this, 360, 250, `${t('moves', lang)}: ${level.moves}`, 32, INK);
    const goals = createProgress(level.objectives).map((item) => objectiveLabel(item, 0));
    goals.forEach((goal, index) => label(this, 360, 330 + index * 48, goal, 30, INK));
    if (level.intro) label(this, 360, 330 + goals.length * 48 + 40, level.intro, 26, INK);
    const car = carById(services.save.selectedCar);
    const custom = services.save.customization[services.save.selectedCar];
    const preview = this.add.graphics();
    if (car && custom) drawCar(preview, car.id, custom.paint, custom.wheels, 360, 220);
    preview.setPosition(180, 700);
    this.pip = new Pip(this, 130, 980, 0.7);
    this.pip.setMood('happy');
    makeButton(this, 360, 1080, 460, 96, t('play', lang), () => this.scene.start('Game'), 0xff5c8a);
    makeButton(this, 360, 1190, 280, 76, t('map', lang), () => this.scene.start('Map'), 0x6d4cb5);
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }
}
