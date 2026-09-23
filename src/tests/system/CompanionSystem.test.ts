import { describe, expect, it } from 'vitest';
import { CompanionSystem } from '../../systems/CompanionSystem';

describe('CompanionSystem', () => {
  it('automatically recruits at most four living companions and isolates snapshots', () => {
    const party = new CompanionSystem(() => 0);
    for (let n = 0; n < 6; n++) party.resolveSearch(2, `site-${n}`, [], 1);
    expect(party.getActive()).toHaveLength(4);
    expect(new Set(party.getActive().map(ally => ally.id)).size).toBe(4);
    party.getRoster()[0].courage = -10;
    expect(party.getActive()[0].courage).toBe(35);
  });
  it('kills only deployed searchers and applies death loss to all surviving companions', () => {
    let random = 0;
    const party = new CompanionSystem(() => random);
    party.resolveSearch(2, 'a', [], 1);
    party.resolveSearch(2, 'b', [], 1);
    const [searcher, resting] = party.getActive();
    // Kill the selected searcher; the newly recruited survivor does not face the same search risk.
    party.resolveSearch(3, 'c', [searcher.id], 1);
    expect(party.getRoster().find(ally => ally.id === searcher.id)?.status).toBe('dead');
    expect(party.getActive().find(ally => ally.id === resting.id)?.courage).toBe(20);
    random = 0.99;
    party.resolveSearch(3, 'd', [searcher.id], 1);
    expect(party.getEvents().filter(event => event.type === 'died')).toHaveLength(1);
    expect(party.getActive().find(ally => ally.id === resting.id)?.courage).toBe(20);
  });
  it('recovers resting survivors but returns fleeing companions at minimum courage', () => {
    const party = new CompanionSystem(() => 0);
    party.resolveSearch(2, 'a', [], 1);
    party.resolveSearch(2, 'b', [], 1);
    const [fleeing, resting] = party.getActive();
    party.rest(resting.id, 12);
    party.surviveNight([fleeing.id]);
    expect(party.getActive().map(ally => ally.courage)).toEqual([0, 50]);
    party.rest(fleeing.id, NaN);
    party.rest(fleeing.id, -2);
    expect(party.getActive()[0].courage).toBe(0);
  });
});
