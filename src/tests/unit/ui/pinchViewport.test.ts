import { describe, expect, it } from 'vitest';
import { PinchViewport } from '../../../logic/pinchViewport';

describe('PinchViewport', () => {
  it.each([0.6, 1.6])('centers the selected content point at a fixed zoom from %s', zoom => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 20, y: 40, zoom });
    view.placeContentPoint({ x: 400, y: 270 }, { x: 150, y: 100 }, 1.25);

    expect(view.zoom).toBeCloseTo(1.25);
    expect(view.contentPoint({ x: 150, y: 100 }).x).toBeCloseTo(400);
    expect(view.contentPoint({ x: 150, y: 100 }).y).toBeCloseTo(270);
  });

  it('keeps the map in bounds when centering a site near its edge', () => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 0, y: 0 });
    view.placeContentPoint({ x: 20, y: 600 }, { x: 150, y: 100 }, 1.25);

    expect(view.left).toBeCloseTo(0);
    expect(view.top + 620 * view.zoom).toBeCloseTo(200);
    expect(view.left + 20 * view.zoom).toBeGreaterThanOrEqual(0);
    expect(view.top + 600 * view.zoom).toBeLessThanOrEqual(200);
  });

  it('reaches the same focus after intermediate frames clamp against a map edge', () => {
    const direct = new PinchViewport(300, 200, 800, 620, { x: 0, y: 0 });
    const animated = new PinchViewport(300, 200, 800, 620, { x: 0, y: 0 });
    const point = { x: 400, y: 270 };
    animated.placeContentPoint(point, { x: 300, y: 200 }, 0.4);
    animated.placeContentPoint(point, { x: 240, y: 160 }, 0.8);
    for (const view of [direct, animated]) view.placeContentPoint(point, { x: 150, y: 100 }, 1.25);

    expect(animated.left).toBeCloseTo(direct.left);
    expect(animated.top).toBeCloseTo(direct.top);
    expect(animated.zoom).toBeCloseTo(direct.zoom);
  });

  it('starts with the entire content visible without stretching', () => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 0, y: 0 });
    expect(view.zoom * 800).toBeLessThanOrEqual(300);
    expect(view.zoom * 620).toBeCloseTo(200);
    expect(view.left).toBeGreaterThan(0);
    expect(view.top).toBeCloseTo(0);
  });

  it('keeps the content under the pinch midpoint while zooming and translating', () => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 100, y: 100, zoom: 1 });
    const before = view.contentPoint({ x: 140, y: 80 });
    view.pinch({ x: 140, y: 80 }, { x: 170, y: 90 }, 1.5);
    const after = view.contentPoint({ x: 170, y: 90 });
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(view.zoom).toBeCloseTo(1.5);
  });

  it('limits zoom and returns to a centered overview on pinch in', () => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 0, y: 0 });
    const center = { x: 150, y: 100 };
    view.pinch(center, center, 1000);
    expect(view.zoom).toBe(view.maxZoom);
    view.pinch(center, center, 0.0001);
    expect(view.zoom).toBe(view.minZoom);
    expect([view.scroll.x, view.scroll.y]).toEqual([0, 0]);
    expect(view.contentPoint(center).x).toBeCloseTo(400);
    expect(view.contentPoint(center).y).toBeCloseTo(310);
  });

  it('keeps zoomed content in bounds when pinching near an edge', () => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 0, y: 0, zoom: 1 });
    view.pinch({ x: 0, y: 0 }, { x: 500, y: 500 }, 1.5);
    expect([view.scroll.x, view.scroll.y]).toEqual([0, 0]);
    view.pinch({ x: 0, y: 0 }, { x: -5000, y: -5000 }, 1);
    expect([view.scroll.x, view.scroll.y]).toEqual([view.scroll.maxX, view.scroll.maxY]);
  });

  it('restores zoom and clamps saved pan after a viewport resize', () => {
    const view = new PinchViewport(600, 400, 800, 620, { x: 9999, y: 9999, zoom: 1.5 });
    expect(view.zoom).toBe(1.5);
    expect([view.scroll.x, view.scroll.y]).toEqual([600, 530]);
  });

  it('fills a rack viewport instead of shrinking the cabinet into a strip', () => {
    const view = new PinchViewport(318, 430, 1120, 520, { x: 0, y: 0 }, 'cover');
    expect(view.zoom).toBe(1);
    expect(view.left).toBe(0);
    expect(view.top).toBe(0);
    view.pinch({ x: 159, y: 215 }, { x: 159, y: 215 }, 0.01);
    expect(view.zoom * 1120).toBeGreaterThanOrEqual(318);
    expect(view.zoom * 520).toBeCloseTo(430);
    expect(view.left).toBeLessThanOrEqual(0);
    expect(view.top).toBeLessThanOrEqual(0);
  });

  it('keeps a wide rack viewport filled at the minimum zoom', () => {
    const view = new PinchViewport(790, 210, 1120, 520, { x: 0, y: 0, zoom: 0.1 }, 'cover');
    expect(view.zoom * 1120).toBeCloseTo(790);
    expect(view.zoom * 520).toBeGreaterThan(210);
  });

  it('shows the same complete rack on desktop and phone after zooming out', () => {
    const desktop = new PinchViewport(1120, 436, 1120, 520, { x: 0, y: 0 });
    const phone = new PinchViewport(318, 498, 1120, 520, { x: 0, y: 0, zoom: 1 });
    phone.pinch({ x: 159, y: 249 }, { x: 159, y: 249 }, 0.01);

    for (const view of [desktop, phone]) {
      expect(view.left).toBeGreaterThanOrEqual(0);
      expect(view.top).toBeGreaterThanOrEqual(0);
      expect(view.left + 1120 * view.zoom).toBeLessThanOrEqual(view.width);
      expect(view.top + 520 * view.zoom).toBeLessThanOrEqual(view.height);
      const weapon = view.contentPoint({ x: view.left + 78 * view.zoom, y: view.top + 62 * view.zoom });
      expect(weapon.x).toBeCloseTo(78);
      expect(weapon.y).toBeCloseTo(62);
    }
  });

  it('reaches both edges of the desktop rack at detail scale on a phone', () => {
    const view = new PinchViewport(318, 430, 1120, 520, { x: 0, y: 0, zoom: 1 });
    expect(view.contentPoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    view.scroll.move(-2000, -2000, 16);
    expect(view.contentPoint({ x: 318, y: 430 })).toEqual({ x: 1120, y: 520 });
  });

  it('ignores invalid pinch ratios', () => {
    const view = new PinchViewport(300, 200, 800, 620, { x: 40, y: 80, zoom: 1 });
    for (const ratio of [0, -1, NaN, Infinity]) view.pinch({ x: 0, y: 0 }, { x: 1, y: 1 }, ratio);
    expect(view.zoom).toBe(1);
    expect([view.scroll.x, view.scroll.y]).toEqual([40, 80]);
  });
});
