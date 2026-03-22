/**
 * Deno HTTP server that routes requests in priority order:
 *  1. `/ws/<lobbyId>` — WebSocket upgrade
 *  2. `/`             — redirects to a new random lobby (e.g. `/abc12`)
 *  3. `/<lobbyId>`    — serves `index.html`, the client reads the lobby ID from the URL and
 *                       opens a WebSocket
 *  4. everything else — serves static files (js/, assets/, etc.) requested by the client
 */

import { serveDir } from "@std/http/file-server";
import { handleWebSocket } from "./ws.ts";

const fsRoot = Deno.args.includes("--prod") ? "dist" : ".";

/** Generates a random lobby ID (5 alphanumeric characters). */
function generateLobbyId(): string {
  return Math.random().toString(36).substring(2, 7);
}

Deno.serve({ port: 3000, hostname: "0.0.0.0" }, (req) => {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/ws/")) {
    const lobbyId = url.pathname.split("/ws/")[1];
    if (!lobbyId) {
      return new Response("Invalid lobby ID", { status: 400 });
    }
    return handleWebSocket(req, lobbyId);
  }

  if (url.pathname === "/") {
    const lobbyId = generateLobbyId();
    return new Response(null, {
      status: 302,
      headers: { Location: `/${lobbyId}` },
    });
  }

  const path = url.pathname.slice(1);
  if (path && !path.includes("/") && !path.includes(".")) {
    return serveDir(new Request(new URL("/index.html", req.url), req), {
      fsRoot,
    });
  }

  return serveDir(req, { fsRoot });
});
