// main.ts

// --- Canvas setup ---
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

canvas.width = 800;
canvas.height = 300;
ctx.imageSmoothingEnabled = false; // pixel-perfect rendering

// --- Asset loading ---
const assets = {
  spriteSheet: await loadImage("/sprites/sheet.png"),
  ground: await loadImage("/sprites/ground.png"),
};

// --- Input ---
const input = new InputManager();

// --- Scene management ---
let currentScene: Scene;

function switchScene(scene: Scene) {
  currentScene?.exit();
  currentScene = scene;
  currentScene.enter();
}

// Scenes can trigger transitions via this callback
const sceneContext = {
  switchScene,
  canvas,
  assets,
  input,
};

// --- Game loop ---
let lastTime = 0;
const TICK_RATE = 1000 / 60;
let accumulator = 0;

function loop(timestamp: number) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += delta;

  while (accumulator >= TICK_RATE) {
    currentScene.update(TICK_RATE / 1000);
    accumulator -= TICK_RATE;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  currentScene.render(ctx);
  requestAnimationFrame(loop);
}

// --- Start ---
switchScene(new MenuScene(sceneContext));
requestAnimationFrame(loop);
