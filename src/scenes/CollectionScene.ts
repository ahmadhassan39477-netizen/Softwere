import Phaser from 'phaser';
import { BADGE_DEFS, STICKER_DEFS } from '../config/collection';
import { CARS } from '../config/cars';
import { t } from '../config/text';
import { boot, label, makeButton } from '../ui/widgets';
import { FONT, INK } from '../ui/layout';

type Tab = 'stickers' | 'badges' | 'cars';

export class CollectionScene extends Phaser.Scene {
  private page: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Collection');
  }

  create(): void {
    const services = boot(this);
    const lang = services.save.settings.language;
    if (this.textures.exists('bg-mountain')) this.add.image(360, 640, 'bg-mountain').setDisplaySize(720, 1280);
    label(this, 360, 70, t('collection', lang), 48, INK);
    const completed = Object.values(services.save.levels).filter((level) => level.completed).length;
    label(this, 360, 130, `${t('progress', lang)}  ${completed}/20   ${t('cars', lang)} ${services.save.ownedCars.length}/${CARS.length}`, 24, INK);
    makeButton(this, 140, 200, 180, 70, t('stickers', lang), () => this.show('stickers'), 0xff5c8a);
    makeButton(this, 360, 200, 180, 70, t('badges', lang), () => this.show('badges'), 0x6d4cb5);
    makeButton(this, 580, 200, 180, 70, t('cars', lang), () => this.show('cars'), 0x4c8dff);
    makeButton(this, 360, 1200, 240, 76, t('map', lang), () => this.scene.start('Map'), 0x14967a);
    this.show('stickers');
  }

  private show(tab: Tab): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    this.page?.destroy();
    this.page = this.add.container(0, 0);
    if (tab === 'stickers') this.drawItems(STICKER_DEFS, new Set(services.save.stickers));
    if (tab === 'badges') this.drawItems(BADGE_DEFS, new Set(services.save.achievements));
    if (tab === 'cars') this.drawCars();
  }

  private drawItems(items: { id: string; name: string; hint: string }[], owned: Set<string>): void {
    items.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? 190 : 530;
      const y = 300 + row * 110;
      const has = owned.has(item.id);
      const dot = this.add.circle(x - 110, y, 18, has ? 0xffe14a : 0xd9d0e6).setStrokeStyle(3, 0x6d4cb5);
      const title = this.add
        .text(x - 80, y - 18, item.name, { fontFamily: FONT, fontSize: '24px', color: INK, fontStyle: 'bold' })
        .setOrigin(0, 0.5);
      const hint = this.add
        .text(x - 80, y + 16, has ? item.name : item.hint, {
          fontFamily: FONT,
          fontSize: '18px',
          color: has ? '#14967A' : '#6D4CB5',
          wordWrap: { width: 250 },
        })
        .setOrigin(0, 0.5);
      this.page?.add([dot, title, hint]);
    });
  }

  private drawCars(): void {
    const services = this.registry.get('services') as ReturnType<typeof boot>;
    CARS.forEach((car, index) => {
      const owned = services.save.ownedCars.includes(car.id);
      const y = 290 + index * 100;
      const text = this.add
        .text(80, y, `${owned ? '●' : '○'}  ${car.name}`, {
          fontFamily: FONT,
          fontSize: '28px',
          color: owned ? INK : '#8D84A3',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      const detail = this.add
        .text(80, y + 32, owned ? t('owned', services.save.settings.language) : `${car.price} coins`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: INK,
        })
        .setOrigin(0, 0.5);
      this.page?.add([text, detail]);
    });
  }
}
