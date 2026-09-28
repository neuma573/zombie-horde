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
  if (companions?.companions.length) {
    const people = [{ id: 'player', name: t('Player') }, ...companions.companions.map(person => ({
      id: person.id, name: `${person.firstName} ${person.lastName}`,
    }))];
    const index = Math.max(0, people.findIndex(person => person.id === companions.recipientId));
    const selectorWidth = Math.min(width - 40, 480);
    const left = x + 20;
    for (const [direction, bx, label] of [[-1, left, '‹'], [1, left + selectorWidth - 36, '›']] as const) {
      onTap(rect(bx, y + 47, 36, 34, 0x2c261f).setStrokeStyle(1, 0x796650), () => {
        companions.selectRecipient(people[(index + direction + people.length) % people.length].id);
      });
      text(bx + 18, y + 62, label, 26).setOrigin(0.5);
    }
    text(left + selectorWidth / 2, y + (ally ? 55 : 62), people[index].name, 15).setOrigin(0.5);
    if (ally) text(left + selectorWidth / 2, y + 73, `${t('Courage')} ${ally.courage}`, 11, '#cbb98f').setOrigin(0.5);
  } else text(x + 20, y + 51, t('Choose up to two weapons for defense.'), 13).setWordWrapWidth(width - 40);
  const layout = getArmoryControlsLayout(width, height);
  const { side: landscapePhone, compact, slotHeight, controlsWidth } = layout;
  const controlsX = x + layout.controlsX;
  const buttonY = y + layout.buttonY;
  const slotY = y + layout.slotY;
  const viewport = { ...layout.viewport, x: x + layout.viewport.x, y: y + layout.viewport.y };
  rect(viewport.x, viewport.y, viewport.width, viewport.height, 0x241c15).setStrokeStyle(5, 0x241c15);
  // Only the display rack uses desktop coordinates. Slots and controls stay in screen UI.
  const rack = { x: 0, y: 0, width: 1120, height: 520 };
  // Desktop opens on the whole rack; phones open at usable weapon size. Both can
  // zoom out to the same complete rack, or pan across it at the same detail scale.
  if (offset.zoom === undefined) {
    offset.zoom = width >= 800 && !landscapePhone
      ? Math.min(1, viewport.width / rack.width, viewport.height / rack.height)
      : Math.min(1, viewport.height / 124);
  }
  const panel = new ScrollPanel(scene, root, viewport, rack.width, rack.height, offset);
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
    const cx = 78 + index * cellWidth;
    const cy = 62;
    const assigned = armory.isAssigned(id);
    const selected = selectedWeapon === id;
    if (selected) {
      const glow = add(scene.add.ellipse(cx, cy, id === 'pistol' ? 110 : 210, 94, 0xffd681, 0.16));
      const tween = scene.tweens.add({ targets: glow, alpha: 0.55, duration: 600, yoyo: true, repeat: -1 });
      glow.once('destroy', () => tween.remove());
    }
    const image = weaponImage(id, cx, cy, id === 'pistol' ? 116 : 230, 116);
    if (assigned) image.setTint(0x858585).setAlpha(0.3);
    else {
      if (selected) image.setTint(0xffe5a7);
      const hitWidth = id === 'pistol' ? 116 : 230;
      panel.onTap({ x: cx - hitWidth / 2, y: 4, width: hitWidth, height: 116 }, () => {
        if (armory.selectWeapon(id)) refresh();
      });
    }
    text(cx, 132, t(WEAPON_DEFINITIONS[id as WeaponId].name), 14, '#2c261f').setOrigin(0.5);
  });
  parent = root;
  const slotWidth = landscapePhone ? controlsWidth : (controlsWidth - 12) / 2;
  const visibleSlots = ally ? [armory.getCompanionWeapon(ally.id)] : slots;
  visibleSlots.forEach((id, index) => {
    const sx = controlsX + (landscapePhone ? 0 : index * (slotWidth + 12));
    const sy = slotY + (landscapePhone ? index * (slotHeight + 10) : 0);
    const slot = rect(sx, sy, slotWidth, slotHeight, id ? 0x494b30 : 0x2c261f)
      .setStrokeStyle(2, id || selectedWeapon ? 0xc5ac6b : 0x796650);
    if (id || selectedWeapon) onTap(slot, () => {
      if (ally ? armory.clickCompanionSlot(ally.id) : armory.clickSlot(index as 0 | 1)) refresh();
    });
    text(sx + 10, sy + (compact ? 5 : slotHeight < 65 ? slotHeight / 2 : 9), ally ? t('Weapon') : t('WEAPON SLOT {slot}', { slot: index + 1 }), compact ? 12 : slotHeight < 65 ? 11 : 12, '#cbb98f').setOrigin(0, !compact && slotHeight < 65 ? 0.5 : 0);
    if (ally && !id) {
      if (slotHeight >= 65) weaponImage('pistol', sx + slotWidth / 2, sy + slotHeight * 0.48, slotHeight * 0.52, slotHeight * 0.52);
      text(sx + slotWidth / 2, sy + slotHeight - 18, t('Worn Pistol'), 12).setOrigin(0.5, 0);
      return;
    }
    if (compact) {
      text(sx + 10, sy + 25, id ? '✓ ' + t('EQUIPPED') : '+ ' + t('EMPTY'), 12, id ? '#d4dca8' : '#cbb98f');
    } else if (id && slotHeight < 65) {
      text(sx + slotWidth - 10, sy + slotHeight / 2, '✓ ' + t('EQUIPPED'), 11, '#d4dca8').setOrigin(1, 0.5);
    } else if (id) {
      weaponImage(id, landscapePhone ? sx + 42 : sx + slotWidth / 2, sy + slotHeight * 0.48, slotWidth * 0.6, slotHeight * 0.52);
      const name = text(sx + slotWidth * (landscapePhone ? 0.66 : 0.5), sy + slotHeight - 36,
        t(WEAPON_DEFINITIONS[id as WeaponId].name), 12).setOrigin(0.5, 0);
      name.setScale(Math.min(1, (landscapePhone ? slotWidth * 0.58 : slotWidth - 16) / name.width));
      text(sx + slotWidth * (landscapePhone ? 0.66 : 0.5), sy + slotHeight - 18, '✓ ' + t('EQUIPPED'), 11, '#d4dca8').setOrigin(0.5, 0);
    } else {
      if (slotHeight >= 65) text(sx + slotWidth / 2, sy + slotHeight * 0.24, '+', 32, '#aa9477').setOrigin(0.5, 0);
      text(slotHeight < 65 ? sx + slotWidth - 10 : sx + slotWidth / 2,
        slotHeight < 65 ? sy + slotHeight / 2 : sy + slotHeight - 28, t('EMPTY'), slotHeight < 65 ? 11 : 13, '#cbb98f')
        .setOrigin(slotHeight < 65 ? 1 : 0.5, slotHeight < 65 ? 0.5 : 0);
    }
  });
  if (ally && companions) {
    const sx = controlsX + (landscapePhone ? 0 : slotWidth + 12);
    const sy = slotY + (landscapePhone ? slotHeight + 10 : 0);
    const deployed = armory.getDeployedIds().includes(ally.id);
    const affordable = armory.getDeployedIds().length < companions.ammo;
    const button = rect(sx, sy, slotWidth, slotHeight, deployed ? 0x494b30 : 0x2c261f).setStrokeStyle(2, 0xc5ac6b);
    if (deployed || affordable) onTap(button, () => { armory.toggleDeployment(ally.id, companions.ammo); refresh(); });
    const label = deployed ? 'Participating · Ammo 1' : affordable ? 'Join defense · Ammo 1' : 'Not enough Ammo';
    text(sx + slotWidth / 2, sy + slotHeight / 2, (deployed ? '✓ ' : '') + t(label), 13,
      deployed ? '#d4dca8' : affordable ? '#ead9b8' : '#978775').setOrigin(0.5).setWordWrapWidth(slotWidth - 16).setAlign('center');
  }
  if (companions?.companions.length) {
    text(controlsX, buttonY - 13, t('Companions {count}/{total} · Ammo {cost}/{ammo}', {
      count: armory.getDeployedIds().length, total: companions.companions.length,
      ammo: companions.ammo, cost: armory.getDeployedIds().length,
    }), 10);
  }
  const canStart = armory.canStartDefense() && (!companions || armory.getDeployedIds().length <= companions.ammo);
  const start = rect(controlsX, buttonY, controlsWidth, 44, canStart ? 0x802c24 : 0x4a4136)
    .setStrokeStyle(1, canStart ? 0xc79c61 : 0x70604e);
  if (canStart) {
    onTap(start, () => {
      if (armory.canStartDefense()) startDefense();
    });
  }
  text(controlsX + controlsWidth / 2, buttonY + 22, t('Day {day} · Start defense', { day }), 16, canStart ? '#fff0cf' : '#978775')
    .setOrigin(0.5);
}
