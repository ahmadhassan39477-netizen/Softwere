# Candy Car Adventure

A portrait-first match-3 puzzle for ages 5–10. Help Pip, a friendly toy car, clear candy boards, collect garage coins, and fit parts onto original cars.

This repository did not contain a Unity project or an existing game. Unity Editor and the Android SDK are not used here. The playable game is a Phaser 3 web app so it can be installed, tested, and built in this environment.

## Prerequisites

- Node.js 22 (developed on 22.14)
- npm 10

## Install

```bash
npm install
```

## Play in development

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The layout is portrait 720×1280 and scales to fit the window.

## Test

```bash
npm test
```

## Typecheck and lint

```bash
npm run typecheck
npm run lint
```

## Production build

```bash
npm run build
npm run preview
```

The build output is written to `dist/`. Preview serves that folder.

## How to play

1. Press **Play** on the welcome screen. A short tutorial sits above the buttons and can be skipped.
2. On the adventure map, choose the highlighted level. Later areas open only after you finish the levels before them.
3. Swap candies so three or more of the same shape line up. Matches clear, candies fall, and new ones drop in.
4. Match four for a striped candy, a T or L of five for a wrapped candy, and five in a line for a rainbow candy. Swap specials together for a bigger pop.
5. Finish every goal before moves run out. The last move still wins if it completes the goals.
6. Spend coins in the garage if you want a new car. You can finish the adventure without buying anything.
7. The workshop has five fitting puzzles. Drag a part to a slot, or tap a part and then tap the slot.

## Controls

- Pointer drag between two neighboring candies
- Tap a candy, then tap a neighbor
- Arrow keys or WASD move the cursor. Enter or Space picks it up. An arrow then swaps that way
- H asks Pip for a hint. Esc pauses
- Menus also respond to arrow keys and Enter

Invalid swaps bounce back and do not use a move. A second swap waits until the first one finishes.

## Save

Progress is stored in `localStorage` under `candy-car-adventure-v1`. The save is versioned and checked on load. Broken data falls back to a fresh adventure. Coins never go below zero.

The save remembers unlocked levels, best scores, stars, coins, owned cars, the selected car, paint and wheels, stickers, badges, settings, workshop prizes, and whether the tutorial was seen. Leaving in the middle of a board does not keep that board. Completed levels and settings are kept. Reset progress asks first and keeps your volume settings.

## Project structure

- `src/scenes` — loading, welcome, map, level prep, play, pause, victory, try-again, garage, collection, settings, workshop
- `src/systems` — board, matches, swaps, gravity, refill, specials, cascades, score, goals, session, save, economy, fitting
- `src/config` — 20 levels, 8 cars, workshop puzzles, text
- `src/art` — procedural candy, Pip, and car drawing
- `src/audio` — synthesized music and effects (starts after the first tap or click)
- `tests` — rules, saves, rewards, and level boards

## Replacing art

Candy, boards, icons, and backgrounds are drawn on canvas in `src/art/textures.ts` and registered as Phaser textures. Pip is drawn in `src/art/Pip.ts`. Cars are drawn in `src/art/drawCar.ts`. To use image files instead, generate the same texture keys (`candy-strawberry`, `candy-strawberry-stripedH`, `bg-sky`, and so on) and keep the gameplay modules unchanged.

Player-facing copy lives in `src/config/text.ts`. Add a language block and set `settings.language` to its key.

New levels can be added in `src/config/levels.ts` without changing the matcher.

## Known limitations

- Unity 6, C#, URP, and Android builds are not in this project. The tree was empty, and a Phaser game is the build that can be compiled and played here.
- Art and audio are original and procedural. There are no external image or audio files.
- English is the only language shipped. The text table is ready for more.
- The portrait board is fitted on wide screens, with a candy-colored page around it.
- Reduced motion shortens board animation and turns off extra bobbing and confetti.
- A level board is not restored if the page is closed mid-level. Rewards save when the level ends.
