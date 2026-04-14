import { TINT_COLORS, drawTintedSprite } from "./tints.js";

export class BaseChicken {
  /** @param {Object} assets */
  constructor(assets) {
    this.assets = assets;

    this.x = 400;
    this.y = 320;
    this.airY = 0;

    this.spriteSetName = "default";
    this.spriteWidth = 20;
    this.spriteHeight = 20;
    this.width = this.spriteWidth * 3;
    this.height = this.spriteHeight * 3;

    this.facingRight = true;
    this.isMoving = false;
    this.isJumping = false;
    this.isGliding = false;
    this.isClucking = false;

    this.currentFrame = 0;
    this.cluckFrame = 0;

    this.tint = null;
    this.opacity = 1;
    this.name = "";

    /** @type {{text: string, age: number, maxAge: number}[]} */
    this.chatMessages = [];

    // depth bounds for parallax scaling
    this.minY = 210;
    this.maxY = 346;
  }

  /** @param {string} name */
  setSpriteSet(name) {
    const set = this.assets.spriteSets[name];
    if (!set) return;
    this.spriteSetName = name;
    this.spriteWidth = set.spriteWidth;
    this.spriteHeight = set.spriteHeight;
    this.width = this.spriteWidth * 3;
    this.height = this.spriteHeight * 3;
  }

  /** @param {number} colorIndex */
  setColorIndex(colorIndex) {
    this.colorIndex = colorIndex;
    this.tint = TINT_COLORS[colorIndex % TINT_COLORS.length];
  }

  /** @param {string} text */
  addChatMessage(text) {
    this.chatMessages.push({ text, age: 0, maxAge: 4500 });
    if (this.chatMessages.length > 5) this.chatMessages.shift();
  }

  /** @param {number} dt - elapsed time in seconds */
  updateChat(dt) {
    const ms = dt * 1000;
    for (const msg of this.chatMessages) msg.age += ms;
    this.chatMessages = this.chatMessages.filter((msg) => msg.age < msg.maxAge);
  }

  /** @param {{spriteSetName: string, colorIndex: number, name: string}} appearance */
  applyAppearance(appearance) {
    this.setSpriteSet(appearance.spriteSetName);
    this.setColorIndex(appearance.colorIndex);
    this.name = appearance.name;
  }

  /**
   * Draw the chicken sprite with optional color tint, cluck bubble, and name tag.
   * Selects the correct animation frame based on current state (idle/run/jump/glide).
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const set = this.assets.spriteSets[this.spriteSetName];

    let state;
    if (this.isGliding) state = "glide";
    else if (this.isJumping) state = "jump";
    else if (this.isMoving) state = "run";
    else state = "idle";

    const anim = set.animations[state];
    const frameX = (this.currentFrame % anim.frames) * this.spriteWidth;
    const frameY = anim.row * this.spriteHeight;

    const drawWidth = this.width;
    const drawHeight = this.height;
    const drawY = this.y + this.airY;

    drawTintedSprite(ctx, set.spriteSheet, frameX, frameY, this.spriteWidth, this.spriteHeight, this.x, drawY, drawWidth, drawHeight, this.facingRight, this.tint, this.opacity);

    // cluck bubble — decorative only, excluded from collision
    if (this.isClucking) {
      const cluckAnim = set.animations.cluck;
      if (cluckAnim) {
        const cluckFrameX = (this.cluckFrame % cluckAnim.frames) * this.spriteWidth;
        const cluckFrameY = cluckAnim.row * this.spriteHeight;
        const cluckingDraw = this.width;
        const cluckingX = this.facingRight
          ? this.x + drawWidth
          : this.x - cluckingDraw;

        drawTintedSprite(ctx, set.spriteSheet, cluckFrameX, cluckFrameY, this.spriteWidth, this.spriteHeight, cluckingX, drawY, cluckingDraw, cluckingDraw, this.facingRight, null, this.opacity);
      }
    }

    // draw name above chicken (hidden for now)
    // NOTE: decide what to do with this
    if (false && this.name) {
      ctx.save();
      ctx.font = "bold 11px DepartureMono";
      ctx.textAlign = "center";

      const nameX = this.x + drawWidth / 2;
      const nameY = drawY - 2;
      const textWidth = ctx.measureText(this.name).width;
      const padding = 3;

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(
        nameX - textWidth / 2 - padding,
        nameY - 10 - padding,
        textWidth + padding * 2,
        12 + padding * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillText(this.name, nameX, nameY);
      ctx.restore();
    }

    // draw chat bubbles stacked above name/chicken
    if (this.chatMessages.length > 0) {
      // this.#renderChatBubbles(ctx, this.x + drawWidth / 2, drawY);
      this.#renderChatBubbles(ctx, this.facingRight ? this.x + drawWidth : this.x, drawY);
    }
  }

  /**
   * Draw stacked speech bubbles above the chicken.
   * Newest message at bottom, older ones stack upward.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX
   * @param {number} chickenTopY
   */
  #renderChatBubbles(ctx, centerX, chickenTopY) {
    const PADDING_X = 7;
    const PADDING_Y = 5;
    const BUBBLE_GAP = 2;
    const TAIL_H = 6;
    const FONT = "10px DepartureMono";
    const RADIUS = 5;
    const FADE_MS = 600;
    const POPIN_MS = 150;

