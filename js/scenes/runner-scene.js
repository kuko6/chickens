import { Chicken } from "../entities/chicken.js";
import { Obstacle } from "../entities/obstacle.js";
import { InputFilter } from "../engine/input-filter.js";
import { NetworkSync } from "../engine/network-sync.js";
import { LobbyScene } from "./lobby-scene.js";

const BASE_SPEED = 3;
const ACCEL = 0.002; // speed increase per tick
const MAX_SPEED = 20;
const MIN_GAP = 50;          // closest two obstacles can be (pixels)
const MAX_GAP = 500;         // largest gap between spawn slots
const SAFE_FRAMES = 55;      // conservative airborne frames during jump+glide
const HITBOX_SPAN = 108;     // obstacle width (48) + chicken width (60)
const DESPAWN_BEHIND = 300;  // pixels behind camera to remove

export class RunnerScene {
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
    this.networkSync = null;
    this.cameraX = 0;

    // will be set by lobby before enter()
    this.chickenState = null;
    this.roundSeed = 0;
  }

  enter() {
    // create chicken with filtered input (only vertical + jump + cluck)
    const filteredInput = new InputFilter(this.input, ["up", "down", "jump", "cluck"]);
    this.chicken = new Chicken(filteredInput, this.assets, {
      width: this.canvasW,
      height: this.canvasH,
    });

    // apply appearance from lobby
    if (this.chickenState) {
      this.chicken.setSpriteSet(this.chickenState.spriteSetName);
      if (this.chickenState.colorIndex != null) {
        this.chicken.setColorIndex(this.chickenState.colorIndex);
      }
      this.chicken.name = this.chickenState.name || "";
    }

    // spread chickens evenly from the center of the y axis
    const totalPlayers = 1 + this.network.remotePlayers.size;
    const midY = (this.chicken.minY + this.chicken.maxY) / 2;
    if (totalPlayers === 1) {
      this.chicken.y = midY;
    } else {
      const ids = [this.network.id, ...this.network.remotePlayers.keys()];
      ids.sort((a, b) => Number(a) - Number(b));
      const slot = ids.indexOf(this.network.id);
      const maxRange = this.chicken.maxY - this.chicken.minY;
      const gap = Math.min(60, maxRange / (totalPlayers - 1));
      const totalSpan = (totalPlayers - 1) * gap;
      this.chicken.y = midY - totalSpan / 2 + slot * gap;
    }

    // enable auto-run animation
    this.chicken.autoRun = true;

    // network sync
    this.networkSync = new NetworkSync(this.network, this.assets);
    this.networkSync.init(this.chicken);

    // ground tile config
    this.tileSize = 16;
    this.tileScale = 3;
    this.drawSize = this.tileSize * this.tileScale;
    this.groundRows = (this.canvasH - this.horizonY) / this.drawSize;

    const { groundTileset, groundEdgeTileset } = this.assets.environment;
    this.edgeTileCount = groundEdgeTileset.width / this.tileSize;
    this.groundTileCount = groundTileset.width / this.tileSize;

    // start spawning well ahead of the chicken so nothing appears on screen immediately
    this.nextSpawnX = this.chicken.x + this.canvasW;
    this.nextSpawnIndex = 0;
    this.consecutiveSpawned = 0;

    this.elapsed = 0;
    this.scrollSpeed = BASE_SPEED;
    this.obstacles = [];
    this.gameOver = false;
    this.distance = 0;

    this.onKeyDown = (e) => {
      if (e.code === "Enter" && this.gameOver) {
        this.returnToLobby();
      }
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  returnToLobby() {
    const lobby = new LobbyScene(this.context);
    lobby.chickenState = {
      spriteSetName: this.chicken.spriteSetName,
      colorIndex: this.chicken.colorIndex,
      tint: this.chicken.tint,
      name: this.chicken.name,
    };
    this.switchScene(lobby);
  }

  /** @param {number} dt */
  update(dt) {
    this.cloudLayer.update();

    if (this.gameOver) {
      // spectate: keep receiving remote state, follow an alive player
      this.networkSync.receive();
      const alive = this.getAliveRemotes();
      if (alive.length > 0) {
        const target = alive[0];
        this.cameraX = target.x + target.width / 2 - this.canvasW / 2;
        // keep spawning/despawning around spectated player
        this.spawnObstacles();
        this.obstacles = this.obstacles.filter(
          (o) => o.x + o.width > this.cameraX - DESPAWN_BEHIND,
        );
      }
      return;
    }

    this.elapsed++;
    this.scrollSpeed = Math.min(BASE_SPEED + this.elapsed * ACCEL, MAX_SPEED);
    // console.log(this.scrollSpeed)

    // auto-scroll: move chicken right
    this.chicken.x += this.scrollSpeed;
    this.chicken.gameSpeed = this.scrollSpeed;

    // score
    this.distance = Math.floor(this.chicken.x / 10);

    this.chicken.update(dt);
    this.networkSync.update(this.chicken);

    // snap alive remote chickens to local x
    for (const remote of this.getAliveRemotes()) {
      remote.x = this.chicken.x;
    }

    // position chicken at 25% from left
    this.cameraX = this.chicken.x + this.chicken.width / 2 - this.canvasW * 0.25;

    // spawn obstacles ahead of camera
    this.spawnObstacles();

    // despawn obstacles behind camera
    this.obstacles = this.obstacles.filter(
      (o) => o.x + o.width > this.cameraX - DESPAWN_BEHIND,
    );

    // collision check
    for (const obstacle of this.obstacles) {
      if (obstacle.collides(this.chicken)) {
        this.gameOver = true;
        this.network.sendDead();
        return;
      }
    }
  }

  getAliveRemotes() {
    return this.networkSync.getRemoteChickens().filter((r) => !r.dead);
  }

  spawnObstacles() {
    const spawnEdge = this.cameraX + this.canvasW + 200;
    const obstacleSprites = this.assets.environment.obstacles;
    const horizonY = this.horizonY;

    while (this.nextSpawnX < spawnEdge) {
      const idx = this.nextSpawnIndex;
      const hash = this.rng.hash(idx, 42, this.roundSeed);

      // variable gap to next slot — creates organic spacing
      const gapHash = this.rng.hash(idx, 77, this.roundSeed);
      const gap = MIN_GAP + (gapHash % (MAX_GAP - MIN_GAP));

      // max consecutive scales with speed: more clusters allowed as game speeds up
      // speed is derived from world position so it's deterministic across clients
      const approxSpeed = Math.min(
        Math.sqrt(BASE_SPEED * BASE_SPEED + 2 * ACCEL * this.nextSpawnX),
        MAX_SPEED,
      );
      const maxConsecutive = Math.max(2, Math.min(6,
        Math.floor((SAFE_FRAMES * approxSpeed - HITBOX_SPAN) / MIN_GAP),
      ));

      // ~30% chance to skip a slot for breathing room
      const shouldSpawn = hash % 10 < 7;

      if (shouldSpawn && this.consecutiveSpawned < maxConsecutive) {
        const spriteIdx = hash % obstacleSprites.length;
        const tileset = obstacleSprites[spriteIdx];
        const worldX = this.nextSpawnX;

        // pick a random middle tile (1 or 2) for a given row index
        const midTile = (r) => 1 + (this.rng.hash(idx, r, this.roundSeed) % 2);

        // variant selection: 0=full, 1=tall-top, 2=tall-bottom, 3=hole
        const variantHash = this.rng.hash(idx, 55, this.roundSeed);
        const variant = variantHash % 3;
        let segments;

        switch (variant) {
          case 1: // tall (3 rows from top)
            segments = [{ startRow: 0, tiles: [0, midTile(0), 3] }];
            break;
          case 2: // tall (3 rows from row 1)
            segments = [{ startRow: 1, tiles: [0, midTile(0), 3] }];
            break;
          default: // full (4 rows)
            segments = [{ startRow: 0, tiles: [0, midTile(0), midTile(1), 3] }];
            break;
        }

        this.obstacles.push(
          new Obstacle(worldX, horizonY, tileset, this.tileScale, this.tileSize, segments),
        );
        this.consecutiveSpawned++;
      } else {
        this.consecutiveSpawned = 0;
      }

      this.nextSpawnX += gap;
      this.nextSpawnIndex++;
    }
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    this.cloudLayer.render(ctx, this.cameraX);

    this.renderGround(ctx);

    // render obstacles
    for (const obstacle of this.obstacles) {
      obstacle.render(ctx, this.cameraX);
    }

    // draw alive chickens sorted by y, offset by camera
    const alive = this.getAliveRemotes();
    const allChickens = this.gameOver ? alive : [this.chicken, ...alive];
    allChickens.sort((a, b) => a.y - b.y);
    for (const chicken of allChickens) {
      const origX = chicken.x;
      chicken.x = origX - this.cameraX;
      chicken.render(ctx);
      chicken.x = origX;
    }

    // HUD: distance
    ctx.save();
    ctx.font = "bold 16px DepartureMono";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    const scoreText = `${this.distance}`;
    const sw = ctx.measureText(scoreText).width;
    ctx.fillRect(this.canvasW - sw - 24, 12, sw + 16, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(scoreText, this.canvasW - 16, 30);
    ctx.restore();

    // game over — show as a banner so spectating is still visible
    if (this.gameOver) {
      const alive = this.getAliveRemotes();
      ctx.save();
      ctx.font = "bold 14px DepartureMono";
      ctx.textAlign = "center";
      const label = alive.length > 0
        ? `Game Over — ${this.distance} — Spectating...`
        : `Game Over — ${this.distance}`;
      const tw = ctx.measureText(label).width;
      const bx = (this.canvasW - tw) / 2 - 12;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(bx, 8, tw + 24, 32);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, this.canvasW / 2, 30);

      ctx.font = "10px DepartureMono";
      ctx.fillStyle = "#595e66";
      ctx.fillText("press Enter to return to the lobby", this.canvasW / 2, 52);
      ctx.restore();
    }
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
    this.chicken = null;
    if (this.networkSync) {
      this.networkSync.destroy();
      this.networkSync = null;
    }
  }
}
