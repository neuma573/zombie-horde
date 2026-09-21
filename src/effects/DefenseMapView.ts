import Phaser from 'phaser';
import type { CityDefenseConfig } from '../types/lastStandCombat';
import type { LastStandCombat } from '../systems/LastStandCombat';

/** Map paint only; barricade collision and integrity belong to the combat rules. */
export class DefenseMapView {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly barricades: Phaser.GameObjects.Graphics;
  private readonly spawnShade: Phaser.GameObjects.Graphics;
  private lastState = '';

  constructor(scene: Phaser.Scene, layout: CityDefenseConfig) {
    this.ground = scene.add.graphics().setDepth(-20);
    this.barricades = scene.add.graphics().setDepth(10);
    // Opaque cover sits above actors and their effects, independently of the flashlight.
    this.spawnShade = scene.add.graphics().setDepth(79);
    for (const sector of layout.sectors) {
      const concealEnd = Math.max(...sector.zombieSpawnAreas.map(area => area.x + area.width)) + 48;
      const fadeEnd = sector.entranceArea.x - 12;
      this.spawnShade.fillStyle(0x05070b, 1).fillRect(0, 0, concealEnd, layout.worldSize.height);
      const strips = 80;
      const stripWidth = Math.max(0, fadeEnd - concealEnd) / strips;
      for (let i = 0; i < strips; i++) {
        const progress = i / strips;
        const alpha = 1 - progress * progress * (3 - 2 * progress);
        this.spawnShade.fillStyle(0x05070b, alpha)
          .fillRect(concealEnd + i * stripWidth, 0, stripWidth + 0.1, layout.worldSize.height);
      }
    }
    const g = this.ground;
    const area = layout.interiorArea;
    // Rough asphalt outside, warm worn ceramic inside. No luminous grid lines.
    g.fillStyle(0x34352f).fillRect(0, 0, layout.worldSize.width, layout.worldSize.height);
    for (let i = 0; i < 2400; i++) {
      const x = (i * 137.73) % layout.worldSize.width;
      const y = (i * 83.41) % layout.worldSize.height;
      g.fillStyle(i % 2 ? 0x828173 : 0x141915, 0.16).fillRect(x, y, 2 + i % 5, 1 + i % 3);
    }
    for (const sector of layout.sectors) {
      const gate = sector.entranceArea;
      const approach = { x: gate.x - 220, y: gate.y - 48, width: 220, height: gate.height + 96 };
      g.fillStyle(0x505049).fillRect(approach.x, approach.y, approach.width, approach.height);
      g.lineStyle(3, 0xa59b68, 0.45);
      g.lineBetween(approach.x, approach.y + 24, approach.x + approach.width, approach.y + 24);
      g.lineBetween(approach.x, approach.y + approach.height - 24, approach.x + approach.width, approach.y + approach.height - 24);
      // Exterior pavement ends at the open doorway, before the indoor approach.
      for (let i = 0; i < 28; i++) {
        const x = approach.x + (i * 97.3) % approach.width;
        const y = approach.y + 40 + (i * 61.7) % (approach.height - 80);
        g.lineStyle(1, 0x242820, 0.7).lineBetween(x, y, x + 16, y + 8);
        if (i % 4 === 0) g.fillStyle(0xb7b096, 0.6).fillRect(x, y, 10, 7);
      }
    }
    g.fillStyle(0x151710, 0.65).fillRect(area.x - 18, area.y - 20, area.width + 56, area.height + 60);
    g.fillStyle(0x8a8371).fillRect(area.x, area.y, area.width, area.height);
    const tile = 40;
    for (let row = 0; row < Math.ceil(area.height / tile); row++) {
      for (let col = 0; col < Math.ceil(area.width / tile); col++) {
        const x = area.x + col * tile;
        const y = area.y + row * tile;
        const shade = [0xc0bba3, 0xb5b099, 0xc8c0a6, 0xaaa790][(row * 7 + col * 3) % 4];
        g.fillStyle(shade).fillRect(x + 1, y + 1, Math.min(tile - 2, area.width - col * tile - 1),
          Math.min(tile - 2, area.height - row * tile - 1));
        g.fillStyle(0x66644f, 0.15).fillEllipse(x + 14, y + 24, 16 + col % 9, 7);
        if ((row * 13 + col) % 11 === 0) {
          g.lineStyle(1, 0x65634f, 0.45).lineBetween(x + 3, y + 8, x + 19, y + 18);
          g.lineBetween(x + 19, y + 18, x + 24, y + 36);
        }
      }
    }
    // Scuffed rubber entrance mats and muddy footprints.
    for (const sector of layout.sectors) {
      const gate = sector.entranceArea;
      g.fillStyle(0x77766a).fillRect(gate.x, gate.y, gate.width, gate.height);
      g.fillStyle(0x4e5142).fillRect(gate.x + gate.width, gate.y + 10, 64, gate.height - 20);
      g.lineStyle(2, 0x30382d, 0.55);
      for (let y = gate.y + 16; y < gate.y + gate.height - 10; y += 7) {
        g.lineBetween(gate.x + gate.width + 4, y, gate.x + gate.width + 60, y);
      }
      // Door jambs and open leaves show a passable entrance rather than another barrier.
      g.fillStyle(0xbbb6a2).fillRect(gate.x - 4, gate.y - 6, 40, 8)
        .fillRect(gate.x - 4, gate.y + gate.height - 2, 40, 8);
      g.lineStyle(5, 0x6c746c).lineBetween(gate.x, gate.y, gate.x - 48, gate.y - 42);
      g.lineBetween(gate.x, gate.y + gate.height, gate.x - 48, gate.y + gate.height + 42);
      for (let i = 0; i < 16; i++) g.fillStyle(0x5b503a, 0.22)
        .fillEllipse(gate.x + gate.width + 70 + i * 12, gate.y + gate.height / 2 + (i % 2 ? 12 : -8), 12, 6);
    }
    for (const wall of layout.walls) {
      g.fillStyle(0x322b22).fillRect(wall.x - 4, wall.y - 4, wall.width + 8, wall.height + 8);
      g.fillStyle(0x938776).fillRect(wall.x, wall.y, wall.width, wall.height);
      g.fillStyle(0xb7aa8d).fillRect(wall.x + 3, wall.y + 3, wall.width - 6, wall.height - 9);
      g.lineStyle(2, 0x655646, 0.65);
      if (wall.width > wall.height) {
        for (let x = wall.x + 44; x < wall.x + wall.width; x += 44) g.lineBetween(x, wall.y + 3, x, wall.y + wall.height - 3);
        g.fillStyle(0x5e4331).fillRect(wall.x, wall.y + wall.height - 8, wall.width, 8);
      } else {
        for (let y = wall.y + 44; y < wall.y + wall.height; y += 44) g.lineBetween(wall.x + 3, y, wall.x + wall.width - 3, y);
        g.fillStyle(0x5e4331).fillRect(wall.x, wall.y, 8, wall.height);
      }
    }
    for (const fixture of layout.fixtures ?? []) this.drawFixture(fixture);
    // Wall-mounted emergency lamps cast warm pools over the interior.
    for (const x of [area.x + 160, area.x + area.width - 100]) {
      for (let r = 90; r > 0; r -= 15) g.fillStyle(0xffdd8d, 0.015).fillCircle(x, area.y + 24, r);
      g.fillStyle(0x3c3e30).fillRect(x - 27, area.y + 6, 54, 12);
      g.fillStyle(0xffeab1).fillRect(x - 22, area.y + 8, 44, 6);
    }
  }

