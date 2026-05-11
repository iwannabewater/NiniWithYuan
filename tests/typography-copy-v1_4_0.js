const assert = require("node:assert/strict");
const fs = require("node:fs");
const zlib = require("node:zlib");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const eggs = fs.readFileSync("src/render/easter-eggs.js", "utf8");
const hud = fs.readFileSync("src/render/hud.js", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

const WOFF2_KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post",
  "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT",
  "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
  "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH",
  "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop",
  "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill"
];

assert.ok(["1.4.0", "1.5.0", "1.5.1"].includes(pkg.version), "package.json should be v1.4.0 or later");
assert.ok(["1.4.0", "1.5.0", "1.5.1"].includes(lock.version), "package-lock.json root version should be v1.4.0 or later");
assert.match(sw, /CACHE = "nini-yuan-v(1\.4\.0-world-3-phase-tide|1\.5\.(0-(game-feel|canonical-url)|1-mobile-skill-control))"/, "service worker cache should use a v1.4.0+ key");
assert.ok(/versionCode="(10|11|12)"/.test(androidManifest), "Android versionCode should be 10 or later");
assert.ok(/versionName="(1\.4\.0|1\.5\.(0|1))"/.test(androidManifest), "Android versionName should be 1.4.0 or later");

assert.ok(css.includes("--font-ui:"), "styles.css should define the shared UI font stack");
assert.ok(css.includes("--font-canvas:"), "styles.css should define the shared Canvas font stack");
assert.ok(css.includes("font-family: var(--font-ui);"), "styles.css should apply --font-ui to visible UI text");
assert.ok(game.includes("CANVAS_FONT_FAMILY"), "game.js should define a shared Canvas font family");
assert.ok(!/ctx\.font\s*=\s*["'][^"']*system-ui/.test(game), "Canvas text should not use a system-ui-only font");
assert.ok(/ctx\.font = `italic 700 20px \$\{CANVAS_FONT_FAMILY\}`/.test(game), "Canvas gilded underprint should use CANVAS_FONT_FAMILY");
assert.ok(/ctx\.font = `700 20px \$\{CANVAS_FONT_FAMILY\}`/.test(game), "Canvas float text should use CANVAS_FONT_FAMILY");

for (const [name, source] of [
  ["index.html", html],
  ["manifest.webmanifest", manifest.description],
  ["src/render/easter-eggs.js", eggs],
]) {
  assert.ok(!/(五大章节|五个章节|八大章节)/.test(source), `${name} should not hard-code a current chapter count in user-facing copy`);
}

assert.ok(html.includes("多世界章节"), "visible menu metadata should use count-free chapter scope copy");
assert.ok(manifest.description.includes("多世界章节"), "manifest description should use count-free chapter scope copy");
assert.ok(!/(Yuan to Nini|Hidden Atlas|Constellation Found|Y · N · Y · N|Yuan ❤ Nini)/.test(eggs), "easter-egg overlays should avoid English-only labels inside Chinese UI copy");

const runtimeText = [html, css, game, eggs, hud].join("\n");
const cjkChars = [...new Set([...runtimeText].filter((ch) => isCjk(ch)))].sort();
for (const fontPath of [
  "assets/fonts/lxgw-wenkai-500.woff2",
  "assets/fonts/lxgw-wenkai-700.woff2",
]) {
  const supported = readWoff2Cmap(fontPath);
  const missing = cjkChars.filter((ch) => !supported.has(ch.codePointAt(0)));
  assert.deepEqual(missing, [], `${fontPath} should cover every current runtime Chinese glyph`);
}

for (const phrase of ["五枚心石碎片", "星门重新接合路线", "星门浅湾", "回环灯塔", "星环温室", "第三星域 星潮镜域", "星潮相位路线", "相位浅滩", "群岛星核"]) {
  for (const fontPath of ["assets/fonts/lxgw-wenkai-500.woff2", "assets/fonts/lxgw-wenkai-700.woff2"]) {
    const supported = readWoff2Cmap(fontPath);
    const missing = [...phrase].filter((ch) => isCjk(ch) && !supported.has(ch.codePointAt(0)));
    assert.deepEqual(missing, [], `${fontPath} should cover reported mixed-font phrase: ${phrase}`);
  }
}

console.log("typography-copy-v1.4.0: shared font stack, local CJK glyph coverage, and count-free current UI/easter-egg copy passed");

function isCjk(ch) {
  const code = ch.codePointAt(0);
  return (code >= 0x3400 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff);
}

function readWoff2Cmap(path) {
  const buf = fs.readFileSync(path);
  assert.equal(buf.toString("ascii", 0, 4), "wOF2", `${path} should be WOFF2`);
  const numTables = buf.readUInt16BE(12);
  const totalCompressedSize = buf.readUInt32BE(20);
  let pos = 48;
  const entries = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = buf[pos++];
    const tagIndex = flags & 0x3f;
    const transformVersion = flags >> 6;
    let tag = WOFF2_KNOWN_TAGS[tagIndex];
    if (tagIndex === 0x3f) {
      tag = buf.toString("latin1", pos, pos + 4);
      pos += 4;
    }
    const origLength = readUIntBase128(buf, () => pos, (next) => { pos = next; });
    let transformLength = origLength;
    if ((tag === "glyf" || tag === "loca") ? transformVersion !== 3 : transformVersion !== 0) {
      transformLength = readUIntBase128(buf, () => pos, (next) => { pos = next; });
    }
    entries.push({ tag, transformLength });
  }

  const decompressed = zlib.brotliDecompressSync(buf.subarray(pos, pos + totalCompressedSize));
  let tableOffset = 0;
  for (const entry of entries) {
    if (entry.tag === "cmap") {
      return parseCmap(decompressed.subarray(tableOffset, tableOffset + entry.transformLength));
    }
    tableOffset += entry.transformLength;
  }
  throw new Error(`${path} has no cmap table`);
}

function readUIntBase128(buf, getPos, setPos) {
  let pos = getPos();
  let result = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = buf[pos++];
    result = (result << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      setPos(pos);
      return result;
    }
  }
  throw new Error("Invalid WOFF2 UIntBase128 value");
}

