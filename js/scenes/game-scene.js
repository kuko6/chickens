import { Chicken } from "../entities/chicken.js";
import { CustomizeOverlay } from "../ui/customize-overlay.js";
import { NetworkSync } from "../engine/network-sync.js";
import { SPRITE_SETS } from "../engine/assets.js";

export class GameScene {
  /**
   * @param {{ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, viewport: { width: number, height: number }, assets: Object, input: import('../engine/input.js').InputManager, network: import('../engine/network.js').NetworkManager}} context
   */
  constructor(context) {
    this.ctx = context.ctx;
    this.canvas = context.canvas;
    this.viewport = context.viewport;
    this.canvasW = this.viewport.width;
    this.canvasH = this.viewport.height;
    this.assets = context.assets;
    this.input = context.input;
    this.network = context.network;
    this.chicken = null;
    this.overlay = null;
    this.networkSync = null;
  }

  enter() {
    this.chicken = new Chicken(this.input, this.assets, {
      width: this.canvasW,
      height: this.canvasH,
    });

    // random initial appearance
    const randomSet = SPRITE_SETS[Math.floor(Math.random() * SPRITE_SETS.length)].name;
    this.chicken.setSpriteSet(randomSet);

    // customization overlay
    this.overlay = new CustomizeOverlay(this.canvas, this.assets, (spriteSet, colorIndex, name) => {
      this.chicken.setSpriteSet(spriteSet);
      this.chicken.setColorIndex(colorIndex);
      this.chicken.name = name;
      this.network.sendCustomize(spriteSet, colorIndex, name);
    });
    this.overlay.selectedSpriteSet = randomSet;

    // network sync
    this.networkSync = new NetworkSync(this.network, this.assets);
    this.networkSync.init(this.chicken, this.overlay);
  }

  /** @param {number} dt */
  update(dt) {
    this.chicken.update(dt);
    this.networkSync.update(this.chicken);
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // fill ground area below horizon
    const horizonY = this.chicken.minY + 30;
    ctx.fillStyle = "#c8e6a0";
    ctx.fillRect(0, horizonY, this.canvasW, this.canvasH - horizonY);

    // draw horizon line
    ctx.strokeStyle = "#272744";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(this.canvasW, horizonY);
    ctx.stroke();

    // draw all chickens sorted by y so lower ones appear in front
    const allChickens = [this.chicken, ...this.networkSync.getRemoteChickens()];
    allChickens.sort((a, b) => a.y - b.y);
    for (const chicken of allChickens) {
      chicken.render(ctx);
    }
  }

  exit() {
    this.chicken = null;
    if (this.networkSync) {
      this.networkSync.destroy();
      this.networkSync = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }
}
