((root) => {
  "use strict";

  // Chapter backdrops: a nocturnal blue-green landscape scroll.
  //
  // `composeScene` paints every parallax layer once into a seamless,
  // horizontally tiling offscreen canvas (mineral-pigment ranges, ink texture
  // strokes, moonlit rims, mist, architecture, and flora along the ridges).
  // `drawScene` then only blits those tiles each frame, plus a handful of
  // cheap animated touches: twinkling stars, the celestial body, aurora, the
  // shimmering world beneath the isles, and ambient life. A chapter therefore
  // looks hand-painted but costs a few drawImage calls per frame.
  //
  // Coordinates: tiles are authored in CSS pixels and painted at a reduced
  // per-layer resolution, so far layers stay soft and read as atmospheric
  // depth. Each tile is then cropped to its painted band and resampled once to
  // device resolution, and drawn every frame at whole device pixels: a plain
  // blit with no per-frame filtering. The sky, its stars, and the moon sit at
  // optical infinity, so they are baked into one opaque screen canvas.
  // Layers scroll by `parallax * camera` and sink slightly as the camera
  // rises, never exposing a tile edge.

  const Art = dependency("NiniYuanArt", "./art.js");
  const Motifs = dependency("NiniYuanMotifs", "./motifs.js");
  const Specs = dependency("NiniYuanSceneSpecs", "./scene-specs.js");

  const LAYER_SCALE = [0.6, 0.82, 1];
  const MAX_TILE_PIXELS = 9e6;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the scenery`);
  }

  function wrapDistance(a, b, period) {
    let d = Math.abs(a - b) % period;
    if (d > period / 2) d = period - d;
    return d;
  }

  /**
   * Skyline sampler for one range layer: y of the ridge at tile x.
   *
   * Peaks follow the Song scroll grammar rather than generic cones: one or two
   * towering "hero" crowns per tile, rounded caps on steep flanks, and
   * shoulder ridges stepping down each side.
   */
  function skylineSampler(layer, tileW, tileH, seed) {
    const random = Art.rng(seed);
    const coarse = Art.periodicNoise(`${seed}:coarse`, 5);
    const fine = Art.periodicNoise(`${seed}:fine`, 7);
    const horizonY = tileH * layer.horizon;
    const peakH = tileH * layer.height;
    const sharp = Art.clamp(layer.sharpness ?? 0.6, 0, 1);
    const peaks = [];
    const heroes = new Set([Math.floor(random() * layer.peaks)]);
    if (layer.peaks > 4 && random() > 0.4) heroes.add(Math.floor(random() * layer.peaks));
    for (let i = 0; i < layer.peaks; i += 1) {
      const hero = heroes.has(i);
      const c = ((i + 0.2 + random() * 0.6) / layer.peaks) * tileW;
      const w = (tileW / layer.peaks) * (hero ? 0.62 : 0.42 + random() * 0.3) * (layer.islands ? 0.75 : 1);
      const h = peakH * (hero ? 0.9 + random() * 0.1 : 0.42 + random() * 0.38);
      peaks.push({ c, w, h, hero });
      // Shoulder ridges stepping down the flanks.
      for (const side of [-1, 1]) {
        if (random() < 0.25) continue;
        peaks.push({ c: c + side * w * (0.42 + random() * 0.18), w: w * (0.34 + random() * 0.12), h: h * (0.48 + random() * 0.2), hero: false });
      }
    }
    const exponent = 1.3 + sharp * 2.2;
    const sample = (x) => {
      let height = 0;
      for (const peak of peaks) {
        const d = wrapDistance(x, peak.c, tileW) / peak.w;
        if (d >= 1) continue;
        const v = peak.h * Math.pow(Math.cos(d * Math.PI / 2), exponent);
        if (v > height) height = v;
      }
      if (height > 0.5) {
        height += coarse(x, tileW) * peakH * 0.045 + fine(x, tileW) * peakH * (0.012 + sharp * 0.014);
      } else if (!layer.islands) {
        height = Math.max(0, 5 + coarse(x, tileW) * 5);
      }
      return horizonY - Math.max(0, height);
    };
    return { sample, horizonY, peakH, peaks };
  }

  function atmospheric(color, sky, depth) {
    // depth 0 = farthest; far layers dissolve toward the horizon light.
    return Art.mix(color, sky.horizon, (1 - depth) * 0.5);
  }

  function rangePath(g, points, tileW, bottom) {
    g.beginPath();
    g.moveTo(0, bottom);
    for (const [x, y] of points) g.lineTo(x, y);
    g.lineTo(tileW, bottom);
    g.closePath();
  }

  /**
   * Directional shading band: (range) minus (range shifted by `distance`
   * toward `direction`), filled with `color`. Bands at growing distances and
   * falling alpha stack into a soft, painterly gradient along every flank.
   */
  function shadeBands(g, points, tileW, tileH, direction, color, bands) {
    const scratch = Art.createCanvas(g.canvas.width, g.canvas.height);
    if (!scratch) return;
    const transform = g.getTransform ? g.getTransform() : null;
    const s2 = scratch.getContext("2d");
    for (const [distance, alpha] of bands) {
      s2.setTransform(1, 0, 0, 1, 0, 0);
      s2.clearRect(0, 0, scratch.width, scratch.height);
      if (transform) s2.setTransform(transform);
      s2.globalCompositeOperation = "source-over";
      rangePath(s2, points, tileW, tileH);
      s2.fillStyle = color;
      s2.fill();
      s2.globalCompositeOperation = "destination-out";
      s2.save();
      s2.translate(direction * distance, distance * 0.35);
      rangePath(s2, points, tileW, tileH);
      s2.fill();
      s2.restore();
      // Wrap: the shifted copy must also cover the seam from the far side.
      s2.save();
      s2.translate(direction * distance - direction * tileW, distance * 0.35);
      rangePath(s2, points, tileW, tileH);
      s2.fill();
      s2.restore();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = alpha;
      g.drawImage(scratch, 0, 0);
      g.restore();
    }
  }

  function paintRange(g, layer, index, count, scene, tileW, tileH, seed) {
    const sky = scene.sky;
    const depth = count <= 1 ? 1 : index / (count - 1);
    const colors = layer.colors;
    const crown = atmospheric(colors.crown, sky, depth);
    const slope = atmospheric(colors.slope, sky, depth);
    const foot = atmospheric(colors.foot, sky, depth * 0.85);
    const ink = Art.mix(colors.ink, foot, 0.3);
    const mistColor = Art.mix(sky.horizon, "#dbe5ea", 0.3 + (1 - depth) * 0.15);
    const lightSide = (scene.celestial?.x ?? 0.7) >= 0.5 ? 1 : -1;
    const { sample, horizonY, peakH, peaks } = skylineSampler(layer, tileW, tileH, seed);
    const step = 4;
    const points = [];
    for (let x = 0; x <= tileW + step; x += step) points.push([x, sample(x % tileW)]);
    const top = horizonY - peakH;

    g.save();
    rangePath(g, points, tileW, tileH);
    const fill = g.createLinearGradient(0, top, 0, horizonY);
    fill.addColorStop(0, crown);
    fill.addColorStop(0.45, slope);
    fill.addColorStop(1, foot);
    g.fillStyle = fill;
    g.fill();
    // Volume: flanks facing away from the moon fall into shadow and flanks
    // facing it catch light. Each band is the range minus a copy of itself
    // shifted along the light direction, so shading hugs every ridge exactly.
    shadeBands(g, points, tileW, tileH, -lightSide, colors.ink, [[5, 0.2 + depth * 0.1], [13, 0.12 + depth * 0.06], [30, 0.08]]);
    shadeBands(g, points, tileW, tileH, lightSide, colors.rim, [[3, 0.12 + depth * 0.08], [10, 0.05 + depth * 0.04]]);
    rangePath(g, points, tileW, tileH);
    g.save();
    g.clip();

    // Snow caps on the aurora range.
    if (layer.snowline) {
      const snow = g.createLinearGradient(0, top, 0, top + peakH * layer.snowline);
      snow.addColorStop(0, Art.rgba("#f2f6ff", 0.7));
      snow.addColorStop(1, Art.rgba("#f2f6ff", 0));
      g.fillStyle = snow;
      g.fillRect(0, top, tileW, peakH * layer.snowline);
    }

    // Hemp-fibre texture: long wavering strokes down the flanks.
    const random = Art.rng(`${seed}:cun`);
    g.lineCap = "round";
    const fibres = Math.round((tileW / 7) * (0.5 + depth * 0.6));
    for (let i = 0; i < fibres; i += 1) {
      const x = random() * tileW;
      const ridge = sample(x);
      if (ridge > horizonY - 10) continue;
      const span = horizonY - ridge;
      const y = ridge + random() * span * 0.35;
      const length = span * (0.18 + random() * 0.32);
      const slopeDir = sample((x + 5) % tileW) - sample((x - 5 + tileW) % tileW) > 0 ? 1 : -1;
      const lean = slopeDir * (0.12 + random() * 0.2);
      g.strokeStyle = Art.rgba(colors.ink, 0.05 + random() * 0.08 * (0.6 + depth));
      g.lineWidth = 0.5 + random() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + lean * length * 0.3 + 1.5, y + length * 0.33, x + lean * length * 0.7 - 1.5, y + length * 0.66, x + lean * length, y + length);
      g.stroke();
    }

    g.restore();

    // Moonlit rim along the ridge.
    g.beginPath();
    for (let i = 0; i < points.length; i += 1) {
      const [x, y] = points[i];
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokeStyle = Art.rgba(colors.rim, 0.1 + depth * 0.1);
    g.lineWidth = 1.1;
    g.stroke();

    // Moss dots and distant tree ticks along the ridgeline.
    const dots = Math.round((tileW / 26) * (0.4 + depth));
    for (let i = 0; i < dots; i += 1) {
      const x = random() * tileW;
      const y = sample(x);
      if (y > horizonY - 6) continue;
      g.fillStyle = Art.rgba(colors.ink, 0.35 + depth * 0.3);
      if (random() < 0.55) {
        g.beginPath();
        g.ellipse(x, y + 1.5 + random() * 3, 1 + random() * 1.4 * (0.5 + depth), 0.8 + random() * 0.8, 0, 0, Math.PI * 2);
        g.fill();
      } else {
        const ticks = 2 + Math.floor(random() * 4);
        for (let t = 0; t < ticks; t += 1) {
          const tx = x + t * 2.2;
          const th = (3 + random() * 4) * (0.5 + depth * 0.7);
          g.fillRect(tx, sample(tx % tileW) - th + 1.5, 0.9 + depth * 0.5, th);
        }
      }
    }

    // Island reflections on still water.
    if (layer.islands) {
      g.save();
      g.globalAlpha = 0.14;
      g.beginPath();
      g.moveTo(0, horizonY);
      for (const [x, y] of points) g.lineTo(x, horizonY + (horizonY - y) * 0.34);
      g.lineTo(tileW, horizonY);
      g.closePath();
      g.fillStyle = slope;
      g.fill();
      g.restore();
    }

    // The feet of the range dissolve into luminous mist.
    const mistTop = horizonY - peakH * (0.32 + layer.mist * 0.12);
    const dissolve = g.createLinearGradient(0, mistTop, 0, Math.min(tileH, horizonY + tileH * 0.06));
    dissolve.addColorStop(0, Art.rgba(mistColor, 0));
    dissolve.addColorStop(0.55, Art.rgba(mistColor, 0.22 * layer.mist + 0.08));
    dissolve.addColorStop(1, Art.rgba(mistColor, 0.55 * layer.mist + 0.2));
    rangePath(g, points, tileW, tileH);
    g.fillStyle = dissolve;
    g.fill();

    // Soft drifting cloud bands across the slopes.
    const mistRandom = Art.rng(`${seed}:mist`);
    const bands = 1 + Math.round(layer.mist * 2);
    for (let b = 0; b < bands; b += 1) {
      const centerY = horizonY - peakH * (0.08 + mistRandom() * 0.38);
      const thick = 18 + mistRandom() * 34;
      const wave = Art.periodicNoise(`${seed}:mist${b}`, 4);
      g.beginPath();
      for (let x = 0; x <= tileW; x += 10) {
        const y = centerY - thick * (0.5 + wave(x, tileW) * 0.45);
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      for (let x = tileW; x >= 0; x -= 10) g.lineTo(x, centerY + thick * (0.45 + wave(x + 61, tileW) * 0.35));
      g.closePath();
      const band = g.createLinearGradient(0, centerY - thick, 0, centerY + thick);
      band.addColorStop(0, Art.rgba(mistColor, 0));
      band.addColorStop(0.5, Art.rgba(mistColor, layer.mist * (0.16 + (1 - depth) * 0.1)));
      band.addColorStop(1, Art.rgba(mistColor, 0));
      g.fillStyle = band;
      g.fill();
    }
    g.restore();
    return { sample, horizonY, peakH, ink, foot, depth };
  }

  /** Local ridge maxima: natural perches for pavilions and pagodas. */
  function perches(sample, tileW, count, random, margin) {
    const candidates = [];
    for (let x = margin; x < tileW - margin; x += 8) {
      const y = sample(x);
      if (y <= sample(x - 16) && y <= sample(x + 16)) candidates.push([x, y]);
    }
    candidates.sort((a, b) => a[1] - b[1]);
    const chosen = [];
    for (const candidate of candidates) {
      if (chosen.length >= count) break;
      if (chosen.some(([x]) => wrapDistance(x, candidate[0], tileW) < tileW / (count + 1))) continue;
      if (random() < 0.15) continue;
      chosen.push(candidate);
    }
    return chosen;
  }

  function paintStructures(g, scene, layerIndex, painted, tileW, tileH, seed) {
    const random = Art.rng(`${seed}:structures`);
    const light = "#ffd89a";
    for (const group of scene.structures || []) {
      if (group.layer !== layerIndex) continue;
      const scale = (0.6 + painted.depth * 0.55) * (group.scale || 1);
      const ink = Art.mix(painted.foot, "#05070b", 0.45);
      const spots = group.onClouds
        ? Array.from({ length: group.count }, (_, i) => [((i + 0.3 + random() * 0.4) / group.count) * tileW, painted.horizonY + 4])
        : perches(painted.sample, tileW, group.count, random, 70);
      for (const [x, y] of spots) {
        const kind = group.kinds[Math.floor(random() * group.kinds.length)];
        const opts = { ink, light: Art.rgba(light, 0.85), rim: scene.layersRim, random, sail: Art.mix(ink, "#c9c2b0", 0.25) };
        for (const offset of [0, -tileW, tileW]) {
          const px = x + offset;
          if (px < -200 || px > tileW + 200) continue;
          g.save();
          Motifs.drawStructure(g, kind, px, y + 3, scale, { ...opts, random: Art.rng(`${seed}:${kind}:${Math.round(x)}`) });
          g.restore();
        }
      }
    }
  }

  function paintFlora(g, scene, layerIndex, painted, tileW, seed) {
    const flora = scene.flora;
    if (!flora || flora.layer !== layerIndex) return;
    const random = Art.rng(`${seed}:flora`);
    const ink = Art.mix(painted.foot, "#04060a", 0.55);
    const foliage = Art.mix(painted.foot, "#1d3a33", 0.35);
    for (let i = 0; i < flora.count; i += 1) {
      const x = ((i + 0.15 + random() * 0.7) / flora.count) * tileW;
      const y = painted.sample(x) + 2;
      const kind = flora.kinds[Math.floor(random() * flora.kinds.length)];
      const scale = 0.55 + random() * 0.35;
      for (const offset of [0, -tileW, tileW]) {
        const px = x + offset;
        if (px < -160 || px > tileW + 160) continue;
        g.save();
        Motifs.drawFlora(g, kind, px, y, scale, {
          ink,
          foliage,
          rim: scene.ranges[layerIndex]?.colors.rim,
          blossom: kind === "plum" ? "#efb3c2" : "#e8a7bb",
          random: Art.rng(`${seed}:${kind}:${i}`),
        });
        g.restore();
      }
    }
  }

  function paintStars(g, scene, tileW, tileH, seed) {
    const random = Art.rng(`${seed}:stars`);
    const density = scene.stars.density ?? 1;
    const count = Math.round((tileW * tileH) / 2600 * density);
    for (let i = 0; i < count; i += 1) {
      const x = random() * tileW;
      const y = Math.pow(random(), 1.35) * tileH * 0.78;
      const size = random() < 0.08 ? 1.2 + random() * 0.9 : 0.4 + random() * 0.7;
      g.globalAlpha = 0.25 + random() * 0.65;
      g.fillStyle = random() < 0.15 ? "#c9e6ff" : scene.stars.tint;
      g.beginPath();
      g.arc(x, y, size, 0, Math.PI * 2);
      g.fill();
      if (size > 1.5) {
        g.globalAlpha *= 0.5;
        g.fillRect(x - size * 3, y - 0.3, size * 6, 0.6);
        g.fillRect(x - 0.3, y - size * 3, 0.6, size * 6);
      }
    }
    g.globalAlpha = 1;
  }

  /** The Silver River: a dense diagonal band of stars and nebula light. */
  function paintStarRiver(g, w, h, color, seed) {
    const random = Art.rng(`${seed}:river`);
    g.save();
    const angle = -0.32;
    g.translate(w * 0.5, h * 0.36);
    g.rotate(angle);
    const span = Math.hypot(w, h) * 0.75;
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 42; i += 1) {
      const x = (random() - 0.5) * span * 1.6;
      const y = (random() - 0.5) * h * 0.12;
      const r = h * (0.06 + random() * 0.12);
      const glow = g.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, Art.rgba(i % 5 === 0 ? "#b8c8ff" : color, 0.07));
      glow.addColorStop(1, Art.rgba(color, 0));
      g.fillStyle = glow;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 900; i += 1) {
      const x = (random() - 0.5) * span * 1.6;
      const spread = random() + random() + random() - 1.5;
      const y = spread * h * 0.07;
      g.globalAlpha = 0.25 + random() * 0.6;
      g.fillStyle = random() < 0.2 ? "#d8e4ff" : color;
      const r = random() < 0.05 ? 1.1 : 0.45 + random() * 0.45;
      g.fillRect(x, y, r, r);
    }
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 5; i += 1) {
      const x = (random() - 0.5) * span;
      const y = (random() - 0.5) * h * 0.03;
      const rx = h * (0.12 + random() * 0.14);
      const lane = g.createRadialGradient(x, y, 0, x, y, rx);
      lane.addColorStop(0, Art.rgba("#070a18", 0.32));
      lane.addColorStop(1, Art.rgba("#070a18", 0));
      g.save();
      g.translate(x, y);
      g.scale(1, 0.22);
      g.translate(-x, -y);
      g.fillStyle = lane;
      g.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      g.restore();
    }
    g.restore();
  }

  function paintMoon(g, size, color, crescent) {
    const r = size / 2;
    const c = r;
    const disc = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.05, c, c, r);
    disc.addColorStop(0, Art.shade(color, 0.3));
    disc.addColorStop(0.75, color);
    disc.addColorStop(1, Art.shade(color, -0.1));
    g.fillStyle = disc;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.clip();
    const random = Art.rng(`moon:${color}`);
    for (let i = 0; i < 9; i += 1) {
      const mx = c + (random() - 0.35) * r * 1.2;
      const my = c + (random() - 0.45) * r * 1.1;
      const mr = r * (0.08 + random() * 0.2);
      const mare = g.createRadialGradient(mx, my, 0, mx, my, mr);
      mare.addColorStop(0, Art.rgba("#7d7f8c", 0.16 + random() * 0.08));
      mare.addColorStop(1, Art.rgba("#7d7f8c", 0));
      g.fillStyle = mare;
      g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    }
    g.restore();
    if (crescent) {
      g.globalCompositeOperation = "destination-out";
      g.beginPath();
      g.arc(c - r * 0.48, c - r * 0.2, r * 0.9, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = "source-over";
    }
  }

  /** Paint the sky, stars, and celestial body into one opaque screen canvas. */
  function paintSky(spec, view, dpr, seed, quality) {
    const canvas = Art.createCanvas(view.w * dpr, view.h * dpr);
    if (!canvas) return null;
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    const w = view.w;
    const h = view.h;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, spec.sky.top);
    sky.addColorStop(0.45, spec.sky.mid);
    sky.addColorStop(0.82, spec.sky.horizon);
    sky.addColorStop(1, Art.mix(spec.sky.horizon, spec.sky.glow, 0.35));
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    Art.drawGlow(g, w * 0.5, h * 0.86, w * 0.55, spec.sky.glow, 0.12);
    paintStars(g, spec, w, h, `${seed}:sky`);
    const celestial = spec.celestial;
    if (celestial) {
      const cx = w * celestial.x;
      const cy = h * celestial.y;
      if (["moon", "crescent", "ember", "starCore"].includes(celestial.kind)) {
        const size = Math.round(Math.min(w, h) * celestial.size * 2) + 2;
        Art.drawGlow(g, cx, cy, size * 2.2, celestial.color, celestial.kind === "ember" ? 0.5 : 0.28);
        // The crescent is cut with destination-out, so the disc gets its own
        // canvas before it is laid onto the sky.
        const res = Math.min(2, dpr);
        const disc = Art.createCanvas(size * res, size * res);
        if (disc) {
          const d = disc.getContext("2d");
          d.scale(res, res);
          paintMoon(d, size, celestial.color, celestial.kind === "crescent");
          g.drawImage(disc, cx - size / 2, cy - size / 2, size, size);
        }
      } else if (celestial.kind === "starRiver") {
        paintStarRiver(g, w, h, celestial.color, seed);
      } else if (celestial.kind === "twinStars") {
        const r = Math.min(w, h) * celestial.size;
        for (const [dx, dy, tint] of [[-r * 1.4, 0, "#f6e3a8"], [r * 1.4, r * 0.5, "#a8d8f6"]]) {
          Art.drawGlow(g, cx + dx, cy + dy, r * 3, tint, 0.55);
          g.fillStyle = "#fffaf0";
          g.beginPath();
          g.arc(cx + dx, cy + dy, r * 0.22, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // A soft framing falloff toward the corners of the sky.
    const frame = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    frame.addColorStop(0, "rgba(0,0,0,0)");
    frame.addColorStop(1, `rgba(0,0,0,${(0.22 * quality).toFixed(3)})`);
    g.fillStyle = frame;
    g.fillRect(0, 0, w, h);
    return canvas;
  }

  /** Twinkle sites, fixed per scene so the per-frame pass allocates nothing. */
  function twinkleSites(spec, view) {
    const random = Art.rng(`${spec.id}:twinkle`);
    const count = 18;
    const sites = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      sites[i * 4] = random() * view.w;
      sites[i * 4 + 1] = random() * view.h * 0.55;
      sites[i * 4 + 2] = 1.5 + random() * 2;
      sites[i * 4 + 3] = random() * 6;
    }
    return sites;
  }

  /**
   * Highest painted pixel a range layer can reach: its ridge, less headroom
   * for the structures, flora, and mist bands painted above it.
   */
  function layerCropTop(spec, index, layer, sample, tileW, horizonY, peakH) {
    let ridge = horizonY;
    for (let x = 0; x < tileW; x += 4) ridge = Math.min(ridge, sample(x));
    const hasStructures = (spec.structures || []).some((group) => group.layer === index);
    const hasFlora = spec.flora?.layer === index;
    const headroom = hasStructures ? 160 : hasFlora ? 96 : 18;
    const mistTop = horizonY - peakH * 0.46 - 56;
    return Math.max(0, Math.floor(Math.min(ridge - headroom, mistTop)));
  }

  /** A gradient strip for the world below the isles, painted once. */
  function paintBelowStrip(below, view, dpr) {
    if (!below || below.kind === "cloudsea") return null;
    const pad = below.kind === "lava" ? 60 : below.kind === "starsea" || below.kind === "mirror" ? 0 : 40;
    const height = Math.ceil(view.h * 0.1 + 24 + pad);
    const canvas = Art.createCanvas(view.w * dpr, height * dpr);
    if (!canvas) return null;
    const g = canvas.getContext("2d");
    g.scale(dpr, dpr);
    const fill = g.createLinearGradient(0, 0, 0, height);
    if (below.kind === "starsea" || below.kind === "mirror") {
      fill.addColorStop(0, Art.rgba(Art.mix(below.color, "#9ad1d8", 0.25), 0.9));
      fill.addColorStop(1, Art.rgba(Art.shade(below.color, -0.4), 0.98));
    } else if (below.kind === "lava") {
      fill.addColorStop(0, Art.rgba(below.color, 0));
      fill.addColorStop(0.35, Art.rgba(below.color, 0.35));
      fill.addColorStop(1, Art.rgba("#3a0e08", 0.95));
    } else {
      fill.addColorStop(0, Art.rgba(below.color, 0));
      fill.addColorStop(0.45, Art.rgba(below.color, 0.55));
      fill.addColorStop(1, Art.rgba(Art.shade(below.color, -0.45), 0.95));
    }
    g.fillStyle = fill;
    g.fillRect(0, 0, view.w, height);
    return { canvas, height, pad };
  }

  function composeScene(spec, view, options = {}) {
    const seed = `${spec.id}:${spec.world}`;
    const quality = options.fx === false ? 0.75 : 1;
    const dpr = Math.max(1, Number(view.dpr) || 1);
    // Tile width is whole device pixels so consecutive tiles butt exactly.
    const tileW = Math.ceil(Math.max(1400, view.w * 1.3) * dpr) / dpr;
    const tileH = Math.ceil(view.h);
    const scene = {
      spec,
      tileW,
      tileH,
      view: { w: view.w, h: view.h, dpr },
      sky: paintSky(spec, view, dpr, seed, quality),
      twinkles: twinkleSites(spec, view),
      layers: [],
      aurora: null,
      below: paintBelowStrip(spec.below, view, dpr),
      belowColors: belowColors(spec.below),
      ambient: createAmbient(spec, seed),
      ringColor: spec.celestial?.kind === "starCore" ? Art.rgba(spec.celestial.color, 0.35) : null,
      layersRim: spec.ranges[spec.ranges.length - 1]?.colors.rim,
    };

    if (spec.celestial?.kind === "aurora") {
      // Curtains only occupy the upper half of the sky; keep just that band.
      const res = Math.min(0.75, dpr * 0.5 * quality);
      const bandH = Math.ceil(view.h * 0.62);
      const soft = Art.createCanvas(view.w * res, bandH * res);
      const canvas = Art.createCanvas(view.w * dpr, bandH * dpr);
      if (soft && canvas) {
        const g = soft.getContext("2d");
        g.scale(res, res);
        paintAurora(g, view.w, view.h, spec.celestial.color, seed);
        const out = canvas.getContext("2d");
        out.imageSmoothingQuality = "high";
        out.drawImage(soft, 0, 0, canvas.width, canvas.height);
        scene.aurora = { canvas, w: view.w, h: bandH };
      }
    }

    const sized = spec.ranges.map((layer, index) => {
      const layerSeed = `${seed}:range${index}`;
      const { sample, horizonY, peakH } = skylineSampler(layer, tileW, tileH, layerSeed);
      const cropTop = layerCropTop(spec, index, layer, sample, tileW, horizonY, peakH);
      // Band height in whole device pixels; the crop line moves up to match.
      const bandH = Math.ceil((tileH - cropTop) * dpr) / dpr;
      return { layer, index, layerSeed, cropTop: tileH - bandH, bandH };
    });
    const pixels = sized.reduce((sum, item) => sum + tileW * item.bandH * dpr * dpr, 0);
    const budget = pixels > MAX_TILE_PIXELS ? Math.sqrt(MAX_TILE_PIXELS / pixels) : 1;

    for (const { layer, index, layerSeed, cropTop, bandH } of sized) {
      const paintRes = Math.max(0.3, (layer.res ?? 0.75) * dpr * quality);
      const drawRes = dpr * budget;
      const soft = Art.createCanvas(tileW * Math.min(paintRes, drawRes), bandH * Math.min(paintRes, drawRes));
      if (!soft) continue;
      const res = Math.min(paintRes, drawRes);
      const g = soft.getContext("2d");
      g.scale(res, res);
      g.translate(0, -cropTop);
      const painted = paintRange(g, layer, index, spec.ranges.length, spec, tileW, tileH, layerSeed);
      paintStructures(g, spec, index, painted, tileW, tileH, layerSeed);
      paintFlora(g, spec, index, painted, tileW, layerSeed);
      let canvas = soft;
      if (res < drawRes) {
        // Resample the soft painting to draw resolution once, here, instead
        // of filtering it on every frame.
        canvas = Art.createCanvas(tileW * drawRes, bandH * drawRes);
        if (!canvas) canvas = soft;
        else {
          const out = canvas.getContext("2d");
          out.imageSmoothingQuality = "high";
          out.drawImage(soft, 0, 0, canvas.width, canvas.height);
        }
      }
      scene.layers.push({ canvas, cropTop, bandH, parallax: layer.parallax, sink: 0.15 + index * 0.12 });
    }
    return scene;
  }

  function belowColors(below) {
    if (!below) return null;
    if (below.kind === "cloudsea") {
      return [0, 1, 2].map((layer) => Art.rgba(Art.mix(below.color, "#e8eef6", 0.2 + layer * 0.15), 0.55 + layer * 0.15));
    }
    return {
      ripple: Art.rgba("#d9f2ff", below.kind === "mirror" ? 0.22 : 0.16),
      ember: Art.rgba("#ffd08a", 0.5),
    };
  }

  // --- ambient life -----------------------------------------------------------

  function createAmbient(spec, seed) {
    const random = Art.rng(`${seed}:ambient`);
    const kinds = spec.ambient?.kinds || [];
    const count = spec.ambient?.count || 0;
    const particles = [];
    for (let i = 0; i < count && kinds.length; i += 1) {
      particles.push({
        kind: kinds[i % kinds.length],
        x: random(),
        y: random(),
        z: 0.35 + random() * 0.9,
        phase: random() * Math.PI * 2,
        speed: 0.6 + random() * 0.8,
        spin: (random() - 0.5) * 3,
      });
    }
    return { particles, lastCamX: null, lastCamY: null };
  }

  const AMBIENT_STYLE = {
    petal: { color: "#f0b9c6", drift: [-0.012, 0.018], size: 3.2 },
    firefly: { color: "#ffe9a0", drift: [0.004, -0.002], size: 1.6 },
    mote: { color: "#f3ead2", drift: [0.002, -0.004], size: 1.1 },
    ember: { color: "#ffab6a", drift: [0.003, -0.03], size: 1.6 },
    snow: { color: "#eef4ff", drift: [-0.004, 0.02], size: 1.5 },
    sparkle: { color: "#d9f6ff", drift: [0.002, 0], size: 1.2 },
    cloud: { color: "#c5d2e0", drift: [0.006, 0], size: 26 },
    bird: { color: "#0e141d", drift: [0.03, -0.001], size: 4 },
    feather: { color: "#e9eef8", drift: [-0.006, 0.012], size: 3 },
  };

  function updateAndDrawAmbient(ctx, scene, frame) {
    const ambient = scene.ambient;
    const { view, time, dt, camX, camY, zoom, reducedMotion } = frame;
    if (!ambient.particles.length) return;
    const moveX = ambient.lastCamX === null ? 0 : (camX - ambient.lastCamX) * zoom;
    const moveY = ambient.lastCamY === null ? 0 : (camY - ambient.lastCamY) * zoom;
    ambient.lastCamX = camX;
    ambient.lastCamY = camY;
    const step = reducedMotion ? 0 : Math.min(0.05, dt);
    for (const p of ambient.particles) {
      const style = AMBIENT_STYLE[p.kind] || AMBIENT_STYLE.mote;
      p.x += (style.drift[0] * p.speed * step) - (moveX * p.z * 0.5) / view.w;
      p.y += (style.drift[1] * p.speed * step) - (moveY * p.z * 0.35) / view.h;
      p.phase += step * (1.2 + p.speed);
      if (p.x < -0.05) p.x += 1.1;
      if (p.x > 1.05) p.x -= 1.1;
      if (p.y < -0.05) p.y += 1.1;
      if (p.y > 1.05) p.y -= 1.1;
      const sx = p.x * view.w;
      const sy = p.y * view.h + Math.sin(p.phase) * 6 * p.z;
      const size = style.size * (0.6 + p.z * 0.6);
      if (p.kind === "firefly" || p.kind === "ember" || p.kind === "sparkle") {
        const pulse = reducedMotion ? 0.7 : 0.45 + Math.sin(p.phase * 2.3) * 0.4;
        Art.drawGlow(ctx, sx, sy, size * 7, style.color, Math.max(0, pulse) * 0.5);
        ctx.globalAlpha = Math.max(0, pulse);
        ctx.fillStyle = style.color;
        ctx.fillRect(sx - size * 0.5, sy - size * 0.5, size, size);
      } else if (p.kind === "petal" || p.kind === "feather") {
        const angle = p.phase * p.spin;
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.ellipse(sx, sy, size, size * 0.45 * Math.abs(Math.cos(angle)) + 0.4, angle * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "cloud") {
        ctx.globalAlpha = 0.07 * p.z;
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.ellipse(sx, sy * 0.6 + view.h * 0.15, size * p.z * 2.2, size * p.z * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "bird") {
        const flap = Math.sin(p.phase * 5) * size * 0.6;
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 1.2;
        const by = sy * 0.5 + view.h * 0.12;
        ctx.beginPath();
        ctx.moveTo(sx - size, by - flap);
        ctx.quadraticCurveTo(sx - size * 0.4, by - size * 0.3, sx, by);
        ctx.quadraticCurveTo(sx + size * 0.4, by - size * 0.3, sx + size, by - flap);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.35 + Math.sin(p.phase) * 0.2;
        ctx.fillStyle = style.color;
        ctx.fillRect(sx, sy, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- per-frame drawing ------------------------------------------------------

  /** Whole-device-pixel position for a CSS coordinate. */
  function alignToDevice(value, dpr) {
    return Math.round(value * dpr) / dpr;
  }

  function drawTiled(ctx, layer, offsetX, y, tileW, viewW, dpr) {
    const start = alignToDevice(-(((offsetX % tileW) + tileW) % tileW), dpr);
    const top = alignToDevice(y, dpr);
    for (let x = start; x < viewW; x += tileW) {
      ctx.drawImage(layer.canvas, x, top, tileW, layer.bandH);
    }
  }

  /**
   * Aurora curtains, painted once: a bright lower hem fading upward through
   * violet, with vertical folds. Drawn per frame as a gently drifting tile.
   */
  function paintAurora(g, w, h, color, seed) {
    const random = Art.rng(`${seed}:aurora`);
    g.globalCompositeOperation = "lighter";
    for (let band = 0; band < 3; band += 1) {
      const hemBase = h * (0.3 + band * 0.07);
      const height = h * (0.22 - band * 0.04);
      const amplitude = h * (0.04 + band * 0.01);
      const tint = band === 1 ? "#a8f0cf" : band === 2 ? "#c4a6ff" : color;
      const top = band === 2 ? "#ffb4c8" : "#9d8cff";
      for (let x = 0; x < w; x += 3) {
        const u = (x / w) * Math.PI * 2;
        const hem = hemBase + Math.sin(u * 2 + band * 1.7) * amplitude + Math.sin(u * 5 + band) * amplitude * 0.4;
        const fold = 0.55 + 0.45 * Math.sin(u * 23 + band * 3 + random() * 0.6);
        const curtain = height * (0.55 + fold * 0.45);
        const gradient = g.createLinearGradient(0, hem - curtain, 0, hem);
        gradient.addColorStop(0, Art.rgba(top, 0));
        gradient.addColorStop(0.55, Art.rgba(top, 0.03 * fold));
        gradient.addColorStop(0.92, Art.rgba(tint, (0.12 + band * 0.02) * fold));
        gradient.addColorStop(1, Art.rgba(tint, 0));
        g.fillStyle = gradient;
        g.fillRect(x, hem - curtain, 3, curtain);
      }
    }
    g.globalCompositeOperation = "source-over";
  }

  /** Animated celestial touches over the baked sky: aurora curtains and core rings. */
  function drawCelestial(ctx, scene, frame) {
    const celestial = scene.spec.celestial;
    if (!celestial) return;
    const { view, camX, camY, zoom, time, reducedMotion } = frame;
    const dpr = scene.view.dpr;
    if (celestial.kind === "aurora") {
      const sprite = scene.aurora;
      if (!sprite) return;
      const sway = reducedMotion ? 0 : Math.sin(time * 0.08) * view.w * 0.04;
      const breathe = reducedMotion ? 1 : 0.85 + Math.sin(time * 0.6) * 0.15;
      const previousAlpha = ctx.globalAlpha;
      const previousComposite = ctx.globalCompositeOperation;
      ctx.globalAlpha = breathe;
      ctx.globalCompositeOperation = "lighter";
      const shift = (camX * zoom * 0.015 + sway) % view.w;
      const x = alignToDevice(-shift - view.w, dpr);
      const y = alignToDevice(-(camY * zoom) * 0.006, dpr);
      for (let ox = x; ox < view.w; ox += view.w) ctx.drawImage(sprite.canvas, ox, y, sprite.w, sprite.h);
      ctx.globalAlpha = previousAlpha;
      ctx.globalCompositeOperation = previousComposite;
      return;
    }
    if (celestial.kind === "starCore" && scene.ringColor) {
      const size = Math.round(Math.min(view.w, view.h) * celestial.size * 2) + 2;
      const t = reducedMotion ? 0 : time;
      ctx.save();
      ctx.translate(view.w * celestial.x, view.h * celestial.y);
      ctx.strokeStyle = scene.ringColor;
      ctx.lineWidth = 1.2;
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.rotate(t * (0.05 + ring * 0.03));
        ctx.beginPath();
        ctx.ellipse(0, 0, size * (0.8 + ring * 0.22), size * (0.22 + ring * 0.06), ring * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBelow(ctx, scene, frame, surfaceY) {
    const below = scene.spec.below;
    if (!below) return;
    const { view, time, reducedMotion } = frame;
    const t = reducedMotion ? 0 : time;
    if (surfaceY >= view.h) return;
    const dpr = scene.view.dpr;
    const top = Math.max(-20, surfaceY);
    if (below.kind === "cloudsea") {
      for (let layer = 0; layer < 3; layer += 1) {
        const y = top + layer * 26;
        ctx.fillStyle = scene.belowColors[layer];
        ctx.beginPath();
        ctx.moveTo(0, view.h);
        for (let x = 0; x <= view.w + 40; x += 40) {
          const puff = Math.sin((x + t * (8 + layer * 5)) * 0.012 + layer * 2) * 14 + Math.sin(x * 0.031 + layer) * 8;
          ctx.lineTo(x, y + puff);
        }
        ctx.lineTo(view.w, view.h);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    const strip = scene.below;
    if (strip) ctx.drawImage(strip.canvas, 0, alignToDevice(top - strip.pad, dpr), view.w, strip.height);
    if (below.kind === "starsea" || below.kind === "mirror") {
      ctx.strokeStyle = scene.belowColors.ripple;
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i += 1) {
        const y = top + 4 + Math.pow(i / 14, 1.6) * (view.h - top);
        const span = 30 + i * 9;
        const offset = ((i * 97 + t * (14 + i * 2)) % (span * 3));
        ctx.beginPath();
        for (let x = -offset; x < view.w; x += span * 3) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + span, y);
        }
        ctx.stroke();
      }
      const moon = scene.spec.celestial;
      if (moon && moon.kind !== "aurora") {
        const mx = view.w * moon.x;
        const previous = ctx.globalAlpha;
        ctx.fillStyle = moon.color;
        for (let i = 0; i < 9; i += 1) {
          const wobble = Math.sin(t * 1.3 + i) * 6;
          ctx.globalAlpha = previous * 0.22 * (1 - i / 9);
          ctx.fillRect(mx - 22 + wobble - i * 2, top + i * ((view.h - top) / 9), 44 + i * 4, 2);
        }
        ctx.globalAlpha = previous;
      }
    } else if (below.kind === "lava") {
      ctx.fillStyle = scene.belowColors.ember;
      for (let i = 0; i < 16; i += 1) {
        const x = ((i * 173 + t * 12 * (i % 3 + 1)) % (view.w + 40)) - 20;
        const y = top + 12 + ((i * 37) % 30) + Math.sin(t * 2 + i) * 3;
        ctx.fillRect(x, y, 8 + (i % 4) * 4, 1.5);
      }
    }
  }

  /**
   * Draw the backdrop in screen space. `frame.refCamY` is the camera y at the
   * chapter's lowest framing; layers sink below their authored horizon as the
   * camera climbs above it.
   */
  function drawScene(ctx, scene, frame) {
    const { view, camX, camY, zoom } = frame;
    const spec = scene.spec;
    const dpr = scene.view.dpr;
    const rise = Math.max(0, (frame.refCamY ?? camY) - camY) * zoom;

    if (scene.sky) {
      ctx.drawImage(scene.sky, 0, 0, view.w, view.h);
    } else {
      ctx.fillStyle = spec.sky.mid;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    if (!frame.reducedMotion) {
      const sites = scene.twinkles;
      const previous = ctx.globalAlpha;
      ctx.fillStyle = spec.stars.tint;
      for (let i = 0; i < sites.length; i += 4) {
        const pulse = Math.sin(frame.time * sites[i + 2] + sites[i + 3]);
        if (pulse < 0.6) continue;
        const x = sites[i];
        const y = sites[i + 1];
        ctx.globalAlpha = previous * (pulse - 0.6) * 1.6;
        ctx.fillRect(x - 2.5, y - 0.35, 5, 0.7);
        ctx.fillRect(x - 0.35, y - 2.5, 0.7, 5);
      }
      ctx.globalAlpha = previous;
    }
    drawCelestial(ctx, scene, frame);

    for (const layer of scene.layers) {
      drawTiled(ctx, layer, camX * zoom * layer.parallax, layer.cropTop + rise * layer.sink, scene.tileW, view.w, dpr);
    }
    drawBelow(ctx, scene, frame, view.h * 0.9 + rise * 0.55);
    if (frame.fx !== false) updateAndDrawAmbient(ctx, scene, frame);
  }

  const api = {
    LAYER_SCALE,
    composeScene,
    drawScene,
    sceneFor: Specs.sceneFor,
    skylineSampler,
  };

  root.NiniYuanScenery = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
