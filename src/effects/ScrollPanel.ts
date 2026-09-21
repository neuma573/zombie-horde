import Phaser from 'phaser';
import { PinchViewport, type Point, type ViewportState } from '../logic/pinchViewport';

type Box = { x: number; y: number; width: number; height: number };
type Touch = { point: Point; start: Point; time: number };

/** A clipped canvas viewport: pinch to zoom, drag to pan, release a stationary finger to tap. */
export class ScrollPanel {
  readonly content: Phaser.GameObjects.Container;
  private targets: { box: Box; action: () => void }[] = [];
  private view: PinchViewport;
  private sync: () => void;
  private zoomTween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, box: Box,
    width: number, height: number, state: ViewportState, fit: 'contain' | 'cover' = 'contain',
    options: { dragCursor?: boolean; onNavigate?: () => void } = {}) {
    const view = new PinchViewport(box.width, box.height, width, height, state, fit);
    this.view = view;
    this.content = scene.add.container(box.x, box.y);
    parent.add(this.content);
    const matrix = parent.getWorldTransformMatrix();
    const origin = matrix.transformPoint(box.x, box.y);
    const maskGraphics = scene.make.graphics({ x: 0, y: 0 });
    maskGraphics.fillStyle(0xffffff).fillRect(origin.x, origin.y,
      box.width * matrix.scaleX, box.height * matrix.scaleY);
    const mask = maskGraphics.createGeometryMask();
    this.content.setMask(mask);
    const input = scene.add.zone(box.x, box.y, box.width, box.height).setOrigin(0)
      .setInteractive(options.dragCursor ? { cursor: 'grab' } : undefined);
    parent.add(input);
    const touches = new Map<number, Touch>();
    let gesture = false;
    const point = (pointer: Phaser.Input.Pointer): Point => {
      const local = matrix.applyInverse(pointer.x, pointer.y);
      return { x: local.x - box.x, y: local.y - box.y };
    };
    const pair = () => {
      const [a, b] = [...touches.values()].map(touch => touch.point);
      return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) };
    };
    const sync = this.sync = () => {
      this.content.setPosition(box.x + view.left, box.y + view.top).setScale(view.zoom);
      state.x = view.scroll.x; state.y = view.scroll.y; state.zoom = view.zoom;
    };
    const navigate = () => { this.zoomTween?.remove(); options.onNavigate?.(); };
    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (touches.size >= 2) return;
      this.zoomTween?.remove();
      if (!touches.size) gesture = false;
      const position = point(pointer);
      touches.set(pointer.id, { point: position, start: position, time: scene.time.now });
      if (touches.size === 2) gesture = true;
      view.scroll.stop();
    });
    const move = (pointer: Phaser.Input.Pointer) => {
      const touch = touches.get(pointer.id);
      if (!touch) return;
      const position = point(pointer);
      if (position.x === touch.point.x && position.y === touch.point.y) return;
      if (touches.size === 2) {
        navigate();
        const before = pair();
        touch.point = position;
        const after = pair();
        view.pinch(before.center, after.center, before.distance > 0 ? after.distance / before.distance : 1);
      } else {
        if (!gesture && Math.hypot((position.x - touch.start.x) * matrix.scaleX,
          (position.y - touch.start.y) * matrix.scaleY) < 8) return;
        gesture = true;
        navigate();
        view.scroll.move(position.x - touch.point.x, position.y - touch.point.y, Math.max(1, scene.time.now - touch.time));
        touch.point = position;
      }
      touch.time = scene.time.now;
      sync();
    };
    const release = (pointer: Phaser.Input.Pointer) => {
      const touch = touches.get(pointer.id);
      if (!touch) return;
      move(pointer);
      touches.delete(pointer.id);
      if (touches.size || scene.time.now - touch.time > 100) view.scroll.stop();
      // A remaining finger continues panning; it must never become a tap after a pinch.
      for (const remaining of touches.values()) remaining.time = scene.time.now;
      if (gesture || !scene.input.enabled) return;
      const local = point(pointer);
      if (local.x < 0 || local.y < 0 || local.x > box.width || local.y > box.height) return;
      const { x, y } = view.contentPoint(local);
      this.targets.find(target => x >= target.box.x && x <= target.box.x + target.box.width &&
        y >= target.box.y && y <= target.box.y + target.box.height)?.action();
    };
    const cancel = () => { touches.clear(); gesture = true; view.scroll.stop(); };
    const update = (_time: number, delta: number) => {
      if (!scene.input.enabled) cancel();
      if (!touches.size) { view.scroll.update(delta); sync(); }
    };
    input.on('wheel', (pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      if (touches.size) return;
      navigate();
      const center = point(pointer);
      view.pinch(center, center, Math.exp(-dy * 0.002));
      sync();
    });
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', cancel);
    scene.game.events.on(Phaser.Core.Events.BLUR, cancel);
    scene.game.canvas.addEventListener('touchcancel', cancel);
    scene.events.on(Phaser.Scenes.Events.UPDATE, update);
    this.content.once('destroy', () => {
      this.zoomTween?.remove();
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', release);
      scene.input.off('pointerupoutside', cancel);
      scene.game.events.off(Phaser.Core.Events.BLUR, cancel);
      scene.game.canvas.removeEventListener('touchcancel', cancel);
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      mask.destroy(); maskGraphics.destroy();
    });
    sync();
  }

  onTap(box: Box, action: () => void): void { this.targets.push({ box, action }); }

  /** Pan the target into focus while zooming; direct manipulation cancels the transition. */
  zoomTo(point: Point, zoom: number, center = false): void {
    this.zoomTween?.remove();
    const view = this.view;
    view.scroll.stop();
    const anchor = { x: view.left + point.x * view.zoom, y: view.top + point.y * view.zoom };
    const destination = center ? { x: view.width / 2, y: view.height / 2 } : anchor;
    const startZoom = view.zoom;
    const targetZoom = Phaser.Math.Clamp(zoom, view.minZoom, view.maxZoom);
    const value = { progress: 0 };
    this.zoomTween = this.scene.tweens.add({ targets: value,
      progress: 1, duration: 700, ease: 'Sine.InOut',
      onUpdate: () => {
        view.placeContentPoint(point, {
          x: Phaser.Math.Linear(anchor.x, destination.x, value.progress),
          y: Phaser.Math.Linear(anchor.y, destination.y, value.progress),
        }, Phaser.Math.Linear(startZoom, targetZoom, value.progress));
        this.sync();
      },
    });
  }
}
