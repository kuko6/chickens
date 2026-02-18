export class InputManager {
  constructor() {
    /** @type {Record<string, boolean>} */
    this.keys = {};

    document.addEventListener("keydown", (e) => {
      if (e.key === " ") e.preventDefault();
      this.keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  /** @param {string} key */
  isDown(key) {
    return !!this.keys[key];
  }
}
