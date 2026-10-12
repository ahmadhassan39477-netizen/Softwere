import { startGame } from './game/createGame';

const game = startGame('game');

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
