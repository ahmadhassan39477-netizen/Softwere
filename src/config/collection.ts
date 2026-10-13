export interface CollectionItem {
  id: string;
  name: string;
  hint: string;
  kind: 'sticker' | 'badge';
}

export const STICKER_DEFS: CollectionItem[] = [
  { id: 'sticker-strawberry-wheels', name: 'Berry Wheels', hint: 'Finish the first workshop puzzle.', kind: 'sticker' },
  { id: 'sticker-mint-body', name: 'Mint Body', hint: 'Fit the Mint Mini body.', kind: 'sticker' },
  { id: 'sticker-sunshine', name: 'Sunshine', hint: 'Build the Sunshine Buggy.', kind: 'sticker' },
  { id: 'sticker-bubble', name: 'Bubble', hint: 'Fit the Bubble Coupe.', kind: 'sticker' },
  { id: 'sticker-moonlight', name: 'Moonlight', hint: 'Finish the Moonlight Racer puzzle.', kind: 'sticker' },
  { id: 'sticker-meadow-star', name: 'Meadow Star', hint: 'Earn 3 stars in Strawberry Meadow.', kind: 'sticker' },
  { id: 'sticker-bay-star', name: 'Bay Star', hint: 'Earn 3 stars in Bubblegum Bay.', kind: 'sticker' },
  { id: 'sticker-mountain-star', name: 'Mountain Star', hint: 'Earn 3 stars on Rainbow Mountain.', kind: 'sticker' },
  { id: 'sticker-finale', name: 'Finale Flag', hint: 'Complete level 20.', kind: 'sticker' },
];

export const BADGE_DEFS: CollectionItem[] = [
  { id: 'first-win', name: 'First Finish', hint: 'Complete a level.', kind: 'badge' },
  { id: 'star-trio', name: 'Triple Shine', hint: 'Earn 3 stars on a level.', kind: 'badge' },
  { id: 'meadow-done', name: 'Meadow Friend', hint: 'Finish Strawberry Meadow.', kind: 'badge' },
  { id: 'bay-done', name: 'Bay Explorer', hint: 'Finish Bubblegum Bay.', kind: 'badge' },
  { id: 'mountain-done', name: 'Mountain Star', hint: 'Finish Rainbow Mountain.', kind: 'badge' },
  { id: 'special-maker', name: 'Candy Inventor', hint: 'Create a special candy.', kind: 'badge' },
  { id: 'combo-kid', name: 'Combo Spark', hint: 'Set off a special candy.', kind: 'badge' },
  { id: 'garage-owner', name: 'Garage Trio', hint: 'Own 3 cars.', kind: 'badge' },
  { id: 'fitter', name: 'Careful Fitter', hint: 'Finish a workshop puzzle.', kind: 'badge' },
  { id: 'collector', name: 'Sticker Start', hint: 'Earn a sticker.', kind: 'badge' },
];

export const REGIONS = [
  { id: 'meadow' as const, name: 'Strawberry Meadow', start: 1, end: 6, tint: 0xff8fb8 },
  { id: 'bay' as const, name: 'Bubblegum Bay', start: 7, end: 13, tint: 0x7ec8ff },
  { id: 'mountain' as const, name: 'Rainbow Mountain', start: 14, end: 20, tint: 0xc9b6ff },
];
