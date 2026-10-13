export const VIEW_W = 720;
export const VIEW_H = 1280;
export const CELL = 74;
export const BOARD_X = (VIEW_W - CELL * 8) / 2;
export const BOARD_Y = 330;

export const FONT = 'Trebuchet MS, Segoe UI, Verdana, sans-serif';

export const INK = '#3D2C6B';
export const CREAM = '#FFF6E8';

export function cellCenter(r: number, c: number): { x: number; y: number } {
  return { x: BOARD_X + c * CELL + CELL / 2, y: BOARD_Y + r * CELL + CELL / 2 };
}
