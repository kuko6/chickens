import { serveDir } from "@std/http/file-server";
import { handleWebSocket } from "./ws.ts";

const fsRoot = Deno.args.includes("--prod") ? "dist" : ".";

Deno.serve({ port: 3000, hostname: "0.0.0.0" }, (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/ws") {
    return handleWebSocket(req);
  }

  return serveDir(req, { fsRoot });
});
