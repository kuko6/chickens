import { loadAssets } from "./engine/assets.js";
import { InputManager } from "./engine/input.js";
import { NetworkManager } from "./engine/network.js";
import { GameLoop } from "./engine/game-loop.js";
import { GameScene } from "./scenes/game-scene.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const viewport = configureCanvasForHiDPI(canvas, ctx);

const assets = await loadAssets();

const input = new InputManager();

const network = new NetworkManager();
network.connect();

let currentScene = null;

function switchScene(scene) {
  currentScene?.exit();
  currentScene = scene;
  currentScene.enter();
}

const sceneContext = { canvas, ctx, viewport, assets, input, network, switchScene };

switchScene(new GameScene(sceneContext));

// start
const loop = new GameLoop(
  (dt) => currentScene.update(dt),
  () => currentScene.render(),
);

loop.start();

/**
 * Keep logical game coordinates stable while rendering at device pixel ratio.
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
function configureCanvasForHiDPI(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width, height, dpr };
}
