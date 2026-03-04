const TICK_RATE = 1000 / 60;
const MAX_FRAME_DELTA = 100;
const MAX_UPDATES_PER_FRAME = 5;

export class GameLoop {
  /**
   * @param {function(number): void} updateFn - receives dt in seconds
   * @param {function(): void} renderFn
   */
  constructor(updateFn, renderFn) {
    this.update = updateFn;
    this.render = renderFn;
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.runLoop(t));
  }

  stop() {
    this.running = false;
  }

  /** @param {number} timestamp */
  runLoop(timestamp) {
    if (!this.running) return;

    const delta = Math.min(timestamp - this.lastTime, MAX_FRAME_DELTA);
    this.lastTime = timestamp;
    this.accumulator += delta;

    let updates = 0;
    while (this.accumulator >= TICK_RATE && updates < MAX_UPDATES_PER_FRAME) {
      this.update(TICK_RATE / 1000);
      this.accumulator -= TICK_RATE;
      updates++;
    }

    // drop excess accumulated time to avoid long catch-ups after tab pause
    if (updates === MAX_UPDATES_PER_FRAME && this.accumulator >= TICK_RATE) {
      this.accumulator = 0;
    }

    this.render();
    requestAnimationFrame((t) => this.runLoop(t));
  }
}
