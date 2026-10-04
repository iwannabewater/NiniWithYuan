((root) => {
  "use strict";

  // Secondary motion for the painted protagonists.
  //
  // Each atlas pose is a single authored illustration, so on its own a run is
  // one frame sliding across the ground. This module gives the costume life
  // without touching the painting: the frame is drawn as horizontal bands, the
  // rigid upper body as one band and the robe below the waist as several, and
  // each lower band is offset by a damped spring. Hems trail behind the
  // direction of travel, flutter faster with speed and in the air, lean with
  // crosswinds, and swing back past centre when the runner stops.
  //
  // The springs run on presentation time, never inside the fixed step, and
  // reduced motion collapses every offset to zero.

  const BANDS = 10;
  const RIGID_TOP = 0.42;
  const MAX_TRAIL = 5.2;
  const FLUTTER = 1.6;
  const WIND_LEAN = 3.4;

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function createCloth() {
    return {
      offsets: new Float32Array(BANDS),
      velocities: new Float32Array(BANDS),
    };
  }

  function resetCloth(cloth) {
    cloth.offsets.fill(0);
    cloth.velocities.fill(0);
  }

  /** Band edges in [0, 1] of frame height: one rigid band, then the robe. */
  function bandTop(index) {
    if (index === 0) return 0;
    return RIGID_TOP + ((1 - RIGID_TOP) * (index - 1)) / (BANDS - 1);
  }

  function bandBottom(index) {
    return index === BANDS - 1 ? 1 : bandTop(index + 1);
  }

  /**
   * Advance the hem springs. Offsets are world pixels along the direction of
   * travel (positive = toward +x). `input.speed` is the character's run speed.
   */
  function stepCloth(cloth, input, dt) {
    if (input.still) {
      resetCloth(cloth);
      return cloth;
    }
    const step = clamp(dt, 0, 0.05);
    if (step <= 0) return cloth;
    const ratio = clamp((Number(input.vx) || 0) / Math.max(1, Number(input.speed) || 1), -1.5, 1.5);
    const airborne = input.onGround === false;
    const rise = airborne ? clamp(-(Number(input.vy) || 0) / 900, -1, 1) : 0;
    const time = Number(input.time) || 0;
    const wind = clamp(Number(input.wind) || 0, -1, 1);
    const pace = 4.5 + Math.abs(ratio) * 4 + (airborne ? 2.5 : 0);
    const flutterAmp = FLUTTER * (0.35 + Math.abs(ratio) * 0.9 + (airborne ? 0.8 : 0));
    // Substeps keep the stiff upper springs stable on long frames.
    const substeps = Math.ceil(step / (1 / 120));
    const h = step / substeps;
    for (let i = 1; i < BANDS; i += 1) {
      const t = (bandTop(i) + bandBottom(i)) / 2;
      const weight = smoothstep(RIGID_TOP - 0.02, 1, t);
      const trail = -ratio * MAX_TRAIL * Math.pow(weight, 1.25) * (airborne ? 0.75 + Math.abs(rise) * 0.4 : 1);
      const flutter = Math.sin(time * pace - t * 5.2) * flutterAmp * weight;
      const target = trail + flutter + wind * WIND_LEAN * weight;
      const stiffness = 170 - 95 * weight;
      const damping = 2 * Math.sqrt(stiffness) * 0.42;
      let x = cloth.offsets[i];
      let v = cloth.velocities[i];
      for (let s = 0; s < substeps; s += 1) {
        v += (stiffness * (target - x) - damping * v) * h;
        x += v * h;
      }
      // Neighbouring bands may not shear apart: the robe stays one piece.
      const above = cloth.offsets[i - 1];
      const limit = 1.6;
      if (x > above + limit) x = above + limit;
      else if (x < above - limit) x = above - limit;
      cloth.offsets[i] = x;
      cloth.velocities[i] = v;
    }
    return cloth;
  }

  /**
   * Draw a frame as bands. `direction` converts world-space offsets into the
   * current local x axis (the caller may have mirrored the frame). Bands
   * overlap by one destination pixel so no seam opens between them.
   */
  function drawBanded(ctx, source, sx, sy, sw, sh, dx, dy, dw, dh, cloth, direction, overlap = 1) {
    for (let i = 0; i < BANDS; i += 1) {
      const t0 = bandTop(i);
      const t1 = bandBottom(i);
      const last = i === BANDS - 1;
      const srcY = sy + sh * t0;
      const srcH = sh * (t1 - t0);
      const pad = last ? 0 : overlap;
      const padSrc = (pad * sh) / dh;
      const offset = cloth ? cloth.offsets[i] * direction : 0;
      ctx.drawImage(source, sx, srcY, sw, Math.min(srcH + padSrc, sy + sh - srcY), dx + offset, dy + dh * t0, dw, dh * (t1 - t0) + pad);
    }
  }

  const api = {
    BANDS,
    RIGID_TOP,
    MAX_TRAIL,
    createCloth,
    resetCloth,
    stepCloth,
    drawBanded,
    bandTop,
    bandBottom,
  };

  root.NiniYuanCharacterCloth = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
