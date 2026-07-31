export interface ResettableGameplayKey {
  keyCode: number;
  enabled: boolean;
  isDown: boolean;
  reset(): unknown;
}

export class GameplayKeyStateGuard {
  private readonly suppressedKeys = new Map<number, ResettableGameplayKey>();

  suppressHeldUntilKeyUp(
    keys: readonly (ResettableGameplayKey | undefined)[],
  ): void {
    for (const key of keys) {
      if (key?.isDown) this.suppressUntilKeyUp(key);
    }
  }

  suppressUntilKeyUp(key: ResettableGameplayKey): void {
    key.reset();
    key.enabled = false;
    this.suppressedKeys.set(key.keyCode, key);
  }

  releaseOnKeyUp(keyCode: number): void {
    const key = this.suppressedKeys.get(keyCode);
    if (!key) return;
    key.reset();
    key.enabled = true;
    this.suppressedKeys.delete(keyCode);
  }

  releaseAll(): void {
    for (const key of this.suppressedKeys.values()) {
      key.reset();
      key.enabled = true;
    }
    this.suppressedKeys.clear();
  }
}
