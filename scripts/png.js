"use strict";

// Minimal PNG decoder for 8-bit RGB/RGBA, non-interlaced images. Enough to
// read the character atlases for build-time measurements and their tests,
// without adding an image dependency.

const zlib = require("node:zlib");

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Decode a PNG buffer to { width, height, data } with RGBA rows. */
function decodePng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const bitDepth = body[8];
      colorType = body[9];
      const interlace = body[12];
      if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2) || interlace !== 0) {
        throw new Error(`unsupported PNG (depth ${bitDepth}, color ${colorType}, interlace ${interlace})`);
      }
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      pixels[y * stride + x] = value & 255;
    }
  }
  if (channels === 4) return { width, height, data: pixels };
  const rgba = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i += 1) pixels.copy(rgba, i * 4, i * 3, i * 3 + 3);
  return { width, height, data: rgba };
}

/**
 * Lowest painted row of every cell (alpha above `threshold`), as a fraction
 * of cell height, rounded to four decimals. Matches the runtime measurement.
 */
function cellBaselines(image, cellW, cellH, threshold = 60) {
  const columns = Math.floor(image.width / cellW);
  const rows = Math.floor(image.height / cellH);
  const baselines = [];
  for (let cell = 0; cell < columns * rows; cell += 1) {
    const x0 = (cell % columns) * cellW;
    const y0 = Math.floor(cell / columns) * cellH;
    let lowest = -1;
    for (let y = y0 + cellH - 1; y >= y0 && lowest < 0; y -= 1) {
      for (let x = x0; x < x0 + cellW; x += 1) {
        if (image.data[(y * image.width + x) * 4 + 3] > threshold) {
          lowest = y;
          break;
        }
      }
    }
    baselines.push(lowest < 0 ? 1 : Math.round(((lowest + 1 - y0) / cellH) * 1e4) / 1e4);
  }
  return baselines;
}

module.exports = { decodePng, cellBaselines };
