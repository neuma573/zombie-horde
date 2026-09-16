import { KineticScroll } from './kineticScroll';

export interface ViewportState { x: number; y: number; zoom?: number }
export interface Point { x: number; y: number }

/** Zoom and pan in viewport pixels, with a content-space anchor under the fingers. */
export class PinchViewport {
  readonly scroll: KineticScroll;
  readonly minZoom: number;
  readonly maxZoom: number;
  zoom: number;

  constructor(readonly width: number, readonly height: number,
    readonly contentWidth: number, readonly contentHeight: number, state: ViewportState, fit: 'contain' | 'cover' = 'contain') {
    this.minZoom = fit === 'cover'
      ? Math.max(width / contentWidth, height / contentHeight)
      : Math.min(1, width / contentWidth, height / contentHeight);
    this.maxZoom = Math.max(2, this.minZoom * 4);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, state.zoom ?? (fit === 'cover' ? Math.max(1, this.minZoom) : this.minZoom)));
    this.scroll = new KineticScroll(0, 0);
    this.updateBounds();
    this.scroll.x = Math.max(0, Math.min(this.scroll.maxX, state.x));
    this.scroll.y = Math.max(0, Math.min(this.scroll.maxY, state.y));
  }

  get left(): number { return Math.max(0, (this.width - this.contentWidth * this.zoom) / 2) - this.scroll.x; }
  get top(): number { return Math.max(0, (this.height - this.contentHeight * this.zoom) / 2) - this.scroll.y; }

  contentPoint(point: Point): Point {
    return { x: (point.x - this.left) / this.zoom, y: (point.y - this.top) / this.zoom };
  }

  pinch(previousCenter: Point, center: Point, ratio: number): void {
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    const anchor = this.contentPoint(previousCenter);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * ratio));
    this.updateBounds();
    this.scroll.x = Math.max(0, Math.min(this.scroll.maxX,
      anchor.x * this.zoom - center.x + Math.max(0, (this.width - this.contentWidth * this.zoom) / 2)));
    this.scroll.y = Math.max(0, Math.min(this.scroll.maxY,
      anchor.y * this.zoom - center.y + Math.max(0, (this.height - this.contentHeight * this.zoom) / 2)));
    this.scroll.stop();
  }

  private updateBounds(): void {
    this.scroll.maxX = Math.max(0, this.contentWidth * this.zoom - this.width);
    this.scroll.maxY = Math.max(0, this.contentHeight * this.zoom - this.height);
  }
}
