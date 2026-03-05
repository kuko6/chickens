/**
 * Seeded pseudo-random number generator (mulberry32).
 * Given the same seed, produces the same sequence of numbers.
 */
export class SeededRandom {
  /** @param {number} seed */
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next() {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  /** Returns an integer in [0, max) */
  nextInt(max) {
    return Math.floor(this.next() * max);
  }

  /** Returns a float in [min, max) */
  nextRange(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Deterministic hash for a world position — stateless, doesn't advance the sequence.
   * Useful for infinite tiling where you need the same result for a given (col, row) every time.
   * @param  {...number} coords
   * @returns {number} unsigned 32-bit integer
   */
  hash(...coords) {
    let h = this.seed;
    for (const c of coords) {
      h = (h + Math.imul(c, 374761)) | 0;
      h = Math.imul((h >> 16) ^ h, 0x45d9f3b) | 0;
      h = Math.imul((h >> 16) ^ h, 0x45d9f3b) | 0;
    }
    return ((h >> 16) ^ h) >>> 0;
  }
}
