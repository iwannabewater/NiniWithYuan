((root) => {
  "use strict";

  // Name seals: the first time each creature or ancient fixture comes into
  // view in a session, a lacquer tag with a cinnabar seal, its Chinese name,
  // and a four-character hint fades in beside it. The world teaches its own
  // vocabulary in place, one name at a time, and never repeats itself.
  //
  // Tags draw in screen space so the calligraphy stays crisp at every zoom.
  // Discovery is presentation-only: nothing here touches the simulation.

  const HOLD = 2.6;
  const FADE = 0.3;
  const SCAN_INTERVAL = 0.2;

  /** Entry order is also queue priority when several appear together. */
  const CATALOG = Object.freeze({
    slime: Object.freeze({ name: "玉蟾", hint: "踏顶可破" }),
    ember: Object.freeze({ name: "祸斗", hint: "身负烈火" }),
    wisp: Object.freeze({ name: "灯魅", hint: "星弹可破" }),
    sentry: Object.freeze({ name: "哨星", hint: "蓄光而射" }),
    warder: Object.freeze({ name: "石胄", hint: "星弹难伤" }),
    spike: Object.freeze({ name: "星棘", hint: "触之即伤" }),
    lava: Object.freeze({ name: "熔浆", hint: "不可涉足" }),
    spring: Object.freeze({ name: "玉鼓", hint: "踏之高跃" }),
    jade: Object.freeze({ name: "青玉桥", hint: "往复而行" }),
    cloud: Object.freeze({ name: "祥云", hint: "可立其上" }),
    breakable: Object.freeze({ name: "琥珀晶", hint: "击之可碎" }),
    phase: Object.freeze({ name: "潮相桥", hint: "随潮隐现" }),
    aurora: Object.freeze({ name: "极光琉璃", hint: "坚可立足" }),
    wind: Object.freeze({ name: "罡风", hint: "顺逆有别" }),
    portal: Object.freeze({ name: "铜镜门", hint: "两镜相通" }),
    lantern: Object.freeze({ name: "星灯", hint: "点亮续行" }),
    marrow: Object.freeze({ name: "星髓", hint: "秘藏之宝" }),
    goal: Object.freeze({ name: "月洞门", hint: "章终之门" }),
  });

  const KINDS = Object.freeze(Object.keys(CATALOG));

  function createIntroductions() {
    return { seen: new Set(), queue: [], active: null, scanTimer: 0 };
  }

  function overlaps(rect, item) {
    return item.x < rect.x + rect.w && item.x + item.w > rect.x && item.y < rect.y + rect.h && item.y + (item.h || 0) > rect.y;
  }

  /** The first visible entity of `kind` in `level`, or null. */
  function findVisible(level, kind, rect) {
    const pick = (items, test) => {
      for (const item of items || []) if (test(item) && overlaps(rect, item)) return item;
      return null;
    };
    switch (kind) {
      case "slime":
      case "ember":
      case "wisp":
      case "sentry":
      case "warder":
        return pick(level.enemies, (e) => e.alive && e.type === kind);
      case "spike":
      case "lava":
        return pick(level.hazards, (h) => h.type === kind);
      case "spring":
        return pick(level.springs, () => true);
      case "jade":
        return pick(level.moving, (m) => m.type === "jade");
      case "cloud":
        return pick(level.platforms, (p) => p.type === "cloud") || pick(level.moving, (m) => m.type === "cloud");
      case "breakable":
      case "phase":
      case "aurora":
        return pick(level.platforms, (p) => p.type === kind && !p.broken);
      case "wind":
        return pick(level.wind, () => true);
      case "portal":
        return pick(level.portals, () => true);
      case "lantern":
        return pick(level.lanterns, () => true);
      case "marrow":
        return level.marrow && !level.marrow.taken && overlaps(rect, level.marrow) ? level.marrow : null;
      case "goal":
        return overlaps(rect, level.goal) ? level.goal : null;
      default:
        return null;
    }
  }

  /** Look for kinds not yet introduced; queue any that are on screen. */
  function scan(state, level, rect, dt) {
    state.scanTimer -= dt;
    if (state.scanTimer > 0) return;
    state.scanTimer = SCAN_INTERVAL;
    for (const kind of KINDS) {
      if (state.seen.has(kind)) continue;
      const target = findVisible(level, kind, rect);
      if (!target) continue;
      state.seen.add(kind);
      state.queue.push({ kind, target, age: 0 });
    }
  }

  function update(state, dt) {
    if (!state.active && state.queue.length) state.active = state.queue.shift();
    const active = state.active;
    if (!active) return;
    active.age += dt;
    if (active.age >= HOLD + FADE * 2) state.active = null;
  }

  function clear(state) {
    state.queue.length = 0;
    state.active = null;
    state.scanTimer = 0;
  }

  /**
   * Draw the active tag. `toScreen(x, y, out)` maps world to CSS pixels;
   * `fonts` carries prebuilt font strings.
   */
  function draw(ctx, state, toScreen, fonts, options = {}) {
    const active = state.active;
    if (!active) return;
    const entry = CATALOG[active.kind];
    const target = active.target;
    const t = active.age;
    const appear = Math.min(1, t / FADE);
    const vanish = Math.min(1, Math.max(0, (HOLD + FADE * 2 - t) / FADE));
    const alpha = Math.min(appear, vanish);
    if (alpha <= 0) return;
    const anchor = toScreen(target.x + target.w / 2, target.y, ANCHOR);
    const rise = options.reducedMotion ? 0 : (1 - appear) * 8;
    ctx.font = fonts.name;
    const nameWidth = ctx.measureText(entry.name).width;
    ctx.font = fonts.hint;
    const hintWidth = ctx.measureText(entry.hint).width;
    const width = 34 + nameWidth + 10 + hintWidth + 12;
    const height = 34;
    const view = options.view;
    let x = anchor.x - width / 2;
    let y = anchor.y - height - 26 + rise;
    if (view) {
      x = Math.max(12, Math.min(view.w - width - 12, x));
      y = Math.max(64, Math.min(view.h - height - 70, y));
    }
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * alpha;
    // Leader line from the tag to the thing it names.
    ctx.strokeStyle = "rgba(195,164,104,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.max(x + 8, Math.min(x + width - 8, anchor.x)), y + height);
    ctx.lineTo(anchor.x, anchor.y - 6);
    ctx.stroke();
    ctx.fillStyle = "#c3a468";
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y - 6, 2, 0, Math.PI * 2);
    ctx.fill();
    // Lacquer tag with a gilt hairline.
    ctx.fillStyle = "rgba(14,16,22,0.88)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(195,164,104,0.85)";
    ctx.strokeRect(x + 2.5, y + 2.5, width - 5, height - 5);
    // Cinnabar seal carrying the first character.
    ctx.fillStyle = "#b8322e";
    ctx.fillRect(x + 7, y + 7, 20, 20);
    ctx.fillStyle = "#f8eadb";
    ctx.font = fonts.seal;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.name[0], x + 17, y + 17.5);
    // Name and hint.
    ctx.textAlign = "left";
    ctx.fillStyle = "#f3ead8";
    ctx.font = fonts.name;
    ctx.fillText(entry.name, x + 34, y + 18);
    ctx.fillStyle = "rgba(195,164,104,0.95)";
    ctx.font = fonts.hint;
    ctx.fillText(entry.hint, x + 34 + nameWidth + 10, y + 18.5);
    ctx.globalAlpha = before;
  }

  const ANCHOR = { x: 0, y: 0 };

  const api = { CATALOG, KINDS, HOLD, createIntroductions, findVisible, scan, update, clear, draw };

  root.NiniYuanPlaques = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
