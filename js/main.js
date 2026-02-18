import { loadAssets } from "./engine/assets.js";
import { InputManager } from "./engine/input.js";
import { GameLoop } from "./engine/game-loop.js";
import { GameScene } from "./scenes/game-scene.js";

// canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// load assets
const assets = await loadAssets();

// input
const input = new InputManager();

// --- Scene management ---
let currentScene = null;

function switchScene(scene) {
  currentScene?.exit();
  currentScene = scene;
  currentScene.enter();
}

// start
const sceneContext = { canvas, ctx, assets, input, switchScene };

switchScene(new GameScene(sceneContext));

const loop = new GameLoop(
  (dt) => currentScene.update(dt),
  () => currentScene.render(),
);

loop.start();
