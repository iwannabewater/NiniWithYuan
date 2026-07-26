((root) => {
  "use strict";

  // v2.0.0 — Canvas drawing for the Astral Echo additions: world-finale wardens,
  // their projectiles, the two new hostile silhouettes, and the hidden star
  // marrow. Stateless like the rest of `src/render/`: every function reads its
  // arguments and draws. Collision geometry and encounter state stay in
  // `src/game.js`.

  const WARDEN_PALETTES = Object.freeze({
    aurora: Object.freeze({ shell: "#5b6486", core: "#c3a468", trim: "#b87b86", glow: "rgba(195,164,104,.5)" }),
    core: Object.freeze({ shell: "#3f6a63", core: "#6da895", trim: "#c3a468", glow: "rgba(109,168,149,.5)" }),
    tide: Object.freeze({ shell: "#3d5468", core: "#7893a4", trim: "#c3a468", glow: "rgba(120,147,164,.5)" }),
  });

  function wardenPalette(name) {
    return WARDEN_PALETTES[name] || WARDEN_PALETTES.aurora;
  }

  function ellipse(ctx, x, y, rx, ry, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
  }

  function ring(ctx, x, y, radius, width, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * The sealed arena edge. Drawn as a vertical rule of star glyphs so the wall
   * reads as intent rather than an invisible collision surface.
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

  /**
   * The guardian itself: an armillary shell around a lit core, tilted by its
   * current action. `flash` brightens the shell on a landed hit.
   */
  function drawWarden(ctx, warden, options = {}) {
    if (!warden) return;
    const { time = 0, telegraph = 0, flash = 0, sigil = "" } = options;
    const palette = wardenPalette(warden.palette);
    const cx = warden.x + warden.w / 2;
    const cy = warden.y + warden.h / 2;
    const radius = Math.min(warden.w, warden.h) / 2;
    const charge = Math.max(0, Math.min(1, telegraph));

    ctx.save();
    // Grounded reference shadow keeps the silhouette anchored during sweeps.
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, warden.y + warden.h + 14, radius * 0.86, 8);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(time * 0.7) * 0.05);

    // Outer armillary rings.
    ring(ctx, 0, 0, radius * 0.98, 2, palette.trim, 0.55);
    ctx.save();
    ctx.rotate(time * 0.55);
    ring(ctx, 0, 0, radius * 0.8, 1.4, palette.core, 0.7);
    ctx.restore();
    ctx.save();
    ctx.rotate(-time * 0.38);
    ctx.scale(1, 0.42);
    ring(ctx, 0, 0, radius * 0.9, 1.6, palette.trim, 0.5);
    ctx.restore();

    // Shell.
    const shellGradient = ctx.createLinearGradient(0, -radius, 0, radius);
    shellGradient.addColorStop(0, palette.shell);
    shellGradient.addColorStop(1, "#141b25");
    ctx.fillStyle = shellGradient;
    ellipse(ctx, 0, 0, radius * 0.62, radius * 0.68);
    ctx.fill();
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Core. Charge and hit flash both read on this one element.
    const coreRadius = radius * (0.24 + charge * 0.12);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = flash > 0 ? "#eee7d5" : palette.core;
    ellipse(ctx, 0, 0, coreRadius, coreRadius);
    ctx.fill();
    ctx.globalAlpha = 0.34 + charge * 0.4;
    ring(ctx, 0, 0, coreRadius + 6 + charge * 10, 2, palette.core, 0.7);
    ctx.globalAlpha = 1;

    if (sigil) {
      ctx.fillStyle = "#0b1016";
      ctx.font = `600 ${Math.round(radius * 0.34)}px ${options.fontFamily || "sans-serif"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sigil, 0, 1);
    }
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

  /** Hostile projectiles: warden bolts, falling shards, and sentry bolts. */
  function drawHostileBolt(ctx, bolt, time = 0) {
    const cx = bolt.x + bolt.w / 2;
    const cy = bolt.y + bolt.h / 2;
    ctx.save();
    if (bolt.kind === "shard") {
      ctx.translate(cx, cy);
      ctx.fillStyle = "#c96978";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, bolt.h / 2);
      ctx.lineTo(-bolt.w / 2, -bolt.h / 2);
      ctx.lineTo(bolt.w / 2, -bolt.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#eee7d5";
      ctx.fillRect(-1, -bolt.h / 2 - 16, 2, 14);
    } else {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = bolt.kind === "sentry" ? "#c96978" : "#c3a468";
      ellipse(ctx, cx, cy, bolt.w / 2, bolt.h / 2);
      ctx.fill();
      ctx.globalAlpha = 0.32 + Math.sin(time * 9) * 0.08;
      ring(ctx, cx, cy, bolt.w * 0.72, 1.4, "#eee7d5", 0.6);
    }
    ctx.restore();
  }

  /** 哨星 — a fixed emplacement. The muzzle ring shows how close the next shot is. */
  function drawSentry(ctx, enemy, options = {}) {
    const { time = 0, charge = 0, flash = 0 } = options;
    const cx = enemy.x + enemy.w / 2;
    const baseY = enemy.y + enemy.h;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, baseY + 2, enemy.w * 0.62, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#2c3a48";
    ctx.beginPath();
    ctx.moveTo(cx - enemy.w * 0.62, baseY);
    ctx.lineTo(cx + enemy.w * 0.62, baseY);
    ctx.lineTo(cx + enemy.w * 0.34, baseY - enemy.h * 0.44);
    ctx.lineTo(cx - enemy.w * 0.34, baseY - enemy.h * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#80683f";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const headY = baseY - enemy.h * 0.62;
    ctx.fillStyle = flash > 0 ? "#eee7d5" : "#4a5c6d";
    ellipse(ctx, cx, headY, enemy.w * 0.46, enemy.h * 0.3);
    ctx.fill();
    ctx.strokeStyle = "#c3a468";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    const facing = enemy.facing >= 0 ? 1 : -1;
    ctx.fillStyle = "#c96978";
    ctx.globalAlpha = 0.55 + charge * 0.45;
    ellipse(ctx, cx + facing * enemy.w * 0.42, headY, 4 + charge * 3, 4 + charge * 3);
    ctx.fill();
    ctx.globalAlpha = 0.2 + charge * 0.5;
    ring(ctx, cx, headY, enemy.w * 0.62 + charge * 6, 1.4, "#c96978", 0.8);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#c96978";
    ctx.setLineDash([4, 7]);
    ctx.lineDashOffset = -time * 20;
    ctx.beginPath();
    ctx.moveTo(cx + facing * enemy.w * 0.6, headY);
    ctx.lineTo(cx + facing * (enemy.w * 0.6 + 74), headY - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** 石胄 — a shelled walker. The plate reads as "bolts will not work here". */
  function drawWarder(ctx, enemy, options = {}) {
    const { time = 0, flash = 0 } = options;
    const cx = enemy.x + enemy.w / 2;
    const baseY = enemy.y + enemy.h;
    const facing = enemy.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#05080c";
    ellipse(ctx, cx, baseY + 2, enemy.w * 0.54, 4.5);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#3a4a3f";
    ellipse(ctx, cx, baseY - enemy.h * 0.34, enemy.w * 0.44, enemy.h * 0.32);
    ctx.fill();

    // Shell plate.
    const plate = ctx.createLinearGradient(0, baseY - enemy.h, 0, baseY);
    plate.addColorStop(0, flash > 0 ? "#eee7d5" : "#8b8f7c");
    plate.addColorStop(1, "#43483f");
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.moveTo(cx - enemy.w * 0.54, baseY - enemy.h * 0.28);
    ctx.quadraticCurveTo(cx, baseY - enemy.h * 1.06, cx + enemy.w * 0.54, baseY - enemy.h * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c3a468";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#eee7d5";
    ctx.lineWidth = 0.9;
    for (const offset of [-0.24, 0, 0.24]) {
      ctx.beginPath();
      ctx.moveTo(cx + enemy.w * offset, baseY - enemy.h * 0.3);
      ctx.lineTo(cx + enemy.w * offset * 0.5, baseY - enemy.h * 0.86);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#0b1016";
    ellipse(ctx, cx + facing * enemy.w * 0.22, baseY - enemy.h * 0.36, 3, 3.4);
    ctx.fill();

    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = "#8b8f7c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(enemy.baseX - enemy.patrol + enemy.w / 2, baseY + 6);
    ctx.lineTo(enemy.baseX + enemy.patrol + enemy.w / 2, baseY + 6);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ellipse(ctx, cx + facing * 10 + Math.sin(time * 3) * 2, baseY + 6, 2.2, 2.2);
    ctx.fillStyle = "#8b8f7c";
    ctx.fill();
    ctx.restore();
  }

  /**
   * 星灯 — a respawn lantern. Unlit it reads as cold indigo scaffolding; once lit
   * the bowl carries the aged-gold flame used everywhere else for "recorded".
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

    ctx.strokeStyle = lit ? "#c3a468" : "#3b4756";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, bottom);
    ctx.lineTo(cx, top + 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - lantern.w * 0.42, bottom);
    ctx.lineTo(cx + lantern.w * 0.42, bottom);
    ctx.stroke();

    if (lit) {
      ctx.globalAlpha = 0.18 + Math.sin(time * 2.6) * 0.05;
      const halo = ctx.createRadialGradient(cx, top + 12, 2, cx, top + 12, 46);
      halo.addColorStop(0, "rgba(238,231,213,.75)");
      halo.addColorStop(1, "rgba(195,164,104,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, top + 12, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = lit ? "#c3a468" : "#232e3b";
    ctx.beginPath();
    ctx.moveTo(cx - lantern.w * 0.46, top + 20);
    ctx.lineTo(cx, top + 2);
    ctx.lineTo(cx + lantern.w * 0.46, top + 20);
    ctx.lineTo(cx + lantern.w * 0.3, top + 26);
    ctx.lineTo(cx - lantern.w * 0.3, top + 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = lit ? "#eee7d5" : "#3b4756";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    if (lit) {
      ctx.fillStyle = "#eee7d5";
      ellipse(ctx, cx, top + 15, 3.4, 4.6 + Math.sin(time * 5) * 0.7);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 星髓 — the hidden chapter collectible. */
  function drawMarrow(ctx, marrow, options = {}) {
    if (!marrow || marrow.taken) return;
    const { time = 0 } = options;
    const cx = marrow.x + marrow.w / 2;
    const cy = marrow.y + marrow.h / 2 + Math.sin(time * 1.8) * 4;
    const radius = marrow.w / 2;
    ctx.save();
    ctx.globalAlpha = 0.16 + Math.sin(time * 2.2) * 0.05;
    ctx.fillStyle = "#b87b86";
    ellipse(ctx, cx, cy, radius * 2.3, radius * 2.3);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.translate(cx, cy);
    ctx.rotate(time * 0.6);
    const facets = ctx.createLinearGradient(0, -radius, 0, radius);
    facets.addColorStop(0, "#eee7d5");
    facets.addColorStop(0.5, "#b87b86");
    facets.addColorStop(1, "#6b3f4c");
    ctx.fillStyle = facets;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.72, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.72, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c3a468";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = "#eee7d5";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.moveTo(-radius * 0.72, 0);
    ctx.lineTo(radius * 0.72, 0);
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
