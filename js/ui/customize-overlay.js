import { TINT_COLORS } from "../entities/tints.js";
import { SPRITE_SETS } from "../engine/assets.js";

const ICON_SIZE = 28;
const ICON_MARGIN = 10;
const PANEL_WIDTH = 220;
const PANEL_PADDING = 12;
const ROW_HEIGHT = 36;

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

    this.selectedSpriteSet = "default";
    this.selectedColorIndex = 0;
    this.playerName = "";

    const w = canvas.logicalWidth || canvas.width;

    // gear icon position (top-right)
    this.iconX = w - ICON_SIZE - ICON_MARGIN;
    this.iconY = ICON_MARGIN;

    // panel position (below icon, right-aligned)
    this.panelX = w - PANEL_WIDTH - ICON_MARGIN;
    this.panelY = ICON_MARGIN + ICON_SIZE + 6;

    // name input (HTML element)
    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.maxLength = 16;
    this.nameInput.placeholder = "Name...";
    this.nameInput.style.cssText = `
      position: absolute;
      font-size: 13px;
      font-family: Arial, sans-serif;
      padding: 3px 6px;
      border: 2px solid #272744;
      border-radius: 4px;
      outline: none;
      display: none;
      image-rendering: auto;
    `;
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.appendChild(this.nameInput);

    this.nameInput.addEventListener("input", () => {
      this.playerName = this.nameInput.value;
      this._emitChange();
    });

    // prevent game input while typing
    this.nameInput.addEventListener("keydown", (e) => e.stopPropagation());
    this.nameInput.addEventListener("keyup", (e) => e.stopPropagation());

    // mouse handling
    this._onClick = this._handleClick.bind(this);
    canvas.addEventListener("click", this._onClick);
  }

  _emitChange() {
    this.onChange(this.selectedSpriteSet, this.selectedColorIndex, this.playerName);
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const logicalW = this.canvas.logicalWidth || this.canvas.width;
    const logicalH = this.canvas.logicalHeight || this.canvas.height;
    const mx = (e.clientX - rect.left) * logicalW / rect.width;
    const my = (e.clientY - rect.top) * logicalH / rect.height;

    // gear icon click
    if (mx >= this.iconX && mx <= this.iconX + ICON_SIZE &&
        my >= this.iconY && my <= this.iconY + ICON_SIZE) {
      this.open = !this.open;
      this._updateInputVisibility();
      return;
    }

    if (!this.open) return;

    // check if click is inside panel
    const panelH = this._panelHeight();
    if (mx < this.panelX || mx > this.panelX + PANEL_WIDTH ||
        my < this.panelY || my > this.panelY + panelH) {
      // clicked outside panel — close it
      this.open = false;
      this._updateInputVisibility();
      return;
    }

    const localX = mx - this.panelX - PANEL_PADDING;
    const localY = my - this.panelY - PANEL_PADDING;

    // sprite set row (after "Skin:" label at ~16px)
    const spriteRowY = 18;
    if (localY >= spriteRowY && localY <= spriteRowY + ROW_HEIGHT) {
      const idx = Math.floor(localX / 40);
      if (idx >= 0 && idx < SPRITE_SETS.length) {
        this.selectedSpriteSet = SPRITE_SETS[idx].name;
        this._emitChange();
      }
      return;
    }

    // color row (after sprite row)
    const colorRowY = spriteRowY + ROW_HEIGHT + 22;
    if (localY >= colorRowY && localY <= colorRowY + ROW_HEIGHT) {
      const idx = Math.floor(localX / 28);
      if (idx >= 0 && idx < TINT_COLORS.length) {
        this.selectedColorIndex = idx;
        this._emitChange();
      }
      return;
    }
  }

  _panelHeight() {
    // label + sprite row + label + color row + label + name input + padding
    return PANEL_PADDING * 2 + 18 + ROW_HEIGHT + 22 + ROW_HEIGHT + 22 + 28;
  }

  _updateInputVisibility() {
    if (this.open) {
      const rect = this.canvas.getBoundingClientRect();
      const logicalW = this.canvas.logicalWidth || this.canvas.width;
      const logicalH = this.canvas.logicalHeight || this.canvas.height;
      const scaleX = rect.width / logicalW;
      const scaleY = rect.height / logicalH;

      // position the name input inside the panel
      const inputCanvasX = this.panelX + PANEL_PADDING;
      const inputCanvasY = this.panelY + PANEL_PADDING + 18 + ROW_HEIGHT + 22 + ROW_HEIGHT + 22;

      this.nameInput.style.display = "block";
      this.nameInput.style.left = `${rect.left - this.canvas.parentElement.getBoundingClientRect().left + inputCanvasX * scaleX}px`;
      this.nameInput.style.top = `${rect.top - this.canvas.parentElement.getBoundingClientRect().top + inputCanvasY * scaleY}px`;
      this.nameInput.style.width = `${(PANEL_WIDTH - PANEL_PADDING * 2 - 12) * scaleX}px`;
      this.nameInput.value = this.playerName;
    } else {
      this.nameInput.style.display = "none";
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    // draw gear icon
    this._drawGearIcon(ctx);

    if (!this.open) return;

    const panelH = this._panelHeight();

    // panel background
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = "#272744";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.panelX, this.panelY, PANEL_WIDTH, panelH, 6);
    ctx.fill();
    ctx.stroke();

    const px = this.panelX + PANEL_PADDING;
    let py = this.panelY + PANEL_PADDING;

    // --- Skin label ---
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#272744";
    ctx.textAlign = "left";
    ctx.fillText("Skin:", px, py + 12);
    py += 18;

    // sprite set previews
    for (let i = 0; i < SPRITE_SETS.length; i++) {
      const set = SPRITE_SETS[i];
      const setData = this.assets.spriteSets[set.name];
      const sx = px + i * 40;
      const selected = set.name === this.selectedSpriteSet;

      // selection highlight
      if (selected) {
        ctx.fillStyle = "rgba(100, 180, 255, 0.3)";
        ctx.fillRect(sx - 2, py - 2, 36, ROW_HEIGHT + 4);
      }

      // draw idle frame preview
      if (setData && setData.idle) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(setData.idle, 0, 0, set.spriteWidth, set.spriteHeight, sx + 2, py + 2, 32, 32);
      }

      // label below
      ctx.font = "9px Arial";
      ctx.fillStyle = "#272744";
      ctx.textAlign = "center";
    }
    py += ROW_HEIGHT;

    // --- Color label ---
    py += 4;
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#272744";
    ctx.textAlign = "left";
    ctx.fillText("Tint:", px, py + 12);
    py += 18;

    // color swatches
    for (let i = 0; i < TINT_COLORS.length; i++) {
      const cx = px + i * 28 + 10;
      const cy = py + ROW_HEIGHT / 2;
      const selected = i === this.selectedColorIndex;

      ctx.beginPath();
      ctx.arc(cx, cy, selected ? 11 : 9, 0, Math.PI * 2);

      if (TINT_COLORS[i]) {
        // parse the rgba to get a solid fill
        ctx.fillStyle = TINT_COLORS[i].replace(/[\d.]+\)$/, "1)");
      } else {
        ctx.fillStyle = "#f5f5f5";
      }
      ctx.fill();
      ctx.strokeStyle = selected ? "#272744" : "#999";
      ctx.lineWidth = selected ? 2.5 : 1;
      ctx.stroke();
    }
    py += ROW_HEIGHT;

    // --- Name label ---
    py += 4;
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#272744";
    ctx.textAlign = "left";
    ctx.fillText("Name:", px, py + 12);

    ctx.restore();
  }

  _drawGearIcon(ctx) {
    const cx = this.iconX + ICON_SIZE / 2;
    const cy = this.iconY + ICON_SIZE / 2;
    const r = ICON_SIZE / 2;

    ctx.save();
    ctx.fillStyle = this.open ? "rgba(100, 180, 255, 0.8)" : "rgba(255, 255, 255, 0.7)";
    ctx.strokeStyle = "#272744";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // draw a simple gear shape
    ctx.fillStyle = "#272744";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2699", cx, cy + 1);
    ctx.restore();
  }

  destroy() {
    this.canvas.removeEventListener("click", this._onClick);
    this.nameInput.remove();
  }
}
