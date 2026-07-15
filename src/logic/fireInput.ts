export interface FirePointerInput {
  button: number;
  primaryDown: boolean;
}

export function isPrimaryFireInput(pointer: FirePointerInput): boolean {
  return pointer.button === 0 && pointer.primaryDown;
}
