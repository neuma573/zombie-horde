export const ZOMBIE_SKIN_PALETTES = [
  { base: 0x697461, highlight: 0x89917c, shadow: 0x505b4d },
  { base: 0x77766a, highlight: 0x969184, shadow: 0x5a5a50 },
  { base: 0x68706d, highlight: 0x87918c, shadow: 0x4d5653 },
  { base: 0x746b62, highlight: 0x94877a, shadow: 0x584f48 },
] as const;

export const ZOMBIE_OUTFIT_PALETTES = {
  casual: { base: 0x3e4b52, detail: 0x59676d },
  hoodie: { base: 0x4c4448, detail: 0x696065 },
  office: { base: 0x596269, detail: 0x858d90 },
  worker: { base: 0x68543d, detail: 0x9a7950 },
} as const;

export const ZOMBIE_HAIR_COLORS = [
  { base: 0x211b18, highlight: 0x44362e },
  { base: 0x30251d, highlight: 0x5a4635 },
  { base: 0x27282a, highlight: 0x4c4e50 },
  { base: 0x4a4034, highlight: 0x716454 },
] as const;
