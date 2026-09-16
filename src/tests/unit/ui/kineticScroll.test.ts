import { describe, expect, it } from 'vitest';
import { KineticScroll } from '../../../logic/kineticScroll';

describe('KineticScroll', () => {
  it('keeps dragged content inside the viewport limits', () => {
    const scroll = new KineticScroll(300, 600);
    scroll.move(-900, -900, 16);
    expect([scroll.x, scroll.y]).toEqual([300, 600]);
    scroll.move(900, 900, 16);
    expect([scroll.x, scroll.y]).toEqual([0, 0]);
  });

  it('continues a released swipe equally across frame rates', () => {
    const single = new KineticScroll(2000, 2000);
    const split = new KineticScroll(2000, 2000);
    single.move(-40, -80, 20);
    split.move(-40, -80, 20);
    single.update(480);
    for (let frame = 0; frame < 30; frame++) split.update(16);
    expect(split.x).toBeCloseTo(single.x);
    expect(split.y).toBeCloseTo(single.y);
    expect(single.x).toBeGreaterThan(40);
    expect(single.y).toBeGreaterThan(80);
  });

  it('stops momentum when interrupted by a new touch', () => {
    const scroll = new KineticScroll(300, 600);
    scroll.move(-40, -80, 20);
    scroll.stop();
    scroll.update(1000);
    expect([scroll.x, scroll.y]).toEqual([40, 80]);
  });

  it('clamps a fling at the end without moving a fitting axis', () => {
    const scroll = new KineticScroll(0, 100);
    scroll.move(-50, -50, 10);
    scroll.update(1000);
    expect([scroll.x, scroll.y]).toEqual([0, 100]);
  });

  it('ignores invalid elapsed times', () => {
    const scroll = new KineticScroll(300, 600);
    scroll.move(-40, -80, 20);
    for (const delta of [0, -1, NaN, Infinity]) scroll.update(delta);
    expect([scroll.x, scroll.y]).toEqual([40, 80]);
  });
});
