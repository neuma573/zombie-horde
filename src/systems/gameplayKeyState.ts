export interface ResettableGameplayKey {
  reset(): unknown;
}

export function discardGameplayKeyState(
  keys: readonly (ResettableGameplayKey | undefined)[],
): void {
  for (const key of keys) key?.reset();
}
