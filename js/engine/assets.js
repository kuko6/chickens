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
    spriteWidth: 18,
    spriteHeight: 18,
    sound: "assets/sounds/chicken_cluck.mp3",
    paths: {
      idle: "assets/sprites/chickens.png",
      run: "assets/sprites/chickens_run.png",
      jump: "assets/sprites/chickens_jump.png",
      cluck: "assets/sprites/chickens_cluck.png",
    },
  },
  {
    name: "imro",
    label: "Imro",
    spriteWidth: 20,
    spriteHeight: 20,
    sound: "assets/sounds/rooster.mp3",
    paths: {
      idle: "assets/sprites/imro_idle.png",
      run: "assets/sprites/imro_run.png",
      jump: "assets/sprites/imro_jump.png",
      cluck: "assets/sprites/chickens_cluck.png",
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

  return {
    spriteSets,
    // backward compat alias
    sprites: spriteSets["default"],
    sounds: { cluck: spriteSets["default"].cluckSound },
  };
}
