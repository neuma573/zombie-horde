import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import Phaser from 'phaser';
import { ScrollPanel } from './ScrollPanel';
import type { ViewportState } from '../logic/pinchViewport';
import type { ExplorationSystem } from '../systems/ExplorationSystem';
import { t } from '../systems/UserSettings';

/** Scrollable roster and allocations; all mutations go through the day system. */
export function renderCompanionPlanning(scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  box: { x: number; y: number; width: number; height: number }, exploration: ExplorationSystem,
  offset: ViewportState, refresh: () => void, close: () => void): void {
  parent.add(scene.add.rectangle(box.x, box.y, box.width, box.height, 0xe7e5d5).setOrigin(0));
  const state = exploration.getState();
  const roster = exploration.companions.getActive();
  const people = [{ id: 'player', name: t('Player'), courage: null, available: true }, ...roster.map(ally => ({
    id: ally.id, name: `${ally.firstName} ${ally.lastName}`, courage: ally.courage, available: ally.joinedDay < state.day,
  }))];
  const width = box.width - 24;
  const events = exploration.companions.getEvents();
  const contentHeight = 130 + people.length * 105 + state.plannedLocationIds.length * (110 + people.length * 42) + events.length * 48 + exploration.getRecoveredWeapons().length * 48;
  const panel = new ScrollPanel(scene, parent, { x: box.x + 12, y: box.y + 56, width, height: Math.max(40, box.height - 68) },
    width, Math.max(contentHeight, box.height - 68), offset, 'contain', { zoomEnabled: false });
  const text = (x: number, y: number, label: string, size = 14, color = '#292b25') => {
    const item = scene.add.text(x, y, label, { fontFamily: 'Arial', fontSize: size, color }).setWordWrapWidth(width - x - 8);
    panel.content.add(item); return item;
  };
  const button = (x: number, y: number, w: number, label: string, action: () => void, enabled = true) => {
    panel.content.add(scene.add.rectangle(x, y, w, 36, enabled ? 0x982c24 : 0xc6c6b4).setOrigin(0));
    text(x + 8, y + 9, label, 13, enabled ? '#fff3dc' : '#626454');
    if (enabled) panel.onTap({ x, y, width: w, height: 36 }, action);
  };
  parent.add(scene.add.text(box.x + 12, box.y + 14, t('Companions {count}/4', { count: roster.length }), { fontSize: 18, color: '#292b25' }));
  const back = scene.add.text(box.x + box.width - 12, box.y + 14, t('Back'), { fontSize: 18, color: '#982c24' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
  back.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (pointer.getDistance() <= 8) close(); });
  parent.add(back);
  let y = 8;
  text(0, y, t('Each person has 12 hours. Unassigned time is rest.'), 13); y += 48;
  for (const weapon of exploration.getRecoveredWeapons()) {
    text(0, y, t('Recovered {weapon}', { weapon: t(WEAPON_DEFINITIONS[weapon].name) }), 14, '#526537');
    y += 48;
  }
  for (const event of events) {
    text(0, y, t(event.type === 'joined' ? '{name} joined at {site}.' : '{name} died at {site}.', {
      name: `${event.companion.firstName} ${event.companion.lastName}`,
      site: t(state.locations.find(location => location.id === event.locationId)?.name ?? event.locationId),
    }), 13, event.type === 'died' ? '#982c24' : '#526537');
    y += 48;
  }

  for (const person of people) {
    text(0, y, person.name + (person.courage === null ? '' : ` · ${t('Courage')} ${person.courage}`), 15);
    const editable = person.available && !state.confirmed && state.day > 1;
    text(0, y + 24, person.available
      ? t('Rest {hours} h', { hours: exploration.getUnallocatedHours(person.id) }) : t('Available for work tomorrow'), 12);
    button(0, y + 46, 38, '−', () => { exploration.setRepairHours(exploration.getRepairHours(person.id) - 1, person.id); refresh(); }, editable && exploration.getRepairHours(person.id) > 0);
    text(48, y + 56, t('{hours} h repair', { hours: exploration.getRepairHours(person.id) }), 13);
    button(width - 40, y + 46, 38, '+', () => { exploration.setRepairHours(exploration.getRepairHours(person.id) + 1, person.id); refresh(); }, editable && exploration.getUnallocatedHours(person.id) >= 1 && exploration.getProjectedRepair() < 100 - state.barricade);
    y += 105;
  }
  for (const locationId of state.plannedLocationIds) {
    const location = state.locations.find(location => location.id === locationId)!;
    text(0, y, `${t(location.name)} · ${exploration.getSearchHours(locationId)} h`, 15); y += 28;
    const ids = exploration.getParticipants(locationId);
    const feedback = text(0, y, '', 12, '#982c24');
    y += 36;
    for (const person of people) {
      button(0, y, width - 2, `${ids.includes(person.id) ? '✓' : '+'} ${person.name}`, () => {
        const next = ids.includes(person.id) ? ids.filter(id => id !== person.id) : [...ids, person.id];
        if (!exploration.setParticipants(locationId, next)) {
          feedback.setText(t('Keep one searcher and stay within each time budget.'));
          return;
        }
        refresh();
      }, person.available && !state.confirmed);
      y += 42;
    }
    y += 38;
  }
}
