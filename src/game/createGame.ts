import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../ui/layout';
import { CollectionScene } from '../scenes/CollectionScene';
import { FailScene } from '../scenes/FailScene';
import { FittingScene } from '../scenes/FittingScene';
import { GameScene } from '../scenes/GameScene';
import { GarageScene } from '../scenes/GarageScene';
import { LevelPrepScene } from '../scenes/LevelPrepScene';
import { LoadingScene } from '../scenes/LoadingScene';
import { MapScene } from '../scenes/MapScene';
import { PauseScene } from '../scenes/PauseScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { VictoryScene } from '../scenes/VictoryScene';
import { WelcomeScene } from '../scenes/WelcomeScene';
import { createServices } from './services';

export function startGame(parent: string): Phaser.Game {
  const services = createServices();
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#FFF6E8',
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: VIEW_W,
      height: VIEW_H,
    },
    scene: [
      LoadingScene,
      WelcomeScene,
      MapScene,
      LevelPrepScene,
      GameScene,
      PauseScene,
      VictoryScene,
      FailScene,
      GarageScene,
      CollectionScene,
      SettingsScene,
      FittingScene,
    ],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('services', services);
      },
    },
  });
}
