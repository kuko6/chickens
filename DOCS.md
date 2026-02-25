# Chicken Game

A multiplayer 2D side-scrolling game where players control pixel-art chickens. Built with Deno and vanilla JavaScript using HTML5 Canvas.

## Running

```bash
deno run --allow-net --allow-read serve.ts
```

Open `http://localhost:3000` in up to 6 browser tabs.

### Controls

| Key                    | Action     |
| ---------------------- | ---------- |
| Arrow Left / A         | Move left  |
| Arrow Right / D        | Move right |
| Spacebar               | Jump       |
| V                      | Cluck      |

## Architecture

```
serve.ts                  HTTP server + routing
ws.ts                     WebSocket game server
index.html                Game page
js/
  main.js                 Entry point, wires everything together
  engine/
    game-loop.js          Fixed-timestep loop (60 FPS)
    input.js              Keyboard state tracker
    assets.js             Sprite & sound loader
    network.js            WebSocket client
  scenes/
    game-scene.js         Main scene (manages all chickens)
  entities/
    chicken.js            Local player chicken (input-driven)
    remote-chicken.js     Remote player chicken (network-driven)
    tints.js              Color tints & shared sprite rendering
assets/
  sprites/                PNG sprite sheets (idle, run, jump, cluck)
  sounds/                 MP3 sound effects
```

## Server

### `serve.ts`

HTTP entry point. Routes `/ws` requests to the WebSocket handler in `ws.ts`, everything else is served as static files via `@std/http/file-server`.

### `ws.ts`

Manages multiplayer state. Tracks connected clients and their assigned color indices.

**Player limit:** 6 concurrent players (one per color slot).

**Color assignment:** Each player gets the first available color index (0-5). Index 0 is the base chicken (no tint), indices 1-5 are blue, red, green, yellow, and pink. When a player disconnects their color slot is freed for the next joiner.

**Connection rejected** with HTTP 503 when all slots are taken.

**WebSocket messages (server → client):**

| Type    | Fields              | Description                         |
| ------- | ------------------- | ----------------------------------- |
| `id`    | `id`, `colorIndex`  | Sent to the connecting client       |
| `join`  | `id`, `colorIndex`  | A new player joined                 |
| `leave` | `id`                | A player disconnected               |
| `state` | `id`, chicken state | Another player's position/animation |

**WebSocket messages (client → server):**

| Type    | Fields          | Description                            |
| ------- | --------------- | -------------------------------------- |
| `state` | chicken state   | Local player's current state, relayed to all other clients |

**Chicken state fields:** `x`, `y`, `facingRight`, `isMoving`, `isJumping`, `isClucking`, `currentFrame`, `cluckFrame`.

## Client

### `js/main.js`

Entry point loaded as an ES module from `index.html`. Sets up the canvas, loads assets, creates the input manager and network manager, then starts the game loop with a `GameScene`.

### `js/engine/game-loop.js` — `GameLoop`

Fixed-timestep game loop running at 60 ticks per second. Uses an accumulator pattern to decouple game logic from the browser's frame rate. Calls `update(dt)` for logic and `render()` for drawing each frame via `requestAnimationFrame`.

### `js/engine/input.js` — `InputManager`

Tracks keyboard state via `keydown`/`keyup` events. Provides `isDown(key)` to query whether a key is currently pressed. Prevents default behavior for spacebar to avoid page scrolling.

### `js/engine/assets.js` — `loadAssets()`

Loads all game assets in parallel and returns them as a structured object:

- **Sprites:** `idle` (16×16), `run` (2 frames, 16×16 each), `jump` (16×16), `cluck` (4 frames, 21×16 each)
- **Sounds:** `cluck` (MP3)

### `js/engine/network.js` — `NetworkManager`

WebSocket client that connects to `/ws`. Exposes three callbacks:

- `onId(colorIndex)` — called when the server assigns this client's color
- `onJoin(id, colorIndex)` — called when another player connects
- `onLeave(id)` — called when another player disconnects

Stores remote player state in a `remotePlayers` map. Sends the local chicken's state to the server every tick via `sendState(chicken)`.

### `js/scenes/game-scene.js` — `GameScene`

Main game scene. Creates the local `Chicken` on enter and manages a map of `RemoteChicken` instances based on network join/leave events.

- **update:** Runs local chicken physics, sends state to the server, applies incoming network state to remote chickens.
- **render:** Clears the canvas, draws the ground line, renders remote chickens first, then the local chicken on top.

### `js/entities/chicken.js` — `Chicken`

The local player's chicken, controlled by keyboard input.

**Physics:** Horizontal speed of 3px/tick, jump force of -8px/tick, gravity of 0.4px/tick². Position clamped to canvas bounds. Lands on a fixed ground plane at y=328.

**Animation states:**

| State    | Sprite          | Frames | Frame delay |
| -------- | --------------- | ------ | ----------- |
| Idle     | `chickens.png`  | 1      | —           |
| Running  | `chickens_run`  | 2      | 4 ticks     |
| Jumping  | `chickens_jump` | 1      | —           |
| Clucking | `chickens_cluck`| 4      | 6 ticks     |

Clucking plays the cluck sound and is blocked during jumps. Sprites are rendered at 3× scale (16px → 48px). Tint is applied via `setColorIndex()` when the server assigns a color.

### `js/entities/remote-chicken.js` — `RemoteChicken`

Network-driven chicken with no input handling. Receives position and animation state from the server via `applyState()`. Rendered at 70% opacity with its assigned color tint.

### `js/entities/tints.js`

Shared color palette and rendering helper.

**`TINT_COLORS`** array (6 entries, matching `MAX_PLAYERS` on the server):

| Index | Color  | Value                         |
| ----- | ------ | ----------------------------- |
| 0     | Base   | `null` (no tint)              |
| 1     | Blue   | `rgba(0, 100, 255, 0.4)`     |
| 2     | Red    | `rgba(255, 40, 40, 0.4)`     |
| 3     | Green  | `rgba(40, 200, 40, 0.4)`     |
| 4     | Yellow | `rgba(255, 220, 0, 0.4)`     |
| 5     | Pink   | `rgba(255, 100, 200, 0.4)`   |

**`drawTintedSprite()`** renders a sprite frame with an optional color overlay using an offscreen canvas and `source-atop` compositing, so only opaque pixels are tinted. Supports alpha for rendering remote chickens at reduced opacity and horizontal flipping for facing direction.
