import Phaser from 'phaser';
import { carById } from '../config/cars';

export function drawCar(
  graphics: Phaser.GameObjects.Graphics,
  carId: string,
  paintId: string,
  wheelId: string,
  width: number,
  height: number,
): void {
  graphics.clear();
  const car = carById(carId);
  const paint = car?.paints.find((item) => item.id === paintId) ?? car?.paints[0];
  const body = Phaser.Display.Color.HexStringToColor(paint?.body ?? '#FF5C8A').color;
  const accent = Phaser.Display.Color.HexStringToColor(paint?.accent ?? '#FFF6E8').color;
  const trim = Phaser.Display.Color.HexStringToColor(paint?.trim ?? '#3D2C6B').color;
  const cx = width / 2;
  const cy = height * 0.58;
  graphics.fillStyle(0x3d2c6b, 0.12);
  graphics.fillEllipse(cx, height * 0.82, width * 0.7, 28);

  if (carId === 'mint-mini') drawMini(graphics, cx, cy, body, accent, trim);
  else if (carId === 'sunshine-buggy') drawBuggy(graphics, cx, cy, body, accent, trim);
  else if (carId === 'rainbow-roadster') drawRoadster(graphics, cx, cy, body, accent, trim);
  else if (carId === 'cloud-cruiser') drawCloud(graphics, cx, cy, body, accent, trim);
  else if (carId === 'star-explorer') drawExplorer(graphics, cx, cy, body, accent, trim);
  else if (carId === 'bubble-coupe') drawCoupe(graphics, cx, cy, body, accent, trim);
  else if (carId === 'moonlight-racer') drawMoon(graphics, cx, cy, body, accent, trim);
  else drawRacer(graphics, cx, cy, body, accent, trim);

  const wheelY = cy + 48;
  drawWheel(graphics, cx - 70, wheelY, wheelId, trim);
  drawWheel(graphics, cx + 78, wheelY, wheelId, trim);
}

function drawRacer(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillRoundedRect(x - 130, y - 28, 250, 70, 28);
  g.fillTriangle(x + 90, y - 28, x + 150, y + 10, x + 90, y + 42);
  g.fillStyle(accent, 1);
  g.fillRoundedRect(x - 20, y - 58, 90, 46, 18);
  g.lineStyle(5, trim, 1);
  g.strokeRoundedRect(x - 130, y - 28, 250, 70, 28);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(x - 110, y - 8, 90, 10);
}

function drawMini(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillCircle(x, y + 6, 78);
  g.fillStyle(accent, 1);
  g.fillCircle(x, y - 36, 36);
  g.lineStyle(5, trim, 1);
  g.strokeCircle(x, y + 6, 78);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(x - 18, y - 4, 8);
  g.fillCircle(x + 18, y - 4, 8);
  g.lineStyle(4, trim, 1);
  g.beginPath();
  g.arc(x, y + 10, 16, 0.2, Math.PI - 0.2, false);
  g.strokePath();
}

function drawBuggy(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillRoundedRect(x - 120, y - 10, 230, 62, 20);
  g.lineStyle(8, trim, 1);
  g.strokeRoundedRect(x - 40, y - 70, 90, 70, 16);
  g.fillStyle(accent, 1);
  g.fillRect(x - 90, y, 50, 16);
  g.lineStyle(5, trim, 1);
  g.strokeRoundedRect(x - 120, y - 10, 230, 62, 20);
}

function drawRoadster(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillRoundedRect(x - 150, y - 16, 280, 58, 18);
  g.fillTriangle(x + 110, y - 16, x + 150, y - 70, x + 130, y - 16);
  g.fillStyle(accent, 1);
  g.fillRoundedRect(x + 10, y - 52, 70, 40, 12);
  g.lineStyle(5, trim, 1);
  g.strokeRoundedRect(x - 150, y - 16, 280, 58, 18);
  g.lineStyle(8, 0xff4d7a, 1);
  g.lineBetween(x - 130, y + 8, x + 40, y + 8);
  g.lineStyle(8, 0xffe14a, 1);
  g.lineBetween(x - 130, y + 20, x + 20, y + 20);
}

function drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillCircle(x - 50, y + 10, 48);
  g.fillCircle(x + 20, y - 10, 58);
  g.fillCircle(x + 80, y + 12, 42);
  g.fillCircle(x, y + 24, 50);
  g.fillStyle(accent, 1);
  g.fillCircle(x + 10, y - 8, 22);
  g.lineStyle(5, trim, 1);
  g.strokeCircle(x + 20, y - 10, 58);
}

function drawExplorer(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillRoundedRect(x - 100, y - 70, 120, 120, 16);
  g.fillRoundedRect(x + 10, y - 20, 90, 70, 12);
  g.fillStyle(accent, 1);
  g.fillRoundedRect(x - 80, y - 52, 80, 40, 8);
  g.lineStyle(5, trim, 1);
  g.strokeRoundedRect(x - 100, y - 70, 120, 120, 16);
  g.lineStyle(4, accent, 1);
  g.lineBetween(x - 40, y - 70, x - 40, y - 110);
  g.fillCircle(x - 40, y - 114, 8);
}

function drawCoupe(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillRoundedRect(x - 120, y - 8, 240, 64, 30);
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(x + 10, y - 36, 130, 80);
  g.lineStyle(5, trim, 1);
  g.strokeRoundedRect(x - 120, y - 8, 240, 64, 30);
  g.strokeEllipse(x + 10, y - 36, 130, 80);
  g.fillStyle(accent, 1);
  g.fillCircle(x + 70, y + 10, 10);
}

function drawMoon(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, accent: number, trim: number): void {
  g.fillStyle(body, 1);
  g.fillEllipse(x, y + 8, 280, 90);
  g.fillStyle(0xfff6e8, 1);
  g.fillEllipse(x + 30, y - 8, 150, 70);
  g.fillStyle(body, 1);
  g.fillEllipse(x + 10, y + 16, 240, 54);
  g.fillStyle(accent, 1);
  g.fillCircle(x + 90, y - 6, 10);
  g.lineStyle(5, trim, 1);
  g.strokeEllipse(x, y + 8, 280, 70);
}

function drawWheel(g: Phaser.GameObjects.Graphics, x: number, y: number, style: string, trim: number): void {
  const rugged = style === 'knobby' || style === 'rugged' || style === 'chunky';
  const radius = rugged ? 26 : style === 'slim' ? 16 : 22;
  g.fillStyle(0x2a1d4a, 1);
  g.fillCircle(x, y, radius);
  if (rugged) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      g.fillCircle(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 5);
    }
  }
  const hub = style === 'star' || style === 'glow' ? 0xffe14a : style === 'heart' ? 0xff5c8a : style === 'silver' || style === 'crescent' ? 0xd5d8e6 : trim;
  g.fillStyle(hub, 1);
  if (style === 'star') {
    g.fillTriangle(x, y - 10, x - 8, y + 8, x + 8, y + 8);
    g.fillTriangle(x, y + 10, x - 8, y - 6, x + 8, y - 6);
  } else if (style === 'crescent') {
    g.fillCircle(x, y, 10);
    g.fillStyle(0x2a1d4a, 1);
    g.fillCircle(x + 4, y - 2, 8);
  } else if (style === 'button' || style === 'disc') {
    g.fillCircle(x, y, 12);
    g.fillStyle(0xfff6e8, 1);
    g.fillCircle(x - 4, y - 3, 2);
    g.fillCircle(x + 4, y - 3, 2);
    g.fillCircle(x, y + 4, 2);
  } else {
    g.fillCircle(x, y, style === 'slim' ? 6 : 9);
  }
}
