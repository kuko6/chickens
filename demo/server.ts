interface SocketData {
  userId: string;
  lobbyId: string | null;
  username: string | null;
}

const lobbies = new Map<string, Set<WebSocket>>();
const socketData = new WeakMap<WebSocket, SocketData>();

Deno.serve((req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    const data: SocketData = {
      userId: crypto.randomUUID(),
      lobbyId: null,
      username: null,
    };
    socketData.set(socket, data);

    console.log(`[LOG] Client ${data.userId} connected`);
  });

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    const data = socketData.get(socket)!;

    if (msg.type === "register") {
      data.username = msg.username;
      console.log(
        `[LOG] User ${data.userId} registered as ${msg.username}`,
      );
    } else if (msg.type === "join") {
      console.log(
        `[LOG] User ${data.userId} joined lobby ${msg.lobby}`,
      );
      joinLobby(socket, msg.lobby);
    } else if (msg.type === "chat") {
      if (data.lobbyId !== null && data.username !== null) {
        console.log(
          `[LOG] User: ${data.username}, lobby: ${data.lobbyId} said: ${msg.text}`,
        );
        broadcastLobby(data.lobbyId, {
          "type": "chat",
          "user": data.username,
          "text": msg.text,
        });
      }
    }
  });

  socket.addEventListener("close", (event) => {
    const data = socketData.get(socket)!;
    console.log(
      `[LOG] User ${data.userId} left lobby ${data.lobbyId}`,
    );
    if (data.lobbyId) {
      leaveLobby(socket, data.lobbyId);
    }
  });

  return response;
});

function joinLobby(socket: WebSocket, lobbyId: string) {
  if (!lobbies.has(lobbyId)) {
    lobbies.set(lobbyId, new Set());
  }

  lobbies.get(lobbyId)!.add(socket);
  const data = socketData.get(socket)!;
  data.lobbyId = lobbyId;

  broadcastLobby(lobbyId, {
    "type": "info",
    "user": "server",
    "text": `${data.username} joined the lobby`,
  });
}

function leaveLobby(socket: WebSocket, lobbyId: string) {
  if (!lobbies.has(lobbyId)) {
    return;
  }

  lobbies.get(lobbyId)!.delete(socket);
  if (lobbies.get(lobbyId)!.size === 0) {
    console.log(`[LOG] Lobby: ${lobbyId} is empty, deleting`)
    lobbies.delete(lobbyId);
    return;
  }

  const data = socketData.get(socket)!;
  broadcastLobby(lobbyId, {
    "type": "info",
    "user": "server",
    "text": `${data.username} left the lobby`,
  });
}

function broadcastLobby(
  lobbyId: string,
  msg: { type: string; user: string; text: string },
) {
  for (const socket of lobbies.get(lobbyId)!) {
    const data = socketData.get(socket)!;
    if (msg.user === data.username) continue;
    socket.send(JSON.stringify(msg));
  }
}
