"use strict";

// Write each protagonist atlas's per-cell foot baselines into its atlas.json.
//
// The runtime cannot read pixels on Android (file:// origins taint canvases),
// so the lowest painted row of every cell is measured here, at build time,
// and shipped as data. Run after changing an atlas image:
//   node scripts/measure-atlas-baselines.js

const fs = require("node:fs");
const path = require("node:path");
const { decodePng, cellBaselines } = require("./png.js");

for (const id of ["nini", "yuan"]) {
  const manifestPath = path.join(__dirname, "..", "assets", "characters", id, "atlas.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const image = decodePng(fs.readFileSync(path.join(path.dirname(manifestPath), manifest.image)));
  const baselines = cellBaselines(image, manifest.frame.w, manifest.frame.h);
  // Keep the hand-authored layout: replace or insert one line after "frame".
  const source = fs.readFileSync(manifestPath, "utf8");
  const line = `  "baselines": [${baselines.join(", ")}],`;
  const next = /\n  "baselines": \[[^\]]*\],/.test(source)
    ? source.replace(/\n  "baselines": \[[^\]]*\],/, `\n${line}`)
    : source.replace(/(\n  "frame": \{[^}]*\},)/, `$1\n${line}`);
  JSON.parse(next);
  fs.writeFileSync(manifestPath, next);
  console.log(`${id}: ${baselines.join(", ")}`);
}
