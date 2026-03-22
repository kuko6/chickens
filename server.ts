/**
 * HTTP server that handles three kinds of requests:
 *
 *  1. `/ws/<lobbyId>` — upgrades to a WebSocket connection for the given lobby
 *  2. `/<lobbyId>`    — serves `index.html` so the game client boots (SPA-style)
 *  3. Everything else — serves static files (js/, assets/, etc.)
 *
 * Visiting `/` generates a random lobby ID and redirects there, so every new
 * visitor gets their own lobby by default. Players share the URL to join the
 * same lobby.
 */

import { serveDir } from "@std/http/file-server";
import { handleWebSocket } from "./ws.ts";

const fsRoot = Deno.args.includes("--prod") ? "dist" : ".";

/** Generates a short random lobby ID (5 alphanumeric characters). */
function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 7);
}

Deno.serve({ port: 3000, hostname: "0.0.0.0" }, (req) => {
  const url = new URL(req.url);

  // websocket: /ws/<lobbyId>
  if (url.pathname.startsWith("/ws/")) {
    const lobbyId = url.pathname.slice(4);
    if (!lobbyId) {
      return new Response("Missing lobby ID", { status: 400 });
    }
    return handleWebSocket(req, lobbyId);
  }

  // root: redirect to a new random lobby
  if (url.pathname === "/") {
    const lobbyId = generateLobbyId();
    return new Response(null, {
      status: 302,
      headers: { Location: `/${lobbyId}` },
    });
  }

  // lobby URL (e.g., /abc123): serve the game HTML
  // only matches single-segment paths without a file extension
  const path = url.pathname.slice(1);
  if (path && !path.includes("/") && !path.includes(".")) {
    return serveDir(new Request(new URL("/index.html", req.url), req), { fsRoot });
  }

  // static files (js/, assets/, etc.)
  return serveDir(req, { fsRoot });
});
