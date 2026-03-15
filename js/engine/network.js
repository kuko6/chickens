export class NetworkManager {
  constructor() {
    this.id = null;
    this.ws = null;
    this.mapSeed = null;
    this.colorIndex = null;
    this.connected = false;
    this.remotePlayers = new Map(); // id -> state
    this.onId = null;
    this.onJoin = null;
    this.onLeave = null;
    this.onCustomize = null;
    this.onDisconnect = null;
  }

  /** @returns {Promise<void>} resolves once the server sends the id message, or on failure */
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
          this.onJoin?.(data.id, data.colorIndex, data.spriteSet, data.name);
          break;
        case "leave":
          this.remotePlayers.delete(data.id);
          this.onLeave?.(data.id);
          break;
        case "state":
          this.remotePlayers.set(data.id, data);
          break;
        case "customize":
          this.onCustomize?.(data.id, data.spriteSet, data.colorIndex, data.name);
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
        this.onDisconnect?.();
      }
    };
  }

  /** Send local chicken state to the server */
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
      isClucking: chicken.isClucking,
      currentFrame: chicken.currentFrame,
      cluckFrame: chicken.cluckFrame,
      spriteSet: chicken.spriteSetName,
    }));
  }

  /** Send customization change to server */
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
