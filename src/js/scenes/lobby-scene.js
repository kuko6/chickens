import { Chicken } from "../entities/chicken.js";
import { CustomizeOverlay } from "../ui/customize-overlay.js";
import { RunnerScene } from "./runner-scene.js";
import { BaseScene } from "./base-scene.js";

export class LobbyScene extends BaseScene {
  constructor(context) {
    super(context);
    this.overlay = null;
    this.localReady = false;
    this.readyPlayers = new Set();
  }

  /** Set up lobby: chicken, overlay, network handlers, and ready system. */
  enter() {
    this.lobbyId = window.location.pathname.slice(1);
    this.buildBackButton();
    this.chicken = new Chicken(this.input, this.assets, {
      width: this.canvasW,
      height: this.canvasH,
    });

    // random spawn
    const pad = 144;
    this.chicken.x = pad + Math.random() * (this.canvasW - this.chicken.width - pad * 2);
    this.chicken.y = this.chicken.minY + Math.random() * (this.chicken.maxY - this.chicken.minY);
    this.chicken.facingRight = Math.random() < 0.5;

    // apply appearance from shared state
    const appearance = this.context.appearance;
    this.chicken.applyAppearance(appearance);

    // customization overlay
    this.overlay = new CustomizeOverlay(
      this.canvas,
      this.assets,
      appearance,
      this.lobbyId,
      () => {
        this.chicken.applyAppearance(appearance);
        this.network.sendCustomize(appearance.spriteSetName, appearance.colorIndex, appearance.name);
      },
    );

    // attach local chicken to network sync
    this.networkSync.attach(this.chicken, appearance);

    // refresh overlay button highlights when server assigns a color
    this.origOnId = this.network.onId;
    this.network.onId = (colorIndex) => {
      this.origOnId?.(colorIndex);
      this.overlay.syncStyleSelection();
    };

    // sync initial appearance to server so other clients see it
    this.network.sendCustomize(appearance.spriteSetName, appearance.colorIndex, appearance.name);

    // ready system
    this.localReady = false;
    this.readyPlayers.clear();

    this.network.onReady = (id, ready) => {
      if (id === this.network.id) return;
      if (ready) {
        this.readyPlayers.add(id);
      } else {
        this.readyPlayers.delete(id);
      }
    };

    this.network.onStart = (roundSeed) => {
      this.startRunnerScene(roundSeed);
    };

    this.origOnJoin = this.network.onJoin;
    this.network.onJoin = (id, colorIndex, spriteSet, name) => {
      this.origOnJoin?.(id, colorIndex, spriteSet, name);
      this.localReady = false;
      this.readyPlayers.clear();
    };

    this.origOnLeave = this.network.onLeave;
    this.network.onLeave = (id) => {
      this.origOnLeave?.(id);
      this.readyPlayers.delete(id);
      this.localReady = false;
    };

    this.initGround();
    this.initChat();

    // listen for Enter to toggle ready / start in single player
    this.onKeyDown = (e) => {
      if (e.code === "Enter") {
        if (this.network.connected) {
          this.network.sendReady();
          this.localReady = !this.localReady;
        } else {
          const roundSeed = Math.floor(Math.random() * 0x7fffffff);
          this.startRunnerScene(roundSeed);
        }
      }
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  /** @param {number} roundSeed */
  startRunnerScene(roundSeed) {
    const runner = new RunnerScene(this.context);
    runner.roundSeed = roundSeed;
    this.switchScene(runner);
  }

  /**
   * Update clouds, chickens and sync them across network.
   * @param {number} dt
  */
  update(dt) {
    this.cloudLayer.update();
    this.chicken.update(dt);
    this.networkSync.update(this.chicken, dt);
    this.updateChat([this.chicken, ...this.networkSync.getRemoteChickens()], dt);

    // clamp chicken to lobby area
    const maxX = this.canvasW - this.chicken.width;
    if (this.chicken.x < 0) this.chicken.x = 0;
    if (this.chicken.x > maxX) this.chicken.x = maxX;

    this.cameraX = 0;
  }

  render() {
    this.renderBackground();

    // draw all chickens sorted by y
    const allChickens = [this.chicken, ...this.networkSync.getRemoteChickens()];
    this.renderChickens(allChickens);

    // draw lobby code
    const ctx = this.ctx;
    ctx.save();
    ctx.font = "10px DepartureMono";
    ctx.textAlign = "left";
    ctx.fillStyle = "#595e66";
    ctx.fillText("lobby: " + this.lobbyId, 8, 28);
    ctx.restore();

    // draw ready hint
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

  buildBackButton() {
    const host = this.canvas.parentElement;
    if (!host) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    this.backButton = document.createElement("a");
    this.backButton.href = "/";
    this.backButton.textContent = "< back";
    this.backButton.style.cssText = `
      position: absolute;
      top: 6px;
      left: 8px;
      font-family: 'DepartureMono', monospace;
      font-size: 10px;
      color: #595e66;
      text-decoration: none;
      cursor: pointer;
      z-index: 5;
    `;
    host.appendChild(this.backButton);
  }

  exit() {
    this.network.onReady = null;
    this.network.onStart = null;
    this.network.onId = this.origOnId;
    this.network.onJoin = this.origOnJoin;
    this.network.onLeave = this.origOnLeave;
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    if (this.backButton) {
      this.backButton.remove();
      this.backButton = null;
    }
    super.exit();
  }
}
