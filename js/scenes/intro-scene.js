import { BaseScene } from "./base-scene.js";
import { IntroOverlay } from "../ui/intro-overlay.js";
import { LobbyScene } from "./lobby-scene.js";
import { SeededRandom } from "../engine/seeded-random.js";
import { CloudLayer } from "./cloud-layer.js";

export class IntroScene extends BaseScene {
  constructor(context) {
    super(context);
    this.overlay = null;
  }

  enter() {
    this.initGround();
    this.overlay = new IntroOverlay(this.canvas, (name, lobbyCode) => {
      this.joinLobby(name, lobbyCode);
    });
  }

  async joinLobby(name, lobbyCode) {
    const ctx = this.context;
    ctx.appearance.name = name;
    if (lobbyCode === "imro") ctx.appearance.spriteSetName = "imro";

    // update URL so NetworkManager.connect() reads the correct lobby ID
    history.pushState(null, "", "/" + lobbyCode);

    ctx.network.connect();
    await ctx.network.ready;

    // reseed rng with the server's map seed
    const mapSeed = ctx.network.mapSeed ?? Math.floor(Math.random() * 0x7fffffff);
    ctx.rng = new SeededRandom(mapSeed);
    ctx.cloudLayer = new CloudLayer(this.canvasW, ctx.assets.environment.clouds, ctx.rng);

    this.switchScene(new LobbyScene(ctx));
  }

  update(_dt) {
    this.cloudLayer.update();
    this.cameraX = 0;
  }

  render() {
    this.renderBackground();
  }

  exit() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    super.exit();
  }
}
