export interface CarPaint {
  id: string;
  name: string;
  body: string;
  accent: string;
  trim: string;
}

export interface CarWheel {
  id: string;
  name: string;
}

export interface CarDef {
  id: string;
  name: string;
  description: string;
  price: number;
  paints: CarPaint[];
  wheels: CarWheel[];
}

export const STARTER_CAR_ID = 'strawberry-racer';

export const CARS: CarDef[] = [
  {
    id: 'strawberry-racer',
    name: 'Strawberry Racer',
    description: 'A long, low wedge with a berry nose and speedy stripes.',
    price: 0,
    paints: [
      { id: 'berry', name: 'Berry', body: '#FF5C8A', accent: '#FFE08A', trim: '#C81E4A' },
      { id: 'cream', name: 'Cream', body: '#FFF1D6', accent: '#FF8FB3', trim: '#E07A9A' },
      { id: 'soda', name: 'Soda', body: '#FF8DA8', accent: '#7EC8FF', trim: '#C43B66' },
    ],
    wheels: [
      { id: 'chunky', name: 'Chunky' },
      { id: 'star', name: 'Star caps' },
    ],
  },
  {
    id: 'mint-mini',
    name: 'Mint Mini',
    description: 'An almost-round city car with a big friendly face.',
    price: 50,
    paints: [
      { id: 'mint', name: 'Mint', body: '#5EE0B5', accent: '#FFF6C2', trim: '#14967A' },
      { id: 'lime', name: 'Lime', body: '#B6F25C', accent: '#FFFFFF', trim: '#5B8C12' },
      { id: 'sea', name: 'Sea', body: '#7DDFC3', accent: '#4C8DFF', trim: '#1D6B5A' },
    ],
    wheels: [
      { id: 'round', name: 'Round' },
      { id: 'button', name: 'Button' },
    ],
  },
  {
    id: 'sunshine-buggy',
    name: 'Sunshine Buggy',
    description: 'An open-top buggy with tall arches and no roof.',
    price: 80,
    paints: [
      { id: 'lemon', name: 'Lemon', body: '#FFE14A', accent: '#FF9E42', trim: '#E0A800' },
      { id: 'peach', name: 'Peach', body: '#FFB084', accent: '#FFF3B0', trim: '#E36A3A' },
      { id: 'honey', name: 'Honey', body: '#FFD27A', accent: '#FF6B9A', trim: '#C47B12' },
    ],
    wheels: [
      { id: 'knobby', name: 'Knobby' },
      { id: 'smooth', name: 'Smooth' },
    ],
  },
  {
    id: 'rainbow-roadster',
    name: 'Rainbow Roadster',
    description: 'A long-hood roadster with a fin tail and prism stripe.',
    price: 100,
    paints: [
      { id: 'prism', name: 'Prism', body: '#FFFFFF', accent: '#B06BFF', trim: '#5B3FA0' },
      { id: 'grape', name: 'Grape', body: '#C9A6FF', accent: '#FFE14A', trim: '#6E2BB5' },
      { id: 'sky', name: 'Sky', body: '#B7E4FF', accent: '#FF8FB3', trim: '#2E6BC4' },
    ],
    wheels: [
      { id: 'slim', name: 'Slim' },
      { id: 'disc', name: 'Disc' },
    ],
  },
  {
    id: 'cloud-cruiser',
    name: 'Cloud Cruiser',
    description: 'A puffy cloud body that looks soft enough to hug.',
    price: 120,
    paints: [
      { id: 'cloud', name: 'Cloud', body: '#F4F8FF', accent: '#9AD7FF', trim: '#8AA4C8' },
      { id: 'blush', name: 'Blush', body: '#FFE4F1', accent: '#FFB7D5', trim: '#D47AA4' },
      { id: 'lilac', name: 'Lilac', body: '#E4DCFF', accent: '#FFFFFF', trim: '#8D74C9' },
    ],
    wheels: [
      { id: 'puff', name: 'Puff' },
      { id: 'ring', name: 'Ring' },
    ],
  },
  {
    id: 'star-explorer',
    name: 'Star Explorer',
    description: 'A tall cab with a big rear pack for sticker expeditions.',
    price: 140,
    paints: [
      { id: 'night', name: 'Night', body: '#3D4D8F', accent: '#FFE566', trim: '#F4F8FF' },
      { id: 'comet', name: 'Comet', body: '#6C7CFF', accent: '#FFFFFF', trim: '#2A2E6B' },
      { id: 'aurora', name: 'Aurora', body: '#7DDFC3', accent: '#C9B6FF', trim: '#214E6A' },
    ],
    wheels: [
      { id: 'rugged', name: 'Rugged' },
      { id: 'glow', name: 'Glow' },
    ],
  },
  {
    id: 'bubble-coupe',
    name: 'Bubble Coupe',
    description: 'A round coupe under a clear bubble dome.',
    price: 160,
    paints: [
      { id: 'bubble', name: 'Bubble', body: '#FF8EC8', accent: '#FFF6E8', trim: '#C43B7A' },
      { id: 'aqua', name: 'Aqua', body: '#7EC8FF', accent: '#FFFFFF', trim: '#2E6BC4' },
      { id: 'sherbet', name: 'Sherbet', body: '#FFC4A3', accent: '#FFE566', trim: '#E36A3A' },
    ],
    wheels: [
      { id: 'capsule', name: 'Capsule' },
      { id: 'heart', name: 'Heart caps' },
    ],
  },
  {
    id: 'moonlight-racer',
    name: 'Moonlight Racer',
    description: 'A low crescent silhouette that shines after bedtime stories.',
    price: 200,
    paints: [
      { id: 'moon', name: 'Moon', body: '#E7E2FF', accent: '#FFE9A8', trim: '#6E62B5' },
      { id: 'ink', name: 'Ink', body: '#2E255C', accent: '#C9B6FF', trim: '#F6F1FF' },
      { id: 'dusk', name: 'Dusk', body: '#8E7CC3', accent: '#FFB7D5', trim: '#2E255C' },
    ],
    wheels: [
      { id: 'crescent', name: 'Crescent' },
      { id: 'silver', name: 'Silver' },
    ],
  },
];

export function carById(id: string): CarDef | undefined {
  return CARS.find((car) => car.id === id);
}
