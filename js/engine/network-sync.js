import { RemoteChicken } from "../entities/remote-chicken.js";

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
  }

  /**
   * Wire up network callbacks.
   * @param {import('../entities/chicken.js').Chicken} chicken
   * @param {{spriteSetName: string, colorIndex: number, name: string}} [appearance]
   */
  init(chicken, appearance) {
    this.network.onId = (colorIndex) => {
      if (appearance) {
        appearance.colorIndex = colorIndex;
        chicken.applyAppearance(appearance);
        this.network.sendCustomize(appearance.spriteSetName, colorIndex, appearance.name);
      } else {
        chicken.setColorIndex(colorIndex);
      }
    };

    // if the id message arrived before init, apply the server-assigned color once
    if (this.network.colorIndex !== null) {
      this.network.onId(this.network.colorIndex);
      this.network.colorIndex = null;
    }

    this.network.onJoin = (id, colorIndex, spriteSet, name) => {
      const remote = new RemoteChicken(this.assets, colorIndex, spriteSet, name);
      remote.minY = chicken.minY;
      remote.maxY = chicken.maxY;
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

    // Re-create remote chickens for players that already exist (e.g. after scene transition)
    for (const [id, info] of this.network.remotePlayerInfo) {
      if (!this.remoteChickens.has(id)) {
        const remote = new RemoteChicken(this.assets, info.colorIndex, info.spriteSet, info.name);
        remote.minY = chicken.minY;
        remote.maxY = chicken.maxY;
        this.remoteChickens.set(id, remote);
      }
    }
  }

  /**
   * Per-frame: send local state and apply remote states.
   * @param {import('../entities/chicken.js').Chicken} chicken
   */
  update(chicken) {
    this.network.sendState(chicken);
    this.receive();
  }

  /** Apply remote states without sending (used when spectating). */
  receive() {
    for (const [id, remote] of this.remoteChickens) {
      const state = this.network.remotePlayers.get(id);
      if (state) remote.applyState(state);
    }
  }

  /** @returns {RemoteChicken[]} */
  getRemoteChickens() {
    return [...this.remoteChickens.values()];
  }

  destroy() {
    this.remoteChickens.clear();
  }
}