  private drawFixture(fixture: NonNullable<CityDefenseConfig['fixtures']>[number]): void {
    const g = this.ground;
    const { x, y, width: w, height: h } = fixture;
    g.fillStyle(0x25291e, 0.32).fillRect(x - 7, y + 8, w + 7, h + 4);
    if (fixture.kind === 'shelf') {
      g.fillStyle(0x55554c).fillRect(x, y, w, h);
      g.fillStyle(0x969382).fillRect(x + 3, y + 3, w - 6, h - 6);
      const colors = [0x9a4633, 0xbba36b, 0x58715a, 0x8a7961, 0xaab092];
      for (let row = 0; row < Math.floor(h / 20); row++) {
        for (let col = 0; col < Math.floor(w / 18); col++) {
          if ((row * 3 + col) % 7 === 0) continue;
          const px = x + 5 + col * 18, py = y + 4 + row * 20;
          g.fillStyle(colors[(col + row * 2) % colors.length]).fillRect(px, py, 12, 14);
          g.fillStyle(0xe5d9b3, 0.5).fillRect(px + 2, py + 5, 8, 4);
        }
        g.fillStyle(0x494b41).fillRect(x + 1, y + 18 + row * 20, w - 2, 3);
      }
      g.fillStyle(0x7d3430).fillRect(x, y + h - 5, w, 5);
    } else if (fixture.kind === 'counter') {
      g.fillStyle(0x784d34).fillRoundedRect(x, y, w, h, 5);
      g.fillStyle(0xb6aa8d).fillRoundedRect(x + 3, y + 3, w - 6, h - 10, 4);
      g.fillStyle(0x323e36).fillRect(x + 12, y + 8, w * 0.57, h - 24);
      g.lineStyle(1, 0x617061, 0.7);
      for (let i = 0; i < 10; i++) g.lineBetween(x + 16 + i * 10, y + 9, x + 16 + i * 10, y + h - 17);
      g.fillStyle(0x4c5044).fillRect(x + w - 55, y + 6, 36, 29);
      g.fillStyle(0x9baa83).fillRect(x + w - 51, y + 8, 27, 12);
      g.fillStyle(0xd0c7a8).fillRect(x + w - 45, y + 24, 18, 7);
    } else {
      g.fillStyle(0x977549).fillRect(x, y, w, h);
      g.lineStyle(3, 0x5d432d).strokeRect(x + 2, y + 2, w - 4, h - 4);
      g.lineBetween(x + 5, y + 5, x + w - 5, y + h - 5);
      g.lineBetween(x + w - 5, y + 5, x + 5, y + h - 5);
      g.fillStyle(0xceba86).fillRect(x + w / 2 - 11, y + h / 2 - 7, 22, 14);
    }
  }

