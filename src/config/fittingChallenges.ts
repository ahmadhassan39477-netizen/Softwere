import type { FittingChallenge } from '../systems/fitting';

export const FITTING_CHALLENGES: FittingChallenge[] = [
  {
    id: 'fit-strawberry-wheels',
    title: 'Strawberry Wheels',
    clue: 'Pip needs strawberry wheels. Place the matching pair on the car.',
    difficulty: 1,
    slots: [{ id: 'wheels', label: 'Wheels', accepts: 'wheels-strawberry' }],
    pieces: [
      { id: 'wheels-strawberry', label: 'Strawberry wheels', shape: 'round', color: '#FF5C8A' },
      { id: 'wheels-mint', label: 'Mint wheels', shape: 'round', color: '#5EE0B5' },
      { id: 'wheels-lemon', label: 'Lemon wheels', shape: 'round', color: '#FFE14A' },
    ],
    rewardCoins: 40,
    sticker: 'sticker-strawberry-wheels',
  },
  {
    id: 'fit-mint-body',
    title: 'Mint Mini Body',
    clue: 'Find the round mint body and snap it into the bay.',
    difficulty: 2,
    slots: [{ id: 'body', label: 'Body', accepts: 'body-mint-round' }],
    pieces: [
      { id: 'body-strawberry-wedge', label: 'Berry wedge', shape: 'wedge', color: '#FF5C8A' },
      { id: 'body-mint-round', label: 'Mint round', shape: 'round', color: '#5EE0B5' },
      { id: 'body-lemon-dome', label: 'Lemon dome', shape: 'dome', color: '#FFE14A' },
    ],
    rewardCoins: 45,
    sticker: 'sticker-mint-body',
  },
  {
    id: 'fit-sunshine',
    title: 'Sunshine Buggy',
    clue: 'The buggy wants a lemon wedge body and sunny knobby wheels.',
    difficulty: 3,
    slots: [
      { id: 'body', label: 'Body', accepts: 'body-lemon-wedge' },
      { id: 'wheels', label: 'Wheels', accepts: 'wheels-sunny' },
    ],
    pieces: [
      { id: 'body-lemon-wedge', label: 'Lemon wedge', shape: 'wedge', color: '#FFE14A' },
      { id: 'body-mint-round', label: 'Mint round', shape: 'round', color: '#5EE0B5' },
      { id: 'wheels-sunny', label: 'Sunny wheels', shape: 'round', color: '#FF9E42' },
      { id: 'wheels-mint', label: 'Mint wheels', shape: 'round', color: '#5EE0B5' },
    ],
    rewardCoins: 55,
    sticker: 'sticker-sunshine',
  },
  {
    id: 'fit-bubble',
    title: 'Bubble Coupe',
    clue: 'Fit the pink bubble dome and the heart-cap wheels.',
    difficulty: 4,
    slots: [
      { id: 'body', label: 'Body', accepts: 'body-bubble-dome' },
      { id: 'wheels', label: 'Wheels', accepts: 'wheels-heart' },
    ],
    pieces: [
      { id: 'body-bubble-dome', label: 'Pink bubble', shape: 'bubble', color: '#FF8EC8' },
      { id: 'body-aqua-dome', label: 'Aqua dome', shape: 'dome', color: '#7EC8FF' },
      { id: 'wheels-heart', label: 'Heart caps', shape: 'round', color: '#FF8EC8' },
      { id: 'wheels-capsule', label: 'Blue capsules', shape: 'round', color: '#4C8DFF' },
    ],
    rewardCoins: 60,
    sticker: 'sticker-bubble',
  },
  {
    id: 'fit-moonlight',
    title: 'Moonlight Racer',
    clue: 'Ink crescent body, crescent wheels, and a star spoiler. Three parts!',
    difficulty: 5,
    slots: [
      { id: 'body', label: 'Body', accepts: 'body-moon-crescent' },
      { id: 'wheels', label: 'Wheels', accepts: 'wheels-crescent' },
      { id: 'spoiler', label: 'Spoiler', accepts: 'spoiler-star' },
    ],
    pieces: [
      { id: 'body-moon-crescent', label: 'Ink crescent', shape: 'wedge', color: '#2E255C' },
      { id: 'body-dusk', label: 'Dusk wedge', shape: 'wedge', color: '#8E7CC3' },
      { id: 'wheels-crescent', label: 'Crescent wheels', shape: 'round', color: '#E7E2FF' },
      { id: 'wheels-silver', label: 'Plain silver', shape: 'round', color: '#C9D2E0' },
      { id: 'spoiler-star', label: 'Star spoiler', shape: 'star', color: '#FFE566' },
      { id: 'spoiler-cloud', label: 'Cloud spoiler', shape: 'cloud', color: '#F4F8FF' },
    ],
    rewardCoins: 70,
    sticker: 'sticker-moonlight',
  },
];
