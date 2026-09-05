// Physics tests do not render; provide only the offscreen canvas used at import.
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
const { Chicken } = await import("./chicken.js");
const { RemoteChicken } = await import("./remote-chicken.js");
delete globalThis.document;
import { Obstacle } from "./obstacle.js";
import { CHICKEN_MOVEMENT_SCALE } from "./chicken-scale.js";

const assets = { spriteSets: { default: { spriteWidth: 20, spriteHeight: 20 }, alternate: { spriteWidth: 20, spriteHeight: 20 } } };
const bounds = { width: 800, height: 400 };
function near(actual, expected) {
  if (Math.abs(actual - expected) > 1e-8) throw Error(`Expected ${expected}, got ${actual}`);
}

Deno.test("small chickens retain size across appearances and proportional diagonal movement", () => {
  const chicken = new Chicken({ isDown: (key) => key === "right" || key === "down" }, assets, bounds);
  const remote = new RemoteChicken(assets);
  for (const player of [chicken, remote]) {
    player.setSpriteSet("alternate");
    near(player.width, 50);
    near(player.height, 50);
  }
  const x = chicken.x;
  const y = chicken.y;
  chicken.update(1 / 60);
  near(Math.hypot(chicken.x - x, chicken.y - y), 4 * CHICKEN_MOVEMENT_SCALE);
  near(chicken.minY + chicken.height, 236);
  near(chicken.maxY + chicken.height, bounds.height);
});

Deno.test("scaled jumps and glides preserve timing and proportional height at runner speeds", () => {
  for (const speed of [3, 10, 20]) {
    for (const holdFrames of [1, 8, 120]) {
      let frame = 0;
      const input = { isDown: (key) => key === "jump" && frame < holdFrames };
      const small = new Chicken(input, assets, bounds);
      const original = new Chicken(input, assets, bounds);
      for (const key of ["jumpForce", "gravity", "jumpHoldBoost", "glideGravity", "glideMaxFallSpeed"]) {
        original[key] /= CHICKEN_MOVEMENT_SCALE;
      }
      small.gameSpeed = original.gameSpeed = speed * CHICKEN_MOVEMENT_SCALE;
      let landed = false;
      for (; frame < 200; frame++) {
        small.update(1 / 60);
        original.update(1 / 60);
        near(small.airY, original.airY * CHICKEN_MOVEMENT_SCALE);
        if (small.isGliding !== original.isGliding) throw Error("Glide timing changed");
        if (!small.isJumping) { landed = true; break; }
      }
      if (!landed) throw Error("Chicken did not land");
    }
  }
});

Deno.test("small chicken collides on the ground and clears fences while jumping", () => {
  const chicken = new Chicken({ isDown: () => false }, assets, bounds);
  const fence = new Obstacle(chicken.x, 208, {}, 3, 16, [{ startRow: 0, tiles: [0, 1, 2, 3] }]);
  if (!fence.collides(chicken)) throw Error("Grounded chicken missed fence");
  chicken.airY = -11 * CHICKEN_MOVEMENT_SCALE;
  if (fence.collides(chicken)) throw Error("Airborne chicken did not clear fence");
  chicken.airY = 0;
  chicken.x = fence.x - chicken.width;
  if (fence.collides(chicken)) throw Error("Collision outside the smaller chicken");
});
