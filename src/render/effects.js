((root) => {
  "use strict";

  // Presentation-only effects: a fixed-capacity particle pool, a pool of
  // floating score texts, and cached screen-space post layers.
  //
  // Particles and texts live in preallocated slots and are compacted in place,
  // so bursts, landings, and wind streaks never allocate during play. Drawing
  // avoids per-particle save/restore and transforms: rotated shapes are
  // expanded by hand and glows come from cached sprites.

  const Art = dependency("NiniYuanArt", "./art.js");

  const PARTICLE_CAPACITY = 640;
  const TEXT_CAPACITY = 24;
  const TEXT_LIFE = 0.8;
  const DEFAULT_GRAVITY = 520;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before effects`);
  }

  function blankParticle() {
    return {
      x: 0, y: 0, vx: 0, vy: 0, r: 1, life: 0, max: 1,
      color: "#ffffff", shape: "orb", gravity: DEFAULT_GRAVITY, drag: 0,
      rotation: 0, spin: 0, glow: false,
    };
  }

  function createParticlePool(capacity = PARTICLE_CAPACITY) {
    const items = new Array(capacity);
    for (let i = 0; i < capacity; i += 1) items[i] = blankParticle();
    return { items, count: 0, capacity };
  }

  /**
   * Claim a slot. When the pool is full the oldest particle is recycled, so a
   * burst during a busy moment still reads instead of silently vanishing.
   */
  function claim(pool) {
    if (pool.count < pool.capacity) return pool.items[pool.count++];
    let oldest = 0;
    let lowest = Infinity;
    for (let i = 0; i < pool.count; i += 1) {
      if (pool.items[i].life < lowest) {
        lowest = pool.items[i].life;
        oldest = i;
      }
    }
    return pool.items[oldest];
  }

  function emit(pool, x, y, vx, vy, r, life, color, shape, gravity, drag, rotation, spin, glow) {
    const p = claim(pool);
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.r = r;
    p.life = life;
    p.max = life;
    p.color = color;
    p.shape = shape || "orb";
    p.gravity = Number.isFinite(gravity) ? gravity : DEFAULT_GRAVITY;
    p.drag = drag > 0 ? drag : 0;
    p.rotation = rotation || 0;
    p.spin = spin || 0;
    p.glow = glow === true;
    return p;
  }

  /** A radial burst. `count` is pre-scaled by the caller's effects setting. */
  function burst(pool, x, y, color, count, options = {}) {
    const shape = options.shape || "orb";
    const gravity = Number.isFinite(options.gravity) ? options.gravity : DEFAULT_GRAVITY;
    const drag = Math.max(0, Number(options.drag) || 0);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 420;
      emit(
        pool, x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        2 + Math.random() * 4,
        0.35 + Math.random() * 0.55,
        color, shape, gravity, drag, angle, (Math.random() - 0.5) * 9, false,
      );
    }
    if (options.glow) emit(pool, x, y, 0, 0, 18, 0.28, color, "orb", 0, 0, 0, 0, true);
  }

  function update(pool, dt) {
    const items = pool.items;
    let i = 0;
    while (i < pool.count) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        // Swap the dead slot with the last live one; order is irrelevant.
        const last = pool.count - 1;
        items[i] = items[last];
        items[last] = p;
        pool.count = last;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const damping = Math.exp(-p.drag * dt);
        p.vx *= damping;
        p.vy *= damping;
      }
      p.rotation += p.spin * dt;
      i += 1;
    }
  }

  function clear(pool) {
    pool.count = 0;
  }

  /** Draw live particles inside `rect` (world space). Glows composite additively. */
  function draw(ctx, pool, rect) {
    const items = pool.items;
    const previousAlpha = ctx.globalAlpha;
    const left = rect.x - 40;
    const right = rect.x + rect.w + 40;
    const top = rect.y - 40;
    const bottom = rect.y + rect.h + 40;
    let glows = 0;
    ctx.lineCap = "round";
    for (let i = 0; i < pool.count; i += 1) {
      const p = items[i];
      if (p.x < left || p.x > right || p.y < top || p.y > bottom) continue;
      if (p.glow) {
        glows += 1;
        continue;
      }
      const alpha = p.life / p.max;
      ctx.globalAlpha = previousAlpha * (alpha > 1 ? 1 : alpha);
      drawShape(ctx, p, 1 - alpha);
    }
    if (glows > 0) {
      const previousComposite = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < pool.count; i += 1) {
        const p = items[i];
        if (!p.glow || p.x < left || p.x > right || p.y < top || p.y > bottom) continue;
        const alpha = p.life / p.max;
        Art.drawGlow(ctx, p.x, p.y, p.r * 1.6, p.color, previousAlpha * alpha);
      }
      ctx.globalCompositeOperation = previousComposite;
    }
    ctx.globalAlpha = previousAlpha;
  }

  function drawShape(ctx, p, progress) {
    const r = p.r > 0.5 ? p.r : 0.5;
    const cos = Math.cos(p.rotation);
    const sin = Math.sin(p.rotation);
    if (p.shape === "streak") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = r * 0.58 > 1 ? r * 0.58 : 1;
      ctx.beginPath();
      ctx.moveTo(p.x - cos * r * 2.4, p.y - sin * r * 2.4);
      ctx.lineTo(p.x + cos * r * 1.15, p.y + sin * r * 1.15);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.shape === "shard") {
      const ax = -sin * r * 1.8;
      const ay = cos * r * 1.8;
      const bx = cos * r * 0.72;
      const by = sin * r * 0.72;
      ctx.moveTo(p.x - ax, p.y - ay);
      ctx.lineTo(p.x + bx, p.y + by);
      ctx.lineTo(p.x + ax, p.y + ay);
      ctx.lineTo(p.x - bx, p.y - by);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === "petal") {
      ctx.ellipse(p.x, p.y, r * 1.35, r * 0.55, p.rotation, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "ring") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = r * 0.14 > 1 ? r * 0.14 : 1;
      ctx.ellipse(p.x, p.y, r * (0.7 + progress * 1.5), r * (0.22 + progress * 0.45), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- floating texts ------------------------------------------------------------

  function createTextPool(capacity = TEXT_CAPACITY) {
    const items = new Array(capacity);
    for (let i = 0; i < capacity; i += 1) items[i] = { text: "", x: 0, y: 0, color: "#ffffff", life: 0 };
    return { items, count: 0, capacity };
  }

  function addText(pool, text, x, y, color) {
    let slot;
    if (pool.count < pool.capacity) {
      slot = pool.items[pool.count++];
    } else {
      // Recycle the most faded text.
      slot = pool.items[0];
      for (let i = 1; i < pool.count; i += 1) if (pool.items[i].life < slot.life) slot = pool.items[i];
    }
    slot.text = String(text);
    slot.x = x;
    slot.y = y;
    slot.color = color;
    slot.life = TEXT_LIFE;
  }

  function updateTexts(pool, dt) {
    const items = pool.items;
    let i = 0;
    while (i < pool.count) {
      const t = items[i];
      t.life -= dt;
      if (t.life <= 0) {
        const last = pool.count - 1;
        items[i] = items[last];
        items[last] = t;
        pool.count = last;
        continue;
      }
      t.y -= 46 * dt;
      i += 1;
    }
  }

  /** Score texts with a gilded under-print; the font strings are prebuilt by the caller. */
  function drawTexts(ctx, pool, options) {
    if (pool.count === 0) return;
    const previousAlpha = ctx.globalAlpha;
    ctx.textAlign = "center";
    if (options.fx !== false) {
      ctx.font = options.italicFont;
      ctx.fillStyle = "#f2d389";
      for (let i = 0; i < pool.count; i += 1) {
        const t = pool.items[i];
        ctx.globalAlpha = previousAlpha * Math.min(1, t.life / TEXT_LIFE) * 0.55;
        ctx.fillText(t.text, t.x + 1, t.y + 1);
      }
    }
    ctx.font = options.font;
    ctx.strokeStyle = "rgba(10,15,21,0.7)";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    for (let i = 0; i < pool.count; i += 1) {
      const t = pool.items[i];
      ctx.globalAlpha = previousAlpha * Math.min(1, t.life / TEXT_LIFE);
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = previousAlpha;
  }

  function clearTexts(pool) {
    pool.count = 0;
  }

  // --- post -------------------------------------------------------------------------

  /**
   * A cached vignette, painted once per viewport at device resolution so the
   * per-frame draw is a 1:1 blit rather than a filtered stretch.
   */
  function createVignette(view, strength = 0.42) {
    const dpr = Math.max(1, Number(view.dpr) || 1);
    const canvas = Art.createCanvas(view.w * dpr, view.h * dpr);
    if (!canvas) return { canvas: null, w: view.w, h: view.h, strength };
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    const w = view.w;
    const h = view.h;
    const gradient = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.7, `rgba(0,0,0,${(strength * 0.45).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(0,0,0,${strength.toFixed(3)})`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, w, h);
    return { canvas, w, h, strength };
  }

  function drawVignette(ctx, vignette, alpha = 1) {
    if (!vignette || alpha <= 0) return;
    if (!vignette.canvas) {
      const gradient = ctx.createRadialGradient(vignette.w / 2, vignette.h / 2, Math.min(vignette.w, vignette.h) * 0.2, vignette.w / 2, vignette.h / 2, Math.max(vignette.w, vignette.h) * 0.7);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${vignette.strength})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, vignette.w, vignette.h);
      return;
    }
    const previous = ctx.globalAlpha;
    ctx.globalAlpha = previous * alpha;
    ctx.drawImage(vignette.canvas, 0, 0, vignette.w, vignette.h);
    ctx.globalAlpha = previous;
  }

  /**
   * A brief full-screen tint for hurt and completion beats. `flash` carries a
   * colour and a decaying intensity; it is advanced with the delivered frame.
   */
  function createFlash() {
    return { color: "#ffffff", intensity: 0, decay: 4 };
  }

  function triggerFlash(flash, color, intensity = 0.35, decay = 4) {
    flash.color = color;
    flash.intensity = Math.max(flash.intensity, intensity);
    flash.decay = decay;
  }

  function drawFlash(ctx, flash, view, dt) {
    if (!flash || flash.intensity <= 0.002) return;
    const previous = ctx.globalAlpha;
    ctx.globalAlpha = previous * Math.min(1, flash.intensity);
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.globalAlpha = previous;
    flash.intensity *= Math.exp(-flash.decay * dt);
  }

  const api = {
    PARTICLE_CAPACITY,
    TEXT_CAPACITY,
    TEXT_LIFE,
    createParticlePool,
    emit,
    burst,
    update,
    clear,
    draw,
    createTextPool,
    addText,
    updateTexts,
    drawTexts,
    clearTexts,
    createVignette,
    drawVignette,
    createFlash,
    triggerFlash,
    drawFlash,
  };

  root.NiniYuanEffects = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
