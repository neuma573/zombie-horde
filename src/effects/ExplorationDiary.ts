import Phaser from 'phaser';
import { t } from '../systems/UserSettings';
import type { MessageKey } from '../i18n/catalog';
import { paginateDiaryLines } from '../logic/explorationLayout';

const HAND = '"Chalkboard SE", "Comic Sans MS", cursive';


const INTRO_PARAGRAPHS = [
  "I arrived in Hazard and found an empty shop to stay in. It is already eleven, so looking around will have to wait until tomorrow.",
  "I put up a barricade with some furniture and checked the pistol and ammunition. The barricade is not very sturdy. I will need to keep the zombies away from it.",
  "For now, I need to hold out until five. Tomorrow I will look for supplies nearby and repair the barricade. There should be time to rest as well.",
] as const satisfies readonly MessageKey[];

/** Introductory writing paginates at a readable size without changing exploration state. */
export class ExplorationDiary {
  readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, width: number, height: number, close: () => void, animate = true) {
    this.container = scene.add.container(0, 0);
    const compact = height < 560;
    const pageWidth = Math.min(compact ? 900 : 660, width - 40);
    const pageHeight = Math.min(760, height - 40);
    const left = (width - pageWidth) / 2;
    const top = (height - pageHeight) / 2;
    const pad = pageWidth < 400 ? 24 : 48;
    const ink = '#303321';
    const graphics = scene.add.graphics();

    graphics.fillStyle(0x080a07, 0.5).fillRoundedRect(left + 7, top + 9, pageWidth, pageHeight, 12);
    graphics.fillStyle(0x394330).fillRoundedRect(left - 8, top - 8, pageWidth + 16, pageHeight + 16, 12);
    graphics.fillStyle(0xc9c5a2).fillRoundedRect(left, top, pageWidth, pageHeight, 7);
    graphics.fillStyle(0xdad3b1).fillRect(left + 9, top + 6, pageWidth - 17, pageHeight - 12);
    // A dark binding, faded edges and fixed paper flecks keep the page quiet behind the writing.
    for (let i = 0; i < 12; i++) {
      graphics.fillStyle(0x4a5034, 0.025 + (12 - i) * 0.005);
      graphics.fillRect(left + i * 1.5, top + 6, 2, pageHeight - 12);
      graphics.lineStyle(1, 0x716b45, 0.045);
      graphics.strokeRect(left + i, top + i, pageWidth - i * 2, pageHeight - i * 2);
    }
    for (let i = 0; i < 650; i++) {
      const x = left + 16 + ((i * 137.3) % (pageWidth - 30));
      const y = top + 12 + ((i * 83.7) % (pageHeight - 24));
      graphics.fillStyle(i % 2 ? 0x777147 : 0xfff5cc, 0.07);
      graphics.fillCircle(x, y, i % 3 === 0 ? 1.5 : 0.6);
    }
    graphics.lineStyle(1, 0x746d48, 0.3);
    graphics.lineBetween(left + 12, top + 43, left + 39, top + 12);
    graphics.lineBetween(left + 12, top + 43, left + 14, top + 14);
    this.container.add(graphics);

    const text = (x: number, y: number, value: string, size: number) => {
      const object = scene.add.text(x, y, value, {
        fontFamily: HAND, fontSize: size, color: ink, fontStyle: 'bold',
      });
      this.container.add(object);
      return object;
    };
    text(left + pageWidth - pad, top + 18, t('DAY {day}', { day: 1 }), compact ? 18 : 23).setOrigin(1, 0);
    const titleY = top + (compact ? 46 : 76);
    text(left + pad, titleY, t('THE FIRST NIGHT'), pageWidth < 400 ? 25 : 33);
    const body = text(left + pad, titleY + (compact ? 48 : 64),
      INTRO_PARAGRAPHS.map(message => t(message)).join('\n\n'), compact ? 17 : 20);
    body.setWordWrapWidth(pageWidth - pad * 2, true).setLineSpacing(compact ? 5 : 9);
    const closeY = top + pageHeight - 64;
    const bodyBottom = closeY - 24;
    const pages = paginateDiaryLines(body.getWrappedText(), bodyBottom - body.y,
      body.getTextMetrics().fontSize + body.lineSpacing);
    let page = 0;
    body.setWordWrapWidth(0);
    const indicator = text(left + pad + 48, closeY + 42, '', 12).setOrigin(0.5, 0);
    const actionX = left + pageWidth - pad - 60;
    const actionLabel = text(actionX, closeY + 18, '', 14).setOrigin(0.5);
    const refresh = () => {
      body.setText(pages[page]);
      indicator.setText(`${page + 1} / ${pages.length}`);
      actionLabel.setText(t(page === pages.length - 1 ? 'START NIGHT DEFENSE' : 'NEXT PAGE'));
      actionLabel.setScale(Math.min(1, 110 / Math.max(1, actionLabel.width)));
    };
    [-1, 1].forEach((direction, index) => {
      const x = left + pad + index * 48;
      text(x + 20, closeY + 18, direction < 0 ? '←' : '→', 24).setOrigin(0.5);
      this.container.add(scene.add.zone(x + 20, closeY + 18, 40, 44)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => {
          if (animating) return;
          page = Math.max(0, Math.min(pages.length - 1, page + direction));
          refresh();
        }));
    });
    const mark = scene.add.graphics().lineStyle(2, 0x303321);
    mark.strokeRoundedRect(actionX - 60, closeY - 4, 120, 44, 3);
    this.container.add(mark);
    this.container.add(scene.add.zone(actionX, closeY + 18, 120, 44)
      .setInteractive({ useHandCursor: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (animating || pointer.getDistance() > 8) return;
        if (page < pages.length - 1) { page++; refresh(); }
        else close();
      }));
    refresh();
    let animating = animate;
    if (animate) {
      this.container.y = height;
      const tween = scene.tweens.add({ targets: this.container, y: 0, duration: 700, ease: 'Cubic.Out',
        onComplete: () => { animating = false; } });
      this.container.once('destroy', () => tween.remove());
    }
  }
}
