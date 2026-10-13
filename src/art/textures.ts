import Phaser from 'phaser';
import { NORMAL_KINDS, type CandyKind, type Special } from '../systems/types';

const KIND_COLOR: Record<string, { main: string; dark: string; light: string }> = {
  strawberry: { main: '#FF4D7A', dark: '#C81E4A', light: '#FFD0DC' },
  lemon: { main: '#FFE14A', dark: '#E0A800', light: '#FFF6C2' },
  mint: { main: '#3DDBB0', dark: '#14967A', light: '#E5FFF7' },
  grape: { main: '#B06BFF', dark: '#6E2BB5', light: '#F3E5FF' },
  blueberry: { main: '#4C8DFF', dark: '#1D4FBF', light: '#E4EEFF' },
  peach: { main: '#FFB084', dark: '#E36A3A', light: '#FFE6D8' },
};

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  return { canvas, ctx };
}

function gloss(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStrawberry(ctx: CanvasRenderingContext2D): void {
  const { main, dark } = KIND_COLOR.strawberry!;
  ctx.beginPath();
  ctx.moveTo(64, 108);
  ctx.bezierCurveTo(18, 78, 18, 36, 64, 22);
  ctx.bezierCurveTo(110, 36, 110, 78, 64, 108);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.fillStyle = '#FFE08A';
  for (const [x, y] of [
    [46, 48],
    [78, 52],
    [58, 68],
    [84, 74],
    [48, 82],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  gloss(ctx, 48, 42, 14, 8);
}

function drawLemon(ctx: CanvasRenderingContext2D): void {
  const { main, dark } = KIND_COLOR.lemon!;
  ctx.save();
  ctx.translate(64, 70);
  ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = dark;
  ctx.stroke();
  gloss(ctx, -16, -10, 16, 8);
  ctx.restore();
  ctx.fillStyle = '#3CB371';
  ctx.beginPath();
  ctx.ellipse(92, 34, 14, 8, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawMint(ctx: CanvasRenderingContext2D): void {
  const { main, dark } = KIND_COLOR.mint!;
  ctx.beginPath();
  ctx.arc(64, 64, 42, 0, Math.PI * 2);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(64, 64, 18, 0.4, 4.2);
  ctx.stroke();
  gloss(ctx, 48, 46, 14, 8);
}

function drawGrape(ctx: CanvasRenderingContext2D): void {
  const { main, dark } = KIND_COLOR.grape!;
  const blobs = [
    [64, 40],
    [44, 58],
    [84, 58],
    [52, 82],
    [76, 84],
  ];
  for (const [x, y] of blobs) {
    ctx.beginPath();
    ctx.arc(x!, y!, 18, 0, Math.PI * 2);
    ctx.fillStyle = main;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = dark;
    ctx.stroke();
  }
  gloss(ctx, 56, 36, 8, 5);
  ctx.strokeStyle = '#3CB371';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(64, 28);
  ctx.lineTo(64, 16);
  ctx.stroke();
}

function drawBlueberry(ctx: CanvasRenderingContext2D): void {
  const { main, dark } = KIND_COLOR.blueberry!;
  ctx.beginPath();
  ctx.arc(64, 70, 40, 0, Math.PI * 2);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.fillStyle = '#2E6B3A';
  ctx.beginPath();
  ctx.moveTo(64, 28);
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    ctx.lineTo(64 + Math.cos(angle) * 16, 34 + Math.sin(angle) * 12);
    ctx.lineTo(64 + Math.cos(angle + 0.4) * 6, 36 + Math.sin(angle + 0.4) * 5);
  }
  ctx.fill();
  gloss(ctx, 50, 56, 14, 8);
}

function drawPeach(ctx: CanvasRenderingContext2D): void {
  const { main, dark } = KIND_COLOR.peach!;
  ctx.beginPath();
  ctx.arc(64, 68, 40, 0, Math.PI * 2);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = dark;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(227,106,58,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(64, 36);
  ctx.quadraticCurveTo(78, 68, 64, 100);
  ctx.stroke();
  ctx.fillStyle = '#3CB371';
  ctx.beginPath();
  ctx.ellipse(86, 36, 12, 7, 0.8, 0, Math.PI * 2);
  ctx.fill();
  gloss(ctx, 48, 54, 12, 7);
}

function drawRainbow(ctx: CanvasRenderingContext2D): void {
  const colors = ['#FF4D7A', '#FFE14A', '#3DDBB0', '#4C8DFF', '#B06BFF', '#FFB084'];
  colors.forEach((color, index) => {
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.arc(64, 64, 46, (index * Math.PI * 2) / 6, ((index + 1) * Math.PI * 2) / 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(64, 64, 46, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#3D2C6B';
  ctx.stroke();
  ctx.fillStyle = '#FFF6E8';
  ctx.beginPath();
  ctx.arc(64, 64, 16, 0, Math.PI * 2);
  ctx.fill();
  starPath(ctx, 64, 64, 12, 6);
  ctx.fillStyle = '#FFE14A';
  ctx.fill();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D): void {
  starPath(ctx, 64, 66, 48, 22);
  ctx.fillStyle = '#FFE14A';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#E0A800';
  ctx.stroke();
  gloss(ctx, 52, 48, 12, 7);
}

const DRAW_KIND: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  strawberry: drawStrawberry,
  lemon: drawLemon,
  mint: drawMint,
  grape: drawGrape,
  blueberry: drawBlueberry,
  peach: drawPeach,
};

function addStripes(ctx: CanvasRenderingContext2D, orientation: 'h' | 'v'): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  if (orientation === 'h') {
    for (const y of [36, 60, 84]) ctx.fillRect(8, y, 112, 12);
  } else {
    for (const x of [36, 60, 84]) ctx.fillRect(x, 8, 12, 112);
  }
  ctx.restore();
}

function addWrap(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#FFF6E8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#FF4D7A';
  ctx.beginPath();
  ctx.arc(50, 28, 10, 0, Math.PI * 2);
  ctx.arc(78, 28, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(58, 24, 12, 16);
}

function publish(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function paintCandy(scene: Phaser.Scene, kind: CandyKind, special: Special, key: string): void {
  const { canvas, ctx } = makeCanvas(128);
  if (kind === 'rainbow') drawRainbow(ctx);
  else if (kind === 'star') drawStar(ctx);
  else DRAW_KIND[kind]?.(ctx);
  if (special === 'stripedH') addStripes(ctx, 'h');
  if (special === 'stripedV') addStripes(ctx, 'v');
  if (special === 'wrapped') addWrap(ctx);
  publish(scene, key, canvas);
}

export function candyTextureKey(kind: CandyKind, special: Special): string {
  if (kind === 'rainbow' || kind === 'star') return `candy-${kind}`;
  if (special === 'none') return `candy-${kind}`;
  return `candy-${kind}-${special}`;
}

export function generateTextures(scene: Phaser.Scene): string[] {
  const errors: string[] = [];
  const jobs: { key: string; draw: () => void }[] = [
    { key: 'bg-sky', draw: () => publish(scene, 'bg-sky', background(['#B7E4FF', '#FFF6E8', '#FFD0E4'])) },
    { key: 'bg-meadow', draw: () => publish(scene, 'bg-meadow', background(['#C8F7D8', '#FFF6E8', '#FFD0E4'])) },
    { key: 'bg-bay', draw: () => publish(scene, 'bg-bay', background(['#B7E4FF', '#E7F6FF', '#FFE4F4'])) },
    { key: 'bg-mountain', draw: () => publish(scene, 'bg-mountain', background(['#E4DCFF', '#FFF6E8', '#FFD0B8'])) },
    { key: 'cell', draw: () => publish(scene, 'cell', roundedTile('#FFF6E8', '#F3D3E4')) },
    { key: 'cell-b', draw: () => publish(scene, 'cell-b', roundedTile('#FFEAF4', '#F3D3E4')) },
    { key: 'jelly', draw: () => publish(scene, 'jelly', jellyTile()) },
    { key: 'wheel', draw: () => publish(scene, 'wheel', wheelTile()) },
    { key: 'blocker', draw: () => publish(scene, 'blocker', blockerTile()) },
    { key: 'trapped', draw: () => publish(scene, 'trapped', trappedTile()) },
    { key: 'coin', draw: () => publish(scene, 'coin', coinTile()) },
  ];
  for (const kind of NORMAL_KINDS) {
    jobs.push({ key: `candy-${kind}`, draw: () => paintCandy(scene, kind, 'none', `candy-${kind}`) });
    jobs.push({ key: `candy-${kind}-stripedH`, draw: () => paintCandy(scene, kind, 'stripedH', `candy-${kind}-stripedH`) });
    jobs.push({ key: `candy-${kind}-stripedV`, draw: () => paintCandy(scene, kind, 'stripedV', `candy-${kind}-stripedV`) });
    jobs.push({ key: `candy-${kind}-wrapped`, draw: () => paintCandy(scene, kind, 'wrapped', `candy-${kind}-wrapped`) });
  }
  jobs.push({ key: 'candy-rainbow', draw: () => paintCandy(scene, 'rainbow', 'none', 'candy-rainbow') });
  jobs.push({ key: 'candy-star', draw: () => paintCandy(scene, 'star', 'none', 'candy-star') });
  for (const job of jobs) {
    try {
      job.draw();
    } catch {
      errors.push(job.key);
    }
  }
  return errors;
}

function background(stops: [string, string, string]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const gradient = ctx.createLinearGradient(0, 0, 0, 1280);
  gradient.addColorStop(0, stops[0]);
  gradient.addColorStop(0.55, stops[1]);
  gradient.addColorStop(1, stops[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 720, 1280);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(180, 1080, 260, 80, 0, 0, Math.PI * 2);
  ctx.ellipse(520, 1140, 280, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function roundedTile(fill: string, stroke: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128);
  roundRect(ctx, 8, 8, 112, 112, 28);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  return canvas;
}

function jellyTile(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = 'rgba(255,120,170,0.55)';
  ctx.beginPath();
  ctx.ellipse(64, 78, 40, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(50, 70, 12, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function wheelTile(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = '#3D2C6B';
  ctx.beginPath();
  ctx.arc(64, 70, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFE14A';
  ctx.beginPath();
  ctx.arc(64, 70, 12, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function blockerTile(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128);
  roundRect(ctx, 22, 28, 84, 72, 18);
  ctx.fillStyle = '#4A3568';
  ctx.fill();
  ctx.strokeStyle = '#2A1D4A';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#C9B6FF';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(40, 48);
  ctx.lineTo(88, 80);
  ctx.moveTo(88, 48);
  ctx.lineTo(40, 80);
  ctx.stroke();
  return canvas;
}

function trappedTile(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128);
  roundRect(ctx, 24, 36, 80, 58, 16);
  ctx.strokeStyle = '#FF8FB8';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#7EC8FF';
  roundRect(ctx, 40, 52, 48, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#3D2C6B';
  ctx.beginPath();
  ctx.arc(52, 82, 7, 0, Math.PI * 2);
  ctx.arc(76, 82, 7, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function coinTile(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128);
  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE14A';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#E0A800';
  ctx.stroke();
  ctx.fillStyle = '#C47B12';
  ctx.font = 'bold 42px Trebuchet MS, Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('c', 64, 68);
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
