const TICK_RATE = 1000 / 60;

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

    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.accumulator += delta;

    while (this.accumulator >= TICK_RATE) {
      this.update(TICK_RATE / 1000);
      this.accumulator -= TICK_RATE;
    }

    this.render();
    requestAnimationFrame((t) => this.runLoop(t));
  }
}
