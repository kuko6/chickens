import { TINT_COLORS } from "../entities/tints.js";
import { SPRITE_SETS } from "../engine/assets.js";

const ICON_SIZE = 28;
const ICON_MARGIN = 10;
const PANEL_WIDTH = 220;

// Index used to represent the imro option in the style selector.
// Tint indices 0..TINT_COLORS.length-1 use the default sprite, this one uses imro.
const IMRO_STYLE_INDEX = TINT_COLORS.length;

export class CustomizeOverlay {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} assets
   * @param {function(string, number, string): void} onChange - (spriteSet, colorIndex, name)
   */
  constructor(canvas, assets, onChange) {
    this.canvas = canvas;
    this.assets = assets;
    this.onChange = onChange;

    this.open = false;
    this.selectedSpriteSetValue = "default";
    this.selectedColorIndexValue = 0;
    this.playerName = "";

    this.styleButtons = [];

    this.buildDom();
    this.syncStyleSelection();
  }

  get selectedSpriteSet() {
    return this.selectedSpriteSetValue;
  }

  set selectedSpriteSet(value) {
    this.selectedSpriteSetValue = value;
    this.syncStyleSelection();
  }

  get selectedColorIndex() {
    return this.selectedColorIndexValue;
  }

  set selectedColorIndex(value) {
    this.selectedColorIndexValue = value;
    this.syncStyleSelection();
  }

  /** Returns the internal style index that represents the current spriteSet + colorIndex combo. */
  get activeStyleIndex() {
    if (this.selectedSpriteSetValue === "imro") return IMRO_STYLE_INDEX;
    return this.selectedColorIndexValue;
  }

  buildDom() {
    const host = this.canvas.parentElement;
    if (!host) throw new Error("Canvas must be mounted before creating overlay.");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    this.root = document.createElement("div");
    this.root.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      font-family: 'DepartureMono', monospace;
      z-index: 5;
    `;

    this.gearButton = document.createElement("button");
    this.gearButton.type = "button";
    this.gearButton.title = "Customize character";
    this.gearButton.textContent = "\u2699";
    this.gearButton.style.cssText = `
      position: absolute;
      top: ${ICON_MARGIN}px;
      right: ${ICON_MARGIN}px;
      width: ${ICON_SIZE}px;
      height: ${ICON_SIZE}px;
      border: 2px solid #272744;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.85);
      color: #272744;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      padding: 0;
      user-select: none;
    `;
    this.gearButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setOpen(!this.open);
    });

    this.panel = document.createElement("div");
    this.panel.style.cssText = `
      position: absolute;
      top: ${ICON_MARGIN + ICON_SIZE + 6}px;
      right: ${ICON_MARGIN}px;
      width: ${PANEL_WIDTH}px;
      border: 2px solid #272744;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
      padding: 10px 12px 12px;
      pointer-events: auto;
      display: none;
      box-sizing: border-box;
    `;

    // name input
    const nameLabel = this.label("Name:");
    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.maxLength = 16;
    this.nameInput.placeholder = "Name...";
    this.nameInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      border: 2px solid #272744;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 13px;
      outline: none;
      margin-bottom: 10px;
    `;
    this.nameInput.addEventListener("input", () => {
      this.playerName = this.nameInput.value;
      this.emitChange();
    });
    this.nameInput.addEventListener("keydown", (e) => e.stopPropagation());
    this.nameInput.addEventListener("keyup", (e) => e.stopPropagation());

    // unified style row: tint swatches + imro sprite
    const styleLabel = this.label("Style:");
    const styleRow = document.createElement("div");
    styleRow.style.cssText = `
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    `;

    // tint color swatches (each selects default sprite + that tint)
    for (let i = 0; i < TINT_COLORS.length; i++) {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.style.cssText = `
        border: 2px solid #9aa4b8;
        border-radius: 999px;
        width: 22px;
        height: 22px;
        padding: 0;
        cursor: pointer;
        background: ${this.solidColor(TINT_COLORS[i])};
      `;
      swatch.addEventListener("click", () => {
        this.selectedSpriteSetValue = "default";
        this.selectedColorIndexValue = i;
        this.syncStyleSelection();
        this.emitChange();
      });
      styleRow.appendChild(swatch);
      this.styleButtons.push({ el: swatch, styleIndex: i });
    }

    // imro option — shown as a small sprite preview
    const imroSet = SPRITE_SETS.find((s) => s.name === "imro");
    if (imroSet) {
      const imroBtn = document.createElement("button");
      imroBtn.type = "button";
      imroBtn.style.cssText = `
        border: 2px solid #9aa4b8;
        border-radius: 6px;
        background: #f5f8ff;
        padding: 2px;
        cursor: pointer;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      `;
      imroBtn.addEventListener("click", () => {
        this.selectedSpriteSetValue = "imro";
        this.selectedColorIndexValue = 0;
        this.syncStyleSelection();
        this.emitChange();
      });

      const preview = document.createElement("canvas");
      preview.width = 20;
      preview.height = 20;
      preview.style.cssText = "image-rendering: pixelated; image-rendering: crisp-edges;";
      this.drawSpritePreview(preview, imroSet);

      imroBtn.appendChild(preview);
      styleRow.appendChild(imroBtn);
      this.styleButtons.push({ el: imroBtn, styleIndex: IMRO_STYLE_INDEX });
    }

    this.panel.appendChild(nameLabel);
    this.panel.appendChild(this.nameInput);
    this.panel.appendChild(styleLabel);
    this.panel.appendChild(styleRow);

    this.root.appendChild(this.gearButton);
    this.root.appendChild(this.panel);
    host.appendChild(this.root);

    this.onDocumentClick = (e) => {
      if (!this.open) return;
      const target = /** @type {Node | null} */ (e.target);
      if (target && (this.panel.contains(target) || this.gearButton.contains(target))) return;
      this.setOpen(false);
    };
    document.addEventListener("click", this.onDocumentClick);
  }

  label(text) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = `
      font-size: 12px;
      font-weight: 700;
      color: #272744;
      margin: 0 0 6px;
    `;
    return el;
  }

  drawSpritePreview(canvas, set) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setData = this.assets.spriteSets[set.name];
    if (!setData?.idle) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(setData.idle, 0, 0, set.spriteWidth, set.spriteHeight, 0, 0, canvas.width, canvas.height);
  }

  emitChange() {
    this.onChange(this.selectedSpriteSetValue, this.selectedColorIndexValue, this.playerName);
  }

  setOpen(open) {
    this.open = open;
    this.panel.style.display = open ? "block" : "none";
    this.gearButton.style.background = open ? "rgba(100, 180, 255, 0.82)" : "rgba(255, 255, 255, 0.85)";
    if (open) this.nameInput.focus();
  }

  syncStyleSelection() {
    const active = this.activeStyleIndex;
    for (const { el, styleIndex } of this.styleButtons) {
      const selected = styleIndex === active;
      el.style.borderColor = selected ? "#272744" : "#9aa4b8";
      el.style.transform = selected ? "scale(1.08)" : "scale(1)";
    }
  }

  solidColor(tint) {
    return tint ? tint.replace(/[\d.]+\)$/, "1)") : "#f5f5f5";
  }

  destroy() {
    document.removeEventListener("click", this.onDocumentClick);
    this.root.remove();
  }
}
