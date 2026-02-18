import { serveDir } from "jsr:@std/http/file-server";

Deno.serve({ port: 3000, hostname: "0.0.0.0" }, (req) => {
  return serveDir(req, { fsRoot: "." });
});
