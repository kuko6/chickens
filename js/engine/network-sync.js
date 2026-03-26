import { RemoteChicken } from "../entities/remote-chicken.js";

/** Minimum interval between state sends (50ms = 20 ticks/sec). */
const SEND_INTERVAL = 50;

export class NetworkSync {
  /**
   * @param {import('./network.js').NetworkManager} network
   * @param {Object} assets
   */
  constructor(network, assets) {
    this.network = network;
    this.assets = assets;
    /** @type {Map<string, RemoteChicken>} */
    this.remoteChickens = new Map();

    this.lastSentState = null;
    this.sendAccumulator = 0;

    this.network.onJoin = (id, colorIndex, spriteSet, name) => {
      const remote = new RemoteChicken(this.assets, colorIndex, spriteSet, name);
      remote.minY = this.chickenMinY;
      remote.maxY = this.chickenMaxY;
      this.remoteChickens.set(id, remote);
    };

    this.network.onLeave = (id) => {
      this.remoteChickens.delete(id);
    };

    this.network.onCustomize = (id, spriteSet, colorIndex, name) => {
      const remote = this.remoteChickens.get(id);
      if (!remote) return;
      if (spriteSet !== undefined) remote.setSpriteSet(spriteSet);
      if (colorIndex !== undefined) remote.setColorIndex(colorIndex);
      if (name !== undefined) remote.name = name;
    };

    this.network.onDisconnect = () => {
      this.remoteChickens.clear();
    };
  }

  /**
   * Attach a new local chicken (e.g. on scene transition).
   * @param {import('../entities/chicken.js').Chicken} chicken
   * @param {{spriteSetName: string, colorIndex: number, name: string}} [appearance]
   */
  attach(chicken, appearance) {
    this.chickenMinY = chicken.minY;
    this.chickenMaxY = chicken.maxY;

    this.network.onId = (colorIndex) => {
      if (appearance) {
        if (!appearance.colorOverride) appearance.colorIndex = colorIndex;
        chicken.applyAppearance(appearance);
        this.network.sendCustomize(appearance.spriteSetName, appearance.colorIndex, appearance.name);
      } else {
        chicken.setColorIndex(colorIndex);
      }
    };

    // if the id message arrived before attach, apply the server-assigned color once
    if (this.network.colorIndex !== null) {
      this.network.onId(this.network.colorIndex);
      this.network.colorIndex = null;
    }

    // reset state on existing remote chickens for the new scene
    for (const remote of this.remoteChickens.values()) {
      remote.minY = chicken.minY;
      remote.maxY = chicken.maxY;
      remote.dead = false;
      remote.hasReceivedState = false;
    }

    // create remote chickens for players that already exist
    for (const [id, info] of this.network.remotePlayerInfo) {
      if (!this.remoteChickens.has(id)) {
        const remote = new RemoteChicken(this.assets, info.colorIndex, info.spriteSet, info.name);
        remote.minY = chicken.minY;
        remote.maxY = chicken.maxY;
        this.remoteChickens.set(id, remote);
      }
    }

    // reset send state so the first update after a scene change always sends
    this.lastSentState = null;
    this.sendAccumulator = SEND_INTERVAL;
  }

  /**
   * Per-frame: throttle sends to 20Hz, skip when state hasn't changed,
   * and interpolate remote chickens every frame for smooth rendering.
   * @param {import('../entities/chicken.js').Chicken} chicken
   */
  update(chicken) {
    this.sendAccumulator += 1000 / 60; // ~16.67ms per frame

    if (this.sendAccumulator >= SEND_INTERVAL) {
      this.sendAccumulator = 0;

      if (this.#hasStateChanged(chicken)) {
        this.network.sendState(chicken);
        this.#snapshotState(chicken);
      }
    }

    this.receive();
  }

  /** Apply remote states and interpolate positions. */
  receive() {
    for (const [id, remote] of this.remoteChickens) {
      const state = this.network.remotePlayers.get(id);
      if (state) remote.applyState(state);
      remote.interpolate();
    }
  }

  /** @returns {RemoteChicken[]} */
  getRemoteChickens() {
    return [...this.remoteChickens.values()];
  }

  /** Compare current chicken state against the last sent snapshot. */
  #hasStateChanged(chicken) {
    const last = this.lastSentState;
    if (!last) return true;

    return (
      chicken.x !== last.x ||
      chicken.y !== last.y ||
      chicken.airY !== last.a ||
      chicken.facingRight !== last.f ||
      chicken.isMoving !== last.m ||
      chicken.isJumping !== last.j ||
      chicken.isGliding !== last.g ||
      chicken.isClucking !== last.c ||
      chicken.currentFrame !== last.fr ||
      chicken.cluckFrame !== last.cf
    );
  }

  /** Save a snapshot of the current state for dirty checking. */
  #snapshotState(chicken) {
    this.lastSentState = {
      x: chicken.x,
      y: chicken.y,
      a: chicken.airY,
      f: chicken.facingRight,
      m: chicken.isMoving,
      j: chicken.isJumping,
      g: chicken.isGliding,
      c: chicken.isClucking,
      fr: chicken.currentFrame,
      cf: chicken.cluckFrame,
    };
  }
}
