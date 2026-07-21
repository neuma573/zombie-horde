export const SEVEN_SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

export type SevenSegment = typeof SEVEN_SEGMENTS[number];

const DIGIT_SEGMENTS: Readonly<Record<string, readonly SevenSegment[]>> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': SEVEN_SEGMENTS,
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
};

export function segmentsForDigit(digit: string): readonly SevenSegment[] {
  return DIGIT_SEGMENTS[digit] ?? [];
}
