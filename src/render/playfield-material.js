((root) => {
  "use strict";

  const MATERIAL = Object.freeze({
    lacquer: "#0b1016",
    lacquerRaised: "#111821",
    indigoSilk: "#18212d",
    indigoRaised: "#202c3a",
    moonWhite: "#eee7d5",
    moonWhiteSoft: "#c6bfae",
    agedGold: "#c3a468",
    agedGoldDeep: "#80683f",
    carvedJade: "#6da895",
    dustyRose: "#b87b86",
    phaseBlue: "#7893a4",
    danger: "#c96978",
  });
  const SKY_DEPTHS = Object.freeze([0.13, 0.25, 0.42]);
  const SKY_RIDGE_FILLS = Object.freeze([
    "rgba(238,231,213,.055)",
    "rgba(24,33,45,.46)",
    "rgba(11,16,22,.72)",
  ]);
  const PLATFORM_COLORS = Object.freeze({
    ground: Object.freeze(["#293747", MATERIAL.lacquerRaised, MATERIAL.agedGoldDeep]),
    grass: Object.freeze([MATERIAL.carvedJade, "#29443c", MATERIAL.agedGold]),
    stone: Object.freeze(["#4b5d70", MATERIAL.indigoSilk, MATERIAL.agedGoldDeep]),
    cloud: Object.freeze(["#aebfbd", "#485f66", MATERIAL.moonWhiteSoft]),
    crystal: Object.freeze(["#789f91", "#303a44", MATERIAL.agedGold]),
    breakable: Object.freeze(["#a98a55", "#4a3830", MATERIAL.dustyRose]),
    aurora: Object.freeze(["#666a82", "#29334a", MATERIAL.dustyRose]),
    jade: Object.freeze([MATERIAL.carvedJade, "#29464a", MATERIAL.agedGold]),
    phaseA: Object.freeze([MATERIAL.phaseBlue, "#2d3f52", MATERIAL.agedGold]),
    phaseB: Object.freeze([MATERIAL.carvedJade, "#294a43", MATERIAL.agedGold]),
  });
  const POWERUP_COLORS = Object.freeze({
    berry: MATERIAL.dustyRose,
    moon: MATERIAL.moonWhite,
    core: MATERIAL.carvedJade,
    bell: MATERIAL.agedGold,
    heart: MATERIAL.danger,
  });
  const PORTAL_COLORS = Object.freeze({
    cyan: MATERIAL.phaseBlue,
    gold: MATERIAL.agedGold,
    jade: MATERIAL.carvedJade,
    rose: MATERIAL.dustyRose,
  });

  function ellipse(ctx, x, y, rx, ry, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    ctx.fill();
  }

  function phaseColor(phase) {
    return phase === "b" ? MATERIAL.carvedJade : MATERIAL.phaseBlue;
  }

  function skyPointX(index, drift, width) {
    return (index * 173 + drift * (index % 3 + 1)) % (width + 160) - 80;
  }

  function skyPointY(index, height) {
    return 28 + (index * 83) % Math.max(190, height * 0.56);
  }

  function ridgeY(worldX, baseY, layer) {
    return baseY - 48 - layer * 17
      + Math.sin(worldX * 0.009 + layer * 0.8) * (38 + layer * 7)
      + Math.sin(worldX * 0.0037 + layer * 1.4) * 20;
  }

  function drawSkyMotifs(ctx, options) {
    const { view, time, intensity } = options;
    ctx.save();
    const drift = view.reducedMotion ? 0 : time * 4;
    ctx.globalAlpha = 0.44 * intensity;
    for (let i = 0; i < 22; i += 1) {
      const x = skyPointX(i, drift, view.w);
      const y = skyPointY(i, view.h);
      const radius = 1.1 + (i % 4) * 0.42;
      ctx.fillStyle = i % 5 === 0 ? MATERIAL.carvedJade : i % 3 === 0 ? MATERIAL.moonWhite : MATERIAL.agedGold;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.1 * intensity;
    ctx.strokeStyle = MATERIAL.agedGold;
    ctx.lineWidth = 1;
    for (let i = 0; i + 5 < 22; i += 6) {
      ctx.beginPath();
      ctx.moveTo(skyPointX(i, drift, view.w), skyPointY(i, view.h));
      ctx.lineTo(skyPointX(i + 2, drift, view.w), skyPointY(i + 2, view.h));
      ctx.lineTo(skyPointX(i + 5, drift, view.w), skyPointY(i + 5, view.h));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawObservatoryDisc(ctx, options) {
    const { view, camX = 0, camY = 0, time = 0, intensity = 1 } = options;
    const radius = Math.min(view.w, view.h) * 0.16;
    const x = view.w * 0.78 - (camX * 0.035) % Math.max(1, view.w * 0.18);
    const y = view.h * 0.24 - camY * 0.02;
    const rotation = view.reducedMotion ? 0 : time * 0.018;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.12 * intensity;
    ctx.strokeStyle = MATERIAL.agedGold;
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * (1 - ring * 0.2), radius * (0.54 + ring * 0.08), ring * 0.58, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.18 * intensity;
    for (let tick = 0; tick < 12; tick += 1) {
      const angle = (tick * Math.PI) / 6;
      const inner = radius * (tick % 3 === 0 ? 0.78 : 0.86);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.54);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.54);
      ctx.stroke();
    }
    ctx.fillStyle = MATERIAL.dustyRose;
    ctx.globalAlpha = 0.26 * intensity;
    ctx.beginPath();
    ctx.arc(radius * 0.64, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBackground(ctx, options) {
    const { view, palette, camX = 0, camY = 0, time = 0, intensity = 1, attract = false } = options;
    const gradient = ctx.createLinearGradient(0, 0, attract ? view.w : 0, view.h);
    if (attract) {
      gradient.addColorStop(0, MATERIAL.indigoSilk);
      gradient.addColorStop(0.56, MATERIAL.lacquerRaised);
    } else {
      gradient.addColorStop(0, palette?.[0] || MATERIAL.indigoSilk);
      gradient.addColorStop(0.52, palette?.[1] || MATERIAL.lacquerRaised);
    }
    gradient.addColorStop(1, MATERIAL.lacquer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.w, view.h);
    if (!attract) {
      ctx.fillStyle = "rgba(7, 11, 17, 0.5)";
      ctx.fillRect(0, 0, view.w, view.h);
    }
    drawSkyMotifs(ctx, { view, time, intensity });
    if (attract) return;
    // v2.0.0 — every chapter authors four palette entries but only two reached
    // the sky. The accent and glow now light the horizon, so each chapter's
    // playfield carries its own hour of night instead of one shared dark.
    drawHorizonWash(ctx, { view, palette, camY, intensity });
    drawObservatoryDisc(ctx, { view, camX, camY, time, intensity });

    for (let layer = 0; layer < 3; layer += 1) {
      const depth = SKY_DEPTHS[layer];
      const baseY = view.h * (0.55 + layer * 0.12) - camY * depth;
      const span = 180;
      const offset = -((camX * depth) % span) - span;
      ctx.beginPath();
      ctx.moveTo(offset, view.h);
      for (let x = offset; x < view.w + span * 2; x += 24) {
        const worldX = x + camX * depth;
        ctx.lineTo(x, ridgeY(worldX, baseY, layer));
      }
      ctx.lineTo(view.w + span, view.h);
      ctx.closePath();
      ctx.fillStyle = SKY_RIDGE_FILLS[layer];
      ctx.fill();
      if (layer === 0 && palette?.[2]) {
        // Aerial perspective: the farthest ridge picks up the chapter accent so
        // distance reads as haze rather than as a second black shape.
        ctx.save();
        ctx.globalAlpha = 0.06 * intensity;
        ctx.fillStyle = palette[2];
        ctx.fill();
        ctx.restore();
      }
      if (layer === 1) {
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = MATERIAL.agedGold;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = offset; x < view.w + span * 2; x += 24) {
          const y = ridgeY(x + camX * depth, baseY, layer);
          if (x === offset) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (layer === 1) drawSkyDust(ctx, { view, camX, camY, time, palette, intensity });
    }
    drawGroundHaze(ctx, { view, palette, intensity });
  }

  /**
   * A single light source behind the mid ridge. Warm core from the chapter's
   * glow entry, cooler falloff from its accent, so the horizon has a direction.
   */
  function drawHorizonWash(ctx, options) {
    const { view, palette, camY = 0, intensity = 1 } = options;
    const glow = palette?.[3] || MATERIAL.moonWhiteSoft;
    const accent = palette?.[2] || MATERIAL.agedGold;
    const horizonY = view.h * 0.62 - camY * 0.2;
    ctx.save();
    // Kept deliberately low: the playfield layer must stay the highest-contrast
    // thing on screen, so the sky only suggests a light source.
    ctx.globalAlpha = 0.13 * intensity;
    const top = Math.max(0, horizonY - view.h * 0.2);
    const wash = ctx.createLinearGradient(0, top, 0, horizonY + view.h * 0.08);
    wash.addColorStop(0, "rgba(0,0,0,0)");
    wash.addColorStop(0.7, accent);
    wash.addColorStop(1, glow);
    ctx.fillStyle = wash;
    ctx.fillRect(0, top, view.w, horizonY + view.h * 0.08 - top);
    ctx.restore();
  }

  /**
   * Slow motes between the mid and near ridges. They travel at their own
   * parallax rate, which is what actually sells the gap between layers.
   */
  function drawSkyDust(ctx, options) {
    const { view, camX = 0, camY = 0, time = 0, palette, intensity = 1 } = options;
    if (intensity < 0.6) return;
    const depth = 0.32;
    const drift = view.reducedMotion ? 0 : time * 9;
    ctx.save();
    ctx.fillStyle = palette?.[3] || MATERIAL.moonWhiteSoft;
    for (let i = 0; i < 26; i += 1) {
      const span = view.w + 220;
      const x = ((i * 211 + drift * (1 + (i % 3) * 0.35) - camX * depth) % span + span) % span - 110;
      const y = ((i * 137) % Math.max(140, view.h * 0.5)) + view.h * 0.26 - camY * depth * 0.5;
      ctx.globalAlpha = (0.06 + (i % 4) * 0.028) * intensity;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Low atmosphere so solids sit in air rather than on a flat void. */
  function drawGroundHaze(ctx, options) {
    const { view, palette, intensity = 1 } = options;
    ctx.save();
    ctx.globalAlpha = 0.34 * intensity;
    const haze = ctx.createLinearGradient(0, view.h * 0.66, 0, view.h);
    haze.addColorStop(0, "rgba(0,0,0,0)");
    haze.addColorStop(1, palette?.[0] || MATERIAL.lacquer);
    ctx.fillStyle = haze;
    ctx.fillRect(0, view.h * 0.66, view.w, view.h * 0.34);
    ctx.restore();
  }

  function sceneryKind(worldId) {
    if (worldId === "world2") return "gate-beacon";
    if (worldId === "world3") return "mirror-reed";
    return "star-bloom";
  }

  function stringSeed(value = "") {
    let seed = 0;
    for (let index = 0; index < value.length; index += 1) seed = (seed * 31 + value.charCodeAt(index)) % 997;
    return seed;
  }

  function drawStarBloom(ctx, x, y, variant, sway) {
    const height = 18 + variant * 4;
    ctx.strokeStyle = "rgba(109,168,149,.48)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway, y - height * 0.5, x + sway * 0.4, y - height);
    ctx.stroke();
    ctx.fillStyle = variant % 2 ? "rgba(184,123,134,.72)" : "rgba(195,164,104,.7)";
    ctx.save();
    ctx.translate(x + sway * 0.4, y - height);
    ctx.rotate(Math.PI / 4 + sway * 0.01);
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();
    ctx.globalAlpha *= 0.72;
    ctx.fillStyle = "rgba(238,231,213,.68)";
    ellipse(ctx, x + 4 + sway * 0.3, y - height * 0.58, 4.5, 1.8, -0.45);
    ellipse(ctx, x - 4 + sway * 0.2, y - height * 0.4, 4.5, 1.8, 0.45);
  }

  function drawGateBeacon(ctx, x, y, variant, sway) {
    const height = 24 + variant * 5;
    ctx.strokeStyle = "rgba(195,164,104,.54)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sway * 0.22, y - height);
    ctx.stroke();
    ctx.save();
    ctx.translate(x + sway * 0.22, y - height * 0.72);
    ctx.rotate(sway * 0.012);
    ctx.strokeStyle = "rgba(120,147,164,.68)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 + variant * 1.5, 3.5, 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.5, -0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(195,164,104,.72)";
    ellipse(ctx, x + sway * 0.22, y - height, 2.4, 2.4, 0);
    ctx.globalAlpha *= 0.72;
    ctx.fillStyle = "rgba(120,147,164,.5)";
    ctx.beginPath();
    ctx.moveTo(x + 1, y - height * 0.9);
    ctx.quadraticCurveTo(x + 13 + sway, y - height * 0.76, x + 18 + sway, y - height * 0.58);
    ctx.quadraticCurveTo(x + 10 + sway, y - height * 0.62, x + 1, y - height * 0.7);
    ctx.fill();
  }

  function drawMirrorReed(ctx, x, y, variant, sway) {
    const height = 22 + variant * 5;
    ctx.strokeStyle = "rgba(120,147,164,.52)";
    ctx.lineWidth = 1.2;
    for (let reed = -1; reed <= 1; reed += 1) {
      const offset = reed * 6;
      const localHeight = height - Math.abs(reed) * 5;
      ctx.beginPath();
      ctx.moveTo(x + offset, y);
      ctx.quadraticCurveTo(x + offset + sway * (0.45 + reed * 0.08), y - localHeight * 0.55, x + offset + sway, y - localHeight);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(x + sway, y - height);
    ctx.rotate(Math.PI / 4 + sway * 0.008);
    ctx.fillStyle = variant % 2 ? "rgba(109,168,149,.42)" : "rgba(120,147,164,.5)";
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = "rgba(238,231,213,.42)";
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
  }

  /**
   * Deterministic, non-colliding world props. They sit behind authored solids,
   * giving each star domain a repeatable silhouette language without adding
   * simulation entities or changing a route.
   */
  function drawScenery(ctx, level, options = {}) {
    const platforms = Array.isArray(level?.platforms) ? level.platforms : [];
    const worldId = level?.world?.id || "world1";
    const kind = sceneryKind(worldId);
    const seed = stringSeed(level?.id || worldId);
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    ctx.save();
    ctx.globalAlpha = options.fx === false ? 0.24 : 0.48;
    for (let index = 0; index < platforms.length; index += 1) {
      const platform = platforms[index];
      if (!platform || platform.broken || platform.phase || platform.type === "breakable" || platform.w < 96) continue;
      if ((index + seed) % 3 !== 0) continue;
      const variant = (seed + index) % 3;
      const x = platform.x + 22 + ((seed + index * 37) % Math.max(24, Math.floor(platform.w - 44)));
      const sway = still ? 0 : Math.sin(time * 1.2 + index * 1.7) * (1.5 + variant * 0.55);
      ctx.save();
      if (kind === "gate-beacon") drawGateBeacon(ctx, x, platform.y, variant, sway);
      else if (kind === "mirror-reed") drawMirrorReed(ctx, x, platform.y, variant, sway);
      else drawStarBloom(ctx, x, platform.y, variant, sway);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlatform(ctx, platform) {
    ctx.save();
    const color = platform.type === "phase"
      ? platform.phase === "b" ? PLATFORM_COLORS.phaseB : PLATFORM_COLORS.phaseA
      : PLATFORM_COLORS[platform.type] || PLATFORM_COLORS.ground;
    // v2.0.0 — a short cast shadow under the lip. Without it a solid reads as a
    // sticker on the sky; with it the same geometry reads as a body with mass.
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = MATERIAL.lacquer;
    roundRect(ctx, platform.x + 2, platform.y + 5, platform.w, platform.h, 3, MATERIAL.lacquer);
    ctx.globalAlpha = 1;
    const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.h);
    gradient.addColorStop(0, color[0]);
    gradient.addColorStop(1, color[1]);
    roundRect(ctx, platform.x, platform.y, platform.w, platform.h, 3, gradient);
    const cap = ctx.createLinearGradient(platform.x, platform.y, platform.x + platform.w, platform.y);
    cap.addColorStop(0, color[2]);
    cap.addColorStop(0.5, MATERIAL.moonWhiteSoft);
    cap.addColorStop(1, color[2]);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = cap;
    ctx.fillRect(platform.x + 3, platform.y + 1, Math.max(0, platform.w - 6), 3);
    ctx.strokeStyle = color[2];
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(platform.x + 3, platform.y + 2);
    ctx.lineTo(platform.x + platform.w - 3, platform.y + 2);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    for (let x = platform.x + 22; x < platform.x + platform.w - 8; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, platform.y + 6);
      ctx.lineTo(x + 12, platform.y + Math.min(12, platform.h - 3));
      ctx.stroke();
    }
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = MATERIAL.moonWhiteSoft;
    for (let x = platform.x + 72; x < platform.x + platform.w - 10; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, platform.y + 9);
      ctx.lineTo(x, platform.y + platform.h - 4);
      ctx.stroke();
      ctx.save();
      ctx.translate(x, platform.y + 9);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = MATERIAL.lacquer;
    ctx.beginPath();
    ctx.moveTo(platform.x + 4, platform.y + platform.h - 2);
    ctx.lineTo(platform.x + platform.w - 4, platform.y + platform.h - 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (platform.type === "breakable") {
      ctx.strokeStyle = "rgba(238,231,213,.28)";
      for (let x = platform.x + 16; x < platform.x + platform.w; x += 38) {
        ctx.beginPath();
        ctx.moveTo(x, platform.y + 8);
        ctx.lineTo(x + 14, platform.y + platform.h - 10);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawHazard(ctx, hazard, time = 0) {
    ctx.save();
    ctx.fillStyle = hazard.type === "lava" ? "#d59662" : MATERIAL.danger;
    if (hazard.type === "lava") {
      roundRect(ctx, hazard.x, hazard.y + hazard.h * 0.25, hazard.w, hazard.h * 0.75, 3, "#713d37");
      ctx.fillStyle = MATERIAL.agedGold;
      for (let x = hazard.x; x < hazard.x + hazard.w; x += 24) {
        ctx.beginPath();
        ctx.arc(x + 12, hazard.y + 18 + Math.sin(time / 0.17 + x) * 3, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    ctx.fillStyle = MATERIAL.lacquerRaised;
    ctx.fillRect(hazard.x, hazard.y + hazard.h - 7, hazard.w, 7);
    ctx.fillStyle = MATERIAL.danger;
    ctx.strokeStyle = "rgba(238,231,213,.38)";
    ctx.lineWidth = 1;
    for (let x = hazard.x; x < hazard.x + hazard.w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, hazard.y + hazard.h);
      ctx.lineTo(x + 12, hazard.y + 8);
      ctx.lineTo(x + 24, hazard.y + hazard.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSpring(ctx, spring) {
    roundRect(ctx, spring.x + 5, spring.y + 8, spring.w - 10, spring.h, 4, MATERIAL.agedGold);
    ctx.strokeStyle = MATERIAL.carvedJade;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(spring.x + 12, spring.y + 20);
    ctx.lineTo(spring.x + 24, spring.y + 8);
    ctx.lineTo(spring.x + 36, spring.y + 20);
    ctx.lineTo(spring.x + 48, spring.y + 8);
    ctx.stroke();
  }

  function drawCoin(ctx, coin, options = {}) {
    const time = Number(options.time) || 0;
    const bob = options.reducedMotion ? 0 : Math.sin(time / 0.36 + coin.x) * 3;
    ctx.save();
    ctx.translate(coin.x + 11, coin.y + 11 + bob);
    ctx.rotate(coin.kind === "gem" ? Math.PI / 4 : time * 0.16);
    const gradient = ctx.createRadialGradient(-3, -4, 1, 0, 0, 15);
    gradient.addColorStop(0, MATERIAL.moonWhite);
    gradient.addColorStop(1, coin.kind === "gem" ? MATERIAL.carvedJade : MATERIAL.agedGold);
    ctx.fillStyle = gradient;
    ctx.shadowColor = coin.kind === "gem" ? MATERIAL.carvedJade : MATERIAL.agedGold;
    ctx.shadowBlur = options.fx === false ? 0 : 7;
    ctx.beginPath();
    if (coin.kind === "gem") {
      ctx.moveTo(0, -13);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-10, 0);
    } else {
      for (let i = 0; i < 16; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 8;
        const radius = i % 2 ? 7 : 12;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(11,16,22,.62)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = MATERIAL.lacquer;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.arc(0, 0, coin.kind === "gem" ? 3 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function powerupColor(kind) {
    return POWERUP_COLORS[kind] || MATERIAL.agedGold;
  }

  function drawPowerup(ctx, powerup, options = {}) {
    const time = Number(options.time) || 0;
    const color = powerupColor(powerup.kind);
    const bob = options.reducedMotion ? 0 : Math.sin(time / 0.28 + powerup.x) * 3;
    ctx.save();
    ctx.translate(powerup.x + powerup.w / 2, powerup.y + powerup.h / 2 + bob);
    ctx.shadowColor = color;
    ctx.shadowBlur = options.fx === false ? 0 : 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (powerup.kind === "berry") {
      ctx.arc(0, 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = MATERIAL.carvedJade;
      ellipse(ctx, 8, -10, 7, 4, -0.4);
    } else if (powerup.kind === "moon") {
      ctx.arc(1, 0, 14, 0.55, Math.PI * 1.65);
      ctx.arc(-4, -2, 12, Math.PI * 1.67, 0.5, true);
      ctx.fill();
    } else if (powerup.kind === "core") {
      ctx.moveTo(0, -16);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
    } else if (powerup.kind === "heart") {
      ctx.moveTo(0, 14);
      ctx.bezierCurveTo(-19, 2, -15, -13, -6, -13);
      ctx.bezierCurveTo(-1, -13, 0, -8, 0, -6);
      ctx.bezierCurveTo(0, -8, 2, -13, 7, -13);
      ctx.bezierCurveTo(16, -13, 19, 2, 0, 14);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(-12, -8);
      ctx.lineTo(12, -8);
      ctx.lineTo(8, 12);
      ctx.lineTo(-8, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = MATERIAL.moonWhite;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(0, 19);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(238,231,213,.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawGoal(ctx, goal, options = {}) {
    const time = Number(options.time) || 0;
    // v2.0.0 — a warden-sealed gate desaturates to lacquer and stops breathing,
    // so "not yet" reads before the player walks into it.
    const sealed = options.sealed === true;
    ctx.save();
    ctx.translate(goal.x + goal.w / 2, goal.y + goal.h / 2);
    ctx.globalAlpha = 0.62;
    const ringColors = sealed
      ? [MATERIAL.agedGoldDeep, MATERIAL.indigoRaised, MATERIAL.agedGoldDeep]
      : [MATERIAL.agedGold, MATERIAL.carvedJade, MATERIAL.dustyRose];
    for (let i = 0; i < ringColors.length; i += 1) {
      ctx.strokeStyle = ringColors[i];
      ctx.lineWidth = i === 0 ? 3 : 2;
      ctx.beginPath();
      const motion = options.reducedMotion ? 0 : Math.sin(time + i) * 2;
      ctx.ellipse(0, 0, 30 + i * 10, 52 + motion, (options.reducedMotion ? 0 : time * 0.18) + i * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 58);
    if (sealed) {
      gradient.addColorStop(0, "rgba(128,104,63,.42)");
      gradient.addColorStop(0.36, "rgba(128,104,63,.16)");
      gradient.addColorStop(1, "rgba(128,104,63,0)");
    } else {
      gradient.addColorStop(0, "rgba(238,231,213,.92)");
      gradient.addColorStop(0.36, "rgba(195,164,104,.34)");
      gradient.addColorStop(1, "rgba(195,164,104,0)");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sealed ? MATERIAL.agedGoldDeep : MATERIAL.agedGold;
    ctx.beginPath();
    for (let i = 0; i < 16; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 8;
      const radius = i % 2 ? 8 : 17;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    if (sealed) {
      ctx.strokeStyle = MATERIAL.moonWhiteSoft;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -16);
      ctx.lineTo(16, 16);
      ctx.moveTo(16, -16);
      ctx.lineTo(-16, 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWind(ctx, wind, options = {}) {
    const time = (Number(options.time) || 0) / 0.3;
    const direction = Math.sign(wind.force) || 1;
    const spacing = Number(options.arrowSpacing) || 72;
    const speed = Number(options.arrowSpeed) || 18;
    const arrowPhase = (time * speed) % spacing;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = MATERIAL.moonWhiteSoft;
    ctx.fillRect(wind.x, wind.y, wind.w, wind.h);
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = MATERIAL.moonWhiteSoft;
    ctx.lineWidth = 3;
    for (let y = wind.y + 80; y < wind.y + wind.h; y += 92) {
      ctx.beginPath();
      for (let x = wind.x; x < wind.x + wind.w; x += 42) {
        const yy = y + Math.sin((x + time * wind.force) * 0.025) * 18;
        if (x === wind.x) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.76;
    ctx.fillStyle = MATERIAL.moonWhite;
    ctx.strokeStyle = "rgba(17,66,92,.34)";
    ctx.lineWidth = 2;
    for (let y = wind.y + 72; y < wind.y + wind.h; y += 110) {
      for (let i = -1; i <= Math.ceil(wind.w / spacing) + 1; i += 1) {
        const localX = i * spacing + (direction > 0 ? arrowPhase : -arrowPhase);
        const x = wind.x + localX;
        if (x < wind.x + 14 || x > wind.x + wind.w - 14) continue;
        const bob = Math.sin(time * 2 + y * 0.04) * 7;
        ctx.beginPath();
        ctx.moveTo(x + direction * 17, y + bob);
        ctx.lineTo(x - direction * 9, y - 12 + bob);
        ctx.lineTo(x - direction * 4, y + bob);
        ctx.lineTo(x - direction * 9, y + 12 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function portalColor(portal) {
    return PORTAL_COLORS[portal.palette] || MATERIAL.phaseBlue;
  }

  function drawPortal(ctx, portal, options = {}) {
    const time = Number(options.time) || 0;
    const color = portalColor(portal);
    const centerX = portal.x + portal.w / 2;
    const centerY = portal.y + portal.h / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.globalCompositeOperation = "source-over";
    const pulse = options.reducedMotion ? 1 : 1 + Math.sin(time * 3 + portal.x * 0.01) * 0.035;
    ctx.scale(pulse, 1);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, portal.h * 0.62);
    glow.addColorStop(0, "rgba(238, 231, 213, 0.16)");
    glow.addColorStop(0.45, `${color}44`);
    glow.addColorStop(1, "rgba(120, 147, 164, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, portal.w * 0.72, portal.h * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, portal.w * 0.42, portal.h * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = MATERIAL.moonWhite;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, portal.w * (0.24 + i * 0.08), portal.h * (0.24 + i * 0.06), (options.reducedMotion ? 0 : time * 0.8) + i * 0.7, 0, Math.PI * 1.65);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7;
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 2;
      const radius = i % 2 ? 5 : 10;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawParticle(ctx, particle, options = {}) {
    if (!particle) return;
    const alpha = Math.max(0, Math.min(1, Number(options.alpha) || 0));
    const progress = 1 - alpha;
    const radius = Math.max(0.5, Number(particle.r) || 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (particle.glow) {
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(particle.x, particle.y, 2, particle.x, particle.y, radius * 1.6);
      glow.addColorStop(0, particle.color);
      glow.addColorStop(0.55, "rgba(255,247,213,.45)");
      glow.addColorStop(1, "rgba(255,247,213,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.translate(particle.x, particle.y);
    ctx.rotate(Number(particle.rotation) || 0);
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    if (particle.shape === "shard") {
      ctx.beginPath();
      ctx.moveTo(0, -radius * 1.8);
      ctx.lineTo(radius * 0.72, 0);
      ctx.lineTo(0, radius * 1.8);
      ctx.lineTo(-radius * 0.72, 0);
      ctx.closePath();
      ctx.fill();
    } else if (particle.shape === "streak") {
      ctx.lineWidth = Math.max(1, radius * 0.58);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-radius * 2.4, 0);
      ctx.lineTo(radius * 1.15, 0);
      ctx.stroke();
    } else if (particle.shape === "ring") {
      ctx.globalAlpha = alpha * 0.72;
      ctx.lineWidth = Math.max(1, radius * 0.14);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * (0.7 + progress * 1.5), radius * (0.22 + progress * 0.45), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (particle.shape === "petal") {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const api = {
    MATERIAL,
    phaseColor,
    powerupColor,
    drawBackground,
    sceneryKind,
    drawScenery,
    drawPlatform,
    drawHazard,
    drawSpring,
    drawCoin,
    drawPowerup,
    drawGoal,
    drawWind,
    portalColor,
    drawPortal,
    drawParticle,
  };

  root.NiniYuanPlayfieldMaterial = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
