export class IntroOverlay {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(name: string, lobbyCode: string) => void} onJoin
   */
  constructor(canvas, onJoin) {
    const host = canvas.parentElement;
    if (!host) throw new Error("Canvas must be mounted before creating overlay.");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    this.root = document.createElement("div");
    this.root.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'DepartureMono', monospace;
      z-index: 5;
    `;

    const titleRow = document.createElement("div");
    titleRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 36px;
    `;

    const icon = document.createElement("img");
    icon.src = "assets/icons/favicon-32x32.png";
    icon.style.cssText = `
      width: 60px;
      height: 60px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    `;

    const title = document.createElement("div");
    title.textContent = "Chickens";
    title.style.cssText = `
      font-size: 42px;
      color: #272744;
    `;

    titleRow.appendChild(icon);
    titleRow.appendChild(title);

    const nameInput = this.makeInput("name", 16);
    nameInput.style.textTransform = "none";
    nameInput.style.width = "234px";
    nameInput.style.marginBottom = "12px";

    const row = this.makeRow();
    const lobbyInput = this.makeInput("lobby code", 16);
    const joinBtn = this.makeButton("Join");
    joinBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const code = lobbyInput.value.trim().toLowerCase() || Math.random().toString(36).substring(2, 7);
      onJoin(name, code);
    });
    lobbyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinBtn.click();
    });
    row.appendChild(lobbyInput);
    row.appendChild(joinBtn);

    const card = document.createElement("div");
    card.style.cssText = `
      padding: 32px 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    card.appendChild(titleRow);
    card.appendChild(nameInput);
    card.appendChild(row);

    this.root.appendChild(card);
    host.appendChild(this.root);
  }

  makeRow() {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;
    return row;
  }

  makeInput(placeholder, maxLength) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.maxLength = maxLength;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.style.cssText = `
      font-family: 'DepartureMono', monospace;
      font-size: 16px;
      padding: 8px 12px;
      border: 2px solid #272744;
      background: rgba(255, 255, 255, 1);
      color: #272744;
      width: 140px;
      text-align: center;
      text-transform: lowercase;
      outline: none;
      border-radius: 0;
    `;
    const style = document.createElement("style");
    style.textContent = `input::placeholder { color: #aaa; }`;
    if (!document.querySelector("style[data-intro-placeholder]")) {
      style.setAttribute("data-intro-placeholder", "");
      document.head.appendChild(style);
    }
    input.addEventListener("focus", () => { input.placeholder = ""; });
    input.addEventListener("blur", () => { input.placeholder = placeholder; });
    input.addEventListener("keydown", (e) => e.stopPropagation());
    input.addEventListener("keyup", (e) => e.stopPropagation());
    return input;
  }

  makeButton(text) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    btn.style.cssText = `
      font-family: 'DepartureMono', monospace;
      font-size: 16px;
      padding: 8px 20px;
      border: 2px solid #272744;
      background: rgba(255, 255, 255, 1);
      color: #272744;
      cursor: pointer;
      white-space: nowrap;
      border-radius: 0;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#272744";
      btn.style.color = "#fff";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(255, 255, 255, 1)";
      btn.style.color = "#272744";
    });
    return btn;
  }

  destroy() {
    this.root.remove();
  }
}
