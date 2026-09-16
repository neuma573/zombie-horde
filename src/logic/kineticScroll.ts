/** Canvas scroll offsets in logical pixels; time is supplied by the caller. */
export class KineticScroll {
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;

  constructor(public maxX: number, public maxY: number) {}

  stop(): void { this.vx = this.vy = 0; }

  move(dx: number, dy: number, elapsedMs: number): void {
    const previousX = this.x;
    const previousY = this.y;
    this.x = Math.max(0, Math.min(this.maxX, this.x - dx));
    this.y = Math.max(0, Math.min(this.maxY, this.y - dy));
    this.vx = elapsedMs > 0 ? (this.x - previousX) / elapsedMs : 0;
    this.vy = elapsedMs > 0 ? (this.y - previousY) / elapsedMs : 0;
  }

  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const decay = Math.exp(-deltaMs / 180);
    const distance = 180 * (1 - decay);
    this.x = Math.max(0, Math.min(this.maxX, this.x + this.vx * distance));
    this.y = Math.max(0, Math.min(this.maxY, this.y + this.vy * distance));
    this.vx *= decay;
    this.vy *= decay;
    if (this.x === 0 || this.x === this.maxX) this.vx = 0;
    if (this.y === 0 || this.y === this.maxY) this.vy = 0;
  }
}
