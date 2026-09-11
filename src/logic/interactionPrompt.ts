export interface InteractionPromptInput {
  playing: boolean;
  mobile: boolean;
  canOpenCrate: boolean;
  hasEmptyWeaponSlot: boolean;
  nearbyWeaponName: string | null;
}

export function resolveInteractionPrompt(input: InteractionPromptInput): string | null {
  if (!input.playing || input.mobile) return null;
  if (input.canOpenCrate) return 'Press E · Open supply crate';
  if (!input.hasEmptyWeaponSlot && input.nearbyWeaponName) {
    return `Press E · Swap for ${input.nearbyWeaponName}`;
  }
  return null;
}
