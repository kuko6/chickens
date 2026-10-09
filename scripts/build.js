/**
 * Builds the production bundle into `dist/`: the minified client script, `index.html`
 * pointing at it, and the static assets the client requests at runtime.
 */

import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/js/main.js"],
  outfile: "dist/main.js",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
});

const html = await readFile("index.html", "utf8");
const bundled = html.replace('src="src/js/main.js"', 'src="main.js"');
if (bundled === html) throw new Error("index.html no longer references src/js/main.js");
await writeFile("dist/index.html", bundled);

await cp("assets", "dist/assets", { recursive: true });
await cp("favicon.ico", "dist/favicon.ico");
