import type Phaser from 'phaser';
import { t } from '../systems/UserSettings';
import type { ExplorationState } from '../types/exploration';

/** Reviews a day plan without resolving searches, repairs, or resource rolls. */
export function renderExplorationConfirmation(
  scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  width: number, height: number, state: ExplorationState,
  cancel: () => void, confirm: () => void,
): void {
  const overlay = scene.add.container(0, 0);
  parent.add(overlay);
  overlay.add(scene.add.rectangle(0, 0, width, height, 0x000000, 0.55)
    .setOrigin(0).setInteractive());

  const columns = height < 400 && width >= 480;
  const panelWidth = Math.min(columns ? 660 : 440, width - 32);
  const panelHeight = Math.min(columns ? 280 : 360, height - 32);
  const left = (width - panelWidth) / 2;
  const top = (height - panelHeight) / 2;
  const padding = 16;
  const innerWidth = panelWidth - padding * 2;
  overlay.add(scene.add.rectangle(left, top, panelWidth, panelHeight, 0xe7e5d5)
    .setOrigin(0).setStrokeStyle(1, 0x737467).setInteractive());
  const text = (x: number, y: number, value: string, size = 14, bold = false, color = '#292b25') => {
    const label = scene.add.text(x, y, value, {
      fontFamily: 'Arial, sans-serif', fontSize: size, color, fontStyle: bold ? 'bold' : 'normal',
    });
    overlay.add(label);
    return label;
  };
  text(left + padding, top + 16, t('Proceed with this plan?'), 20, true);
  text(left + padding, top + 52, t('Search sites'), 14, true);
  const locations = state.locations.filter(location => state.plannedLocationIds.includes(location.id));
  const searchHours = locations.reduce((total, location) => total + location.searchHours, 0);
  const rows = locations.length ? locations.map(location =>
    t('{site} · {hours} h', { site: t(location.name), hours: location.searchHours }),
  ) : [t('No sites selected')];
  rows.forEach((row, index) => text(left + padding,
    top + (columns ? 72 : 76) + index * (columns ? 20 : 22), row));

  const budgetX = columns ? left + panelWidth * 0.56 : left + padding;
  const budgetY = columns ? top + 76 : top + 76 + rows.length * 22 + 14;
  [
    t('Search {hours} h', { hours: searchHours }),
    t('Repair {hours} h', { hours: state.repairHours }),
    t('Rest {hours} h', { hours: state.remainingHours - searchHours - state.repairHours }),
  ].forEach((label, index) => text(budgetX, budgetY + index * 22, label));

  const buttonY = top + panelHeight - 60;
  const buttonWidth = (innerWidth - 12) / 2;
  const button = (x: number, label: string, action: () => void, primary: boolean) => {
    const background = scene.add.rectangle(x, buttonY, buttonWidth, 44, primary ? 0x982c24 : 0xd4d3c4)
      .setOrigin(0).setStrokeStyle(1, primary ? 0x742019 : 0x737467)
      .setInteractive({ useHandCursor: true });
    background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() <= 8 && background.getBounds().contains(pointer.downX, pointer.downY)) action();
    });
    overlay.add(background);
    text(x + buttonWidth / 2, buttonY + 22, label, 15, true, primary ? '#fff3dc' : '#292b25')
      .setOrigin(0.5);
  };
  button(left + padding, t('GO BACK'), cancel, false);
  button(left + padding + buttonWidth + 12, t('PROCEED'), confirm, true);
}
