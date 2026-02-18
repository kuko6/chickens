import { Chicken } from "../entities/chicken.js";

export class GameScene {
  /**
   * @param {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, assets: Object, input: import('../engine/input.js').InputManager}} context
   */
  constructor(context) {
    this.ctx = context.ctx;
    this.canvas = context.canvas;
    this.assets = context.assets;
    this.input = context.input;
    this.chicken = null;
  }

  enter() {
    this.chicken = new Chicken(this.input, this.assets, {
      width: this.canvas.width,
      height: this.canvas.height,
    });
  }

  /** @param {number} dt */
  update(dt) {
    this.chicken.update(dt);
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw ground line
    const groundLineY = this.chicken.groundY + this.chicken.height;
    ctx.strokeStyle = "#228B22";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundLineY);
    ctx.lineTo(this.canvas.width, groundLineY);
    ctx.stroke();

    // Draw chicken
    this.chicken.render(ctx);
  }

  exit() {
    this.chicken = null;
  }
}
