import { describe, expect, it } from 'vitest';
import { ExplorationSystem } from '../../systems/ExplorationSystem';

function createSchedule() {
  const sites = [['recruit', 0], ['player-job', 9], ['ally-job', 10], ['joint', 3], ['short', 1]] as const;
  const system = new ExplorationSystem(sites.map(([id, searchHours]) => ({
    id, name: id, x: 0, y: 0, searchHours, lootTable: {}, searched: false,
  })), () => 0);
  system.completeNight(1, 50);
  system.search('recruit');
  system.completeNight(2, 50);
  return { system, ally: system.companions.getActive()[0].id };
}

describe('exploration schedule availability', () => {
  it('accepts a two-hour search when every selected person can finish within the day', () => {
    const { system } = createSchedule();
    system.setParticipants('player-job', ['player']);
    system.toggleLocation('player-job');

    expect(system.getUnallocatedHours()).toBe(3);
    expect(system.getSearchHours('joint')).toBe(2);
    expect(system.getLocationPlanBlock('joint')).toBeNull();
    expect(system.canPlanLocation('joint')).toBe(true);
    expect(system.toggleLocation('joint')).toBe(true);
  });

  it('identifies the busy companion instead of reporting the player three free hours', () => {
    const { system, ally } = createSchedule();
    system.setParticipants('player-job', ['player']);
    system.toggleLocation('player-job');
    system.setParticipants('ally-job', [ally]);
    system.toggleLocation('ally-job');
    const before = system.getState();

    expect(system.getUnallocatedHours()).toBe(3);
    expect(system.getSearchHours('joint')).toBe(2);
    expect(system.getLocationPlanBlock('joint')).toMatchObject({
      reason: 'NOT ENOUGH TIME', personId: ally, requiredHours: 13.5, availableHours: 12, waitingHours: 0,
    });
    expect(system.toggleLocation('joint')).toBe(false);
    expect(system.getState()).toEqual(before);
  });

  it('separates waiting rest from time that can still be assigned after a joint search', () => {
    const { system, ally } = createSchedule();
    system.setParticipants('player-job', ['player']);
    system.toggleLocation('player-job');
    system.toggleLocation('joint');

    expect(system.getUnallocatedHours(ally)).toBe(10);
    expect(system.getAvailableHours(ally)).toBe(1);
    system.setParticipants('ally-job', [ally]);
    expect(system.getLocationPlanBlock('ally-job')).toMatchObject({
      reason: 'NOT ENOUGH TIME', personId: ally, waitingHours: 9,
    });
    expect(system.setRepairHours(1, ally)).toBe(true);
    expect(system.getAvailableHours(ally)).toBe(0);
    expect(system.setRepairHours(2, ally)).toBe(false);
  });

  it('reports a proposed participation conflict without changing the existing team', () => {
    const { system, ally } = createSchedule();
    system.setParticipants('player-job', ['player']);
    system.toggleLocation('player-job');
    system.toggleLocation('joint');
    expect(system.setRepairHours(1)).toBe(true);
    const team = system.getParticipants('joint');

    expect(system.getParticipantChangeBlock('joint', ['player'])).toMatchObject({
      reason: 'NOT ENOUGH TIME', personId: 'player', requiredHours: 13, availableHours: 12,
    });
    expect(system.setParticipants('joint', ['player'])).toBe(false);
    expect(system.getParticipantChangeBlock('joint', [ally])).toBeNull();
    expect(system.getParticipants('joint')).toEqual(team);
    expect(system.getParticipantChangeBlock('joint', [])).toEqual({ reason: 'NO SEARCHERS' });
    expect(system.getParticipantChangeBlock('joint', ['unknown'])).toEqual({ reason: 'INVALID SEARCHERS' });
    expect(system.getParticipants('joint')).toEqual(team);
  });

  it('starts joint searches after prior direct searches on the same daily timeline', () => {
    const { system, ally } = createSchedule();
    system.search('player-job');
    expect(system.toggleLocation('joint')).toBe(true);
    expect(system.setRepairHours(2, ally)).toBe(false);

    expect(system.getAvailableHours()).toBe(1);
    expect(system.getAvailableHours(ally)).toBe(1);
    expect(system.getUnallocatedHours(ally)).toBe(10);
  });

  it('keeps first-night and searched-location failures distinct from time shortages', () => {
    const fresh = new ExplorationSystem();
    expect(fresh.getLocationPlanBlock('gas')).toEqual({ reason: 'SURVIVE THE FIRST NIGHT' });
    const { system } = createSchedule();
    expect(system.getLocationPlanBlock('recruit')).toEqual({ reason: 'SEARCHED' });
    expect(system.getLocationPlanBlock('missing')).toEqual({ reason: 'UNKNOWN LOCATION' });
  });
});
