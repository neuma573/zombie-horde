import { describe, expect, it } from 'vitest';
import { resolveInteractionPrompt, type InteractionPromptInput } from '../../../logic/interactionPrompt';

const input: InteractionPromptInput = {
  playing: true, mobile: false, canOpenCrate: false,
  hasEmptyWeaponSlot: false, nearbyWeaponName: 'Pistol',
};

describe('interaction prompt', () => {
  it('shows a compact swap hint without requiring hover', () => {
    expect(resolveInteractionPrompt(input)).toBe('E · Swap');
  });
  it('prioritizes opening a crate over swapping a nearby weapon', () => {
    expect(resolveInteractionPrompt({ ...input, canOpenCrate: true }))
      .toBe('E · Open');
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
