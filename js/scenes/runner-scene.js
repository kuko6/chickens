import { Chicken } from "../entities/chicken.js";
import { Obstacle } from "../entities/obstacle.js";
import { InputFilter } from "../engine/input-filter.js";
import { LobbyScene } from "./lobby-scene.js";
import { BaseScene } from "./base-scene.js";

const BASE_SPEED = 3;
const ACCEL = 0.002;
const MAX_SPEED = 20;
const MIN_GAP = 50;
const MAX_GAP = 500;
const SAFE_FRAMES = 55;
const HITBOX_SPAN = 108;
const DESPAWN_BEHIND = 300;

export class RunnerScene extends BaseScene {
  constructor(context) {
    super(context);
    this.roundSeed = 0;
  }

  enter() {
    // create chicken with filtered input (only vertical + jump + cluck)
    const filteredInput = new InputFilter(this.input, ["up", "down", "jump", "cluck"]);
    this.chicken = new Chicken(filteredInput, this.assets, {
      width: this.canvasW,
      height: this.canvasH,
    });

    // apply appearance from shared state
    this.chicken.applyAppearance(this.context.appearance);

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
    this.initNetworkSync(this.context.appearance);

    this.initGround();

    // start spawning well ahead of the chicken
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
    this.switchScene(new LobbyScene(this.context));
  }

  update(dt) {
    this.cloudLayer.update();

    if (this.gameOver) {
      this.networkSync.receive();
      const alive = this.getAliveRemotes();
      if (alive.length > 0) {
        const target = alive[0];
        this.cameraX = target.x + target.width / 2 - this.canvasW / 2;
        this.spawnObstacles();
        this.obstacles = this.obstacles.filter(
          (o) => o.x + o.width > this.cameraX - DESPAWN_BEHIND,
        );
      }
      return;
    }

    this.elapsed++;
    this.scrollSpeed = Math.min(BASE_SPEED + this.elapsed * ACCEL, MAX_SPEED);

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

      const gapHash = this.rng.hash(idx, 77, this.roundSeed);
      const gap = MIN_GAP + (gapHash % (MAX_GAP - MIN_GAP));

      const approxSpeed = Math.min(
        Math.sqrt(BASE_SPEED * BASE_SPEED + 2 * ACCEL * this.nextSpawnX),
        MAX_SPEED,
      );
      const maxConsecutive = Math.max(2, Math.min(6,
        Math.floor((SAFE_FRAMES * approxSpeed - HITBOX_SPAN) / MIN_GAP),
      ));

      const shouldSpawn = hash % 10 < 7;

      if (shouldSpawn && this.consecutiveSpawned < maxConsecutive) {
        const spriteIdx = hash % obstacleSprites.length;
        const tileset = obstacleSprites[spriteIdx];
        const worldX = this.nextSpawnX;

        const midTile = (r) => 1 + (this.rng.hash(idx, r, this.roundSeed) % 2);

        const variantHash = this.rng.hash(idx, 55, this.roundSeed);
        const variant = variantHash % 3;
        let segments;

        switch (variant) {
          case 1:
            segments = [{ startRow: 0, tiles: [0, midTile(0), 3] }];
            break;
          case 2:
            segments = [{ startRow: 1, tiles: [0, midTile(0), 3] }];
            break;
          default:
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
    this.renderBackground();

    // render obstacles
    for (const obstacle of this.obstacles) {
      obstacle.render(this.ctx, this.cameraX);
    }

    // draw alive chickens sorted by y, offset by camera
    const alive = this.getAliveRemotes();
    const allChickens = this.gameOver ? alive : [this.chicken, ...alive];
    this.renderChickens(allChickens);

    // HUD: distance
    const ctx = this.ctx;
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

    // game over banner
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
}
