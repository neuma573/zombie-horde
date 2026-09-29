import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('exploration repair result wiring', () => {
  it('shows finalized repair labor and recovery in the shared scrollable findings for both layouts', async () => {
    // Phaser rendering is a browser boundary; system tests cover the finalized values.
    const source = await readFile(new URL('../../scenes/ExplorationScene.ts', import.meta.url), 'utf8');
    const compact = source.slice(source.indexOf('  private renderCompactResult('), source.indexOf('  private renderResult('));
    const full = source.slice(source.indexOf('  private renderResult('), source.indexOf('  private renderFindings('));
    expect(compact).toContain('this.renderFindings(');
    expect(full).toContain('this.renderFindings(');
    const findings = source.slice(source.indexOf('  private renderFindings('), source.indexOf('  private async openArmory('));
    expect(findings).toContain('const repair = this.exploration.getTeamRepairSummary()');
    expect(findings).toContain('workers: repair.workers, hours: repair.totalHours, repaired: this.result!.repaired');
    expect(findings).toContain("note(t('Repair: {workers} people · {hours} person-hours · +{repaired}%p'");
    expect(findings).toContain('Math.max(box.height, y)');
  });
});
