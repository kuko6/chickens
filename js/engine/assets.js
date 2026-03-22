/**
 * Loads a single image and returns a promise.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Sprite set definitions — add new sets here */
export const SPRITE_SETS = [
  {
    name: "default",
    label: "Chicken",
    spriteWidth: 20,
    spriteHeight: 20,
    sound: "assets/sounds/chicken_cluck.mp3",
    spriteSheet: "assets/sprites/chickens/base.png",
    animations: {
      idle: { row: 0, frames: 1 },
      glide: { row: 1, frames: 2 },
      jump: { row: 2, frames: 1 },
      run: { row: 3, frames: 2 },
      cluck: { row: 4, frames: 4 },
    },
  },
  {
    name: "imro",
    label: "Imro",
    spriteWidth: 20,
    spriteHeight: 20,
    sound: "assets/sounds/rooster.mp3",
    spriteSheet: "assets/sprites/chickens/imro.png",
    animations: {
      idle: { row: 0, frames: 1 },
      glide: { row: 1, frames: 2 },
      jump: { row: 2, frames: 1 },
      run: { row: 3, frames: 2 },
      cluck: { row: 4, frames: 4 },
    },
  },
];

/**
 * Loads all game assets and returns them as a keyed object.
 * @returns {Promise<{spriteSets: Object, sprites: Object, sounds: Object}>}
 */
export async function loadAssets() {
  const setEntries = await Promise.all(
    SPRITE_SETS.map(async (set) => {
      const spriteSheet = await loadImage(set.spriteSheet);
      const cluckSound = set.sound ? new Audio(set.sound) : null;
      return [set.name, {
        spriteSheet,
        animations: set.animations,
        spriteWidth: set.spriteWidth,
        spriteHeight: set.spriteHeight,
        cluckSound,
      }];
    }),
  );

  const spriteSets = Object.fromEntries(setEntries);

  // const [groundTileset, groundEdgeTileset, fenceSlim, fenceWide] = await Promise.all([
  const [groundTileset, groundEdgeTileset, fenceWide] = await Promise.all([
    loadImage("assets/sprites/tilesets/ground.png"),
    loadImage("assets/sprites/tilesets/ground_edge.png"),
    // loadImage("assets/sprites/tilesets/fence_slim.png"),
    loadImage("assets/sprites/tilesets/fence_wide.png"),
  ]);

  const cloudSheet = await loadImage("assets/sprites/clouds/clouds.png");
  const cloudH = 16, cloudW = 48;
  const cloudCount = cloudSheet.height / cloudH;
  const clouds = [];
  for (let i = 0; i < cloudCount; i++) {
    const c = document.createElement("canvas");
    c.width = cloudW; c.height = cloudH;
    c.getContext("2d").drawImage(cloudSheet, 0, i * cloudH, cloudW, cloudH, 0, 0, cloudW, cloudH);
    clouds.push(c);
  }

  return {
    spriteSets,
    // environment: { clouds, groundTileset, groundEdgeTileset, obstacles: [fenceSlim, fenceWide] },
    environment: {
      clouds,
      groundTileset,
      groundEdgeTileset,
      obstacles: [fenceWide],
    },
  };
}
