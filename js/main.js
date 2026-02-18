import { loadAssets } from "./engine/assets.js";
import { InputManager } from "./engine/input.js";
import { NetworkManager } from "./engine/network.js";
import { GameLoop } from "./engine/game-loop.js";
import { GameScene } from "./scenes/game-scene.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

const sceneContext = { canvas, ctx, assets, input, network, switchScene };

switchScene(new GameScene(sceneContext));

// start
const loop = new GameLoop(
  (dt) => currentScene.update(dt),
  () => currentScene.render(),
);

loop.start();
