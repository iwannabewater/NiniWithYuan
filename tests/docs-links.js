const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootDocs = fs.readdirSync(".").filter((file) => file.endsWith(".md"));
const docs = fs.readdirSync("docs").map((file) => path.join("docs", file));
const files = [...rootDocs, ...docs].filter((file) => file.endsWith(".md"));

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const links = source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  for (const [, target] of links) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split("#")[0];
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(file), clean);
    assert.ok(fs.existsSync(resolved), `${file} links to missing file: ${target}`);
  }
}

console.log("docs-links: markdown relative links passed");
