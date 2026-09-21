import { describe, expect, it } from 'vitest';
import { HAZARD_DEFENSE_CONFIG } from '../../../config/lastStandCombatConfig';
import { cameraScreenPoint } from '../../../logic/camera';
import { fitDefenseCamera } from '../../../logic/defenseCamera';

describe('defense camera framing', () => {
  it.each([[320, 568], [390, 844], [844, 390], [1280, 800]])(
    'keeps the entrance and entire playable room visible at %i by %i', (width, height) => {
      const viewport = { width, height };
      const safe = { top: 24, bottom: 20, left: 12, right: 12 };
      const frame = fitDefenseCamera(HAZARD_DEFENSE_CONFIG, viewport, true, safe);
      const areas = [...HAZARD_DEFENSE_CONFIG.walls, HAZARD_DEFENSE_CONFIG.combatArea,
        ...HAZARD_DEFENSE_CONFIG.sectors.map(s => s.entranceArea)];
      for (const area of areas) {
        for (const point of [area, { x: area.x + area.width, y: area.y + area.height }]) {
          const screen = cameraScreenPoint(point, frame.scroll, viewport, frame.zoom);
          expect(screen.x).toBeGreaterThan(safe.left);
          expect(screen.x).toBeLessThan(width - safe.right);
          expect(screen.y).toBeGreaterThan(safe.top + Math.min(140, height * 0.4));
          expect(screen.y).toBeLessThan(height - safe.bottom - Math.min(210, height * 0.25));
        }
      }
    },
  );
  it('allows zooming in and returning to the full overview', () => {
    const viewport = { width: 390, height: 844 };
    const overview = fitDefenseCamera(HAZARD_DEFENSE_CONFIG, viewport, true);
    const zoomed = fitDefenseCamera(HAZARD_DEFENSE_CONFIG, viewport, true, undefined, overview.zoom * 2);
    expect(zoomed.zoom).toBeCloseTo(overview.zoom * 2);
    expect(zoomed.scroll).not.toEqual(overview.scroll);
    expect(fitDefenseCamera(HAZARD_DEFENSE_CONFIG, viewport, true, undefined, overview.zoom)).toEqual(overview);
  });

});
