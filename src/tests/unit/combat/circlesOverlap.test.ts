import { describe, expect, it } from 'vitest';
import { circlesOverlap } from '../../../logic/contactDamage';

describe('circlesOverlap', () => {
  it('treats touching circle edges as contact', () => {
    const first = { position: { x: 0, y: 0 }, radius: 10 };

    expect(circlesOverlap(first, { position: { x: 15, y: 0 }, radius: 5 })).toBe(true);
    expect(circlesOverlap(first, { position: { x: 16, y: 0 }, radius: 5 })).toBe(false);
  });
});