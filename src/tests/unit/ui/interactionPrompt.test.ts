import { describe, expect, it } from 'vitest';
import { resolveInteractionPrompt, type InteractionPromptInput } from '../../../logic/interactionPrompt';

const input: InteractionPromptInput = {
  playing: true, mobile: false, canOpenCrate: false,
  hasEmptyWeaponSlot: false, nearbyWeaponName: 'Pistol',
};

describe('interaction prompt', () => {
  it('identifies the nearby replacement without requiring hover', () => {
    expect(resolveInteractionPrompt(input)).toBe('Press E · Swap for Pistol');
  });
  it('prioritizes opening a crate over swapping a nearby weapon', () => {
    expect(resolveInteractionPrompt({ ...input, canOpenCrate: true }))
      .toBe('Press E · Open supply crate');
  });
  it('hides the swap prompt when proximity already collects the weapon', () => {
    expect(resolveInteractionPrompt({ ...input, hasEmptyWeaponSlot: true })).toBeNull();
  });
  it('hides when no interaction is in range', () => {
    expect(resolveInteractionPrompt({ ...input, nearbyWeaponName: null })).toBeNull();
  });
  it('hides keyboard hints for touch controls', () => {
    expect(resolveInteractionPrompt({ ...input, mobile: true, canOpenCrate: true })).toBeNull();
  });
  it('hides when gameplay is inactive', () => {
    expect(resolveInteractionPrompt({ ...input, playing: false, canOpenCrate: true })).toBeNull();
  });
});
