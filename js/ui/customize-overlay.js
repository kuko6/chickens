import { TINT_COLORS } from "../entities/tints.js";
import { SPRITE_SETS } from "../engine/assets.js";

const ICON_SIZE = 28;
const ICON_MARGIN = 10;
const PANEL_WIDTH = 220;

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

    this.spriteButtons = new Map();
    this.colorButtons = [];

    this.buildDom();
    this.syncSpriteSelection();
    this.syncColorSelection();
  }

  get selectedSpriteSet() {
    return this.selectedSpriteSetValue;
  }

  set selectedSpriteSet(value) {
    this.selectedSpriteSetValue = this.normalizeSpriteSet(value);
    this.syncSpriteSelection();
  }

  get selectedColorIndex() {
    return this.selectedColorIndexValue;
  }

  set selectedColorIndex(value) {
    this.selectedColorIndexValue = this.normalizeColorIndex(value);
    this.syncColorSelection();
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

    const skinLabel = this.label("Skin:");
    const skinRow = document.createElement("div");
    skinRow.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    `;

    for (const set of SPRITE_SETS) {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.spriteSet = set.name;
      option.style.cssText = `
        border: 2px solid #b9c2d3;
        border-radius: 6px;
        background: #f5f8ff;
        padding: 4px;
        cursor: pointer;
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      `;
      option.addEventListener("click", () => {
        this.selectedSpriteSet = set.name;
        this.emitChange();
      });

      const preview = document.createElement("canvas");
      preview.width = 32;
      preview.height = 32;
      preview.style.cssText = "image-rendering: pixelated; image-rendering: crisp-edges;";
      this.drawSpritePreview(preview, set);

      option.appendChild(preview);
      skinRow.appendChild(option);
      this.spriteButtons.set(set.name, option);
    }

    const tintLabel = this.label("Tint:");
    const tintRow = document.createElement("div");
    tintRow.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    `;

    for (let i = 0; i < TINT_COLORS.length; i++) {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.dataset.colorIndex = String(i);
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
        this.selectedColorIndex = i;
        this.emitChange();
      });
      tintRow.appendChild(swatch);
      this.colorButtons.push(swatch);
    }

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
    `;
    this.nameInput.addEventListener("input", () => {
      this.playerName = this.nameInput.value;
      this.emitChange();
    });
    this.nameInput.addEventListener("keydown", (e) => e.stopPropagation());
    this.nameInput.addEventListener("keyup", (e) => e.stopPropagation());

    this.panel.appendChild(skinLabel);
    this.panel.appendChild(skinRow);
    this.panel.appendChild(tintLabel);
    this.panel.appendChild(tintRow);
    this.panel.appendChild(nameLabel);
    this.panel.appendChild(this.nameInput);

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

  syncSpriteSelection() {
    for (const [name, button] of this.spriteButtons) {
      const selected = name === this.selectedSpriteSetValue;
      button.style.borderColor = selected ? "#272744" : "#b9c2d3";
      button.style.background = selected ? "rgba(100, 180, 255, 0.25)" : "#f5f8ff";
    }
  }

  syncColorSelection() {
    this.colorButtons.forEach((button, index) => {
      const selected = index === this.selectedColorIndexValue;
      button.style.borderColor = selected ? "#272744" : "#9aa4b8";
      button.style.transform = selected ? "scale(1.08)" : "scale(1)";
    });
  }

  normalizeSpriteSet(value) {
    if (this.spriteButtons.has(value)) return value;
    return SPRITE_SETS[0].name;
  }

  normalizeColorIndex(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(TINT_COLORS.length - 1, Math.floor(n)));
  }

  solidColor(tint) {
    return tint ? tint.replace(/[\d.]+\)$/, "1)") : "#f5f5f5";
  }

  destroy() {
    document.removeEventListener("click", this.onDocumentClick);
    this.root.remove();
  }
}