  update(sectors: ReturnType<LastStandCombat['getSectors']>): void {
    const key = sectors.map(sector => `${sector.id}:${sector.phase}`).join('|');
    if (key === this.lastState) return;
    this.lastState = key;
    const g = this.barricades.clear();
    for (const sector of sectors) {
      const b = sector.barricade;
      if (sector.phase === 'BREACHED') {
        g.fillStyle(0x4d3c2c).fillRect(b.x, b.y, b.width, 25).fillRect(b.x, b.y + b.height - 25, b.width, 25);
        continue;
      }
      // A mismatched pile of tipped furniture, boxes and nailed scrap timber.
      // Keep the pile inside the collision footprint, with no continuous rail/frame.
      for (let y = b.y, i = 0; y < b.y + b.height; i++) {
        const h = Math.min([78, 46, 66, 53][i % 4], b.y + b.height - y);
        const x = b.x + (i % 2 ? 3 : 0);
        const w = b.width - (i % 3) * 3;
        g.fillStyle(0x201c16, 0.65).fillRect(x - 3, y + 4, w + 6, h);
        const colors = [0x685544, 0x7a6441, 0x59604c, 0x92724b];
        g.fillStyle(colors[i % colors.length]).fillRect(x, y + 1, w, h - 3);
        if (i % 3 === 0) {
          // Tipped chest of drawers, handles still attached.
          for (let dy = 5; dy < h - 10; dy += 18) {
            g.lineStyle(1, 0x33291e).strokeRect(x + 3, y + dy, w - 6, 16);
            g.lineStyle(2, 0xbaa784).lineBetween(x + 12, y + dy + 8, x + 20, y + dy + 8);
          }
        } else if (i % 3 === 1) {
          // Crate slats and torn packing label.
          for (let dx = 4; dx < w; dx += 8) g.lineStyle(1, 0x423322)
            .lineBetween(x + dx, y + 3, x + dx, y + h - 4);
          g.fillStyle(0xc7b68d).fillRect(x + 7, y + 17, 15, 12);
        } else {
          // Torn upholstered cushion on an overturned chair.
          g.fillStyle(0x373e30).fillRoundedRect(x + 4, y + 7, w - 8, h - 14, 5);
          g.lineStyle(2, 0x999075).lineBetween(x + 8, y + 20, x + 18, y + 32);
        }
        // Uneven salvaged boards bridge the individual objects, fixed with nails.
        if (i % 3 === 1) {
          const endY = Math.min(y + h + 9, b.y + b.height);
          g.lineStyle(9, sector.phase === 'DANGER' ? 0x65412e : 0xa18458)
            .lineBetween(x + 6, y + 6, x + w - 6, endY - 5);
          g.lineStyle(1, 0x59432d).lineBetween(x + 5, y + 7, x + w - 7, endY - 5);
          g.fillStyle(0x2c2923).fillCircle(x + 7, y + 10, 1.5)
            .fillCircle(x + w - 7, endY - 9, 1.5);
        }
        if (sector.phase === 'DANGER') g.lineStyle(3, 0x241b16)
          .lineBetween(x, y + 30, x + w, y + 22);
        y += h;
      }
    }
  }

  destroy(): void { this.ground.destroy(); this.barricades.destroy(); this.spawnShade.destroy(); }
}
