// Builds the click-contribution audit into a single Node-runnable bundle.
// Usage:  node brain/scratchpad/clickaudit/build.mjs
//
// - platform=node, format=esm  -> runs directly with `node out/audit.mjs`
// - canvas-confetti is aliased to a no-op stub (no DOM in Node)
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(here, "audit.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outdir: path.join(here, "out"),
  entryNames: "[name]",
  outExtension: { ".js": ".mjs" },
  alias: {
    "canvas-confetti": path.resolve(here, "..", "harness", "stubs", "confetti-stub.js"),
  },
  logLevel: "info",
  legalComments: "none",
});

console.log("[build] OK -> brain/scratchpad/clickaudit/out/audit.mjs");