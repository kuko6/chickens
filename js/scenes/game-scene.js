import { Chicken } from "../entities/chicken.js";
import { RemoteChicken } from "../entities/remote-chicken.js";

export class GameScene {
  /**
   * @param {{ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,assets: Object, input: import('../engine/input.js').InputManager, network: import('../engine/network.js').NetworkManager}} context
   */
  constructor(context) {
    this.ctx = context.ctx;
    this.canvas = context.canvas;
    this.assets = context.assets;
    this.input = context.input;
    this.network = context.network;
    this.chicken = null;
    /** @type {Map<string, RemoteChicken>} */
    this.remoteChickens = new Map();
  }

  enter() {
    this.chicken = new Chicken(this.input, this.assets, {
      width: this.canvas.width,
      height: this.canvas.height,
    });

    this.network.onId = (colorIndex) => {
      this.chicken.setColorIndex(colorIndex);
    };

    this.network.onJoin = (id, colorIndex) => {
      const remote = new RemoteChicken(this.assets, colorIndex);
      remote.minY = this.chicken.minY;
      remote.maxY = this.chicken.maxY;
      this.remoteChickens.set(id, remote);
    };

    this.network.onLeave = (id) => {
      this.remoteChickens.delete(id);
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

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // fill ground area below horizon
    const horizonY = this.chicken.minY + 30;
    ctx.fillStyle = "#c8e6a0";
    ctx.fillRect(0, horizonY, this.canvas.width, this.canvas.height - horizonY);

    // draw horizon line
    ctx.strokeStyle = "#272744";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(this.canvas.width, horizonY);
    ctx.stroke();

    // draw remote chickens
    for (const remote of this.remoteChickens.values()) {
      remote.render(ctx);
    }

    // draw local chicken on top
    this.chicken.render(ctx);
  }

  exit() {
    this.chicken = null;
    this.remoteChickens.clear();
  }
}
