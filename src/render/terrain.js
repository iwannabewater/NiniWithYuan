((root) => {
  "use strict";

  // Playfield terrain: platforms, hazards, and springs, painted in the same
  // nocturnal blue-green scroll as the backdrop.
  //
  // Earth follows the blue-green landscape convention: mineral green or azurite
  // on the lit upper planes, ochre and umber in the body, hemp-fibre texture
  // strokes, and moss dots along the crest. Crystal, aurora, phase, and amber
  // slabs read as cut glass; moving bridges are carved jade with gilt studs.
  //
  // `prepare` builds every static shape once per chapter as Path2D plus
  // gradients in world space. `draw` then culls to the camera and issues a few
  // fills per visible piece, so terrain costs little per frame and allocates
  // nothing.
  //
  // Collision honesty: the walkable top of every platform is drawn exactly on
  // its collision edge and the flanks never bulge past it. Only grass and small
  // props rise a few pixels above the top, and rocky undersides hang below a
  // slab only where nothing walkable lies beneath it.

  const Art = dependency("NiniYuanArt", "./art.js");

  const TILE = 48;
  const FLOOR_EXTENSION = 160;
  const INK_SHADOW = "rgba(10,15,21,0.32)";
  const INK_EDGE = "rgba(12,10,14,0.78)";
  const INK_SOFT = "rgba(12,10,14,0.45)";
  const CLOUD_EDGE = "rgba(29,42,61,0.35)";
  const WHITE_CLOUD = "rgba(255,255,255,0.55)";
  const WHITE_FACET = "rgba(255,255,255,0.13)";
  const WHITE_BEVEL = "rgba(255,255,255,0.32)";
  const WHITE_STONE_LIGHT = "rgba(255,255,255,0.12)";
  const AMBER_CRACK = "rgba(58,29,16,0.6)";
  const SPIKE_EDGE = "rgba(10,15,21,0.75)";
  const SPIKE_LIGHT = "rgba(255,255,255,0.35)";
  const SPRING_SHADOW = "rgba(10,15,21,0.35)";
  const SPRING_EDGE = "rgba(10,15,21,0.8)";
  const HAZARD_ROCK = "#2a1a22";
  const HAZARD_ROCK_DEEP = "#120b10";
  const GOLD = "#c3a468";
  const GOLD_LIGHT = "#e2c27d";

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the terrain`);
  }

  // Night-graded mineral palettes per world. `top` is the mineral pigment on
  // the lit crest, `body` the ochre or slate mass, `cun` the texture ink.
  const MATERIALS = Object.freeze({
    world1: Object.freeze({
      topLight: "#a9d3b0", top: "#4f8d77", body: "#6a4b3e", bodyDeep: "#1e1519", cun: "#2b1d1d",
      moss: "#1c2f28", grass: "#7fb592", stone: "#7a7c8f", flower: "#f0b6c4", trim: GOLD,
    }),
    world2: Object.freeze({
      topLight: "#9fd2d6", top: "#3f7f93", body: "#6c5843", bodyDeep: "#1a1719", cun: "#2a2019",
      moss: "#16292c", grass: "#78b6b0", stone: "#76879a", flower: "#f7e2a2", trim: GOLD,
    }),
    world3: Object.freeze({
      topLight: "#cfe8ea", top: "#6f9ba8", body: "#4a5a6f", bodyDeep: "#121a25", cun: "#1c2633",
      moss: "#1a2b33", grass: "#a3cfd6", stone: "#7590a6", flower: "#b9f0ff", trim: "#cfe9f2",
    }),
    world4: Object.freeze({
      topLight: "#d9dcf4", top: "#7b84b8", body: "#4e4466", bodyDeep: "#16132a", cun: "#221c36",
      moss: "#1d1a33", grass: "#b5bde6", stone: "#8287ab", flower: "#fbe7c6", trim: "#e9cf94",
    }),
  });

  const GLASS_TINTS = Object.freeze({
    crystal: "#8fb8ae",
    aurora: "#8f86c4",
    amber: "#e3a75a",
    a: "#7fb0cc",
    b: "#7fc8ad",
  });

  const PHASE_COLORS = Object.freeze({ a: GLASS_TINTS.a, b: GLASS_TINTS.b });

  function materialFor(worldId) {
    return MATERIALS[worldId] || MATERIALS.world1;
  }

  function isPath2DAvailable() {
    return typeof root.Path2D === "function";
  }

  function kindOf(platform) {
    if (platform.type === "phase") return "phase";
    if (platform.type === "breakable") return "amber";
    if (platform.type === "cloud") return "cloud";
    if (platform.type === "crystal") return "crystal";
    if (platform.type === "aurora") return "aurora";
    if (platform.type === "stone") return "stone";
    if (platform.type === "jade") return "jade";
    return "earth";
  }

  // --- geometry ------------------------------------------------------------------

  /**
   * Clear space directly below a platform before anything solid or deadly,
   * capped at `limit`. Rocky undersides only hang into genuinely empty air.
   */
  function clearanceBelow(level, p, limit) {
    const bottom = p.y + p.h;
    let gap = Math.min(limit, level.height - bottom);
    const scan = (items) => {
      for (const other of items) {
        if (other === p || other.x >= p.x + p.w || other.x + other.w <= p.x) continue;
        if (other.y + (other.h || 0) <= bottom) continue;
        gap = Math.min(gap, Math.max(0, other.y - bottom));
      }
    };
    scan(level.platforms);
    scan(level.moving);
    scan(level.hazards);
    return Math.max(0, gap);
  }

  /**
   * An earth slab: a straight walkable top, flanks that only ever wobble
   * inward, and a bottom that either runs off the floor or tapers into a
   * hanging underside of `hang` pixels.
   */
  function earthPath(p, random, floor, hang) {
    const path = new root.Path2D();
    const x0 = p.x;
    const x1 = p.x + p.w;
    const y0 = p.y;
    const y1 = floor ? p.y + p.h + FLOOR_EXTENSION : p.y + p.h;
    const sideSteps = Math.max(2, Math.round((y1 - y0) / 18));
    const inset = (t) => (t < 0.18 ? 0 : random() * 2.2 + t * (floor ? 2 : 4));
    path.moveTo(x0, y0);
    path.lineTo(x1, y0);
    for (let i = 1; i <= sideSteps; i += 1) {
      const t = i / sideSteps;
      path.lineTo(x1 - inset(t), y0 + (y1 - y0) * t);
    }
    if (!floor) {
      const steps = Math.max(5, Math.round(p.w / 22));
      for (let i = steps - 1; i >= 1; i -= 1) {
        const t = i / steps;
        const belly = Math.pow(Math.sin(t * Math.PI), 0.8);
        const drop = hang > 0 ? belly * hang * (0.6 + random() * 0.4) : -random() * 3;
        path.lineTo(x0 + p.w * t + (random() - 0.5) * 6, y1 + drop);
      }
    }
    for (let i = sideSteps; i >= 1; i -= 1) {
      const t = i / sideSteps;
      path.lineTo(x0 + inset(t), y0 + (y1 - y0) * t);
    }
    path.closePath();
    return path;
  }

  /** The mineral crest: a straight top with soft drips down the face. */
  function crestPath(p, random, depth) {
    const path = new root.Path2D();
    path.moveTo(p.x, p.y);
    path.lineTo(p.x + p.w, p.y);
    let x = p.x + p.w;
    path.lineTo(x, p.y + depth * 0.6);
    while (x > p.x) {
      const span = 10 + random() * 22;
      const nx = Math.max(p.x, x - span);
      const drip = depth * (0.7 + random() * 1.1);
      path.quadraticCurveTo((x + nx) / 2, p.y + drip, nx, p.y + depth * (0.45 + random() * 0.35));
      x = nx;
    }
    path.closePath();
    return path;
  }

  /** Hemp-fibre texture strokes: long, slightly bowed, mostly downward. */
  function cunPath(p, random, depthLimit) {
    const path = new root.Path2D();
    const reach = Math.min(p.h, depthLimit);
    const area = p.w * reach;
    const count = Math.min(70, Math.max(3, Math.round(area / 820)));
    for (let i = 0; i < count; i += 1) {
      const sx = p.x + 6 + random() * (p.w - 12);
      const sy = p.y + 10 + Math.pow(random(), 0.8) * Math.max(6, reach - 18);
      const length = 7 + random() * 18;
      const lean = (random() < 0.5 ? -1 : 1) * (0.2 + random() * 0.35);
      const ex = sx + lean * length;
      const ey = sy + length;
      path.moveTo(sx, sy);
      path.quadraticCurveTo(sx + lean * length * 0.2 + (random() - 0.5) * 4, sy + length * 0.55, ex, ey);
    }
    // A few long contour strokes give the slab its folded planes.
    const folds = Math.min(4, Math.floor(p.w / 120) + 1);
    for (let i = 0; i < folds; i += 1) {
      let x = p.x + 10 + random() * (p.w * 0.4);
      let y = p.y + 14 + random() * Math.max(4, reach * 0.5);
      path.moveTo(x, y);
      const segments = 2 + Math.floor(random() * 3);
      for (let s = 0; s < segments; s += 1) {
        const nx = Math.min(p.x + p.w - 8, x + 20 + random() * 40);
        const ny = y + (random() - 0.3) * 10;
        path.quadraticCurveTo((x + nx) / 2, y + (random() - 0.5) * 8, nx, ny);
        x = nx;
        y = ny;
      }
    }
    return path;
  }

  /** Moss dots: ink dots gathered along the crest and down the corners. */
  function mossPath(p, random) {
    const path = new root.Path2D();
    const clusters = Math.max(2, Math.round(p.w / 46));
    for (let c = 0; c < clusters; c += 1) {
      const cx = p.x + 6 + random() * (p.w - 12);
      const cy = p.y + 4 + random() * 8;
      const dots = 3 + Math.floor(random() * 5);
      for (let d = 0; d < dots; d += 1) {
        const x = cx + (random() - 0.5) * 16;
        const y = cy + random() * 7;
        if (x < p.x + 2 || x > p.x + p.w - 2) continue;
        const r = 0.7 + random() * 1.2;
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    return path;
  }

  function grassPath(p, random, density) {
    const path = new root.Path2D();
    let x = p.x + 3 + random() * 6;
    while (x < p.x + p.w - 3) {
      const blades = 2 + Math.floor(random() * 3);
      for (let b = 0; b < blades; b += 1) {
        const bx = x + b * 1.7;
        const h = 3 + random() * 5.5;
        path.moveTo(bx - 0.9, p.y + 0.5);
        path.quadraticCurveTo(bx + (random() - 0.5) * 2, p.y - h * 0.6, bx + (random() - 0.4) * 3, p.y - h);
        path.lineTo(bx + 0.9, p.y + 0.5);
      }
      x += (12 + random() * 26) / density;
    }
    return path;
  }

  /** Roots and vines hanging from a floating slab's underside. */
  function rootsPath(p, random, hang) {
    const path = new root.Path2D();
    const count = Math.max(1, Math.round(p.w / 70));
    for (let i = 0; i < count; i += 1) {
      const t = 0.2 + random() * 0.6;
      const x = p.x + p.w * t;
      const y = p.y + p.h + Math.pow(Math.sin(t * Math.PI), 0.8) * hang * 0.75;
      const length = 8 + random() * 22;
      const sway = (random() - 0.5) * 10;
      path.moveTo(x, y - 2);
      path.bezierCurveTo(x + sway, y + length * 0.4, x - sway, y + length * 0.7, x + sway * 0.5, y + length);
    }
    return path;
  }

  function chamferPath(x, y, w, h, c) {
    const path = new root.Path2D();
    const k = Math.min(c, w / 4, h / 3);
    path.moveTo(x, y);
    path.lineTo(x + w, y);
    path.lineTo(x + w, y + h - k);
    path.lineTo(x + w - k, y + h);
    path.lineTo(x + k, y + h);
    path.lineTo(x, y + h - k);
    path.closePath();
    return path;
  }

  function roundedPath(x, y, w, h, r) {
    const path = new root.Path2D();
    const k = Math.min(r, w / 2, h / 2);
    path.moveTo(x + k, y);
    path.lineTo(x + w - k, y);
    path.quadraticCurveTo(x + w, y, x + w, y + k);
    path.lineTo(x + w, y + h - k);
    path.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
    path.lineTo(x + k, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - k);
    path.lineTo(x, y + k);
    path.quadraticCurveTo(x, y, x + k, y);
    path.closePath();
    return path;
  }

  /** Slanted light planes inside a glass slab. */
  function facetsPath(p, random) {
    const path = new root.Path2D();
    const count = Math.max(1, Math.min(5, Math.round(p.w / 60)));
    for (let i = 0; i < count; i += 1) {
      const width = 6 + random() * 18;
      const slant = Math.min(p.h * 0.6, 4 + random() * 10);
      const span = p.w - width - slant - 8;
      if (span <= 0) break;
      const fx = p.x + 4 + slant + random() * span;
      path.moveTo(fx, p.y + 3);
      path.lineTo(fx + width, p.y + 3);
      path.lineTo(fx + width - slant, p.y + p.h - 3);
      path.lineTo(fx - slant, p.y + p.h - 3);
      path.closePath();
    }
    return path;
  }

  function cracksPath(p, random) {
    const path = new root.Path2D();
    const count = Math.max(2, Math.round(p.w / 40));
    for (let i = 0; i < count; i += 1) {
      let x = p.x + 8 + random() * (p.w - 16);
      let y = p.y + 2;
      path.moveTo(x, y);
      const steps = 2 + Math.floor(random() * 3);
      for (let s = 0; s < steps; s += 1) {
        x += (random() - 0.5) * 10;
        y += p.h / steps;
        path.lineTo(x, Math.min(p.y + p.h - 2, y));
      }
    }
    return path;
  }

  /** A soft band of aurora light trapped in the glass. */
  function auroraBandPath(p, random) {
    const path = new root.Path2D();
    const mid = p.y + p.h * (0.45 + random() * 0.15);
    const amp = Math.min(5, p.h * 0.2);
    const thickness = Math.max(3, p.h * 0.22);
    path.moveTo(p.x + 3, mid);
    const steps = Math.max(3, Math.round(p.w / 24));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      path.lineTo(p.x + 3 + (p.w - 6) * t, mid + Math.sin(t * Math.PI * 2 + random()) * amp);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const t = i / steps;
      path.lineTo(p.x + 3 + (p.w - 6) * t, mid + thickness + Math.sin(t * Math.PI * 2 + 1.3) * amp * 0.7);
    }
    path.closePath();
    return path;
  }

  function cloudPath(p, random) {
    const path = new root.Path2D();
    const puffs = Math.max(3, Math.round(p.w / 22));
    for (let i = 0; i < puffs; i += 1) {
      const t = (i + 0.5) / puffs;
      const cx = p.x + p.w * t;
      const r = Math.min(p.h * 0.75, 14 + random() * 10);
      // Puffs stay inside the collision box: tops touch the walkable edge.
      const rx = Math.min(r, cx - p.x, p.x + p.w - cx);
      const ry = r * 0.62;
      path.moveTo(cx + rx, p.y + ry);
      path.ellipse(cx, p.y + ry, rx, ry, 0, 0, Math.PI * 2);
    }
    path.rect(p.x + 4, p.y + 4, p.w - 8, Math.max(6, p.h - 8));
    return path;
  }

  function stoneBlocksPath(p, random) {
    const path = new root.Path2D();
    const rows = Math.max(1, Math.round(p.h / 24));
    const rowH = p.h / rows;
    for (let r = 0; r < rows; r += 1) {
      const y = p.y + r * rowH;
      if (r > 0) {
        path.moveTo(p.x + 2, y);
        path.lineTo(p.x + p.w - 2, y);
      }
      let x = p.x + (r % 2 ? 14 : 30) + random() * 8;
      while (x < p.x + p.w - 8) {
        path.moveTo(x, y + 2);
        path.lineTo(x, y + rowH - 2);
        x += 34 + random() * 16;
      }
    }
    return path;
  }

  function jadeStudsPath(p) {
    const path = new root.Path2D();
    const cy = p.y + p.h / 2 + 1;
    const count = Math.max(1, Math.floor(p.w / 34));
    const spacing = p.w / (count + 1);
    for (let i = 1; i <= count; i += 1) {
      const cx = p.x + spacing * i;
      path.moveTo(cx + 2.2, cy);
      path.arc(cx, cy, 2.2, 0, Math.PI * 2);
    }
    return path;
  }

  function decorFor(p, random, worldId) {
    const items = [];
    const count = Math.floor(p.w / 70);
    for (let i = 0; i < count; i += 1) {
      if (random() < 0.45) continue;
      const x = p.x + 16 + random() * Math.max(8, p.w - 32);
      const roll = random();
      if (worldId === "world1" && roll < 0.45) items.push({ kind: "flower", x, size: 0.8 + random() * 0.5 });
      else if (worldId === "world3" && roll < 0.5) items.push({ kind: "reed", x, size: 0.8 + random() * 0.6 });
      else if (roll < 0.75) items.push({ kind: "stone", x, size: 0.7 + random() * 0.8 });
      else items.push({ kind: "tuft", x, size: 1 + random() * 0.5 });
    }
    return items;
  }

  // --- preparation -------------------------------------------------------------------

  /**
   * Build every terrain recipe for a chapter. `ctx` only creates gradients;
   * nothing is drawn here.
   */
  function prepare(ctx, level) {
    const worldId = level.world?.id || "world1";
    const material = materialFor(worldId);
    const colors = {
      rim: Art.rgba(material.topLight, 0.85),
      cun: Art.rgba(material.cun, 0.5),
      moss: Art.rgba(material.moss, 0.85),
      roots: Art.rgba(material.cun, 0.7),
      stem: Art.shade(material.grass, -0.35),
      pebble: Art.mix(material.stone, material.bodyDeep, 0.35),
      reed: Art.shade(material.grass, -0.25),
      side: Art.rgba(material.bodyDeep, 0.38),
    };
    if (!isPath2DAvailable()) return { pieces: [], hazards: [], material, colors, worldId, level };
    const pieces = [];
    level.platforms.forEach((platform, index) => {
      pieces.push(buildPiece(ctx, level, platform, `${level.id}:p${index}`, material, worldId, null));
    });
    level.moving.forEach((platform, index) => {
      pieces.push(buildPiece(ctx, level, { ...platform, x: 0, y: 0 }, `${level.id}:m${index}`, material, worldId, platform));
    });
    const hazards = level.hazards.map((hazard) => prepareHazard(ctx, hazard));
    return { pieces, hazards, material, colors, worldId, level };
  }

  function buildPiece(ctx, level, p, seed, material, worldId, live) {
    const random = Art.rng(seed);
    const kind = kindOf(p);
    const piece = { platform: live || p, kind, moving: !!live, phase: p.phase || "", local: p };
    if (kind === "earth") buildEarth(ctx, level, piece, p, random, material, worldId);
    else if (kind === "stone") buildStone(ctx, piece, p, random, material);
    else if (kind === "cloud") buildCloud(ctx, piece, p, random);
    else if (kind === "jade") buildJade(ctx, piece, p);
    else buildGlass(ctx, piece, p, random, kind);
    return piece;
  }

  function buildEarth(ctx, level, piece, p, random, material, worldId) {
    const floor = !piece.moving && p.y + p.h >= level.height - 1;
    const clearance = floor || piece.moving ? 0 : clearanceBelow(level, p, 120);
    const thick = p.h >= TILE * 2;
    const hang = clearance >= 40 ? Math.min(thick ? 56 : 26, clearance * 0.55) : 0;
    const bottom = floor ? p.y + p.h + FLOOR_EXTENSION : p.y + p.h + hang;
    piece.body = earthPath(p, random, floor, hang);
    const span = Math.max(1, bottom - p.y);
    const band = Math.min(0.42, 18 / span);
    const fill = ctx.createLinearGradient(0, p.y, 0, bottom);
    fill.addColorStop(0, material.topLight);
    fill.addColorStop(band * 0.25, material.top);
    fill.addColorStop(band, Art.mix(material.top, material.body, 0.55));
    fill.addColorStop(Math.min(0.9, band + 56 / span), material.body);
    fill.addColorStop(1, material.bodyDeep);
    piece.fill = fill;
    // Side light: the moon rakes from the upper left, so right faces fall into shade.
    const side = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    side.addColorStop(0, "rgba(255,255,255,0.05)");
    side.addColorStop(0.55, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,0.28)");
    piece.side = side;
    piece.crest = crestPath(p, random, thick ? 9 : 7);
    const crest = ctx.createLinearGradient(0, p.y, 0, p.y + 16);
    crest.addColorStop(0, material.topLight);
    crest.addColorStop(0.35, material.top);
    crest.addColorStop(1, Art.mix(material.top, material.body, 0.35));
    piece.crestFill = crest;
    piece.cun = cunPath(p, random, floor ? 150 : p.h);
    piece.moss = mossPath(p, random);
    piece.grass = grassPath(p, random, worldId === "world3" ? 0.6 : 1);
    piece.roots = hang > 0 ? rootsPath(p, random, hang) : null;
    piece.decor = decorFor(p, random, worldId);
  }

  function buildStone(ctx, piece, p, random, material) {
    piece.body = chamferPath(p.x, p.y, p.w, p.h, 3);
    const fill = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    fill.addColorStop(0, Art.shade(material.stone, 0.12));
    fill.addColorStop(1, Art.shade(material.stone, -0.5));
    piece.fill = fill;
    piece.blocks = stoneBlocksPath(p, random);
    piece.trim = material.trim;
  }

  function buildCloud(ctx, piece, p, random) {
    piece.body = cloudPath(p, random);
    const fill = ctx.createLinearGradient(0, p.y - 10, 0, p.y + p.h);
    fill.addColorStop(0, "#f4f7fb");
    fill.addColorStop(0.55, "#c7d3e2");
    fill.addColorStop(1, "#8696ad");
    piece.fill = fill;
  }

  function buildJade(ctx, piece, p) {
    piece.body = roundedPath(p.x, p.y, p.w, p.h, 5);
    piece.groove = roundedPath(p.x + 3, p.y + 3.5, p.w - 6, p.h - 7, 3);
    piece.studs = jadeStudsPath(p);
    const fill = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    fill.addColorStop(0, "#a6dcc6");
    fill.addColorStop(0.3, "#5f9e88");
    fill.addColorStop(1, "#24483f");
    piece.fill = fill;
    piece.glowTint = "#7fc8ad";
  }

  function buildGlass(ctx, piece, p, random, kind) {
    const tint = kind === "phase" ? GLASS_TINTS[piece.phase] || GLASS_TINTS.a : GLASS_TINTS[kind];
    piece.body = chamferPath(p.x, p.y, p.w, p.h, 3);
    const fill = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    fill.addColorStop(0, Art.shade(tint, 0.45));
    fill.addColorStop(0.18, Art.shade(tint, 0.1));
    fill.addColorStop(0.65, tint);
    fill.addColorStop(1, Art.shade(tint, -0.5));
    piece.fill = fill;
    piece.facets = facetsPath(p, random);
    piece.rim = Art.shade(tint, 0.7);
    piece.glowTint = tint;
    piece.cracks = kind === "amber" ? cracksPath(p, random) : null;
    piece.band = kind === "aurora" ? auroraBandPath(p, random) : null;
    if (piece.band) {
      const band = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
      band.addColorStop(0, "rgba(127,232,190,0)");
      band.addColorStop(0.3, "rgba(127,232,190,0.45)");
      band.addColorStop(0.7, "rgba(240,160,210,0.4)");
      band.addColorStop(1, "rgba(240,160,210,0)");
      piece.bandFill = band;
    }
    piece.glints = [p.x + p.w * (0.2 + random() * 0.25), p.x + p.w * (0.6 + random() * 0.3)];
  }

  // --- drawing -----------------------------------------------------------------------

  function drawDecor(ctx, piece, colors, material) {
    const y = piece.local.y;
    for (const item of piece.decor) {
      if (item.kind === "flower") {
        ctx.strokeStyle = colors.stem;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(item.x, y);
        ctx.lineTo(item.x + 1, y - 7 * item.size);
        ctx.stroke();
        ctx.fillStyle = material.flower;
        ctx.beginPath();
        for (let petal = 0; petal < 5; petal += 1) {
          const a = (petal / 5) * Math.PI * 2;
          const px = item.x + 1 + Math.cos(a) * 1.8 * item.size;
          const py = y - 7 * item.size + Math.sin(a) * 1.8 * item.size;
          ctx.moveTo(px + 1.4 * item.size, py);
          ctx.arc(px, py, 1.4 * item.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(item.x + 1, y - 7 * item.size, 0.9 * item.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.kind === "stone") {
        ctx.fillStyle = colors.pebble;
        ctx.beginPath();
        ctx.ellipse(item.x, y - 0.5, 5 * item.size, 3.2 * item.size, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = WHITE_STONE_LIGHT;
        ctx.beginPath();
        ctx.ellipse(item.x - 1.2 * item.size, y - 2 * item.size, 2.2 * item.size, 1 * item.size, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.kind === "reed") {
        ctx.strokeStyle = colors.reed;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let r = -1; r <= 1; r += 1) {
          ctx.moveTo(item.x + r * 2.5, y);
          ctx.quadraticCurveTo(item.x + r * 3, y - 8 * item.size, item.x + r * 5, y - 14 * item.size);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = material.grass;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let b = -2; b <= 2; b += 1) {
          ctx.moveTo(item.x + b * 1.5, y + 0.5);
          ctx.lineTo(item.x + b * 2.6, y - (5 - Math.abs(b)) * 1.6 * item.size);
        }
        ctx.stroke();
      }
    }
  }

  function drawEarth(ctx, piece, colors, material) {
    const p = piece.local;
    ctx.fillStyle = INK_SHADOW;
    ctx.translate(3, 5);
    ctx.fill(piece.body);
    ctx.translate(-3, -5);
    ctx.fillStyle = piece.fill;
    ctx.fill(piece.body);
    ctx.fillStyle = piece.side;
    ctx.fill(piece.body);
    ctx.strokeStyle = colors.cun;
    ctx.lineWidth = 1.1;
    ctx.stroke(piece.cun);
    ctx.fillStyle = piece.crestFill;
    ctx.fill(piece.crest);
    ctx.fillStyle = colors.moss;
    ctx.fill(piece.moss);
    if (piece.roots) {
      ctx.strokeStyle = colors.roots;
      ctx.lineWidth = 1.2;
      ctx.stroke(piece.roots);
    }
    ctx.strokeStyle = INK_EDGE;
    ctx.lineWidth = 1.3;
    ctx.stroke(piece.body);
    ctx.strokeStyle = colors.rim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x + 1, p.y + 0.6);
    ctx.lineTo(p.x + p.w - 1, p.y + 0.6);
    ctx.stroke();
    ctx.fillStyle = material.grass;
    ctx.fill(piece.grass);
    if (piece.decor.length) drawDecor(ctx, piece, colors, material);
  }

  function drawStone(ctx, piece) {
    const p = piece.local;
    ctx.fillStyle = INK_SHADOW;
    ctx.translate(2, 4);
    ctx.fill(piece.body);
    ctx.translate(-2, -4);
    ctx.fillStyle = piece.fill;
    ctx.fill(piece.body);
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 1;
    ctx.stroke(piece.blocks);
    ctx.strokeStyle = INK_EDGE;
    ctx.lineWidth = 1.2;
    ctx.stroke(piece.body);
    ctx.fillStyle = piece.trim;
    ctx.fillRect(p.x + 2, p.y + 1, p.w - 4, 2);
    ctx.fillStyle = WHITE_STONE_LIGHT;
    ctx.fillRect(p.x + 2, p.y + 3, p.w - 4, 1);
  }

  function drawCloud(ctx, piece) {
    const p = piece.local;
    ctx.fillStyle = piece.fill;
    ctx.fill(piece.body);
    ctx.strokeStyle = CLOUD_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke(piece.body);
    ctx.fillStyle = WHITE_CLOUD;
    ctx.fillRect(p.x + 6, p.y + 1, p.w - 12, 2);
  }

  function drawJade(ctx, piece, fx) {
    const p = piece.local;
    if (fx) Art.drawGlow(ctx, p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, 40) * 0.6, piece.glowTint, 0.16);
    ctx.fillStyle = INK_SHADOW;
    ctx.translate(2, 4);
    ctx.fill(piece.body);
    ctx.translate(-2, -4);
    ctx.fillStyle = piece.fill;
    ctx.fill(piece.body);
    ctx.strokeStyle = "rgba(20,52,44,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke(piece.groove);
    ctx.fillStyle = GOLD_LIGHT;
    ctx.fill(piece.studs);
    ctx.strokeStyle = INK_EDGE;
    ctx.lineWidth = 1.2;
    ctx.stroke(piece.body);
    ctx.fillStyle = GOLD;
    ctx.fillRect(p.x + 4, p.y + 1, p.w - 8, 1.5);
  }

  function drawGlass(ctx, piece, time, fx) {
    const p = piece.local;
    if (fx) Art.drawGlow(ctx, p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, 40) * 0.7, piece.glowTint, 0.2);
    ctx.fillStyle = piece.fill;
    ctx.fill(piece.body);
    if (piece.band) {
      ctx.fillStyle = piece.bandFill;
      ctx.fill(piece.band);
    }
    ctx.fillStyle = WHITE_FACET;
    ctx.fill(piece.facets);
    if (piece.cracks) {
      ctx.strokeStyle = AMBER_CRACK;
      ctx.lineWidth = 1;
      ctx.stroke(piece.cracks);
    }
    ctx.strokeStyle = INK_EDGE;
    ctx.lineWidth = 1.2;
    ctx.stroke(piece.body);
    ctx.fillStyle = piece.rim;
    ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, 1.5);
    ctx.fillStyle = WHITE_BEVEL;
    ctx.fillRect(p.x + 3, p.y + 4, p.w - 6, 1);
    // Glints twinkle along the crest.
    const before = ctx.globalAlpha;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < piece.glints.length; i += 1) {
      const twinkle = 0.5 + Math.sin(time * 2.6 + piece.glints[i] * 0.05 + i * 2) * 0.5;
      if (twinkle < 0.15) continue;
      const gx = piece.glints[i];
      const size = 1.5 + twinkle * 3;
      ctx.globalAlpha = before * twinkle;
      ctx.fillRect(gx - size, p.y + 1.5, size * 2, 1);
      ctx.fillRect(gx - 0.5, p.y + 2 - size, 1, size * 2);
    }
    if (piece.kind === "phase") {
      ctx.globalAlpha = before * (0.25 + Math.sin(time * 3 + p.x * 0.01) * 0.12);
      ctx.fillRect(p.x + 4 + ((time * 40) % Math.max(8, p.w - 24)), p.y + 1, 16, 2);
    }
    ctx.globalAlpha = before;
  }

  function drawPiece(ctx, piece, cache, time, fx) {
    const moving = piece.moving;
    if (moving) {
      ctx.save();
      ctx.translate(piece.platform.x, piece.platform.y);
    }
    if (piece.kind === "earth") drawEarth(ctx, piece, cache.colors, cache.material);
    else if (piece.kind === "stone") drawStone(ctx, piece);
    else if (piece.kind === "cloud") drawCloud(ctx, piece);
    else if (piece.kind === "jade") drawJade(ctx, piece, fx);
    else drawGlass(ctx, piece, time, fx);
    if (moving) ctx.restore();
  }

  /** Inactive phase geometry: a ghost of the bridge, readable as "not yet". */
  function drawGhost(ctx, piece, time) {
    const p = piece.local;
    if (piece.moving) {
      ctx.save();
      ctx.translate(piece.platform.x, piece.platform.y);
    }
    const color = PHASE_COLORS[piece.phase] || PHASE_COLORS.a;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * (0.14 + Math.sin(time * 2.4 + p.x * 0.01) * 0.04);
    ctx.fillStyle = color;
    ctx.fill(piece.body);
    ctx.globalAlpha = before * 0.55;
    ctx.setLineDash(GHOST_DASH);
    ctx.lineDashOffset = -time * 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 1.5, p.y + 1.5, p.w - 3, Math.max(3, p.h - 3));
    ctx.setLineDash(NO_DASH);
    ctx.globalAlpha = before;
    if (piece.moving) ctx.restore();
  }

  const GHOST_DASH = Object.freeze([6, 8]);
  const NO_DASH = Object.freeze([]);

  function visible(rect, p) {
    return p.x < rect.x + rect.w && p.x + p.w > rect.x && p.y - 20 < rect.y + rect.h && p.y + p.h + FLOOR_EXTENSION > rect.y;
  }

  /**
   * Draw every visible terrain piece. `isActive(platform)` reports the live
   * tide phase; inactive phase pieces draw as ghosts.
   */
  function draw(ctx, cache, rect, time, isActive, fx = true) {
    if (!cache) return;
    for (const piece of cache.pieces) {
      const p = piece.platform;
      if (p.broken || !visible(rect, p)) continue;
      if (piece.phase && !isActive(p)) {
        drawGhost(ctx, piece, time);
        continue;
      }
      drawPiece(ctx, piece, cache, time, fx);
    }
  }

  // --- hazards and springs -----------------------------------------------------

  /**
   * Thorned star crystals grow from a dark rock ledge; lava pools glow. Shard
   * geometry and gradients are prepared once per chapter, and only the lava
   * surface and its embers animate.
   */
  function prepareHazard(ctx, hazard) {
    const recipe = { hazard, phase: hazard.phase || "", lava: hazard.type === "lava" };
    if (recipe.lava) {
      const surface = hazard.y + hazard.h * 0.28;
      const fill = ctx.createLinearGradient(0, surface, 0, hazard.y + hazard.h);
      fill.addColorStop(0, "#ffd27a");
      fill.addColorStop(0.25, "#f08a3a");
      fill.addColorStop(1, "#6a1d12");
      recipe.surface = surface;
      recipe.fill = fill;
      return recipe;
    }
    const random = Art.rng(`hazard:${hazard.x}:${hazard.y}`);
    const base = hazard.y + hazard.h;
    const count = Math.max(1, Math.round(hazard.w / 16));
    const spacing = hazard.w / count;
    const half = spacing * 0.5;
    const shards = new root.Path2D();
    const lights = new root.Path2D();
    for (let i = 0; i < count; i += 1) {
      const cx = hazard.x + spacing * (i + 0.5) + (random() - 0.5) * 3;
      const height = hazard.h * (0.72 + random() * 0.24);
      const lean = (random() - 0.5) * 5;
      shards.moveTo(cx - half, base - 5);
      shards.lineTo(cx - half * 0.18 + lean, base - height);
      shards.lineTo(cx + half * 0.2 + lean, base - height * 0.93);
      shards.lineTo(cx + half, base - 5);
      shards.closePath();
      lights.moveTo(cx - half * 0.18 + lean, base - height);
      lights.lineTo(cx + lean * 0.4, base - height * 0.45);
      lights.lineTo(cx - half * 0.5, base - 7);
      lights.closePath();
    }
    // The ledge the crystals grow from, with a ragged underside.
    const ledge = new root.Path2D();
    ledge.moveTo(hazard.x - 4, base - 7);
    ledge.lineTo(hazard.x + hazard.w + 4, base - 7);
    const steps = Math.max(4, Math.round(hazard.w / 20));
    for (let i = steps; i >= 0; i -= 1) {
      const t = i / steps;
      const belly = Math.sin(t * Math.PI);
      ledge.lineTo(hazard.x - 4 + (hazard.w + 8) * t, base + belly * (6 + random() * 10));
    }
    ledge.closePath();
    const fill = ctx.createLinearGradient(0, hazard.y, 0, base);
    fill.addColorStop(0, "#ffd6de");
    fill.addColorStop(0.25, "#e0707f");
    fill.addColorStop(1, "#7a2a3a");
    const rock = ctx.createLinearGradient(0, base - 7, 0, base + 16);
    rock.addColorStop(0, HAZARD_ROCK);
    rock.addColorStop(1, HAZARD_ROCK_DEEP);
    recipe.shards = shards;
    recipe.lights = lights;
    recipe.ledge = ledge;
    recipe.fill = fill;
    recipe.rock = rock;
    recipe.base = base;
    return recipe;
  }

  function drawHazardRecipe(ctx, recipe, time, ghost, fx) {
    const hazard = recipe.hazard;
    const before = ctx.globalAlpha;
    if (ghost) ctx.globalAlpha = before * 0.22;
    if (recipe.lava) {
      const surface = recipe.surface;
      if (!ghost && fx) Art.drawGlow(ctx, hazard.x + hazard.w / 2, surface, hazard.w * 0.75, "#ff8a3c", 0.45);
      ctx.fillStyle = recipe.fill;
      ctx.beginPath();
      ctx.moveTo(hazard.x, hazard.y + hazard.h);
      for (let x = hazard.x; x <= hazard.x + hazard.w; x += 8) {
        ctx.lineTo(x, surface + Math.sin(x * 0.12 + time * 3) * 2.5);
      }
      ctx.lineTo(hazard.x + hazard.w, hazard.y + hazard.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff0b8";
      const embers = Math.floor(hazard.w / 30);
      for (let i = 0; i < embers; i += 1) {
        const bx = hazard.x + 10 + ((i * 37 + time * 22) % (hazard.w - 20));
        const rise = (time * 1.4 + i * 0.7) % 1;
        ctx.globalAlpha = before * (1 - rise) * 0.8 * (ghost ? 0.22 : 1);
        ctx.beginPath();
        ctx.arc(bx, surface - rise * 10, 1.5 + rise * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = before;
      return;
    }
    if (!ghost && fx) Art.drawGlow(ctx, hazard.x + hazard.w / 2, recipe.base - hazard.h * 0.4, hazard.w * 0.55, "#e0707f", 0.14);
    ctx.fillStyle = recipe.rock;
    ctx.fill(recipe.ledge);
    ctx.fillStyle = recipe.fill;
    ctx.fill(recipe.shards);
    ctx.strokeStyle = SPIKE_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke(recipe.shards);
    ctx.fillStyle = SPIKE_LIGHT;
    ctx.fill(recipe.lights);
    ctx.strokeStyle = INK_EDGE;
    ctx.stroke(recipe.ledge);
    ctx.globalAlpha = before;
  }

  /** Draw visible hazards; inactive phase hazards draw as faint ghosts. */
  function drawHazards(ctx, cache, rect, time, isActive, fx = true) {
    if (!cache?.hazards) return;
    for (const recipe of cache.hazards) {
      if (!visible(rect, recipe.hazard)) continue;
      const active = !recipe.phase || isActive(recipe.hazard);
      drawHazardRecipe(ctx, recipe, time, !active, fx);
    }
  }

  /** A jade drum on a lacquer plinth with a gilt coil: reads as "bounce". */
  function drawSpring(ctx, spring, time, compression = 0, fx = true) {
    const cx = spring.x + spring.w / 2;
    const base = spring.y + spring.h;
    const squash = 1 - compression * 0.35;
    ctx.fillStyle = SPRING_SHADOW;
    ctx.beginPath();
    ctx.ellipse(cx, base + 3, spring.w * 0.46, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1d18";
    ctx.fillRect(spring.x + 6, base - 6, spring.w - 12, 6);
    ctx.fillStyle = GOLD;
    ctx.fillRect(spring.x + 6, base - 6, spring.w - 12, 1.5);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const coilTop = base - 6 - 10 * squash;
    for (let i = 0; i <= 4; i += 1) {
      const y = base - 6 - (i / 4) * 10 * squash;
      if (i === 0) ctx.moveTo(cx - 9, y);
      else ctx.lineTo(cx + (i % 2 ? 9 : -9), y);
    }
    ctx.stroke();
    ctx.fillStyle = "#4f8a75";
    ctx.beginPath();
    ctx.ellipse(cx, coilTop - 3, spring.w * 0.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = SPRING_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#9fd6bf";
    ctx.beginPath();
    ctx.ellipse(cx, coilTop - 5, spring.w * 0.3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD_LIGHT;
    ctx.beginPath();
    ctx.arc(cx, coilTop - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (fx) Art.drawGlow(ctx, cx, coilTop - 4, 18, "#9fd6bf", 0.25 + Math.sin(time * 3) * 0.08);
  }

  function drawSprings(ctx, springs, rect, time, fx = true) {
    for (const spring of springs) {
      if (!visible(rect, spring)) continue;
      drawSpring(ctx, spring, time, 0, fx);
    }
  }

  const api = {
    TILE,
    MATERIALS,
    PHASE_COLORS,
    materialFor,
    kindOf,
    clearanceBelow,
    prepare,
    draw,
    drawHazards,
    drawSpring,
    drawSprings,
  };

  root.NiniYuanTerrain = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
