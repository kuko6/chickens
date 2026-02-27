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

/**
 * Loads all game assets and returns them as a keyed object.
 * @returns {Promise<{sprites: Object, sounds: Object}>}
 */
export async function loadAssets() {
  const [idle, run, jump, cluck] = await Promise.all([
    // loadImage("assets/sprites/chickens.png"),
    // loadImage("assets/sprites/chickens_run.png"),
    // loadImage("assets/sprites/chickens_jump.png"),
    // loadImage("assets/sprites/chickens_cluck.png"),
    loadImage("assets/sprites/imro_idle.png"),
    loadImage("assets/sprites/imro_run.png"),
    loadImage("assets/sprites/imro_jump.png"),
    loadImage("assets/sprites/chickens_cluck.png"),
  ]);

  const cluckSound = new Audio("assets/sounds/rooster.mp3");

  return {
    sprites: { idle, run, jump, cluck },
    sounds: { cluck: cluckSound },
  };
}
