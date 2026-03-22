const KEY_MAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyV: "cluck",
};

export class InputManager {
  constructor() {
    /** @type {Record<string, boolean>} */
    this.actions = {};

    this.onKeyDown = (e) => this.handleKeyEvent(e, true);
    this.onKeyUp = (e) => this.handleKeyEvent(e, false);
    this.onBlur = () => this.clear();
    this.onVisibilityChange = () => {
      if (document.visibilityState !== "visible") this.clear();
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur); // window loses focus
    document.addEventListener("visibilitychange", this.onVisibilityChange); // switch tabs
  }

  /**
   * @param {KeyboardEvent} e
   * @param {boolean} isDown
   */
  handleKeyEvent(e, isDown) {
    const action = KEY_MAP[e.code];
    if (!action) return;

    e.preventDefault();
    this.actions[action] = isDown;
  }

  /** Reset all held actions. */
  clear() {
    this.actions = {};
  }

  /** @param {string} action */
  isDown(action) {
    return Boolean(this.actions[action]);
  }

  /** Remove all event listeners and clear state. */
  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.clear();
  }
}
