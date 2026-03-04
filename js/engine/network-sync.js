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
   * @param {import('../ui/customize-overlay.js').CustomizeOverlay} overlay
   */
  init(chicken, overlay) {
    this.network.onId = (colorIndex) => {
      chicken.setColorIndex(colorIndex);
      overlay.selectedColorIndex = colorIndex;
      this.network.sendCustomize(chicken.spriteSetName, colorIndex, chicken.name);
    };

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
  }

  /**
   * Per-frame: send local state and apply remote states.
   * @param {import('../entities/chicken.js').Chicken} chicken
   */
  update(chicken) {
    this.network.sendState(chicken);

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
