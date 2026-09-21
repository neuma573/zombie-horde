import { CAMERA_ZOOM_CONFIG } from '../config/cameraConfig';
import type { CityDefenseConfig } from '../types/lastStandCombat';
import type { Size } from './camera';
import type { SafeAreaInsets } from './hud';

/** Fit the playable room and doorway; concealed spawn space is not part of the overview. */
export function fitDefenseCamera(layout: CityDefenseConfig, viewport: Size, mobile: boolean,
  safe: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 },
  requestedZoom?: number, focus = layout.playerSpawn) {
  const areas = [layout.interiorArea, ...layout.walls,
    ...layout.sectors.map(sector => sector.entranceArea)];
  const left = Math.min(...areas.map(area => area.x)) - 24;
  const top = Math.min(...areas.map(area => area.y)) - 24;
  const right = Math.max(...areas.map(area => area.x + area.width)) + 24;
  const bottom = Math.max(...areas.map(area => area.y + area.height)) + 24;
  const screenLeft = safe.left + 12;
  const screenTop = safe.top + Math.min(140, viewport.height * 0.4);
  const width = Math.max(1, viewport.width - screenLeft - safe.right - 12);
  const height = Math.max(1, viewport.height - screenTop - safe.bottom
    - (mobile ? Math.min(210, viewport.height * 0.25) : 24));
  const fitZoom = Math.min(CAMERA_ZOOM_CONFIG.max, width / (right - left), height / (bottom - top));
  const zoom = Math.max(fitZoom, requestedZoom ?? fitZoom);
  const follow = 1 - fitZoom / zoom;
  const centerX = (left + right) / 2 * (1 - follow) + focus.x * follow;
  const centerY = (top + bottom) / 2 * (1 - follow) + focus.y * follow;
  return { zoom, scroll: {
    x: centerX - viewport.width / 2 - (screenLeft + width / 2 - viewport.width / 2) / zoom,
    y: centerY - viewport.height / 2 - (screenTop + height / 2 - viewport.height / 2) / zoom,
  } };
}
