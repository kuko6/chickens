const MAX_PLAYERS = 6;
const clients = new Map<
  string,
  { ws: WebSocket; colorIndex: number; spriteSet: string; name: string }
>();
let nextId = 1;
const mapSeed = Math.floor(Math.random() * 0x7fffffff);

/** Returns the first free color index, or -1 if full. */
function claimColorIndex(): number {
  const used = new Set<number>();
  for (const { colorIndex } of clients.values()) {
    used.add(colorIndex);
  }
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!used.has(i)) return i;
  }
  return -1;
}

function broadcast(message: string, excludeId?: string) {
  for (const [id, { ws }] of clients) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function handleWebSocket(req: Request): Response {
  if (clients.size >= MAX_PLAYERS) {
    return new Response("Server full", { status: 503 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const id = String(nextId++);

  socket.onopen = () => {
    const colorIndex = claimColorIndex();
    if (colorIndex === -1) {
      socket.close(1013, "Server full");
      return;
    }

    clients.set(id, { ws: socket, colorIndex, spriteSet: "default", name: "" });
    socket.send(JSON.stringify({ type: "id", id, colorIndex, mapSeed }));
    broadcast(
      JSON.stringify({ type: "join", id, colorIndex, spriteSet: "default", name: "" }),
      id,
    );
    // Tell the new client about existing players
    for (const [otherId, other] of clients) {
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
      `Player ${id} connected (color ${colorIndex}, ${clients.size}/${MAX_PLAYERS})`,
    );
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    data.id = id;

    // Store customization on the server so new joiners see it
    if (data.type === "customize") {
      const client = clients.get(id);
      if (client) {
        if (data.spriteSet !== undefined) client.spriteSet = data.spriteSet;
        if (data.colorIndex !== undefined) client.colorIndex = data.colorIndex;
        if (data.name !== undefined) client.name = data.name;
      }
    }

    broadcast(JSON.stringify(data), id);
  };

  socket.onclose = () => {
    clients.delete(id);
    broadcast(JSON.stringify({ type: "leave", id }));
    console.log(`Player ${id} disconnected (${clients.size}/${MAX_PLAYERS})`);
  };

  return response;
}
