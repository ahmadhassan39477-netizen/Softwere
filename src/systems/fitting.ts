export interface FittingPiece {
  id: string;
  label: string;
  shape: 'round' | 'wedge' | 'dome' | 'cloud' | 'star' | 'bubble';
  color: string;
}

export interface FittingSlot {
  id: string;
  label: string;
  accepts: string;
}

export interface FittingChallenge {
  id: string;
  title: string;
  clue: string;
  difficulty: number;
  slots: FittingSlot[];
  pieces: FittingPiece[];
  rewardCoins: number;
  sticker: string;
}

export type PlacementOutcome = 'snap' | 'return' | 'unknown';

export function evaluatePlacement(challenge: FittingChallenge, slotId: string, pieceId: string): PlacementOutcome {
  const slot = challenge.slots.find((item) => item.id === slotId);
  const piece = challenge.pieces.find((item) => item.id === pieceId);
  if (!slot || !piece) return 'unknown';
  return slot.accepts === piece.id ? 'snap' : 'return';
}

export function isFittingComplete(challenge: FittingChallenge, placements: Record<string, string>): boolean {
  return challenge.slots.every((slot) => placements[slot.id] === slot.accepts);
}
