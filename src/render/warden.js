((root) => {
  "use strict";

  // Mythic guardians and set pieces, drawn statelessly from their arguments.
  //
  //   aurora warden -> Zhulong, the torch dragon: a coiled serpent dragon
  //                    holding a candle flame; its gaze turns day and night.
  //   core warden   -> Ao, the giant turtle that carries the floating isles,
  //                    with a star gem set in its brow.
  //   tide warden   -> Kun, the leviathan of the northern dark, curled in a
  //                    scroll of breaking waves with a pearl in its jaws.
  //   sentry        -> a bronze taotie beacon that spits star fire.
  //   warder        -> a stone bixi tortoise; star bolts glance off its shell.
  //   lantern       -> a palace lantern on a bamboo pole (checkpoint).
  //   marrow        -> a jade bi disc cradling a rose star crystal.
  //
  // Every warden shows the same readable signals: the weak point (flame, gem,
  // or pearl) swells while it telegraphs and blazes open during recovery, a
  // landed hit washes the body pale, and cracks spread as health falls.
  // Collision geometry and encounter state stay in the simulation.


  const WARDEN_PALETTES = Object.freeze({
    aurora: Object.freeze({ shell: "#5b6486", core: "#c3a468", trim: "#b87b86", glow: "rgba(195,164,104,.5)", body: "#6b5c9a", belly: "#e2c4a8", flame: "#ffcf7a" }),
    core: Object.freeze({ shell: "#3f6a63", core: "#6da895", trim: "#c3a468", glow: "rgba(109,168,149,.5)", body: "#4d6f5e", belly: "#c8b98f", flame: "#9fe8cf" }),
    tide: Object.freeze({ shell: "#3d5468", core: "#7893a4", trim: "#c3a468", glow: "rgba(120,147,164,.5)", body: "#3f6c8c", belly: "#cfe3ea", flame: "#e9f6ff" }),
  });

  const INK = "rgba(10,12,16,0.85)";
  const HIT = "#fff7d1";
  const CINNABAR = "#b8322e";

  /** Soft glow via the shared sprite cache; skipped if the art helpers are absent. */
  function glow(ctx, x, y, radius, color, alpha) {
    const art = root.NiniYuanArt || (typeof require === "function" ? require("./art.js") : null);
    if (art) art.drawGlow(ctx, x, y, radius, color, alpha);
  }

  function wardenPalette(name) {
    return WARDEN_PALETTES[name] || WARDEN_PALETTES.aurora;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function ellipse(ctx, x, y, rx, ry, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
  }

  function ring(ctx, x, y, radius, width, color, alpha = 1) {
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = before;
  }

  function wash(ctx, amount) {
    if (amount <= 0) return;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * Math.min(1, amount) * 0.7;
    ctx.fillStyle = HIT;
    ctx.fill();
    ctx.globalAlpha = before;
  }

  /** A cinnabar seal stamped with the warden's sigil. */
  function drawSeal(ctx, sigil, x, y, size, fontFamily) {
    if (!sigil) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.fillStyle = CINNABAR;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = "#f3d7c4";
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4);
    ctx.fillStyle = "#f8eadb";
    ctx.font = `700 ${Math.round(size * 0.62)}px ${fontFamily || "serif"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sigil, 0, 1);
    ctx.restore();
  }

  // --- guardian identities ------------------------------------------------------------

  /** The weak point: swells with the telegraph, blazes when open. */
  function drawWeakPoint(ctx, x, y, size, palette, state) {
    const swell = 1 + state.charge * 0.35 + (state.open ? 0.65 : 0);
    const r = size * swell;
    glow(ctx, x, y, r * (state.open ? 4.2 : 3), palette.flame, 0.45 + state.charge * 0.3 + (state.open ? 0.35 : 0));
    ctx.fillStyle = state.flash > 0 || state.open ? "#fffaf0" : palette.flame;
    ellipse(ctx, x, y, r, r);
    ctx.fill();
    if (state.open) {
      ctx.strokeStyle = palette.flame;
      ctx.lineWidth = 1.6;
      for (let ray = 0; ray < 8; ray += 1) {
        const a = ray * Math.PI / 4 + state.time * 0.8;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
        ctx.lineTo(x + Math.cos(a) * r * 2.3, y + Math.sin(a) * r * 2.3);
        ctx.stroke();
      }
    }
  }

  function drawZhulong(ctx, r, palette, state) {
    const t = state.time;
    const R = r * 0.62;
    const start = -0.55;
    const end = start + Math.PI * 1.72;
    const segments = 30;
    // Coiled body, thick at the neck and tapering to the tail.
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < segments; i += 1) {
        const a0 = start + ((end - start) * i) / segments;
        const a1 = start + ((end - start) * (i + 1)) / segments;
        const k = i / segments;
        const wave = Math.sin(a0 * 5 + t * 1.6) * 3;
        ctx.strokeStyle = pass === 0 ? palette.body : palette.belly;
        ctx.lineWidth = pass === 0 ? 17 * (1 - k * 0.8) : 5 * (1 - k * 0.85);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, R + wave + (pass === 1 ? 2.5 : 0), a0, a1 + 0.02);
        ctx.stroke();
      }
    }
    // Dorsal fin flames along the coil.
    ctx.fillStyle = palette.trim;
    for (let i = 2; i < 22; i += 2) {
      const a = start + ((end - start) * i) / segments;
      const k = i / segments;
      const outer = R + Math.sin(a * 5 + t * 1.6) * 3 - 8 * (1 - k * 0.8);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.lineTo(Math.cos(a + 0.08) * (outer - 7 * (1 - k)), Math.sin(a + 0.08) * (outer - 7 * (1 - k)));
      ctx.lineTo(Math.cos(a + 0.16) * outer, Math.sin(a + 0.16) * outer);
      ctx.fill();
    }
    // Head at the top of the coil, looking toward the player.
    const hx = Math.cos(start) * R;
    const hy = Math.sin(start) * R;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(state.facing * 1.35, 1.35);
    ctx.rotate(-0.25);
    const jaw = state.open ? 0.32 : state.charge * 0.12;
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.quadraticCurveTo(-4, -16, 8, -11);
    ctx.lineTo(22, -6);
    ctx.quadraticCurveTo(25, -3, 21, -1);
    ctx.lineTo(8, 0);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();
    wash(ctx, state.flash);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.save();
    ctx.rotate(jaw);
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(19, 1);
    ctx.quadraticCurveTo(18, 6, 10, 6);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    // Antlers and whiskers.
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.quadraticCurveTo(-12, -24, -20, -24);
    ctx.moveTo(-9, -19);
    ctx.lineTo(-11, -26);
    ctx.moveTo(1, -13);
    ctx.quadraticCurveTo(-4, -27, -11, -32);
    ctx.stroke();
    ctx.strokeStyle = "rgba(238,231,213,0.7)";
    ctx.lineWidth = 1;
    const whisk = Math.sin(t * 2.2) * 4;
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.bezierCurveTo(10, 8 + whisk, -4, 14, -16, 10 + whisk);
    ctx.moveTo(16, -6);
    ctx.bezierCurveTo(8, -18 - whisk, -6, -12, -18, -16 - whisk);
    ctx.stroke();
    // Eye: lit while it telegraphs.
    ctx.fillStyle = state.charge > 0.05 ? "#ffd27a" : "#f3e6d0";
    ellipse(ctx, 6, -7, 2.4, 1.6, -0.2);
    ctx.fill();
    ctx.fillStyle = "#1a0f14";
    ellipse(ctx, 6.8, -7, 0.9, 1.4);
    ctx.fill();
    // The candle flame it holds: the weak point.
    drawWeakPoint(ctx, 25, 2 + jaw * 10, 4.5, palette, state);
    ctx.restore();
  }

  function drawAo(ctx, r, palette, state) {
    const t = state.time;
    ctx.save();
    ctx.scale(state.facing, 1);
    const bob = Math.sin(t * 1.1) * 2;
    ctx.translate(0, bob);
    // Flippers.
    ctx.fillStyle = palette.body;
    const paddle = Math.sin(t * 1.8) * 0.25;
    for (const [x, y, rot] of [[-r * 0.5, r * 0.32, 0.6 + paddle], [r * 0.42, r * 0.34, -0.5 - paddle]]) {
      ellipse(ctx, x, y, r * 0.3, r * 0.1, rot);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Shell: a high dome with hexagonal scutes and a gilt rim.
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, r * 0.28);
    ctx.bezierCurveTo(-r * 0.78, -r * 0.42, r * 0.66, -r * 0.42, r * 0.66, r * 0.28);
    ctx.closePath();
    const shell = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.3);
    shell.addColorStop(0, "#6f8f7a");
    shell.addColorStop(1, palette.shell);
    ctx.fillStyle = shell;
    ctx.fill();
    wash(ctx, state.flash);
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(20,32,28,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [x, y] of [[-r * 0.38, 0], [0, -r * 0.1], [r * 0.34, 0], [-r * 0.18, r * 0.18], [r * 0.16, r * 0.18]]) {
      for (let k = 0; k < 6; k += 1) {
        const a = (k * Math.PI) / 3;
        const px = x + Math.cos(a) * r * 0.11;
        const py = y + Math.sin(a) * r * 0.09;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.stroke();
    // Head reaching forward; further when open.
    const reach = state.open ? r * 0.18 : state.charge * r * 0.08;
    ctx.fillStyle = palette.body;
    ellipse(ctx, r * 0.86 + reach, r * 0.1, r * 0.2, r * 0.15, 0.1);
    ctx.fill();
    wash(ctx, state.flash);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "#f3e6d0";
    ellipse(ctx, r * 0.94 + reach, r * 0.05, 2.4, 2);
    ctx.fill();
    ctx.fillStyle = "#101418";
    ellipse(ctx, r * 0.95 + reach, r * 0.05, 1, 1.4);
    ctx.fill();
    // The isle on its back: a mountain, a pine, and a little pavilion.
    ctx.fillStyle = "#3d5a4f";
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.24);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.92, 0, -r * 0.62);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.82, r * 0.38, -r * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = "#7fb592";
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.62);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.92, -r * 0.08, -r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1c242a";
    ctx.fillRect(r * 0.12, -r * 0.58, r * 0.16, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(r * 0.08, -r * 0.58);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.68, r * 0.32, -r * 0.58);
    ctx.fill();
    ctx.fillStyle = "#ffd89a";
    ctx.fillRect(r * 0.18, -r * 0.55, r * 0.04, r * 0.05);
    // Star gem in the brow: the weak point.
    drawWeakPoint(ctx, r * 0.9 + reach, -r * 0.03, 3.6, palette, state);
    ctx.restore();
  }

  function drawKun(ctx, r, palette, state) {
    const t = state.time;
    ctx.save();
    ctx.scale(state.facing, 1);
    // Breaking-wave scroll behind the body.
    ctx.strokeStyle = "rgba(207,227,234,0.6)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const a = i * (Math.PI / 2) + t * 0.4;
      const x = Math.cos(a) * r * 0.78;
      const y = Math.sin(a) * r * 0.5 + r * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.16, a + 0.4, a + 0.4 + Math.PI * 1.4);
      ctx.arc(x + Math.cos(a + 1.2) * r * 0.06, y + Math.sin(a + 1.2) * r * 0.06, r * 0.07, a + 1.8, a + 1.8 + Math.PI * 1.5);
      ctx.stroke();
    }
    // Tail fin sweeping up behind.
    const flick = Math.sin(t * 2.4) * 0.2;
    ctx.save();
    ctx.translate(-r * 0.62, -r * 0.08);
    ctx.rotate(-0.4 + flick);
    ctx.fillStyle = palette.trim;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-r * 0.32, -r * 0.5, -r * 0.42, -r * 0.42);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, -r * 0.46, r * 0.16);
    ctx.quadraticCurveTo(-r * 0.24, r * 0.1, 0, r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Body: a long, arched leviathan.
    ctx.beginPath();
    ctx.moveTo(-r * 0.66, 0);
    ctx.bezierCurveTo(-r * 0.4, -r * 0.5, r * 0.4, -r * 0.5, r * 0.72, -r * 0.08);
    ctx.bezierCurveTo(r * 0.6, r * 0.32, -r * 0.2, r * 0.4, -r * 0.66, 0.06 * r);
    ctx.closePath();
    const body = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.35);
    body.addColorStop(0, palette.body);
    body.addColorStop(0.7, "#24425a");
    body.addColorStop(1, palette.belly);
    ctx.fillStyle = body;
    ctx.fill();
    wash(ctx, state.flash);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Scales in rows of arcs.
    ctx.strokeStyle = "rgba(207,227,234,0.4)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const x = -r * 0.42 + col * r * 0.16 + (row % 2) * r * 0.08;
        const y = -r * 0.2 + row * r * 0.11;
        ctx.moveTo(x + r * 0.06, y);
        ctx.arc(x, y, r * 0.06, 0, Math.PI);
      }
    }
    ctx.stroke();
    // Pectoral fin.
    ctx.fillStyle = palette.trim;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, r * 0.14);
    ctx.quadraticCurveTo(-r * 0.04, r * 0.44 + flick * r * 0.2, -r * 0.2, r * 0.36);
    ctx.quadraticCurveTo(-r * 0.02, r * 0.26, r * 0.1, r * 0.14);
    ctx.fill();
    // Eye and whiskers.
    ctx.fillStyle = state.charge > 0.05 ? "#ffd27a" : "#f3e6d0";
    ellipse(ctx, r * 0.5, -r * 0.16, 2.6, 2.4);
    ctx.fill();
    ctx.fillStyle = "#0d1820";
    ellipse(ctx, r * 0.51, -r * 0.16, 1.1, 1.6);
    ctx.fill();
    ctx.strokeStyle = "rgba(238,231,213,0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.68, -r * 0.04);
    ctx.bezierCurveTo(r * 0.9, r * 0.1, r * 0.8, r * 0.36, r * 1.0, r * 0.42 + flick * 6);
    ctx.stroke();
    // The pearl in its jaws: the weak point.
    const gape = state.open ? r * 0.1 : state.charge * r * 0.04;
    drawWeakPoint(ctx, r * 0.76, -r * 0.02 + gape * 0.5, 4, palette, state);
    ctx.restore();
  }

  function drawWardenIdentity(ctx, name, radius, palette, state) {
    if (name === "core") drawAo(ctx, radius, palette, state);
    else if (name === "tide") drawKun(ctx, radius, palette, state);
    else drawZhulong(ctx, radius, palette, state);
  }

  /**
   * The sealed arena edge: a vertical rule of star glyphs, so the wall reads
   * as intent rather than an invisible collision surface.
   */
  function drawArenaSeal(ctx, options = {}) {
    const { x = 0, top = 0, bottom = 0, time = 0, active = false } = options;
    ctx.save();
    ctx.globalAlpha = active ? 0.5 : 0.16;
    ctx.strokeStyle = "#c3a468";
    ctx.lineWidth = active ? 2 : 1;
    ctx.setLineDash([10, 12]);
    ctx.lineDashOffset = -time * 26;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    if (active) {
      ctx.globalAlpha = 0.26 + Math.sin(time * 2.4) * 0.08;
      ctx.fillStyle = "#c3a468";
      for (let y = top + 40; y < bottom; y += 96) {
        ellipse(ctx, x, y, 3.2, 8);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** A warden: its mythic body, a faint star dial behind it, and its seal. */
  function drawWarden(ctx, warden, options = {}) {
    if (!warden) return;
    const {
      time = 0,
      telegraph = 0,
      flash = 0,
      sigil = "",
      phase = "wait",
      attack = "",
      reducedMotion = false,
    } = options;
    const palette = wardenPalette(warden.palette);
    const cx = warden.x + warden.w / 2;
    const cy = warden.y + warden.h / 2;
    const radius = Math.min(warden.w, warden.h) / 2;
    const charge = clamp(telegraph, 0, 1);
    const open = options.open === true || phase === "recover";
    const healthRatio = clamp(options.healthRatio ?? 1, 0, 1);
    const motionTime = reducedMotion ? 0 : time;
    const state = { time: motionTime, charge, open, flash, facing: options.facing < 0 ? -1 : 1 };

    ctx.save();
    // Grounded reference shadow keeps the silhouette anchored during sweeps.
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, warden.y + warden.h + 14, radius * 0.86, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(cx, cy);

    // Star dial behind: the mark every warden shares. Sweeps telegraph in rose.
    const warn = phase === "telegraph" && attack === "sweep";
    ring(ctx, 0, 0, radius * (open ? 1.14 : 1.02), 1.4, warn ? "#c96978" : palette.trim, 0.28 + charge * 0.4);
    ctx.save();
    ctx.rotate(motionTime * 0.3);
    const ticks = 24;
    ctx.strokeStyle = palette.trim;
    ctx.globalAlpha = 0.3 + charge * 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < ticks; i += 1) {
      const a = (i / ticks) * Math.PI * 2;
      const inner = radius * (i % 6 === 0 ? 0.9 : 0.96);
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * radius * 1.02, Math.sin(a) * radius * 1.02);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.rotate(Math.sin(motionTime * 0.7) * 0.04);
    drawWardenIdentity(ctx, warden.palette, radius, palette, state);

    if (healthRatio < 0.36) {
      ctx.globalAlpha = 0.44 + (0.36 - healthRatio) * 0.8;
      ctx.strokeStyle = "#eee7d5";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.24, -radius * 0.5);
      ctx.lineTo(-radius * 0.05, -radius * 0.18);
      ctx.lineTo(-radius * 0.18, radius * 0.08);
      ctx.moveTo(radius * 0.28, -radius * 0.4);
      ctx.lineTo(radius * 0.08, -radius * 0.12);
      ctx.lineTo(radius * 0.2, radius * 0.12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawSeal(ctx, sigil, -radius * 0.92, -radius * 0.86, Math.max(14, radius * 0.34), options.fontFamily);
    ctx.restore();
  }

  /** Telegraph markers for the falling-shard pattern. */
  function drawWardenMarkers(ctx, markers, options = {}) {
    if (!markers || !markers.length) return;
    const { groundY = 0, progress = 0 } = options;
    ctx.save();
    ctx.globalAlpha = 0.3 + progress * 0.45;
    ctx.strokeStyle = "#c96978";
    ctx.lineWidth = 2;
    for (const x of markers) {
      ctx.beginPath();
      ctx.moveTo(x - 16, groundY - 2);
      ctx.lineTo(x + 16, groundY - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, groundY - 10 - progress * 12);
      ctx.lineTo(x, groundY - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Hostile projectiles: warden fire, falling ice shards, and sentry fire. */
  function drawHostileBolt(ctx, bolt, time = 0) {
    const cx = bolt.x + bolt.w / 2;
    const cy = bolt.y + bolt.h / 2;
    ctx.save();
    if (bolt.kind === "shard") {
      ctx.translate(cx, cy);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#eee7d5";
      ctx.fillRect(-1, -bolt.h / 2 - 16, 2, 14);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#c96978";
      ctx.beginPath();
      ctx.moveTo(0, bolt.h / 2 + 2);
      ctx.lineTo(-bolt.w / 2, -bolt.h / 2);
      ctx.lineTo(0, -bolt.h / 2 + 3);
      ctx.lineTo(bolt.w / 2, -bolt.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const color = bolt.kind === "sentry" ? "#e0707f" : "#ffcf7a";
      const speed = Math.hypot(bolt.vx || 0, bolt.vy || 0) || 1;
      const dx = (bolt.vx || 0) / speed;
      const dy = (bolt.vy || 0) / speed;
      glow(ctx, cx, cy, bolt.w * 1.6, color, 0.6);
      // A comet tail of star fire.
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      for (let i = 1; i <= 3; i += 1) {
        ctx.globalAlpha = 0.5 - i * 0.12;
        ctx.lineWidth = bolt.w * (0.7 - i * 0.15);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - dx * bolt.w * (1 + i * 0.9), cy - dy * bolt.w * (1 + i * 0.9) + Math.sin(time * 18 + i) * 1.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fffaf0";
      ellipse(ctx, cx, cy, bolt.w * 0.32, bolt.h * 0.32);
      ctx.fill();
      ring(ctx, cx, cy, bolt.w * 0.5, 1.2, color, 0.9);
    }
    ctx.restore();
  }

  /** Sentry: a bronze taotie beacon. The muzzle ring shows how close the next shot is. */
  function drawSentry(ctx, enemy, options = {}) {
    const { charge = 0, flash = 0 } = options;
    const time = options.reducedMotion === true ? 0 : Number(options.time) || 0;
    const cx = enemy.x + enemy.w / 2;
    const baseY = enemy.y + enemy.h;
    const facing = enemy.facing >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(1.28, 1.28);
    ctx.translate(-cx, -baseY);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, baseY + 2, enemy.w * 0.62, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Stepped bronze plinth.
    ctx.fillStyle = "#4a3a24";
    ctx.fillRect(cx - enemy.w * 0.6, baseY - 6, enemy.w * 1.2, 6);
    ctx.fillStyle = "#6e5532";
    ctx.beginPath();
    ctx.moveTo(cx - enemy.w * 0.44, baseY - 6);
    ctx.lineTo(cx + enemy.w * 0.44, baseY - 6);
    ctx.lineTo(cx + enemy.w * 0.3, baseY - enemy.h * 0.42);
    ctx.lineTo(cx - enemy.w * 0.3, baseY - enemy.h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(195,164,104,0.6)";
    ctx.beginPath();
    ctx.moveTo(cx - enemy.w * 0.36, baseY - enemy.h * 0.24);
    ctx.lineTo(cx + enemy.w * 0.36, baseY - enemy.h * 0.24);
    ctx.stroke();
    // The taotie mask.
    const headY = baseY - enemy.h * 0.64;
    const mask = ctx.createRadialGradient(cx - 3, headY - 4, 1, cx, headY, enemy.w * 0.5);
    mask.addColorStop(0, flash > 0 ? HIT : "#b08a4e");
    mask.addColorStop(0.6, "#7a5c30");
    mask.addColorStop(1, "#3e2e18");
    ctx.fillStyle = mask;
    ellipse(ctx, cx, headY, enemy.w * 0.48, enemy.h * 0.32);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(43,79,69,0.8)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const ex = cx + side * enemy.w * 0.2;
      ctx.moveTo(ex + 4, headY - 2);
      ctx.arc(ex, headY - 2, 4, 0, Math.PI * 1.6);
      ctx.moveTo(cx + side * enemy.w * 0.06, headY - enemy.h * 0.26);
      ctx.quadraticCurveTo(cx + side * enemy.w * 0.32, headY - enemy.h * 0.4, cx + side * enemy.w * 0.44, headY - enemy.h * 0.18);
    }
    ctx.stroke();
    ctx.fillStyle = "#1a120a";
    for (const side of [-1, 1]) {
      ellipse(ctx, cx + side * enemy.w * 0.2 + facing * 1, headY - 2, 1.6, 1.6);
      ctx.fill();
    }
    // Star fire charging in its mouth.
    const mouthX = cx + facing * enemy.w * 0.36;
    glow(ctx, mouthX, headY + 4, 10 + charge * 10, "#e0707f", 0.3 + charge * 0.6);
    ctx.fillStyle = "#e0707f";
    ctx.globalAlpha = 0.55 + charge * 0.45;
    ellipse(ctx, mouthX, headY + 4, 3 + charge * 3, 3 + charge * 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    ring(ctx, cx, headY, enemy.w * 0.62 + charge * 6, 1.4, "#c96978", 0.2 + charge * 0.5);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#c96978";
    ctx.setLineDash([4, 7]);
    ctx.lineDashOffset = -time * 20;
    ctx.beginPath();
    ctx.moveTo(cx + facing * enemy.w * 0.6, headY + 4);
    ctx.lineTo(cx + facing * (enemy.w * 0.6 + 74), headY - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** The patrol rail stays in world coordinates while the creature art scales. */
  function drawWarderPatrolRail(ctx, enemy, options = {}) {
    const time = options.reducedMotion === true ? 0 : Number(options.time) || 0;
    const cx = enemy.x + enemy.w / 2;
    const baseY = enemy.y + enemy.h;
    const facing = enemy.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = "#8b8f7c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(enemy.baseX - enemy.patrol + enemy.w / 2, baseY + 6);
    ctx.lineTo(enemy.baseX + enemy.patrol + enemy.w / 2, baseY + 6);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#8b8f7c";
    ellipse(ctx, cx + facing * 10 + Math.sin(time * 3) * 2, baseY + 6, 2.2, 2.2);
    ctx.fill();
    ctx.restore();
  }

  /** Warder: a stone bixi tortoise. Its carved shell says "bolts will not work here". */
  function drawWarder(ctx, enemy, options = {}) {
    const { flash = 0 } = options;
    const time = options.reducedMotion === true ? 0 : Number(options.time) || 0;
    const cx = enemy.x + enemy.w / 2;
    const baseY = enemy.y + enemy.h;
    const facing = enemy.vx >= 0 ? 1 : -1;
    drawWarderPatrolRail(ctx, enemy, options);
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(1.28, 1.28);
    ctx.translate(-cx, -baseY);
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, baseY + 2, enemy.w * 0.54, 4.5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(cx, baseY);
    ctx.scale(facing, 1);
    const step = Math.sin(time * 6 + enemy.x * 0.05) * 2;
    // Stubby legs.
    ctx.fillStyle = "#5d6458";
    for (const [x, s] of [[-11, step], [9, -step]]) {
      ctx.fillRect(x - 3 + s * 0.5, -8, 6, 8);
    }
    // Dragon head with a curled snout.
    ctx.fillStyle = "#717866";
    ctx.beginPath();
    ctx.moveTo(10, -12);
    ctx.quadraticCurveTo(16, -22, 23, -18);
    ctx.quadraticCurveTo(26, -14, 22, -11);
    ctx.quadraticCurveTo(17, -8, 10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0b1016";
    ellipse(ctx, 19, -16, 1.2, 1.2);
    ctx.fill();
    // Carved shell with hexagonal plates and gilt seams.
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.bezierCurveTo(-18, -30, 15, -30, 15, -6);
    ctx.closePath();
    const plate = ctx.createLinearGradient(0, -28, 0, -6);
    plate.addColorStop(0, flash > 0 ? HIT : "#9a9f8c");
    plate.addColorStop(1, "#4b5047");
    ctx.fillStyle = plate;
    ctx.fill();
    ctx.strokeStyle = "#c3a468";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(195,164,104,0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const [x, y] of [[-8, -15], [4, -15], [-2, -22]]) {
      for (let k = 0; k < 6; k += 1) {
        const a = (k * Math.PI) / 3;
        const px = x + Math.cos(a) * 5;
        const py = y + Math.sin(a) * 4;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.stroke();
    ctx.fillStyle = "#4b5047";
    ctx.fillRect(-19, -7, 35, 2.5);
    ctx.restore();
  }

  /**
   * Lantern (checkpoint): a palace lantern on a bamboo pole. Unlit, its silk
   * is cold indigo; lit, it glows with the warm gold used for "recorded".
   */
  function drawLantern(ctx, lantern, options = {}) {
    const { time = 0 } = options;
    const cx = lantern.x + lantern.w / 2;
    const top = lantern.y;
    const bottom = lantern.y + lantern.h;
    const lit = lantern.lit === true;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, bottom, lantern.w * 0.7, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Bamboo pole with nodes, and the hook arm.
    ctx.strokeStyle = lit ? "#8c7a4a" : "#3b4756";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - 6, bottom);
    ctx.lineTo(cx - 6, top + 2);
    ctx.lineTo(cx + 2, top + 2);
    ctx.stroke();
    ctx.strokeStyle = lit ? "#5e5030" : "#2a3440";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const y of [bottom - 12, bottom - 26, bottom - 40]) {
      ctx.moveTo(cx - 8, y);
      ctx.lineTo(cx - 4, y);
    }
    ctx.stroke();
    const sway = Math.sin(time * 1.8 + cx * 0.01) * 0.08;
    ctx.translate(cx + 2, top + 2);
    ctx.rotate(sway);
    if (lit) glow(ctx, 0, 14, 38, "#ffcf7a", 0.5 + Math.sin(time * 2.6) * 0.06);
    // Hexagonal silk body framed in lacquer.
    ctx.fillStyle = "#1f1712";
    ctx.fillRect(-8, 4, 16, 2.5);
    ctx.fillRect(-8, 21, 16, 2.5);
    ctx.fillStyle = lit ? "#d9483f" : "#232e3b";
    ctx.beginPath();
    ctx.moveTo(-7, 6.5);
    ctx.lineTo(7, 6.5);
    ctx.lineTo(9, 13.5);
    ctx.lineTo(7, 21);
    ctx.lineTo(-7, 21);
    ctx.lineTo(-9, 13.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = lit ? "#c3a468" : "#3b4756";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (lit) {
      ctx.fillStyle = "#ffe2a6";
      ellipse(ctx, 0, 13.5, 3, 4.6 + Math.sin(time * 5) * 0.6);
      ctx.fill();
    }
    ctx.strokeStyle = lit ? "rgba(31,23,18,0.6)" : "rgba(59,71,86,0.8)";
    ctx.beginPath();
    ctx.moveTo(-3, 6.5);
    ctx.lineTo(-3.6, 21);
    ctx.moveTo(3, 6.5);
    ctx.lineTo(3.6, 21);
    ctx.stroke();
    // Tassel.
    ctx.strokeStyle = lit ? "#c0392b" : "#3b4756";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 23.5);
    ctx.lineTo(Math.sin(time * 2.4) * 1.5, 33);
    ctx.stroke();
    ctx.restore();
  }

  /** Marrow (hidden collectible): a jade bi disc cradling a rose star crystal. */
  function drawMarrow(ctx, marrow, options = {}) {
    if (!marrow || marrow.taken) return;
    const { time = 0 } = options;
    const cx = marrow.x + marrow.w / 2;
    const cy = marrow.y + marrow.h / 2 + Math.sin(time * 1.8) * 4;
    const radius = marrow.w / 2;
    glow(ctx, cx, cy, radius * 3.2, "#b87b86", 0.45 + Math.sin(time * 2.2) * 0.1);
    ctx.save();
    ctx.translate(cx, cy);
    // The bi: a pale jade ring with a carved grain band.
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.moveTo(radius * 0.55, 0);
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2, true);
    const jade = ctx.createRadialGradient(-radius * 0.4, -radius * 0.4, 1, 0, 0, radius * 1.2);
    jade.addColorStop(0, "#e6f4ec");
    jade.addColorStop(1, "#6da895");
    ctx.fillStyle = jade;
    ctx.fill("evenodd");
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(43,79,69,0.45)";
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + 0.1;
      ctx.moveTo(Math.cos(a) * radius * 0.72 + 1.2, Math.sin(a) * radius * 0.72);
      ctx.arc(Math.cos(a) * radius * 0.85, Math.sin(a) * radius * 0.85, 1.2, 0, Math.PI * 2);
    }
    ctx.stroke();
    // The star crystal turning in the bore.
    ctx.rotate(time * 0.6);
    const facets = ctx.createLinearGradient(0, -radius * 0.6, 0, radius * 0.6);
    facets.addColorStop(0, "#fff3f0");
    facets.addColorStop(0.5, "#e08a9a");
    facets.addColorStop(1, "#7a3a4c");
    ctx.fillStyle = facets;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.62);
    ctx.lineTo(radius * 0.4, 0);
    ctx.lineTo(0, radius * 0.62);
    ctx.lineTo(-radius * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c3a468";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  const api = {
    WARDEN_PALETTES,
    wardenPalette,
    drawArenaSeal,
    drawWarden,
    drawWardenMarkers,
    drawHostileBolt,
    drawSentry,
    drawWarder,
    drawLantern,
    drawMarrow,
  };

  root.NiniYuanWarden = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
