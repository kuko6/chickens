export class NetworkManager {
  constructor() {
    this.id = null;
    this.ws = null;
    this.remotePlayers = new Map(); // id -> state
    this.onId = null;
    this.onJoin = null;
    this.onLeave = null;
  }

  connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${location.host}/ws`);

    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      switch (data.type) {
        case "id":
          this.id = data.id;
          this.onId?.(data.colorIndex);
          break;
        case "join":
          this.remotePlayers.set(data.id, null);
          this.onJoin?.(data.id, data.colorIndex);
          break;
        case "leave":
          this.remotePlayers.delete(data.id);
          this.onLeave?.(data.id);
          break;
        case "state":
          this.remotePlayers.set(data.id, data);
          break;
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
      facingRight: chicken.facingRight,
      isMoving: chicken.isMoving,
      isJumping: chicken.isJumping,
      isClucking: chicken.isClucking,
      currentFrame: chicken.currentFrame,
      cluckFrame: chicken.cluckFrame,
    }));
  }
}
