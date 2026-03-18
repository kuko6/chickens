import { Chicken } from "../entities/chicken.js";
import { CustomizeOverlay } from "../ui/customize-overlay.js";
import { NetworkSync } from "../engine/network-sync.js";
import { RunnerScene } from "./runner-scene.js";

export class LobbyScene {
  /**
   * @param {{ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, viewport: { width: number, height: number }, assets: Object, input: import('../engine/input.js').InputManager, network: import('../engine/network.js').NetworkManager, switchScene: Function, cloudLayer: Object, rng: Object}} context
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
    this.switchScene = context.switchScene;
    this.cloudLayer = context.cloudLayer;
    this.rng = context.rng;
    this.horizonY = context.horizonY;
    this.context = context;
    this.chicken = null;
    this.overlay = null;
    this.networkSync = null;
    this.cameraX = 0;

    this.localReady = false;
    this.readyPlayers = new Set(); // ids of ready remote players

    // set by runner when returning to lobby after game over
    this.chickenState = null;

    this.onKeyDown = null;
  }

  enter() {
    this.chicken = new Chicken(this.input, this.assets, {
      width: this.canvasW,
      height: this.canvasH,
    });

    // random spawn
    const pad = 144; // 3 * shape of the chicken sprite
    this.chicken.x = pad + Math.random() * (this.canvasW - this.chicken.width - pad * 2);
    this.chicken.y = this.chicken.minY + Math.random() * (this.chicken.maxY - this.chicken.minY);
    this.chicken.facingRight = Math.random() < 0.5;

    // restore appearance from previous round (color is server-assigned on first join)
    if (this.chickenState) {
      this.chicken.setSpriteSet(this.chickenState.spriteSetName);
      if (this.chickenState.colorIndex != null) {
        this.chicken.setColorIndex(this.chickenState.colorIndex);
      }
      this.chicken.name = this.chickenState.name || "";
    }

    // customization overlay
    this.overlay = new CustomizeOverlay(
      this.canvas,
      this.assets,
      (spriteSet, colorIndex, name) => {
        this.chicken.setSpriteSet(spriteSet);
        this.chicken.setColorIndex(colorIndex);
        this.chicken.name = name;
        this.network.sendCustomize(spriteSet, colorIndex, name);
      },
    );
    this.overlay.selectedSpriteSet = this.chicken.spriteSetName;
    this.overlay.selectedColorIndex = this.chicken.colorIndex ?? 0;
    if (this.chicken.name) {
      this.overlay.playerName = this.chicken.name;
      this.overlay.nameInput.value = this.chicken.name;
    }

    // network sync
    this.networkSync = new NetworkSync(this.network, this.assets);
    this.networkSync.init(this.chicken, this.overlay);

    // sync initial appearance to server so other clients see it
    this.network.sendCustomize(this.chicken.spriteSetName, this.chicken.colorIndex ?? 0, this.chicken.name);

    // ready system
    this.localReady = false;
    this.readyPlayers.clear();

    this.network.onReady = (id, ready) => {
      // ignore our own ready echo — tracked by localReady
      if (id === this.network.id) return;
      if (ready) {
        this.readyPlayers.add(id);
      } else {
        this.readyPlayers.delete(id);
      }
    };

    this.network.onStart = (roundSeed) => {
      this.startRunner(roundSeed);
    };

    // reset ready states when someone joins/leaves
    const origOnJoin = this.network.onJoin;
    this.network.onJoin = (id, colorIndex, spriteSet, name) => {
      origOnJoin?.(id, colorIndex, spriteSet, name);
      // new player joined — reset ready states
      this.localReady = false;
      this.readyPlayers.clear();
    };

    const origOnLeave = this.network.onLeave;
    this.network.onLeave = (id) => {
      origOnLeave?.(id);
      this.readyPlayers.delete(id);
      this.localReady = false;
    };

    // ground tile config
    this.tileSize = 16;
    this.tileScale = 3;
    this.drawSize = this.tileSize * this.tileScale;
    this.groundRows = (this.canvasH - this.horizonY) / this.drawSize;

    const { groundTileset, groundEdgeTileset } = this.assets.environment;
    this.edgeTileCount = groundEdgeTileset.width / this.tileSize;
    this.groundTileCount = groundTileset.width / this.tileSize;

    // listen for Enter to toggle ready / start in single player
    this.onKeyDown = (e) => {
      if (e.code === "Enter") {
        if (this.network.connected) {
          this.network.sendReady();
          this.localReady = !this.localReady;
        } else {
          // offline single-player: generate a random seed locally
          const roundSeed = Math.floor(Math.random() * 0x7fffffff);
          this.startRunner(roundSeed);
        }
      }
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  startRunner(roundSeed) {
    const runner = new RunnerScene(this.context);
    runner.chickenState = {
      spriteSetName: this.chicken.spriteSetName,
      colorIndex: this.chicken.colorIndex,
      tint: this.chicken.tint,
      name: this.chicken.name,
    };
    runner.roundSeed = roundSeed;
    this.switchScene(runner);
  }

  /** @param {number} dt */
  update(dt) {
    this.cloudLayer.update();
    this.chicken.update(dt);
    this.networkSync.update(this.chicken);

    // clamp chicken to lobby area
    const maxX = this.canvasW - this.chicken.width;
    if (this.chicken.x < 0) this.chicken.x = 0;
    if (this.chicken.x > maxX) this.chicken.x = maxX;

    // keep camera fixed in lobby
    this.cameraX = 0;
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    this.cloudLayer.render(ctx, this.cameraX);

    this.renderGround(ctx);

    // draw all chickens sorted by y
    const allChickens = [this.chicken, ...this.networkSync.getRemoteChickens()];
    allChickens.sort((a, b) => a.y - b.y);
    for (const chicken of allChickens) {
      const origX = chicken.x;
      chicken.x = origX - this.cameraX;
      chicken.render(ctx);
      chicken.x = origX;
    }

    // draw ready hint at the bottom
    ctx.save();
    const remoteCount = this.networkSync.getRemoteChickens().length;
    const totalPlayers = 1 + remoteCount;
    const readyCount = this.readyPlayers.size + (this.localReady ? 1 : 0);

    const hintText = this.localReady
      ? `ready ${readyCount}/${totalPlayers}`
      : "press ENTER to ready up";
    ctx.font = "10px DepartureMono";
    ctx.textAlign = "center";
    ctx.fillStyle = this.localReady
      ? "rgba(80, 200, 80, 1)"
      : "#595e66";
    ctx.fillText(hintText, this.canvasW / 2, 16);
    ctx.restore();
  }

  renderGround(ctx) {
    const horizonY = this.horizonY;
    const { tileSize, drawSize, groundRows } = this;
    const { groundTileset, groundEdgeTileset } = this.assets.environment;

    const startCol = Math.floor(this.cameraX / drawSize);
    const visibleCols = Math.ceil(this.canvasW / drawSize) + 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < groundRows; row++) {
      const isEdge = row === 0;
      const tileset = isEdge ? groundEdgeTileset : groundTileset;
      const tileCount = isEdge ? this.edgeTileCount : this.groundTileCount;
      for (let i = 0; i < visibleCols; i++) {
        const worldCol = startCol + i;
        const hash = this.rng.hash(worldCol, row);
        const tileIdx = hash % tileCount;
        const screenX = worldCol * drawSize - this.cameraX;
        ctx.drawImage(
          tileset,
          tileIdx * tileSize,
          0,
          tileSize,
          tileSize,
          Math.round(screenX),
          horizonY + row * drawSize,
          drawSize,
          drawSize,
        );
      }
    }
    ctx.restore();
  }

  exit() {
    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown);
      this.onKeyDown = null;
    }
    this.network.onReady = null;
    this.network.onStart = null;
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