function parseCmap(table) {
  const set = new Set();
  const numTables = table.readUInt16BE(2);
  for (let i = 0; i < numTables; i += 1) {
    const offset = table.readUInt32BE(8 + i * 8);
    const format = table.readUInt16BE(offset);
    if (format === 4) collectFormat4(table, offset, set);
    if (format === 12) collectFormat12(table, offset, set);
  }
  return set;
}

function collectFormat4(table, offset, set) {
  const length = table.readUInt16BE(offset + 2);
  const segCount = table.readUInt16BE(offset + 6) / 2;
  const endCodeOffset = offset + 14;
  const startCodeOffset = endCodeOffset + segCount * 2 + 2;
  const idDeltaOffset = startCodeOffset + segCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segCount * 2;
  for (let i = 0; i < segCount; i += 1) {
    const end = table.readUInt16BE(endCodeOffset + i * 2);
    const start = table.readUInt16BE(startCodeOffset + i * 2);
    const delta = table.readInt16BE(idDeltaOffset + i * 2);
    const rangeOffsetPos = idRangeOffsetOffset + i * 2;
    const rangeOffset = table.readUInt16BE(rangeOffsetPos);
    for (let code = start; code <= end && code !== 0xffff; code += 1) {
      let glyph = 0;
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff;
      } else {
        const glyphOffset = rangeOffsetPos + rangeOffset + (code - start) * 2;
        if (glyphOffset + 2 <= offset + length) {
          glyph = table.readUInt16BE(glyphOffset);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
      }
      if (glyph !== 0) set.add(code);
    }
  }
}

function collectFormat12(table, offset, set) {
  const numGroups = table.readUInt32BE(offset + 12);
  let pos = offset + 16;
  for (let i = 0; i < numGroups; i += 1) {
    const start = table.readUInt32BE(pos);
    const end = table.readUInt32BE(pos + 4);
    const startGlyph = table.readUInt32BE(pos + 8);
    for (let code = start; code <= end; code += 1) {
      if (startGlyph + (code - start) !== 0) set.add(code);
    }
    pos += 12;
  }
}
