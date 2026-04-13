export class ChatOverlay {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(text: string) => void} onSend
   */
  constructor(canvas, onSend) {
    this.canvas = canvas;
    this.onSend = onSend;
    this.isOpen = false;

    const host = canvas.parentElement;
    if (host && getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.maxLength = 100;
    this.input.placeholder = "say something...";
    this.input.style.cssText = `
      display: none;
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 260px;
      padding: 5px 8px;
      font-family: 'DepartureMono', monospace;
      font-size: 10px;
      color: #272744;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid #272744;
      border-radius: 4px;
      outline: none;
      box-sizing: border-box;
      z-index: 10;
    `;

    this.onInputKeyDown = (e) => {
      e.stopPropagation();
      if (e.code === "Enter") {
        const text = this.input.value.trim();
        if (text) this.onSend(text);
        this.close();
      } else if (e.code === "Escape") {
        this.close();
      }
    };
    this.input.addEventListener("keydown", this.onInputKeyDown);

    host?.appendChild(this.input);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.input.value = "";
    this.input.style.display = "block";
    this.input.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.input.style.display = "none";
    this.input.value = "";
    this.canvas.focus?.();
  }

  destroy() {
    this.input.removeEventListener("keydown", this.onInputKeyDown);
    this.input.remove();
  }
}
