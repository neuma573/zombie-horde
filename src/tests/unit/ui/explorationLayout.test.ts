import { describe, expect, it } from 'vitest';
import { getCompactResultLayout, getExplorationMapZoom, paginateDiaryLines, usesExplorationPages } from '../../../logic/explorationLayout';
import { PinchViewport } from '../../../logic/pinchViewport';

describe('exploration layout', () => {
  it('paginates every diary line without dropping paragraph breaks', () => {
    const lines = ['First', 'paragraph', '', 'Second', 'paragraph'];
    expect(paginateDiaryLines(lines, 60, 20)).toEqual(['First\nparagraph\n', 'Second\nparagraph']);
    expect(paginateDiaryLines(lines, 60, 20).join('\n')).toBe(lines.join('\n'));
  });

  it('keeps all diary lines on a page when they fit exactly', () => {
    expect(paginateDiaryLines(['One', 'Two'], 40, 20)).toEqual(['One\nTwo']);
  });

  it.each([[288, 296], [608, 296], [536, 186]])('separates result rows from the full-size action on a %i by %i board', (width, height) => {
    const layout = getCompactResultLayout(width, height);
    expect(layout.table.y + 22 + 2 * 27 + 22).toBeLessThanOrEqual(layout.button.y);
    expect(layout.button.height).toBe(36);
    expect(layout.button.y + layout.button.height).toBeLessThanOrEqual(height);
    expect(layout.table.x + layout.table.width).toBeLessThanOrEqual(width);
  });

  it.each([[320, 360], [640, 360], [320, 568]])('uses full-size planning pages at %i by %i', (width, height) => {
    expect(usesExplorationPages(width, height)).toBe(true);
  });

  it.each([[390, 844], [1280, 800]])('keeps the overview at %i by %i', (width, height) => {
    expect(usesExplorationPages(width, height)).toBe(false);
  });

  it.each([[539, 150], [264, 208]])('starts a %i by %i map with tappable buildings', (width, height) => {
    const zoom = getExplorationMapZoom(width, height, 800, 620);
    const view = new PinchViewport(width, height, 800, 620, { x: 0, y: 0, zoom });
    expect(86 * view.zoom).toBeGreaterThanOrEqual(44);
    expect(800 * view.zoom).toBeGreaterThanOrEqual(width);
    expect(620 * view.zoom).toBeGreaterThanOrEqual(height);
    view.pinch({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.01);
    expect(view.zoom).toBe(view.minZoom);
    expect(800 * view.zoom).toBeLessThanOrEqual(width);
    expect(620 * view.zoom).toBeLessThanOrEqual(height);
  });
});
