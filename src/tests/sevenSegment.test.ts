import { describe, expect, it } from 'vitest';

import { SEVEN_SEGMENTS, segmentsForDigit } from '../logic/sevenSegment';

describe('seven-segment digit mapping', () => {
  it('lights every segment for eight', () => {
    expect(segmentsForDigit('8')).toEqual(SEVEN_SEGMENTS);
  });

  it('uses only the two right segments for one', () => {
    expect(segmentsForDigit('1')).toEqual(['b', 'c']);
  });

  it('returns no active segments for unsupported characters', () => {
    expect(segmentsForDigit(':')).toEqual([]);
  });
});
