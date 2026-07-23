export type HumanoidDeathVariant = 'spread' | 'side';

export interface HumanoidPartTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
}

export interface HumanoidDeathPose {
  variant: HumanoidDeathVariant;
  head: HumanoidPartTransform;
  torso: HumanoidPartTransform;
  upperArm: HumanoidPartTransform;
  lowerArm: HumanoidPartTransform;
  upperLeg: HumanoidPartTransform;
  lowerLeg: HumanoidPartTransform;
}

function stableVariantIndex(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2;
}

export function resolveHumanoidDeathPose(key: string, fallSide: -1 | 1): HumanoidDeathPose {
  if (stableVariantIndex(key) === 0) {
    return {
      variant: 'spread',
      head: { x: 20, y: 0, rotation: 0, scaleX: 1 },
      torso: { x: 0, y: 0, rotation: 0, scaleX: 1 },
      upperArm: { x: 5, y: -7, rotation: -Math.PI / 2, scaleX: 1.28 },
      lowerArm: { x: 5, y: 7, rotation: Math.PI / 2, scaleX: 1.28 },
      upperLeg: { x: -12, y: -5, rotation: 0.16, scaleX: 1.1 },
      lowerLeg: { x: -12, y: 5, rotation: -0.16, scaleX: 1.1 },
    };
  }

  return {
    variant: 'side',
    head: { x: 16, y: fallSide * -8, rotation: fallSide * -0.2, scaleX: 1 },
    torso: { x: 0, y: fallSide * -2, rotation: fallSide * -0.08, scaleX: 1 },
    upperArm: { x: 5, y: fallSide * -7, rotation: fallSide * -1.18, scaleX: 1.18 },
    lowerArm: { x: 3, y: fallSide * -4, rotation: fallSide * -1.02, scaleX: 1.12 },
    upperLeg: { x: -12, y: fallSide * -3, rotation: fallSide * 0.05, scaleX: 1.08 },
    lowerLeg: { x: -11, y: fallSide * -1, rotation: fallSide * 0.08, scaleX: 1.03 },
  };
}
