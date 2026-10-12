import Phaser from 'phaser';
import { drawCar } from '../art/drawCar';
import { Pip } from '../art/Pip';
import { CARS } from '../config/cars';
import { t } from '../config/text';
import { customizeCar, purchaseCar, selectCar } from '../systems/economy';
import { boot, label, makeButton, toast } from '../ui/widgets';
import { FONT, INK } from '../ui/layout';

export class GarageScene extends Phaser.Scene {
  private index = 0;
  private preview!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private pip!: Pip;
  private reduced = false;
  private controls: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Garage');
  }

  create(): void {
    const services = boot(this);
    this.reduced = services.save.settings.reducedMotion;
    if (this.textures.exists('bg-sky')) this.add.image(360, 640, 'bg-sky').setDisplaySize(720, 1280);
    label(this, 360, 70, t('garage', services.save.settings.language), 48, INK);
    this.preview = this.add.graphics();
    this.title = label(this, 360, 470, '', 36, INK);
    this.info = label(this, 360, 530, '', 24, INK);
    this.pip = new Pip(this, 90, 1180, 0.4);
    const previous = makeButton(this, 180, 610, 240, 76, t('prevCar', services.save.settings.language), () => this.step(-1), 0x6d4cb5);
    const next = makeButton(this, 540, 610, 240, 76, t('nextCar', services.save.settings.language), () => this.step(1), 0x6d4cb5);
    previous.root.setDepth(8);
    next.root.setDepth(8);
    makeButton(this, 360, 1200, 240, 76, t('map', services.save.settings.language), () => this.scene.start('Map'), 0x4c8dff);
    const ownedIndex = CARS.findIndex((car) => car.id === services.save.selectedCar);
    this.index = ownedIndex >= 0 ? ownedIndex : 0;
    this.redraw();
  }

  update(time: number): void {
    this.pip?.tick(time, this.reduced);
  }

  private step(delta: number): void {
    this.index = (this.index + delta + CARS.length) % CARS.length;
    this.redraw();
  }

  private redraw(): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    const lang = services.save.settings.language;
    const car = CARS[this.index]!;
    const owned = services.save.ownedCars.includes(car.id);
    const custom = services.save.customization[car.id] ?? { paint: car.paints[0]!.id, wheels: car.wheels[0]!.id };
    this.preview.clear();
    drawCar(this.preview, car.id, custom.paint, custom.wheels, 720, 420);
    this.title.setText(car.name);
    this.info.setText(owned ? car.description : `${car.description}  ${car.price} coins`);
    this.controls.forEach((item) => item.destroy());
    this.controls = [];
    car.paints.forEach((paint, index) => {
      const swatch = this.add.circle(220 + index * 70, 700, 24, Phaser.Display.Color.HexStringToColor(paint.body).color);
      swatch.setStrokeStyle(custom.paint === paint.id ? 6 : 3, 0x3d2c6b);
      swatch.setInteractive({ useHandCursor: true });
      swatch.on('pointerup', () => {
        if (!owned) {
          toast(this, t('needCoins', lang), this.reduced);
          return;
        }
        services.replace(customizeCar(services.save, car.id, paint.id, custom.wheels));
        this.redraw();
      });
      const name = this.add.text(220 + index * 70, 740, paint.name, { fontFamily: FONT, fontSize: '18px', color: INK }).setOrigin(0.5);
      this.controls.push(swatch, name);
    });
    car.wheels.forEach((wheel, index) => {
      const button = makeButton(this, 250 + index * 220, 830, 200, 72, wheel.name, () => {
        if (!owned) {
          toast(this, t('needCoins', lang), this.reduced);
          return;
        }
        services.replace(customizeCar(services.save, car.id, custom.paint, wheel.id));
        this.redraw();
      }, custom.wheels === wheel.id ? 0x14967a : 0x6d4cb5);
      this.controls.push(button.root);
    });
    const action = makeButton(
      this,
      360,
      960,
      420,
      88,
      owned ? (services.save.selectedCar === car.id ? t('driving', lang) : t('select', lang)) : `${t('buy', lang)} ${car.price}`,
      () => {
        if (owned) {
          services.replace(selectCar(services.save, car.id));
          this.pip.setMood('happy');
          this.redraw();
          return;
        }
        const result = purchaseCar(services.save, car.id);
        if (!result.ok) {
          toast(this, t('needCoins', lang), this.reduced);
          this.pip.setMood('encourage');
          return;
        }
        services.replace(selectCar(result.save, car.id));
        services.audio.play('reward');
        this.pip.setMood('celebrate');
        this.redraw();
      },
      owned ? 0x14967a : 0xff5c8a,
    );
    this.controls.push(action.root);
    if (!owned && services.save.coins < car.price) action.setEnabled(true);
  }
}
