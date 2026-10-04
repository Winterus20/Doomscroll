// Builds the first-prestige measurement harness into a single Node-runnable bundle.
// Usage:  node brain/scratchpad/harness/build.mjs
//
// - platform=node, format=esm  -> runs directly with `node out/run.mjs`
// - canvas-confetti is aliased to a no-op stub (no DOM in Node)
// - pinia / vue / break_eternity.js are bundled from the repo's node_modules
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(here, "run.ts"), path.join(here, "run-worker.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outdir: path.join(here, "out"),
  entryNames: "[name]",
  outExtension: { ".js": ".mjs" },
  alias: {
    "canvas-confetti": path.join(here, "stubs", "confetti-stub.js"),
  },
  logLevel: "info",
  legalComments: "none",
});

console.log("[build] OK -> brain/scratchpad/harness/out/run.mjs, run-worker.mjs");
