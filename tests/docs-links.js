const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function markdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(file);
    return entry.isFile() && entry.name.endsWith(".md") ? [file] : [];
  });
}

const rootDocs = fs.readdirSync(".").filter((file) => file.endsWith(".md"));
const files = [...rootDocs, ...markdownFiles("docs")];

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
