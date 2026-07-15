import { describe, expect, it } from 'vitest';

import { isPrimaryFireInput } from '../logic/fireInput';

describe('isPrimaryFireInput', () => {
  it('accepts the primary mouse button and touch input', () => {
    expect(isPrimaryFireInput({ button: 0, primaryDown: true })).toBe(true);
  });

  it.each([1, 2, 3, 4])('rejects non-primary mouse button %i', (button) => {
    expect(isPrimaryFireInput({ button, primaryDown: false })).toBe(false);
  });

  it('rejects a primary button reported as a secondary action', () => {
    expect(isPrimaryFireInput({ button: 0, primaryDown: false })).toBe(false);
  });
});
