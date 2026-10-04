((root) => {
  "use strict";

  // Silhouette motifs for the landscape scroll: Song architecture, flora, and
  // celestial instruments. Every motif draws bottom-centred at (x, y) with a
  // scale `s` (1 is its nominal size in layer pixels) and reads `opts.ink`
  // (silhouette colour), `opts.light` (warm window glow), and `opts.rim`
  // (moonlit edge). Motifs are stateless and DOM-free.

  const Art = dependency("NiniYuanArt", "./art.js");

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the motifs`);
  }

  /** A hip roof with upturned eave tips: the defining Song silhouette. */
  function roof(ctx, cx, baseY, halfWidth, height, lift) {
    const tip = halfWidth * 1.18;
    ctx.beginPath();
    ctx.moveTo(cx - tip, baseY - lift);
    ctx.quadraticCurveTo(cx - halfWidth * 0.92, baseY + height * 0.06, cx - halfWidth * 0.62, baseY);
    ctx.lineTo(cx + halfWidth * 0.62, baseY);
    ctx.quadraticCurveTo(cx + halfWidth * 0.92, baseY + height * 0.06, cx + tip, baseY - lift);
    ctx.quadraticCurveTo(cx + halfWidth * 0.32, baseY - height * 0.42, cx + halfWidth * 0.16, baseY - height);
    ctx.lineTo(cx - halfWidth * 0.16, baseY - height);
    ctx.quadraticCurveTo(cx - halfWidth * 0.32, baseY - height * 0.42, cx - tip, baseY - lift);
    ctx.closePath();
    ctx.fill();
  }

  function glowWindow(ctx, x, y, w, h, opts) {
    if (!opts.light) return;
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = opts.light;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    Art.drawGlow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 2.2, opts.light, 0.35);
  }

  function rimStroke(ctx, opts, width) {
    if (!opts.rim) return;
    ctx.save();
    ctx.globalAlpha *= 0.32;
    ctx.strokeStyle = opts.rim;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function pavilion(ctx, x, y, s, opts) {
    const w = 46 * s;
    const h = 52 * s;
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - w * 0.62, y - h * 0.08, w * 1.24, h * 0.08);
    ctx.fillRect(x - w * 0.5, y - h * 0.12, w, h * 0.05);
    const pillarTop = y - h * 0.52;
    for (const px of [-0.4, 0.4]) ctx.fillRect(x + w * px - w * 0.035, pillarTop, w * 0.07, h * 0.42);
    ctx.fillRect(x - w * 0.46, y - h * 0.24, w * 0.92, h * 0.03);
    glowWindow(ctx, x - w * 0.3, pillarTop + h * 0.08, w * 0.6, h * 0.22, opts);
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - w * 0.48, pillarTop - h * 0.02, w * 0.96, h * 0.05);
    roof(ctx, x, pillarTop, w * 0.62, h * 0.4, h * 0.12);
    ctx.beginPath();
    ctx.arc(x, pillarTop - h * 0.42, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - w * 0.012, pillarTop - h * 0.52, w * 0.024, h * 0.12);
  }

  function pagoda(ctx, x, y, s, opts) {
    const tiers = opts.tiers || 5;
    let width = 34 * s;
    let cursor = y;
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - width * 0.75, cursor - 6 * s, width * 1.5, 6 * s);
    cursor -= 6 * s;
    for (let tier = 0; tier < tiers; tier += 1) {
      const bodyH = (16 - tier * 1.2) * s;
      ctx.fillStyle = opts.ink;
      ctx.fillRect(x - width * 0.42, cursor - bodyH, width * 0.84, bodyH);
      glowWindow(ctx, x - width * 0.08, cursor - bodyH * 0.72, width * 0.16, bodyH * 0.42, opts);
      ctx.fillStyle = opts.ink;
      cursor -= bodyH;
      roof(ctx, x, cursor + 2 * s, width * 0.62, 7 * s, 4.2 * s);
      cursor -= 5 * s;
      width *= 0.86;
    }
    ctx.fillRect(x - 0.9 * s, cursor - 18 * s, 1.8 * s, 18 * s);
    for (let ring = 0; ring < 4; ring += 1) ctx.fillRect(x - 3 * s, cursor - 4 * s - ring * 3.6 * s, 6 * s, 1.4 * s);
  }

  function paifang(ctx, x, y, s, opts) {
    const w = 70 * s;
    const h = 56 * s;
    ctx.fillStyle = opts.ink;
    for (const px of [-0.45, -0.17, 0.17, 0.45]) ctx.fillRect(x + w * px - 2.2 * s, y - h * 0.78, 4.4 * s, h * 0.78);
    ctx.fillRect(x - w * 0.5, y - h * 0.62, w, 4 * s);
    ctx.fillRect(x - w * 0.48, y - h * 0.8, w * 0.96, 5 * s);
    roof(ctx, x, y - h * 0.8, w * 0.3, 10 * s, 5 * s);
    roof(ctx, x - w * 0.32, y - h * 0.66, w * 0.17, 8 * s, 4 * s);
    roof(ctx, x + w * 0.32, y - h * 0.66, w * 0.17, 8 * s, 4 * s);
    glowWindow(ctx, x - w * 0.1, y - h * 0.58, w * 0.2, h * 0.08, opts);
  }

  /**
   * A garden wall pierced by a moon gate. Moonlight pools in the
   * opening so it reads as a passage rather than a hole in a box.
   */
  function moongate(ctx, x, y, s, opts) {
    const wallW = 120 * s;
    const wallH = 46 * s;
    const r = wallH * 0.36;
    const cy = y - wallH * 0.44;
    if (opts.light) Art.drawGlow(ctx, x, cy, r * 2.2, opts.light, 0.4);
    ctx.fillStyle = opts.ink;
    ctx.beginPath();
    ctx.moveTo(x - wallW / 2, y);
    ctx.lineTo(x - wallW / 2, y - wallH * 0.62);
    ctx.lineTo(x - r * 1.5, y - wallH * 0.62);
    ctx.lineTo(x - r * 1.5, y - wallH);
    ctx.lineTo(x + r * 1.5, y - wallH);
    ctx.lineTo(x + r * 1.5, y - wallH * 0.62);
    ctx.lineTo(x + wallW / 2, y - wallH * 0.62);
    ctx.lineTo(x + wallW / 2, y);
    ctx.closePath();
    ctx.moveTo(x + r, cy);
    ctx.arc(x, cy, r, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    roof(ctx, x, y - wallH + 1, r * 1.75, 8 * s, 4 * s);
    for (const side of [-1, 1]) {
      const segX = x + side * (r * 1.5 + (wallW / 2 - r * 1.5) / 2);
      roof(ctx, segX, y - wallH * 0.62 + 1, (wallW / 2 - r * 1.5) * 0.56, 5 * s, 2.5 * s);
    }
    if (opts.light) {
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = opts.light;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.arc(x, cy, r - 0.6 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function ruin(ctx, x, y, s, opts) {
    const random = opts.random;
    ctx.fillStyle = opts.ink;
    const columns = 3 + Math.floor(random() * 2);
    const spacing = 22 * s;
    for (let i = 0; i < columns; i += 1) {
      const px = x + (i - (columns - 1) / 2) * spacing;
      const height = (34 + random() * 30) * s;
      ctx.fillRect(px - 4 * s, y - height, 8 * s, height);
      ctx.fillRect(px - 6 * s, y - height - 3 * s, 12 * s, 3 * s);
    }
    if (random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(x - spacing * 1.2, y - 58 * s);
      ctx.lineTo(x + spacing * 0.4, y - 66 * s);
      ctx.lineTo(x + spacing * 0.5, y - 60 * s);
      ctx.lineTo(x - spacing * 1.1, y - 52 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - spacing * 2, y - 4 * s, spacing * 4, 4 * s);
  }

  function palace(ctx, x, y, s, opts) {
    const w = 150 * s;
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - w * 0.6, y - 10 * s, w * 1.2, 10 * s);
    ctx.fillRect(x - w * 0.5, y - 18 * s, w, 8 * s);
    ctx.fillRect(x - w * 0.38, y - 44 * s, w * 0.76, 26 * s);
    for (let i = 0; i < 6; i += 1) glowWindow(ctx, x - w * 0.3 + i * w * 0.115, y - 38 * s, w * 0.06, 14 * s, opts);
    ctx.fillStyle = opts.ink;
    roof(ctx, x, y - 44 * s, w * 0.5, 14 * s, 6 * s);
    ctx.fillRect(x - w * 0.24, y - 66 * s, w * 0.48, 10 * s);
    roof(ctx, x, y - 64 * s, w * 0.32, 16 * s, 7 * s);
    for (const side of [-1, 1]) {
      const tx = x + side * w * 0.56;
      ctx.fillRect(tx - 9 * s, y - 50 * s, 18 * s, 40 * s);
      roof(ctx, tx, y - 50 * s, 13 * s, 11 * s, 4 * s);
      glowWindow(ctx, tx - 3 * s, y - 42 * s, 6 * s, 8 * s, opts);
      ctx.fillStyle = opts.ink;
    }
  }

  function lighthouse(ctx, x, y, s, opts) {
    ctx.fillStyle = opts.ink;
    ctx.beginPath();
    ctx.moveTo(x - 13 * s, y);
    ctx.lineTo(x - 8 * s, y - 92 * s);
    ctx.lineTo(x + 8 * s, y - 92 * s);
    ctx.lineTo(x + 13 * s, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 12 * s, y - 96 * s, 24 * s, 4 * s);
    glowWindow(ctx, x - 6 * s, y - 108 * s, 12 * s, 11 * s, { light: opts.light || "#ffe2a0" });
    ctx.fillStyle = opts.ink;
    roof(ctx, x, y - 108 * s, 11 * s, 9 * s, 3 * s);
    for (let band = 1; band <= 3; band += 1) {
      ctx.save();
      ctx.globalAlpha *= 0.4;
      ctx.fillStyle = opts.rim || "#ffffff";
      ctx.fillRect(x - (12 - band) * s, y - band * 24 * s, (24 - band * 2) * s, 2 * s);
      ctx.restore();
    }
  }

  function clocktower(ctx, x, y, s, opts) {
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - 15 * s, y - 104 * s, 30 * s, 104 * s);
    ctx.fillRect(x - 19 * s, y - 108 * s, 38 * s, 5 * s);
    roof(ctx, x, y - 108 * s, 20 * s, 18 * s, 6 * s);
    const dialY = y - 80 * s;
    ctx.save();
    ctx.fillStyle = opts.light || "#f6e3a8";
    ctx.globalAlpha *= 0.85;
    ctx.beginPath();
    ctx.arc(x, dialY, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    Art.drawGlow(ctx, x, dialY, 26 * s, opts.light || "#f6e3a8", 0.35);
    ctx.strokeStyle = opts.ink;
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(x, dialY);
    ctx.lineTo(x, dialY - 7 * s);
    ctx.moveTo(x, dialY);
    ctx.lineTo(x + 5 * s, dialY + 2 * s);
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) glowWindow(ctx, x - 3 * s, y - (52 - i * 14) * s, 6 * s, 7 * s, opts);
  }

  function colonnade(ctx, x, y, s, opts) {
    const span = 130 * s;
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - span / 2, y - 6 * s, span, 6 * s);
    const columns = 7;
    for (let i = 0; i < columns; i += 1) {
      const px = x - span / 2 + 6 * s + i * ((span - 12 * s) / (columns - 1));
      ctx.fillRect(px - 2.2 * s, y - 34 * s, 4.4 * s, 28 * s);
    }
    ctx.fillRect(x - span / 2, y - 38 * s, span, 5 * s);
    ctx.beginPath();
    ctx.moveTo(x - span / 2 - 8 * s, y - 36 * s);
    ctx.quadraticCurveTo(x, y - 52 * s, x + span / 2 + 8 * s, y - 36 * s);
    ctx.lineTo(x + span / 2 - 6 * s, y - 42 * s);
    ctx.quadraticCurveTo(x, y - 56 * s, x - span / 2 + 6 * s, y - 42 * s);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < columns - 1; i += 2) {
      const px = x - span / 2 + 8 * s + i * ((span - 12 * s) / (columns - 1));
      glowWindow(ctx, px + 4 * s, y - 26 * s, 8 * s, 9 * s, opts);
      ctx.fillStyle = opts.ink;
    }
  }

  function bridge(ctx, x, y, s, opts) {
    const span = 120 * s;
    const rise = 34 * s;
    ctx.fillStyle = opts.ink;
    ctx.beginPath();
    ctx.moveTo(x - span / 2, y);
    ctx.quadraticCurveTo(x, y - rise * 2, x + span / 2, y);
    ctx.lineTo(x + span / 2 - 10 * s, y);
    ctx.quadraticCurveTo(x, y - rise * 1.5, x - span / 2 + 10 * s, y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.6 * s;
    ctx.strokeStyle = opts.ink;
    ctx.beginPath();
    ctx.moveTo(x - span / 2, y - 6 * s);
    ctx.quadraticCurveTo(x, y - rise * 2 - 8 * s, x + span / 2, y - 6 * s);
    ctx.stroke();
    for (let i = 1; i < 8; i += 1) {
      const t = i / 8;
      const px = x - span / 2 + span * t;
      const py = y - 6 * s - 4 * rise * t * (1 - t) * 1.0;
      ctx.fillRect(px - 0.8 * s, py - 6 * s, 1.6 * s, 6 * s);
    }
  }

  function junk(ctx, x, y, s, opts) {
    ctx.fillStyle = opts.ink;
    ctx.beginPath();
    ctx.moveTo(x - 34 * s, y - 10 * s);
    ctx.quadraticCurveTo(x, y + 4 * s, x + 36 * s, y - 14 * s);
    ctx.lineTo(x + 30 * s, y - 4 * s);
    ctx.quadraticCurveTo(x, y + 6 * s, x - 28 * s, y - 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 1 * s, y - 62 * s, 2 * s, 54 * s);
    ctx.fillRect(x + 15 * s, y - 44 * s, 1.6 * s, 34 * s);
    sail(ctx, x + 1 * s, y - 60 * s, 26 * s, 44 * s, opts);
    sail(ctx, x + 16 * s, y - 42 * s, 18 * s, 28 * s, opts);
  }

  function sail(ctx, x, top, w, h, opts) {
    ctx.save();
    ctx.fillStyle = opts.sail || opts.ink;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + w * 0.9, top + h * 0.2, x + w, top + h);
    ctx.lineTo(x, top + h * 0.96);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha *= 0.4;
    ctx.strokeStyle = opts.ink;
    ctx.lineWidth = Math.max(0.6, w * 0.03);
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x, top + (h * i) / 5);
      ctx.lineTo(x + w * (0.4 + i * 0.12), top + (h * i) / 5 + h * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  }

  function chimney(ctx, x, y, s, opts) {
    ctx.fillStyle = opts.ink;
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y);
    ctx.lineTo(x - 7 * s, y - 70 * s);
    ctx.lineTo(x + 7 * s, y - 70 * s);
    ctx.lineTo(x + 14 * s, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 9 * s, y - 74 * s, 18 * s, 5 * s);
    const glow = opts.light || "#ff9a5c";
    Art.drawGlow(ctx, x, y - 76 * s, 30 * s, glow, 0.55);
    glowWindow(ctx, x - 4 * s, y - 30 * s, 8 * s, 10 * s, { light: glow });
  }

  function crystals(ctx, x, y, s, opts) {
    const random = opts.random;
    const count = 3 + Math.floor(random() * 3);
    const glow = opts.light || "#ffb07a";
    Art.drawGlow(ctx, x, y - 18 * s, 46 * s, glow, 0.3);
    for (let i = 0; i < count; i += 1) {
      const lean = (random() - 0.5) * 0.7;
      const height = (24 + random() * 42) * s;
      const width = (6 + random() * 7) * s;
      const bx = x + (i - (count - 1) / 2) * 9 * s;
      ctx.save();
      ctx.translate(bx, y);
      ctx.rotate(lean);
      ctx.fillStyle = opts.ink;
      ctx.beginPath();
      ctx.moveTo(-width, 0);
      ctx.lineTo(-width * 0.8, -height * 0.78);
      ctx.lineTo(0, -height);
      ctx.lineTo(width * 0.8, -height * 0.78);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(0, -height);
      ctx.lineTo(width * 0.8, -height * 0.78);
      ctx.lineTo(width * 0.5, -height * 0.1);
      ctx.lineTo(0, -height * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function rings(ctx, x, y, s, opts) {
    ctx.save();
    ctx.strokeStyle = opts.ink;
    ctx.lineWidth = 4 * s;
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - 3 * s, y - 60 * s, 6 * s, 60 * s);
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y - 78 * s, 40 * s, (14 + i * 9) * s, i * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = opts.light || "#ffd1e0";
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.ellipse(x, y - 78 * s, 40 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    Art.drawGlow(ctx, x, y - 78 * s, 22 * s, opts.light || "#ffd1e0", 0.45);
  }

  // --- flora ----------------------------------------------------------------

  function pine(ctx, x, y, s, opts) {
    const random = opts.random;
    const height = (70 + random() * 46) * s;
    const lean = (random() - 0.5) * 0.5;
    ctx.save();
    ctx.strokeStyle = opts.ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const topX = x + lean * height;
    ctx.bezierCurveTo(x + lean * height * 0.2 - 8 * s, y - height * 0.4, topX + 10 * s, y - height * 0.7, topX, y - height);
    ctx.stroke();
    ctx.fillStyle = opts.foliage || opts.ink;
    const pads = 4 + Math.floor(random() * 2);
    for (let i = 0; i < pads; i += 1) {
      const t = 0.35 + (i / pads) * 0.65;
      const py = y - height * t;
      const side = i % 2 ? 1 : -1;
      const reach = (16 + random() * 16) * s * (1.2 - t * 0.6);
      const px = x + lean * height * t + side * reach * 0.6;
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(x + lean * height * t, py + 4 * s);
      ctx.quadraticCurveTo(px - side * reach * 0.2, py + 2 * s, px, py);
      ctx.stroke();
      for (let blob = -2; blob <= 2; blob += 1) {
        ctx.beginPath();
        ctx.ellipse(px + blob * reach * 0.32, py - Math.abs(blob) * -1.6 * s, reach * 0.42, 6.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (opts.rim) {
        ctx.save();
        ctx.globalAlpha *= 0.18;
        ctx.fillStyle = opts.rim;
        ctx.beginPath();
        ctx.ellipse(px, py - 4 * s, reach * 0.9, 2.4 * s, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = opts.foliage || opts.ink;
      }
    }
    ctx.restore();
  }

  function plum(ctx, x, y, s, opts) {
    const random = opts.random;
    const blossoms = [];
    ctx.save();
    ctx.strokeStyle = opts.ink;
    ctx.lineCap = "round";
    const branch = (bx, by, angle, length, width, depth) => {
      const ex = bx + Math.cos(angle) * length;
      const ey = by + Math.sin(angle) * length;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (depth <= 0 || length < 6 * s) {
        blossoms.push([ex, ey]);
        return;
      }
      const forks = depth > 2 ? 2 : 1 + Math.floor(random() * 2);
      for (let i = 0; i < forks; i += 1) {
        const turn = (random() - 0.5) * 1.3 + (i === 0 ? -0.35 : 0.4);
        branch(ex, ey, angle + turn, length * (0.62 + random() * 0.2), width * 0.66, depth - 1);
      }
      if (random() > 0.45) blossoms.push([ex + (random() - 0.5) * 6 * s, ey + (random() - 0.5) * 6 * s]);
    };
    branch(x, y, -Math.PI / 2 + (random() - 0.5) * 0.5, 30 * s, 5 * s, 4);
    const baseAlpha = ctx.globalAlpha;
    for (const [bx, by] of blossoms) {
      ctx.fillStyle = opts.blossom || "#f2b6c4";
      ctx.globalAlpha = baseAlpha * 0.9;
      for (let petal = 0; petal < 5; petal += 1) {
        const a = (petal / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(bx + Math.cos(a) * 2.1 * s, by + Math.sin(a) * 2.1 * s, 1.9 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = baseAlpha;
      ctx.fillStyle = opts.ink;
      ctx.beginPath();
      ctx.arc(bx, by, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function willow(ctx, x, y, s, opts) {
    const random = opts.random;
    const height = (60 + random() * 30) * s;
    ctx.save();
    ctx.strokeStyle = opts.ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 5 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 6 * s, y - height * 0.5, x + 4 * s, y - height);
    ctx.stroke();
    ctx.strokeStyle = opts.foliage || opts.ink;
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 18; i += 1) {
      const sx = x + 4 * s + (random() - 0.5) * 50 * s;
      const sy = y - height + random() * 12 * s;
      const len = (30 + random() * 40) * s;
      ctx.beginPath();
      ctx.moveTo(x + 4 * s, y - height);
      ctx.quadraticCurveTo(sx, sy - 10 * s, sx + (random() - 0.5) * 8 * s, sy + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function bamboo(ctx, x, y, s, opts) {
    const random = opts.random;
    ctx.save();
    ctx.fillStyle = opts.ink;
    ctx.strokeStyle = opts.foliage || opts.ink;
    const stalks = 3 + Math.floor(random() * 3);
    for (let i = 0; i < stalks; i += 1) {
      const sx = x + (i - stalks / 2) * 6 * s;
      const height = (60 + random() * 50) * s;
      const lean = (random() - 0.5) * 0.12;
      for (let node = 0; node * 12 * s < height; node += 1) {
        const ny = y - node * 12 * s;
        ctx.fillRect(sx + lean * node * 12 * s - 1.4 * s, ny - 11 * s, 2.8 * s, 10.4 * s);
      }
      ctx.lineWidth = 2 * s;
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const ly = y - height * (0.45 + random() * 0.55);
        const dir = random() > 0.5 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(sx + dir * 9 * s, ly, 10 * s, 2.2 * s, dir * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = opts.foliage || opts.ink;
        ctx.fill();
        ctx.fillStyle = opts.ink;
      }
    }
    ctx.restore();
  }

  function reeds(ctx, x, y, s, opts) {
    const random = opts.random;
    ctx.save();
    ctx.strokeStyle = opts.ink;
    ctx.lineCap = "round";
    const count = 5 + Math.floor(random() * 5);
    for (let i = 0; i < count; i += 1) {
      const rx = x + (random() - 0.5) * 28 * s;
      const height = (24 + random() * 30) * s;
      const bend = (random() - 0.3) * 14 * s;
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.quadraticCurveTo(rx + bend * 0.3, y - height * 0.6, rx + bend, y - height);
      ctx.stroke();
      if (random() > 0.5) {
        ctx.fillStyle = opts.ink;
        ctx.beginPath();
        ctx.ellipse(rx + bend, y - height - 4 * s, 1.8 * s, 5 * s, bend * 0.02, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function lotus(ctx, x, y, s, opts) {
    const random = opts.random;
    ctx.save();
    ctx.fillStyle = opts.foliage || opts.ink;
    for (let i = 0; i < 3; i += 1) {
      const lx = x + (i - 1) * 18 * s + (random() - 0.5) * 6 * s;
      ctx.beginPath();
      ctx.ellipse(lx, y - 2 * s, (10 + random() * 6) * s, 3.4 * s, 0, 0.18, Math.PI * 2 - 0.18);
      ctx.lineTo(lx, y - 2 * s);
      ctx.fill();
    }
    ctx.strokeStyle = opts.ink;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, y);
    ctx.quadraticCurveTo(x + 2 * s, y - 14 * s, x + 6 * s, y - 24 * s);
    ctx.stroke();
    ctx.fillStyle = opts.blossom || "#e9a4b8";
    for (const angle of [-0.5, 0, 0.5]) {
      ctx.save();
      ctx.translate(x + 6 * s, y - 24 * s);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -5 * s, 2.6 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  const STRUCTURES = Object.freeze({
    pavilion, pagoda, paifang, moongate, ruin, palace, lighthouse, clocktower, colonnade, bridge, junk, chimney, crystals, rings,
  });
  const FLORA = Object.freeze({ pine, plum, willow, bamboo, reeds, lotus });

  function drawStructure(ctx, kind, x, y, s, opts) {
    const fn = STRUCTURES[kind];
    if (fn) fn(ctx, x, y, s, opts);
  }

  function drawFlora(ctx, kind, x, y, s, opts) {
    const fn = FLORA[kind];
    if (fn) fn(ctx, x, y, s, opts);
  }

  const api = { STRUCTURES, FLORA, roof, drawStructure, drawFlora };
  root.NiniYuanMotifs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
