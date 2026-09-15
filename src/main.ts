import Phaser from 'phaser';

import { GAME_CONFIG } from './gameConfig';

import { setLanguage, t, userSettings } from './systems/UserSettings';

setLanguage(userSettings.locale);
const loading = document.getElementById('boot-loading');
if (loading) loading.textContent = t('LOADING...');

new Phaser.Game(GAME_CONFIG);
