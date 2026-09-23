import type { ExplorationSystem } from '../systems/ExplorationSystem';
import type Phaser from 'phaser';
import { t } from '../systems/UserSettings';
import type { ExplorationState } from '../types/exploration';
import { ScrollPanel } from './ScrollPanel';

/** Reviews a day plan without resolving searches, repairs, or resource rolls. */
export function renderExplorationConfirmation(
  scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  width: number, height: number, state: ExplorationState,
  cancel: () => void, confirm: () => void, exploration?: ExplorationSystem,
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
  // Measure wrapped summary text before allocating its scrollable content height.
  // Keep the title and actions outside the mask so every plan remains reviewable.
  const summary = scene.add.container(0, 0);
  const siteWidth = columns ? Math.floor(innerWidth * 0.52) : innerWidth;
  const summaryText = (x: number, y: number, value: string, width: number, bold = false) => {
    const label = scene.add.text(x, y, value, {
      fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#292b25',
      fontStyle: bold ? 'bold' : 'normal', wordWrap: { width, useAdvancedWrap: true },
    });
    summary.add(label);
    return label.height;
  };
  let siteY = summaryText(0, 0, t('Search sites'), siteWidth, true) + 8;
  const locations = state.locations.filter(location => state.plannedLocationIds.includes(location.id));
  const names = new Map([['player', t('Player')], ...(exploration?.companions.getActive() ?? [])
    .map(ally => [ally.id, `${ally.firstName} ${ally.lastName}`] as [string, string])]);
  const searchHours = locations.filter(location => !exploration || exploration.getParticipants(location.id).includes('player'))
    .reduce((total, location) => total + (exploration?.getSearchHours(location.id) ?? location.searchHours), 0);
  const rows = locations.length ? locations.map(location =>
    t('{site} · {hours} h', { site: t(location.name), hours: exploration?.getSearchHours(location.id) ?? location.searchHours })
      + (exploration ? '\n' + exploration.getParticipants(location.id).map(id => names.get(id)).join(', ') : ''),
  ) : [t('No sites selected')];
  rows.forEach(row => { siteY += summaryText(0, siteY, row, siteWidth) + 6; });

  const budgetX = columns ? siteWidth + 12 : 0;
  let budgetY = columns ? 24 : siteY + 8;
  [
    t('Search {hours} h', { hours: searchHours }),
    t('Repair {hours} h', { hours: state.repairHours }),
    t('Rest {hours} h', { hours: state.remainingHours - searchHours - state.repairHours }),
  ].forEach(label => { budgetY += summaryText(budgetX, budgetY, label, innerWidth - budgetX) + 6; });

  for (const ally of exploration?.companions.getActive() ?? []) {
    if (ally.joinedDay >= state.day) continue;
    budgetY += summaryText(budgetX, budgetY, `${ally.firstName} ${ally.lastName} · `
      + t('{hours} h repair', { hours: exploration!.getRepairHours(ally.id) }) + ' · '
      + t('Rest {hours} h', { hours: exploration!.getUnallocatedHours(ally.id) }), innerWidth - budgetX) + 6;
  }
  const buttonY = top + panelHeight - 60;
  const viewport = { x: left + padding, y: top + 52, width: innerWidth, height: buttonY - (top + 52) - 12 };
  const contentHeight = Math.max(viewport.height, siteY, budgetY);
  const panel = new ScrollPanel(scene, overlay, viewport, innerWidth, contentHeight,
    { x: 0, y: 0, zoom: 1 }, 'contain', { zoomEnabled: false, dragCursor: contentHeight > viewport.height });
  panel.content.add(summary);
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
