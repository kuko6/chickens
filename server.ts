/**
 * Node HTTP server that routes requests in priority order:
 *  1. `/ws/<lobbyId>` — WebSocket upgrade
 *  2. `/`             — serves `index.html` (intro screen for creating/joining lobbies)
 *  3. `/<lobbyId>`    — serves `index.html`, the client reads the lobby ID from the URL and
 *                       opens a WebSocket
 *  4. everything else — serves static files (js/, assets/, etc.) requested by the client
 */

import { createServer } from "node:http";
import sirv from "sirv";
import { handleUpgrade } from "./src/ws.ts";

const fsRoot = process.argv.includes("--prod") ? "dist" : ".";
const serveStatic = sirv(fsRoot, { dev: fsRoot === ".", etag: true });

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  const path = pathname.slice(1);
  if (pathname === "/" || (path && !path.includes("/") && !path.includes("."))) {
    req.url = "/index.html";
  }

  serveStatic(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (!pathname.startsWith("/ws/")) {
    socket.destroy();
    return;
  }

  const lobbyId = pathname.split("/ws/")[1];
  if (!lobbyId) {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    return;
  }
  handleUpgrade(req, socket, head, lobbyId);
});

server.listen(3000, "0.0.0.0");
