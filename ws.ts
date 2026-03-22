const MAX_PLAYERS = 6;

interface Client {
  ws: WebSocket;
  colorIndex: number;
  spriteSet: string;
  name: string;
  ready: boolean;
}

interface Lobby {
  clients: Map<string, Client>;
  mapSeed: number;
  nextId: number;
}

const lobbies = new Map<string, Lobby>();

/** Returns the lobby for the given ID, creating it with a fresh map seed if it doesn't exist. */
function getOrCreateLobby(lobbyId: string): Lobby {
  let lobby = lobbies.get(lobbyId);
  if (!lobby) {
    lobby = {
      clients: new Map(),
      mapSeed: Math.floor(Math.random() * 0x7fffffff),
      nextId: 1,
    };
    lobbies.set(lobbyId, lobby);
    console.log(`Lobby "${lobbyId}" created`);
  }
  return lobby;
}

/** Removes a lobby from memory if it has no remaining clients. */
function deleteLobbyIfEmpty(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (lobby && lobby.clients.size === 0) {
    lobbies.delete(lobbyId);
    console.log(`Lobby "${lobbyId}" deleted (empty)`);
  }
}

/** Returns the lowest unused color index (0–5), or -1 if the lobby is full. */
function claimColorIndex(lobby: Lobby): number {
  const used = new Set<number>();
  for (const { colorIndex } of lobby.clients.values()) {
    used.add(colorIndex);
  }
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!used.has(i)) return i;
  }
  return -1;
}

/** Sends a message to every client in the lobby, optionally skipping one (typically the sender). */
function broadcast(lobby: Lobby, message: string, excludeId?: string) {
  for (const [id, { ws }] of lobby.clients) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Upgrades an HTTP request to a WebSocket connection and adds the player to
 * the specified lobby. Handles all game messages (state sync, customization,
 * ready/start) scoped to that lobby. Returns 503 if the lobby is full.
 */
export function handleWebSocket(req: Request, lobbyId: string): Response {
  const lobby = getOrCreateLobby(lobbyId);

  if (lobby.clients.size >= MAX_PLAYERS) {
    return new Response("Lobby full", { status: 503 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const id = String(lobby.nextId++);

  socket.onopen = () => {
    const colorIndex = claimColorIndex(lobby);
    if (colorIndex === -1) {
      socket.close(1013, "Lobby full");
      return;
    }

    lobby.clients.set(id, { ws: socket, colorIndex, spriteSet: "default", name: "", ready: false });
    socket.send(JSON.stringify({ type: "id", id, colorIndex, mapSeed: lobby.mapSeed }));
    broadcast(
      lobby,
      JSON.stringify({ type: "join", id, colorIndex, spriteSet: "default", name: "" }),
      id,
    );

    // tell the new client about existing players
    for (const [otherId, other] of lobby.clients) {
      if (otherId !== id) {
        socket.send(
          JSON.stringify({
            type: "join",
            id: otherId,
            colorIndex: other.colorIndex,
            spriteSet: other.spriteSet,
            name: other.name,
          }),
        );
      }
    }
    console.log(
      `[${lobbyId}] Player ${id} connected (color ${colorIndex}, ${lobby.clients.size}/${MAX_PLAYERS})`,
    );
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    data.id = id;

    // store customization on the server so new joiners see it
    if (data.type === "customize") {
      const client = lobby.clients.get(id);
      if (client) {
        if (data.spriteSet !== undefined) client.spriteSet = data.spriteSet;
        if (data.colorIndex !== undefined) client.colorIndex = data.colorIndex;
        if (data.name !== undefined) client.name = data.name;
      }
    }

    // handle ready toggle
    if (data.type === "ready") {
      const client = lobby.clients.get(id);
      if (client) {
        client.ready = !client.ready;

        // broadcast this player's ready state to everyone (including sender)
        broadcast(lobby, JSON.stringify({ type: "ready", id, ready: client.ready }));

        // check if all players are ready
        if (lobby.clients.size > 0 && [...lobby.clients.values()].every((c) => c.ready)) {
          const roundSeed = Math.floor(Math.random() * 0x7fffffff);
          broadcast(lobby, JSON.stringify({ type: "start", roundSeed }));

          // reset ready state for next round
          for (const c of lobby.clients.values()) c.ready = false;
        }
      }
      return;
    }

    broadcast(lobby, JSON.stringify(data), id);
  };

  socket.onclose = () => {
    lobby.clients.delete(id);

    // reset all ready states when someone leaves
    for (const c of lobby.clients.values()) c.ready = false;

    broadcast(lobby, JSON.stringify({ type: "leave", id }));
    console.log(`[${lobbyId}] Player ${id} disconnected (${lobby.clients.size}/${MAX_PLAYERS})`);
    deleteLobbyIfEmpty(lobbyId);
  };

  return response;
}