    ctx.save();
    ctx.font = FONT;

    // measure all bubbles first (newest = index 0 in reversed order)
    const bubbles = [...this.chatMessages].reverse().map((msg) => {
      const textW = ctx.measureText(msg.text).width;
      const bw = textW + PADDING_X * 2;
      const bh = 10 + PADDING_Y * 2; // line height ~10px
      const popT = Math.min(msg.age / POPIN_MS, 1);
      const scale = 0.5 + 0.5 * popT;
      const fadeStart = msg.maxAge - FADE_MS;
      const alpha = msg.age > fadeStart
        ? 1 - (msg.age - fadeStart) / FADE_MS
        : 1;
      return { msg, bw, bh, scale, alpha };
    });

    // layout: stack from a base y upward
    // compute total height to position stack
    // start from bottom: newest bubble + tail, then older ones above
    const baseY = chickenTopY - 4;
    const positions = [];
    let curY = baseY; // bottom of current slot (including tail for first)
    for (let i = 0; i < bubbles.length; i++) {
      const { bh } = bubbles[i];
      const hasTail = i === 0;
      const totalH = bh + (hasTail ? TAIL_H : 0);
      const top = curY - totalH;
      positions.push({ top, hasTail });
      curY = top - BUBBLE_GAP;
    }

    for (let i = 0; i < bubbles.length; i++) {
      const { bw, bh, scale, alpha } = bubbles[i];
      const { top, hasTail } = positions[i];
      const bubbleMidX = centerX;
      const bubbleMidY = top + bh / 2;

      ctx.save();
      ctx.globalAlpha = alpha * this.opacity;
      ctx.translate(bubbleMidX, bubbleMidY);
      ctx.scale(scale, scale);
      ctx.translate(-bubbleMidX, -bubbleMidY);

      const left = centerX - bw / 2;
      const right = centerX + bw / 2;
      const bottom = top + bh;

      // bubble body
      ctx.beginPath();
      ctx.moveTo(left + RADIUS, top);
      ctx.lineTo(right - RADIUS, top);
      ctx.arcTo(right, top, right, top + RADIUS, RADIUS);
      ctx.lineTo(right, bottom - RADIUS);
      ctx.arcTo(right, bottom, right - RADIUS, bottom, RADIUS);
      ctx.lineTo(left + RADIUS, bottom);
      ctx.arcTo(left, bottom, left, bottom - RADIUS, RADIUS);
      ctx.lineTo(left, top + RADIUS);
      ctx.arcTo(left, top, left + RADIUS, top, RADIUS);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.fill();

      // tail triangle on lowest bubble
      if (hasTail) {
        ctx.beginPath();
        ctx.moveTo(centerX - 5, bottom);
        ctx.lineTo(centerX + 5, bottom);
        ctx.lineTo(centerX, bottom + TAIL_H);
        ctx.closePath();
        ctx.fill();
      }

      // text
      ctx.fillStyle = "#272744";
      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bubbles[i].msg.text, centerX, bubbleMidY);

      ctx.restore();
    }

    ctx.restore();
  }
}
