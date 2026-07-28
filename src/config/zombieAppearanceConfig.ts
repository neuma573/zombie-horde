export const ZOMBIE_SKIN_PALETTES = [
  { base: 0x697461, highlight: 0x89917c, shadow: 0x505b4d },
  { base: 0x77766a, highlight: 0x969184, shadow: 0x5a5a50 },
  { base: 0x68706d, highlight: 0x87918c, shadow: 0x4d5653 },
  { base: 0x746b62, highlight: 0x94877a, shadow: 0x584f48 },
] as const;

export const ZOMBIE_OUTFIT_PALETTES = {
  casualMale: [
    { base: 0x3e4b52, detail: 0x59676d },
    { base: 0x51454a, detail: 0x6d5d63 },
    { base: 0x4d503c, detail: 0x696d51 },
  ],
  casualFemale: [
    { base: 0x55434f, detail: 0x765d6e },
    { base: 0x3f5152, detail: 0x5d7171 },
    { base: 0x575044, detail: 0x756c5a },
  ],
  office: [
    { base: 0x596269, detail: 0x858d90 },
    { base: 0x4d5663, detail: 0x798493 },
  ],
  worker: [
    { base: 0x68543d, detail: 0x9a7950 },
    { base: 0x4e5b62, detail: 0x89979b },
  ],
  athletic: [
    { base: 0x354c55, detail: 0x6f8d94 },
    { base: 0x533e48, detail: 0x8a6574 },
  ],
  medical: [
    { base: 0x58706d, detail: 0x8ba19b },
    { base: 0x697276, detail: 0xa3abad },
  ],
} as const;

export const ZOMBIE_HAIR_COLORS = [
  { base: 0x211b18, highlight: 0x44362e },
  { base: 0x30251d, highlight: 0x5a4635 },
  { base: 0x27282a, highlight: 0x4c4e50 },
  { base: 0x4a4034, highlight: 0x716454 },
] as const;
