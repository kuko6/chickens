import { Chicken } from "../entities/chicken.js";
import { RemoteChicken } from "../entities/remote-chicken.js";
import { CustomizeOverlay } from "../ui/customize-overlay.js";
import { SPRITE_SETS } from "../engine/assets.js";

export class GameScene {
  /**
   * @param {{ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,assets: Object, input: import('../engine/input.js').InputManager, network: import('../engine/network.js').NetworkManager}} context
   */
  constructor(context) {
    this.ctx = context.ctx;
    this.canvas = context.canvas;
    this.canvasW = context.canvas.logicalWidth || context.canvas.width;
    this.canvasH = context.canvas.logicalHeight || context.canvas.height;
    this.assets = context.assets;
    this.input = context.input;
    this.network = context.network;
    this.chicken = null;
    this.overlay = null;
    /** @type {Map<string, RemoteChicken>} */
    this.remoteChickens = new Map();
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

    this.network.onId = (colorIndex) => {
      this.chicken.setColorIndex(colorIndex);
      this.overlay.selectedColorIndex = colorIndex;
      // send initial appearance to others
      this.network.sendCustomize(this.chicken.spriteSetName, colorIndex, this.chicken.name);
    };

    this.network.onJoin = (id, colorIndex, spriteSet, name) => {
      const remote = new RemoteChicken(this.assets, colorIndex, spriteSet, name);
      remote.minY = this.chicken.minY;
      remote.maxY = this.chicken.maxY;
      this.remoteChickens.set(id, remote);
    };

    this.network.onLeave = (id) => {
      this.remoteChickens.delete(id);
    };

    this.network.onCustomize = (id, spriteSet, colorIndex, name) => {
      const remote = this.remoteChickens.get(id);
      if (!remote) return;
      if (spriteSet !== undefined) remote.setSpriteSet(spriteSet);
      if (colorIndex !== undefined) remote.setColorIndex(colorIndex);
      if (name !== undefined) remote.name = name;
    };
  }

  /** @param {number} dt */
  update(dt) {
    this.chicken.update(dt);
    this.network.sendState(this.chicken);

    // apply latest network state to remote chickens
    for (const [id, remote] of this.remoteChickens) {
      const state = this.network.remotePlayers.get(id);
      if (state) remote.applyState(state);
    }
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
    const allChickens = [this.chicken, ...this.remoteChickens.values()];
    allChickens.sort((a, b) => a.y - b.y);
    for (const chicken of allChickens) {
      chicken.render(ctx);
    }

    // draw overlay last (on top of everything)
    if (this.overlay) this.overlay.render(ctx);
  }

  exit() {
    this.chicken = null;
    this.remoteChickens.clear();
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }
}
