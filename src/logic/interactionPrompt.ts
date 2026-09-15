export interface InteractionPromptInput {
  playing: boolean;
  mobile: boolean;
  canOpenCrate: boolean;
  hasEmptyWeaponSlot: boolean;
  nearbyWeaponName: string | null;
}

export function resolveInteractionPrompt(input: InteractionPromptInput): string | null {
  if (!input.playing || input.mobile) return null;
  if (input.canOpenCrate) return 'E · Open';
  if (!input.hasEmptyWeaponSlot && input.nearbyWeaponName) {
    return 'E · Swap';
  }
  return null;
}
