/**
 * Bun HTTP server that routes requests in priority order:
 *  1. `/ws/<lobbyId>` - WebSocket upgrade
 *  2. `/`             - serves `index.html` (intro screen for creating/joining lobbies)
 *  3. `/<lobbyId>`    - serves `index.html`, the client reads the lobby ID from the URL and
 *                       opens a WebSocket
 *  4. everything else - serves static files (js/, assets/, etc.) requested by the client
 */

import { resolve, sep } from "node:path";
import { handleWebSocket, type SocketData, websocket } from "./src/ws.ts";

const fsRoot = resolve(Bun.argv.includes("--prod") ? "dist" : ".");

/** Serves a file below `fsRoot` (with Range and conditional request support), or 404 for anything missing, hidden or outside it. */
async function serveFile(req: Request, pathname: string): Promise<Response> {
  let relative: string;
  try {
    relative = decodeURIComponent(pathname);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const path = resolve(fsRoot, "." + relative);
  const hidden = relative.split("/").some((segment) => segment.startsWith("."));
  if (hidden || !path.startsWith(fsRoot + sep)) {
    return new Response("Not Found", { status: 404 });
  }

  const file = Bun.file(path);
  if (!(await file.exists())) {
    return new Response("Not Found", { status: 404 });
  }

  const etag = `W/"${file.size.toString(16)}-${file.lastModified.toString(16)}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(file, {
    headers: { ETag: etag, "Last-Modified": new Date(file.lastModified).toUTCString() },
  });
}

Bun.serve<SocketData>({
  port: 3000,
  hostname: "0.0.0.0",
  websocket,
  fetch(req, server) {
    const { pathname } = new URL(req.url);

    if (pathname.startsWith("/ws/")) {
      const lobbyId = pathname.split("/ws/")[1];
      if (!lobbyId) {
        return new Response("Invalid lobby ID", { status: 400 });
      }
      return handleWebSocket(req, server, lobbyId);
    }

    const path = pathname.slice(1);
    if (pathname === "/" || (path && !path.includes("/") && !path.includes("."))) {
      return serveFile(req, "/index.html");
    }

    return serveFile(req, pathname);
  },
});
