/**
 * Wraps an InputManager, only allowing whitelisted actions through.
 * Implements the same isDown() interface so Chicken works unchanged.
 */
export class InputFilter {
  /**
   * @param {import('./input.js').InputManager} input
   * @param {string[]} allowed — action names to pass through
   */
  constructor(input, allowed) {
    this.input = input;
    this.allowed = new Set(allowed);
  }

  /** @param {string} action */
  isDown(action) {
    if (!this.allowed.has(action)) return false;
    return this.input.isDown(action);
  }
}
