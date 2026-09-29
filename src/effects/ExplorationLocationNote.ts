import type Phaser from 'phaser';
import type { ViewportState } from '../logic/pinchViewport';
import type { ExplorationSystem } from '../systems/ExplorationSystem';
import type { ExplorationState, SearchLocation } from '../types/exploration';
import { t, userSettings } from '../systems/UserSettings';
import { explorationPlanMessage } from '../logic/explorationFeedback';
import { ScrollPanel } from './ScrollPanel';

/** Building notes show the automatic search party; scheduling stays in the day system. */
export function renderExplorationLocationNote(
  scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  box: { x: number; y: number; width: number; height: number },
  location: SearchLocation, state: ExplorationState, exploration: ExplorationSystem,
  offset: ViewportState, refresh: (message?: string) => void, compact: boolean, failure?: string,
  noteAction = false,
): void {
  parent.add(scene.add.rectangle(box.x + 3, box.y + 4, box.width, box.height, 0x323429, 0.17).setOrigin(0));
  parent.add(scene.add.rectangle(box.x, box.y, box.width, box.height, 0xe4dca8).setOrigin(0));
  const width = box.width - 24;
  const content = scene.add.container(0, 0);
  const targets: Array<{ y: number; height: number; action: () => void }> = [];
  const text = (x: number, y: number, value: string, size = 13, color = '#292b25') => {
    const label = scene.add.text(x, y, value, { fontFamily: '"Chalkboard SE", "Comic Sans MS", cursive',
      fontSize: size, color, wordWrap: { width: width - x, useAdvancedWrap: true } });
    content.add(label);
    return label;
  };
  let y = text(0, 0, t(location.name), compact ? 16 : 19).height + 10;
  if (location.address) y += text(0, y, location.address, 12, '#737467').height + 10;
  y += text(0, y, t('Search required: {hours} h', { hours: exploration.getSearchHours(location.id) }), 12, '#982c24').height + 16;
  if (failure) y += text(0, y, failure, 12, '#982c24').height + 12;
  const planned = state.plannedLocationIds.includes(location.id);
  const editable = !state.confirmed && !exploration.getState().confirmed && !location.searched;
  const companions = exploration.getAvailableCompanions();
  if (companions.length && !location.searched) {
    y += text(0, y, t('Search party'), 13).height + 8;
    y += text(0, y, t('Player'), 14).height + 8;
    for (const ally of companions) {
      y += text(0, y, `${ally.firstName} ${ally.lastName}`, 14).height + 8;
    }
    y += 8;
  }
  const status = state.confirmed ? 'DAY COMPLETE' : location.searched ? 'SEARCHED'
    : planned ? 'Marked for search' : 'Tap a building to mark or unmark it.';
  if (!noteAction || planned || !editable) y += text(0, y, t(status), 12, planned ? '#982c24' : '#737467').height + 8;
  if (editable && (noteAction || (!planned && companions.length))) {
    content.add(scene.add.rectangle(0, y, width, 40, 0x982c24).setOrigin(0));
    text(8, y + 12, t(planned ? 'Unmark for search' : 'Mark for search'), 13, '#fff3dc');
    targets.push({ y, height: 40, action: () => {
      if (!exploration.toggleLocation(location.id)) {
        refresh(explorationPlanMessage(exploration.getLocationPlanBlock(location.id), userSettings.locale));
        return;
      }
      refresh();
    } });
    y += 48;
  }
  const viewport = { x: box.x + 12, y: box.y + 10, width, height: box.height - 20 };
  const panel = new ScrollPanel(scene, parent, viewport, width, Math.max(y, viewport.height),
    offset, 'contain', { zoomEnabled: false, dragCursor: y > viewport.height });
  panel.content.add(content);
  for (const target of targets) panel.onTap({ x: 0, y: target.y, width, height: target.height }, target.action);
}
