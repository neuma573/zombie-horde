import { describe, expect, it } from 'vitest';

import { PLAYER_CONFIG } from '../../config/playerConfig';
import { SPAWN_CONFIG } from '../../config/spawnConfig';
import { BASIC_WEAPON_CONFIG } from '../../config/weaponConfig';
import { ZOMBIE_CONFIG } from '../../config/zombieConfig';
import { resolveAimDirection } from '../../logic/aim';
import { resolveHitscan } from '../../logic/hitscan';
import { createHudLayout } from '../../logic/hud';
import { constrainToBounds } from '../../logic/movement';
import { getEdgeSpawnPosition } from '../../logic/spawn';

describe('responsive gameplay scenario', () => {
  it('keeps gameplay coordinates and HUD inside resized portrait and landscape areas', () => {
  const portrait = { width: 360, height: 640 };
  const player = constrainToBounds(
    { x: 900, y: 500 },
    { ...portrait, padding: PLAYER_CONFIG.radius },
  );
  const zombie = getEdgeSpawnPosition(
    0,
    portrait,
    ZOMBIE_CONFIG.radius,
    player,
    SPAWN_CONFIG.minimumZombieDistanceFromPlayer,
  );
  const aim = resolveAimDirection(
    { x: zombie.x - player.x, y: zombie.y - player.y },
    { x: 1, y: 0 },
  );
  const shot = resolveHitscan(
    player,
    aim,
    BASIC_WEAPON_CONFIG.range,
    [{ id: 'zombie', position: zombie, radius: ZOMBIE_CONFIG.radius }],
    1,
  );
  const portraitHud = createHudLayout(360, 640, { top: 30, right: 0, bottom: 20, left: 0 });
  const landscapeHud = createHudLayout(960, 540, { top: 0, right: 24, bottom: 0, left: 24 });

  expect(player.x).toBeLessThanOrEqual(portrait.width - PLAYER_CONFIG.radius);
  expect(shot.hits[0]?.targetId).toBe('zombie');
  expect(portraitHud.status.x).toBeGreaterThanOrEqual(0);
  expect(portraitHud.ammo.y).toBeLessThan(portrait.height);
  expect(landscapeHud.ammo.x).toBeLessThan(960);
  expect(landscapeHud.gameOver.y).toBeLessThan(540);
    });
});
