/**
 * Builds the production bundle into `dist/`: the minified client script, `index.html`
 * pointing at it, and the static assets the client requests at runtime.
 */

import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const result = await Bun.build({
  entrypoints: ["src/js/main.js"],
  outdir: "dist",
  naming: "main.js",
  target: "browser",
  format: "esm",
  minify: true,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const html = await Bun.file("index.html").text();
const bundled = html.replace('src="src/js/main.js"', 'src="main.js"');
if (bundled === html) throw new Error("index.html no longer references src/js/main.js");
await Bun.write("dist/index.html", bundled);

await cp("assets", "dist/assets", { recursive: true });
await cp("favicon.ico", "dist/favicon.ico");
