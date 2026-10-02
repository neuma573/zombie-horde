import Phaser from 'phaser';
import { getArmoryControlsLayout } from '../logic/armoryLayout';
import type { ViewportState } from '../logic/pinchViewport';
import { ScrollPanel } from './ScrollPanel';
import { LastStandArmory } from '../systems/LastStandArmory';
import { WEAPON_DEFINITIONS } from '../config/weaponConfig';
import type { WeaponId } from '../logic/weapon';
import type { Companion } from '../types/companion';
import { t } from '../systems/UserSettings';

interface CompanionArmoryOptions {
  companions: readonly Companion[];
  ammo: number;
  recipientId: string;
  selectRecipient: (id: string) => void;
}

/** A home gun cabinet: stained wood, perforated backing, brass tags and steel hooks. */
export function renderLastStandArmory(scene: Phaser.Scene, parent: Phaser.GameObjects.Container,
  box: { x: number; y: number; width: number; height: number }, armory: LastStandArmory,
  pistolTexture: string, day: number, refresh: () => void, startDefense: () => void,
  offset: ViewportState = { x: 0, y: 0 }, companions?: CompanionArmoryOptions): void {
  const { x, y, width, height } = box;
  const root = parent;
  const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => { parent.add(object); return object; };
  const text = (tx: number, ty: number, value: string, size = 14, color = '#ead9b8') =>
    add(scene.add.text(tx, ty, value, { fontFamily: 'Arial, sans-serif', fontSize: size, color }));
  const rect = (rx: number, ry: number, rw: number, rh: number, color: number) =>
    add(scene.add.rectangle(rx, ry, rw, rh, color).setOrigin(0));
  const onTap = (target: Phaser.GameObjects.Rectangle, action: () => void) => {
    target.setInteractive({ useHandCursor: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() <= 8 && target.getBounds().contains(pointer.downX, pointer.downY)) action();
    });
  };
  const textures: Record<WeaponId, string> = {
    pistol: pistolTexture, burstRifle: 'weapon-rifle',
    doubleBarrelShotgun: 'weapon-shotgun', policeBaton: 'weapon-police-baton',
  };
  const weaponImage = (id: string, cx: number, cy: number, maxWidth: number, maxHeight: number) => {
    const image = add(scene.add.image(cx, cy, textures[id as WeaponId]));
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    return image.setScale(scale);
  };
  const ally = companions?.companions.find(person => person.id === companions.recipientId);
  rect(x, y, width, height, 0x422b1d).setStrokeStyle(5, 0x765239);
  const wood = add(scene.add.graphics());
  wood.lineStyle(1, 0xb28657, 0.16);
  for (let row = 9; row < height; row += 9) wood.lineBetween(x + 4, y + row, x + width - 4, y + row + 2);
  text(x + 20, y + 16, t('ARMORY'), 25);
  text(x + width - 20, y + 20, t('DAY {day}', { day }), 18).setOrigin(1, 0);
  const hasCompanions = Boolean(companions?.companions.length);
  const columns = width < 600 ? 3 : 5;
  const rows = hasCompanions ? Math.ceil((companions!.companions.length + 1) / columns) : 0;
  const headerHeight = hasCompanions ? 90 + rows * 66 : 88;
  const layout = getArmoryControlsLayout(width, height, headerHeight, 'left');
  const { desktop } = layout;
  if (hasCompanions && companions) {
    const people = [{ id: 'player', name: t('Player') }, ...companions.companions.map(person => ({
      id: person.id, name: `${person.firstName} ${person.lastName}`,
    }))];
    const cardWidth = desktop ? 236 : (width - 40 - (columns - 1) * 6) / columns;
    const cardHeight = desktop ? 78 : 60;
    people.forEach((person, index) => {
      const cx = x + 20 + (desktop ? 0 : (index % columns) * (cardWidth + 6));
      const cy = y + (desktop ? 88 + index * 86 : 49 + Math.floor(index / columns) * 66);
      const selected = person.id === companions.recipientId;
      onTap(rect(cx, cy, cardWidth, cardHeight, selected ? 0x655035 : 0x2c261f)
        .setStrokeStyle(selected ? 2 : 1, selected ? 0xffd681 : 0x796650), () => companions.selectRecipient(person.id));
      const fit = (value: string, ty: number, color: string) => {
        const label = text(cx + 7, cy + ty, value, 12, color);
        label.setScale(Math.min(1, (cardWidth - 14) / label.width));
      };
      fit(person.name, desktop ? 10 : 5, '#fff0cf');
      const member = companions.companions.find(personInRoster => personInRoster.id === person.id);
      const weapons = member ? [armory.getCompanionWeapon(member.id) ?? 'pistol'] : armory.getState().slots;
      const imageWidth = member ? cardWidth - 58 : cardWidth - 14;
      weapons.forEach((weapon, slot) => {
        if (weapon) weaponImage(weapon, cx + 7 + imageWidth * (slot + 0.5) / weapons.length,
          cy + cardHeight - 21, imageWidth / weapons.length - 4, desktop ? 42 : 32);
      });
      if (member) {
        const deployed = armory.getDeployedIds().includes(member.id);
        const affordable = armory.getDeployedIds().length < companions.ammo;
        const controlX = cx + cardWidth - 46;
        const controlY = cy + cardHeight - 42;
        const control = rect(controlX, controlY, 44, 42, 0x211d17).setFillStyle(0x211d17, 0);
        rect(controlX + 13, controlY + 3, 18, 18, deployed ? 0x657044 : 0x332b22)
          .setStrokeStyle(1, affordable || deployed ? 0xc5ac6b : 0x655c4a);
        if (deployed) text(controlX + 22, controlY + 12, '✓', 13, '#fff0cf').setOrigin(0.5);
        text(controlX + 22, controlY + 30, t('Deploy'), 11,
          affordable || deployed ? '#ead9b8' : '#978775').setOrigin(0.5);
        // Keep disabled checkboxes interactive so tapping them does not select the card underneath.
        onTap(control, () => {
          if (armory.toggleDeployment(member.id, companions.ammo)) refresh();
        });
      }
    });
    const hint = ally ? `${t('Choose a weapon')} · ${t('Courage')} ${ally.courage}` : t('Choose a weapon');
    text(x + (desktop ? layout.viewport.x : 20), y + (desktop ? 60 : headerHeight - 30), ally ? `${ally.firstName} ${ally.lastName} · ${hint}` : hint, 12);
  } else text(x + 20, y + 51, t('Choose up to two weapons for defense.'), 13).setWordWrapWidth(width - 40);
  const { side: landscapePhone, compact, slotHeight, controlsWidth } = layout;
  const controlsX = x + layout.controlsX;
  const buttonY = y + layout.buttonY;
  const slotY = y + layout.slotY;
  const viewport = { ...layout.viewport, x: x + layout.viewport.x, y: y + layout.viewport.y };
  rect(viewport.x, viewport.y, viewport.width, viewport.height, 0x241c15).setStrokeStyle(5, 0x241c15);
  // Wide screens fit a two-column rack; compact screens retain the pannable cabinet.
  const rack = { x: 0, y: 0, width: desktop ? viewport.width : 1120, height: desktop ? viewport.height : 520 };
  // Preserve the compact rack viewport when resizing between desktop and mobile.
  if (!desktop && offset.zoom === undefined) {
    offset.zoom = width >= 800 && !landscapePhone
      ? Math.min(1, viewport.width / rack.width, viewport.height / rack.height)
      : Math.min(1, viewport.height / 124);
  }
  const panel = new ScrollPanel(scene, root, viewport, rack.width, rack.height, desktop ? { x: 0, y: 0, zoom: 1 } : offset, 'contain', { zoomEnabled: !desktop });
  parent = panel.content;
  rect(rack.x, rack.y, rack.width, rack.height, 0x8e795b);
  rect(2, 2, rack.width - 4, rack.height - 4, 0x8e795b).setStrokeStyle(4, 0x765239);
  const holes = add(scene.add.graphics());
  holes.fillStyle(0x3c3226, 0.65);
  for (let px = rack.x + 12; px < rack.x + rack.width - 5; px += 18) {
    for (let py = rack.y + 12; py < rack.y + rack.height - 5; py += 18) holes.fillCircle(px, py, 1.8);
  }
  const { owned, slots, selectedWeapon } = armory.getState();
  owned.forEach((id, index) => {
    const cellWidth = 260;
    const cx = desktop ? rack.width * ((index % 2) + 0.5) / 2 : 78 + index * cellWidth;
    const cellHeight = desktop ? rack.height / Math.ceil(owned.length / 2) : 148;
    const cy = desktop ? cellHeight * (Math.floor(index / 2) + 0.44) : 62;
    const imageHeight = desktop ? Math.min(144, cellHeight - 48) : 116;
    const imageWidth = desktop ? Math.min(280, rack.width / 2 - 40) : id === 'pistol' ? 116 : 230;
    const assigned = armory.isAssigned(id);
    const selected = !ally && selectedWeapon === id;
    if (selected) {
      const glow = add(scene.add.ellipse(cx, cy, id === 'pistol' ? 110 : 210, 94, 0xffd681, 0.16));
      const tween = scene.tweens.add({ targets: glow, alpha: 0.55, duration: 600, yoyo: true, repeat: -1 });
      glow.once('destroy', () => tween.remove());
    }
    const image = weaponImage(id, cx, cy, imageWidth, imageHeight);
    if (assigned) image.setTint(0x858585).setAlpha(0.3);
    else {
      if (selected) image.setTint(0xffe5a7);
      const hitWidth = desktop ? imageWidth : id === 'pistol' ? 116 : 230;
      panel.onTap({ x: cx - hitWidth / 2, y: cy - imageHeight / 2, width: hitWidth, height: imageHeight }, () => {
        if (ally ? armory.assignCompanion(ally.id, id) : armory.selectWeapon(id)) refresh();
      });
    }
    text(cx, desktop ? cy + imageHeight / 2 + 16 : 132, t(WEAPON_DEFINITIONS[id as WeaponId].name), 14, '#2c261f').setOrigin(0.5);
  });
  parent = root;
  const slotWidth = ally ? Math.min(controlsWidth, 420) : landscapePhone ? controlsWidth : (controlsWidth - 12) / 2;
  const visibleSlots = ally ? [armory.getCompanionWeapon(ally.id)] : slots;
  visibleSlots.forEach((id, index) => {
    const sx = controlsX + (ally ? (controlsWidth - slotWidth) / 2 : landscapePhone ? 0 : index * (slotWidth + 12));
    const sy = slotY + (landscapePhone ? index * (slotHeight + 10) : 0);
    const slot = rect(sx, sy, slotWidth, slotHeight, id ? 0x494b30 : 0x2c261f)
      .setStrokeStyle(2, id || (!ally && selectedWeapon) ? 0xc5ac6b : 0x796650);
    if (id || (!ally && selectedWeapon)) onTap(slot, () => {
      if (ally ? armory.assignCompanion(ally.id, null) : armory.clickSlot(index as 0 | 1)) refresh();
    });
    if (ally) {
      const weapon = id ?? 'pistol';
      const imageHeight = Math.min(60, slotHeight - 24);
      weaponImage(weapon, sx + slotWidth / 2, sy + imageHeight / 2 + 5, slotWidth * 0.6, imageHeight);
      text(sx + slotWidth / 2, sy + slotHeight - 15,
        t(id ? WEAPON_DEFINITIONS[id as WeaponId].name : 'Worn Pistol'), 12).setOrigin(0.5);
      if (id) text(sx + slotWidth - 16, sy + 14, '×', 16, '#cbb98f').setOrigin(0.5);
      return;
    }
    text(sx + 10, sy + (compact ? 5 : slotHeight < 65 ? slotHeight / 2 : 9),
      t('WEAPON SLOT {slot}', { slot: index + 1 }), compact ? 12 : slotHeight < 65 ? 11 : 12, '#cbb98f')
      .setOrigin(0, !compact && slotHeight < 65 ? 0.5 : 0);
    if (compact) {
      text(sx + 10, sy + 25, id ? '✓ ' + t('EQUIPPED') : '+ ' + t('EMPTY'), 12, id ? '#d4dca8' : '#cbb98f');
    } else if (id && slotHeight < 65) {
      text(sx + slotWidth - 10, sy + slotHeight / 2, '✓ ' + t('EQUIPPED'), 11, '#d4dca8').setOrigin(1, 0.5);
    } else if (id) {
      weaponImage(id, landscapePhone ? sx + 42 : sx + slotWidth / 2, sy + slotHeight * 0.48, slotWidth * 0.6, slotHeight * 0.52);
      const name = text(sx + slotWidth * (landscapePhone ? 0.66 : 0.5), sy + slotHeight - 36,
        t(WEAPON_DEFINITIONS[id as WeaponId].name), 12).setOrigin(0.5, 0);
      name.setScale(Math.min(1, (landscapePhone ? slotWidth * 0.58 : slotWidth - 16) / name.width));
    } else {
      if (slotHeight >= 65) text(sx + slotWidth / 2, sy + slotHeight * 0.24, '+', 32, '#aa9477').setOrigin(0.5, 0);
      text(slotHeight < 65 ? sx + slotWidth - 10 : sx + slotWidth / 2,
        slotHeight < 65 ? sy + slotHeight / 2 : sy + slotHeight - 28, t('EMPTY'), slotHeight < 65 ? 11 : 13, '#cbb98f')
        .setOrigin(slotHeight < 65 ? 1 : 0.5, slotHeight < 65 ? 0.5 : 0);
    }
  });
  if (companions?.companions.length) {
    text(x + layout.buttonX, buttonY - 23, t('Companions {count}/{total} · Ammo {cost}/{ammo}', {
      count: armory.getDeployedIds().length, total: companions.companions.length,
      ammo: companions.ammo, cost: armory.getDeployedIds().length,
    }), 13);
  }
  const canStart = armory.canStartDefense() && (!companions || armory.getDeployedIds().length <= companions.ammo);
  const start = rect(x + layout.buttonX, buttonY, layout.buttonWidth, 44, canStart ? 0x802c24 : 0x4a4136)
    .setStrokeStyle(1, canStart ? 0xc79c61 : 0x70604e);
  if (canStart) {
    onTap(start, () => {
      if (armory.canStartDefense()) startDefense();
    });
  }
  text(x + layout.buttonX + layout.buttonWidth / 2, buttonY + 22, t('START'), 16, canStart ? '#fff0cf' : '#978775')
    .setOrigin(0.5);
}
