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
    paths: {
      idle: "assets/sprites/chickens/base_idle.png",
      run: "assets/sprites/chickens/base_run.png",
      jump: "assets/sprites/chickens/base_jump.png",
      cluck: "assets/sprites/chickens/cluck.png",
    },
  },
  {
    name: "imro",
    label: "Imro",
    spriteWidth: 20,
    spriteHeight: 20,
    sound: "assets/sounds/rooster.mp3",
    paths: {
      idle: "assets/sprites/chickens/imro_idle.png",
      run: "assets/sprites/chickens/imro_run.png",
      jump: "assets/sprites/chickens/imro_jump.png",
      cluck: "assets/sprites/chickens/cluck.png",
    },
  },
];

/**
 * Loads all game assets and returns them as a keyed object.
 * @returns {Promise<{spriteSets: Object, sprites: Object, sounds: Object}>}
 */
export async function loadAssets() {
  // Load all sprite sets in parallel
  const setEntries = await Promise.all(
    SPRITE_SETS.map(async (set) => {
      const images = {};
      const loadPromises = [];
      for (const [key, path] of Object.entries(set.paths)) {
        if (path) {
          loadPromises.push(
            loadImage(path).then((img) => { images[key] = img; })
          );
        }
      }
      await Promise.all(loadPromises);
      const cluckSound = set.sound ? new Audio(set.sound) : null;
      return [set.name, { ...images, spriteWidth: set.spriteWidth, spriteHeight: set.spriteHeight, cluckSound }];
    })
  );

  const spriteSets = Object.fromEntries(setEntries);

  // Load ground tilesets and obstacle sprites
  const [groundTileset, groundEdgeTileset, fenceSlim, fenceWide] = await Promise.all([
    loadImage("assets/sprites/tilesets/ground.png"),
    loadImage("assets/sprites/tilesets/ground_edge.png"),
    loadImage("assets/sprites/tilesets/fence_slim2.png"),
    loadImage("assets/sprites/tilesets/fence_wide.png"),
  ]);

  // Load cloud images
  const cloudPaths = [
    "assets/sprites/clouds/cloud1.png",
    "assets/sprites/clouds/cloud2.png",
    "assets/sprites/clouds/cloud3.png",
    "assets/sprites/clouds/cloud4.png",
    "assets/sprites/clouds/cloud5.png",
    "assets/sprites/clouds/cloud6.png",
    "assets/sprites/clouds/cloud7.png",
    "assets/sprites/clouds/cloud8.png",
    "assets/sprites/clouds/cloud9.png",
  ];
  const clouds = await Promise.all(cloudPaths.map(loadImage));

  return {
    spriteSets,
    // backward compat alias
    sprites: spriteSets["default"],
    sounds: { cluck: spriteSets["default"].cluckSound },
    environment: { clouds, groundTileset, groundEdgeTileset, obstacles: [fenceSlim, fenceWide] },
  };
}
