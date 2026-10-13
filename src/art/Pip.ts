import Phaser from 'phaser';

export type PipMood = 'idle' | 'happy' | 'encourage' | 'celebrate';

/** Rounded toy-car mascot. Call tick from the scene update loop. */
export class Pip extends Phaser.GameObjects.Container {
  private mood: PipMood = 'idle';
  private pupils: Phaser.GameObjects.Arc[];
  private wheels: Phaser.GameObjects.Arc[];
  private mouth: Phaser.GameObjects.Graphics;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);
    this.baseY = y;
    scene.add.existing(this);
    this.setScale(scale);

    const shadow = scene.add.ellipse(0, 78, 150, 28, 0x3d2c6b, 0.15);
    const body = scene.add.graphics();
    body.fillStyle(0xff5c8a, 1);
    body.fillRoundedRect(-78, -20, 156, 78, 36);
    body.fillStyle(0xffd0dc, 1);
    body.fillRoundedRect(-48, -48, 96, 52, 26);
    body.lineStyle(5, 0xc81e4a, 1);
    body.strokeRoundedRect(-78, -20, 156, 78, 36);
    body.fillStyle(0xffffff, 0.45);
    body.fillEllipse(-24, -4, 40, 16);

    const wheelColors = [0x7ddfc3, 0xffe566, 0x7ec8ff, 0xc9b6ff];
    const tires: Phaser.GameObjects.Arc[] = [];
    const hubs: Phaser.GameObjects.Arc[] = [];
    wheelColors.forEach((color, index) => {
      const side = index < 2 ? -1 : 1;
      const offset = index % 2 === 0 ? -18 : 16;
      const wx = side * 46 + offset;
      tires.push(scene.add.circle(wx, 58, 18, 0x3d2c6b));
      hubs.push(scene.add.circle(wx, 58, 8, color));
    });

    const eyeL = scene.add.circle(-22, -28, 16, 0xffffff);
    const eyeR = scene.add.circle(22, -28, 16, 0xffffff);
    const pupilL = scene.add.circle(-18, -26, 7, 0x3d2c6b);
    const pupilR = scene.add.circle(26, -26, 7, 0x3d2c6b);
    this.pupils = [pupilL, pupilR];
    const cheekL = scene.add.circle(-48, -8, 8, 0xff8fb3, 0.95);
    const cheekR = scene.add.circle(48, -8, 8, 0xff8fb3, 0.95);
    this.mouth = scene.add.graphics();
    this.wheels = hubs;
    this.drawMouth(true);
    this.add([shadow, body, ...tires, ...hubs, eyeL, eyeR, pupilL, pupilR, cheekL, cheekR, this.mouth]);
  }

  setMood(mood: PipMood): void {
    this.mood = mood;
    this.drawMouth(mood === 'happy' || mood === 'celebrate' || mood === 'idle');
  }

  tick(time: number, reduced: boolean): void {
    const lift = this.mood === 'celebrate' ? 14 : this.mood === 'happy' ? 8 : 5;
    this.y = this.baseY + (reduced ? 0 : Math.sin(time / 220) * lift);
    this.wheels.forEach((wheel) => {
      wheel.rotation += reduced ? 0 : this.mood === 'celebrate' ? 0.18 : 0.04;
    });
    const look = reduced ? 0 : Math.sin(time / 480) * 3;
    this.pupils[0]?.setX(-18 + look);
    this.pupils[1]?.setX(26 + look);
    if (reduced) this.rotation = 0;
    else if (this.mood === 'encourage') this.rotation = -0.08;
    else if (this.mood === 'celebrate') this.rotation = Math.sin(time / 140) * 0.08;
    else this.rotation = 0;
  }

  private drawMouth(smile: boolean): void {
    this.mouth.clear();
    this.mouth.lineStyle(5, 0x3d2c6b, 1);
    this.mouth.beginPath();
    const radius = smile ? 16 : 10;
    this.mouth.arc(0, smile ? -4 : 2, radius, 0.35, Math.PI - 0.35, false);
    this.mouth.strokePath();
  }
}
