export class NetworkManager {
  constructor() {
    this.id = null;
    this.ws = null;
    this.mapSeed = null;
    this.colorIndex = null;
    this.connected = false;
    this.remotePlayers = new Map(); // id -> state
    this.remotePlayerInfo = new Map(); // id -> { colorIndex, spriteSet, name }
    this.onId = null;
    this.onJoin = null;
    this.onLeave = null;
    this.onCustomize = null;
    this.onDisconnect = null;
    this.onReady = null;
    this.onStart = null;
  }

  /**
   * Open a WebSocket connection and set up message handlers.
   * Sets this.ready to a promise that resolves once the server sends the id message, or on failure.
   */
  connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${location.host}/ws`);

    this.ready = new Promise((resolve) => { this.resolveReady = resolve; });

    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      switch (data.type) {
        case "id":
          this.id = data.id;
          this.mapSeed = data.mapSeed;
          this.colorIndex = data.colorIndex;
          this.connected = true;
          this.resolveReady?.();
          this.onId?.(data.colorIndex);
          break;
        case "join":
          this.remotePlayers.set(data.id, null);
          this.remotePlayerInfo.set(data.id, {
            colorIndex: data.colorIndex,
            spriteSet: data.spriteSet,
            name: data.name,
          });
          this.onJoin?.(data.id, data.colorIndex, data.spriteSet, data.name);
          break;
        case "leave":
          this.remotePlayers.delete(data.id);
          this.remotePlayerInfo.delete(data.id);
          this.onLeave?.(data.id);
          break;
        case "state":
          this.remotePlayers.set(data.id, data);
          break;
        case "customize": {
          this.onCustomize?.(data.id, data.spriteSet, data.colorIndex, data.name);
          const info = this.remotePlayerInfo.get(data.id);
          if (info) {
            if (data.spriteSet !== undefined) info.spriteSet = data.spriteSet;
            if (data.colorIndex !== undefined) info.colorIndex = data.colorIndex;
            if (data.name !== undefined) info.name = data.name;
          }
          break;
        }
        case "ready":
          this.onReady?.(data.id, data.ready);
          break;
        case "start":
          this.onStart?.(data.roundSeed);
          break;
      }
    };

    this.ws.onerror = () => {
      // resolve ready so the game doesn't hang
      this.resolveReady?.();
      this.resolveReady = null;
    };

    this.ws.onclose = () => {
      const wasConnected = this.connected;
      this.connected = false;
      // resolve ready in case we never got the id message
      this.resolveReady?.();
      this.resolveReady = null;
      if (wasConnected) {
        this.remotePlayers.clear();
        this.remotePlayerInfo.clear();
        this.onDisconnect?.();
      }
    };
  }

  /**
   * Send local chicken state to the server.
   * @param {import('../entities/chicken.js').Chicken} chicken
   */
  sendState(chicken) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: "state",
      x: chicken.x,
      y: chicken.y,
      airY: chicken.airY,
      facingRight: chicken.facingRight,
      isMoving: chicken.isMoving,
      isJumping: chicken.isJumping,
      isGliding: chicken.isGliding,
      isClucking: chicken.isClucking,
      currentFrame: chicken.currentFrame,
      cluckFrame: chicken.cluckFrame,
      spriteSet: chicken.spriteSetName,
    }));
  }

  /** Notify other clients that this player is dead. */
  sendDead() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "state", dead: true }));
  }

  /** Toggle the local player's ready state on the server. */
  sendReady() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "ready" }));
  }

  /**
   * Broadcast a customization change to other clients.
   * @param {string} spriteSet
   * @param {number} colorIndex
   * @param {string} name
   */
  sendCustomize(spriteSet, colorIndex, name) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: "customize",
      spriteSet,
      colorIndex,
      name,
    }));
  }
}
