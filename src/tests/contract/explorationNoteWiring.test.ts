import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

// Phaser event wiring is a browser boundary; system tests cannot detect a
// scene mutating the route before opening the separate note page.
describe('paged exploration note wiring', () => {
  it('opens site notes before any route mutation based on layout rather than companions', async () => {
    const source = await readFile(new URL('../../scenes/ExplorationScene.ts', import.meta.url), 'utf8');
    const pages = source.slice(source.indexOf('  private renderPlanningPages('), source.indexOf('  private renderPlan('));
    expect(pages).toContain("if (this.planningPage === 'map') this.renderMap(body, state.locations, true)");
    expect(pages).toContain('this.locationNote(body, selected, true, true)');
    const map = source.slice(source.indexOf('  private renderMap('), source.indexOf('  private renderTimeBudget('));
    const inspect = map.slice(map.indexOf('if (inspectFirst)'), map.indexOf('this.exploration.toggleLocation('));
    expect(inspect).toContain("this.planningPage = 'site'");
    expect(inspect).toContain('this.render()');
    expect(inspect).toContain('return;');
    expect(map).not.toContain('getAvailableCompanions');
  });

  it('offers both mark and unmark note actions without requiring companions on paged screens', async () => {
    const source = await readFile(new URL('../../effects/ExplorationLocationNote.ts', import.meta.url), 'utf8');
    expect(source).toContain('editable && (noteAction || (!planned && companions.length))');
    expect(source).toContain("planned ? 'Unmark for search' : 'Mark for search'");
    expect(source).toContain('exploration.toggleLocation(location.id)');
    expect(source).toContain('explorationPlanMessage(exploration.getLocationPlanBlock(location.id)');
  });
});
