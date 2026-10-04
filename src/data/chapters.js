((root) => {
  "use strict";

  // Authored chapter data. This module is pure: it builds fresh chapter records
  // on every call and never touches the DOM, the save, or runtime state. The
  // simulation clones a chapter before mutating it, so the authored record stays
  // immutable for restarts and for the content validators in tests/.

  const TILE = 48;
  const ENEMY_WIDTH = 38;
  const ENEMY_HEIGHT = 34;
  const WISP_FLOAT_GAP = 24;
  const WISP_HOVER_RANGE = 6;
  const MARROW_SIZE = 30;
  const SENTRY_COOLDOWN = 2.1;

  /**
   * Initial patrol phase for a hostile. Authored from its tile so a chapter
   * always starts in the same state; wisp hover reads this phase, so random
   * seeding made two attempts at the same chapter differ.
   */
  function patrolPhase(x, y) {
    return ((x * 7.31 + y * 3.17) % 10 + 10) % 10;
  }

  function buildChapters() {
    const rectsOverlapRaw = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const P = (x, y, w, h, type = "ground", phase = "") => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE, type, phase });
    const C = (x, y, kind = "coin", phase = "") => ({ x: x * TILE + 18, y: y * TILE + 16, w: 22, h: 22, kind, phase, taken: false });
    const F = (x, y, kind = "berry", phase = "") => ({ x: x * TILE + 10, y: y * TILE + 10, w: 30, h: 30, kind, phase, taken: false });
    const E = (x, y, patrol = 160, type = "slime") => {
      const groundedY = y * TILE + TILE - ENEMY_HEIGHT;
      const enemyY = type === "wisp" ? groundedY - WISP_FLOAT_GAP : groundedY;
      return {
        x: x * TILE,
        y: enemyY,
        w: ENEMY_WIDTH,
        h: ENEMY_HEIGHT,
        baseX: x * TILE,
        baseY: enemyY,
        vx: type === "wisp" ? 65 : 90,
        patrol,
        type,
        alive: true,
        phase: patrolPhase(x, y),
      };
    };
    const S = (x, y, power = 1050) => ({ x: x * TILE, y: y * TILE + 20, w: TILE, h: 18, power });
    const M = (x, y, w, range, speed, axis = "x", type = "jade", phase = "") => ({
      x: x * TILE,
      y: y * TILE,
      w: w * TILE,
      h: 18,
      ox: x * TILE,
      oy: y * TILE,
      range: range * TILE,
      speed,
      axis,
      dir: 1,
      dx: 0,
      dy: 0,
      type,
      phase,
    });
    const H = (x, y, w = 1, h = 1, type = "spike", phase = "") => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE, type, phase });
    const B = (x, y, w = 1, h = 1) => P(x, y, w, h, "breakable");
    const G = (id, pair, x, platformTopY, palette = "cyan") => ({
      id,
      pair,
      x: x * TILE + 3,
      y: platformTopY * TILE - 76,
      w: 42,
      h: 76,
      palette,
    });
    const W1 = { id: "world1", name: "第一星域 破碎星图", subtitle: "五枚心石碎片" };
    const W2 = { id: "world2", name: "第二星域 星门群岛", subtitle: "星门重新接合路线" };
    const W3 = { id: "world3", name: "第三星域 星潮镜域", subtitle: "星潮相位路线" };
    const W4 = { id: "world4", name: "第四星域 银汉鹊桥", subtitle: "七夕之夜重连鹊桥" };
    // v3.0.0 — World 4 fixtures. A magpie bridge is a span of sky held by a
    // flock: it scatters shortly after the player lands and regathers once the
    // span is clear. An updraft cancels gravity and lifts with a capped speed.
    const Q = (x, y, w) => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: 18, type: "magpie" });
    const U = (x, y, w, h, force = 900, max = 520) => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE, force, max });
    const goalOn = (x, top) => ({ x: x * TILE, y: (top - 5) * TILE, w: 80, h: 136 });
    // v2.0.0 — new hostiles. `sentry` is a fixed emplacement that telegraphs then
    // fires; `warder` is a shelled ground enemy that projectiles cannot break.
    const T = (x, y, facing = -1, cadence = SENTRY_COOLDOWN) => ({
      x: x * TILE + 5,
      y: y * TILE + TILE - ENEMY_HEIGHT,
      w: ENEMY_WIDTH - 10,
      h: ENEMY_HEIGHT,
      baseX: x * TILE + 5,
      baseY: y * TILE + TILE - ENEMY_HEIGHT,
      vx: 0,
      patrol: 0,
      type: "sentry",
      facing,
      cadence,
      fireTimer: cadence * 0.6,
      alive: true,
      phase: 0,
    });
    const A = (x, y, patrol = 150) => ({ ...E(x, y, patrol, "warder"), vx: 70 });

    const chapters = [
      {
        id: "sakura",
        world: W1,
        name: "第一章 星露花庭",
        vibe: "黄昏花庭",
        hint: "学习二段跳、冲刺和踩踏敌人。",
        width: 88 * TILE,
        height: 16 * TILE,
        start: { x: 120, y: 470 },
        goal: { x: 83 * TILE, y: 9 * TILE, w: 70, h: 120 },
        palette: ["#1c2442", "#425b8f", "#ff8fbd", "#ffe9a2"],
        platforms: [
          P(0, 14, 15, 2), P(17, 13, 8, 3), P(28, 12, 10, 4), P(42, 13, 8, 3),
          P(54, 12, 9, 4), P(67, 11, 8, 5), P(79, 12, 9, 4), P(10, 10, 4, 1, "grass"),
          P(22, 9, 4, 1, "grass"), P(34, 8, 4, 1, "grass"), P(47, 9, 5, 1, "grass"),
          P(61, 8, 3, 1, "grass"), P(72, 7, 4, 1, "grass"),
        ],
        coins: [
          C(5, 12), C(6, 12), C(11, 8, "gem"), C(22, 7), C(23, 7), C(35, 6, "gem"),
          C(48, 7), C(49, 7), C(61, 6), C(62, 6), C(72, 5, "gem"), C(82, 10),
        ],
        powerups: [F(8, 12, "berry"), F(32, 10, "moon"), F(52, 10, "core"), F(74, 9, "bell")],
        enemies: [E(20, 12), E(36, 11), E(57, 11, 140, "wisp"), E(70, 10)],
        springs: [S(40, 12), S(76, 11)],
        hazards: [H(26, 14, 2, 1), H(64, 13, 2, 1)],
        moving: [M(14, 10, 3, 4, 75), M(51, 9, 3, 3, 82, "y")],
      },
      {
        id: "moonruin",
        world: W1,
        name: "第二章 月镜遗迹",
        vibe: "镜面遗迹",
        hint: "移动平台更密集，星露藏在高路线。",
        width: 104 * TILE,
        height: 18 * TILE,
        start: { x: 100, y: 560 },
        goal: { x: 99 * TILE, y: 7 * TILE, w: 70, h: 120 },
        palette: ["#101828", "#24416b", "#61e5ff", "#c6fff1"],
        platforms: [
          P(0, 16, 12, 2), P(15, 15, 7, 3), P(28, 14, 6, 4), P(42, 15, 9, 3),
          P(58, 14, 6, 4), P(72, 13, 7, 5), P(88, 12, 16, 6),
          P(10, 11, 3, 1, "stone"), P(24, 10, 3, 1, "stone"), P(38, 9, 4, 1, "stone"),
          P(53, 8, 4, 1, "stone"), P(68, 7, 3, 1, "stone"), P(84, 8, 3, 1, "stone"),
        ],
        coins: [
          C(11, 9), C(18, 13), C(24, 8, "gem"), C(31, 12), C(39, 7), C(45, 13),
          C(54, 6, "gem"), C(66, 11), C(69, 5), C(75, 11), C(85, 6, "gem"), C(96, 10),
        ],
        powerups: [F(16, 13, "berry"), F(46, 13, "core"), F(70, 11, "moon"), F(90, 10, "bell")],
        enemies: [E(18, 14, 180), E(44, 14, 220, "wisp"), E(63, 13), E(91, 11, 250)],
        springs: [S(35, 14), S(80, 12)],
        hazards: [H(13, 16, 2, 1), H(52, 16, 4, 1), H(81, 14, 3, 1)],
        moving: [M(22, 12, 3, 5, 92), M(35, 10, 4, 5, 98), M(64, 9, 3, 4, 84, "y"), M(79, 8, 3, 5, 90)],
      },
      {
        id: "cloudsea",
        world: W1,
        name: "第三章 云海风帆",
        vibe: "高空风场",
        hint: "风场会改变落点，保持节奏。",
        width: 112 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 660 },
        goal: { x: 106 * TILE, y: 5 * TILE, w: 70, h: 120 },
        palette: ["#13253f", "#356e9a", "#f5d37a", "#d8f7ff"],
        wind: [{ x: 25 * TILE, y: 0, w: 14 * TILE, h: 18 * TILE, force: -360 }, { x: 67 * TILE, y: 0, w: 12 * TILE, h: 18 * TILE, force: 340 }],
        platforms: [
          P(0, 18, 10, 2), P(14, 17, 6, 3), P(26, 15, 5, 2), P(40, 16, 5, 3),
          P(52, 14, 6, 2), P(65, 15, 5, 2), P(78, 13, 7, 3), P(92, 11, 7, 4),
          P(103, 10, 9, 5), P(12, 13, 3, 1, "cloud"), P(33, 11, 3, 1, "cloud"),
          P(47, 9, 4, 1, "cloud"), P(60, 8, 3, 1, "cloud"), P(75, 7, 3, 1, "cloud"), P(89, 6, 3, 1, "cloud"),
        ],
        coins: [
          C(13, 11), C(20, 15), C(29, 13), C(34, 9, "gem"), C(48, 7), C(53, 12),
          C(61, 6, "gem"), C(69, 13), C(76, 5), C(82, 11), C(90, 4, "gem"), C(105, 8),
        ],
        powerups: [F(19, 15, "bell"), F(45, 14, "moon"), F(74, 11, "core"), F(94, 9, "berry")],
        enemies: [E(17, 16, 130, "wisp"), E(42, 15, 120), E(56, 13, 180, "wisp"), E(96, 10, 160)],
        springs: [S(23, 17, 1120), S(87, 11, 1120)],
        hazards: [H(10, 19, 4, 1), H(31, 17, 7, 1), H(70, 17, 5, 1)],
        moving: [M(21, 14, 3, 6, 104, "x", "cloud"), M(37, 12, 4, 5, 92, "y", "cloud"), M(57, 10, 3, 6, 112, "x", "cloud"), M(84, 8, 4, 4, 88, "y", "cloud")],
      },
      {
        id: "crystalforge",
        world: W1,
        name: "第四章 辉晶锻炉",
        vibe: "熔炉晶洞",
        hint: "源源可以冲碎琥珀晶块，妮妮可走上方滑翔路线。",
        width: 122 * TILE,
        height: 18 * TILE,
        start: { x: 100, y: 560 },
        goal: { x: 116 * TILE, y: 6 * TILE, w: 70, h: 120 },
        palette: ["#171827", "#573455", "#ff9d5b", "#8cf6d5"],
        platforms: [
          P(0, 16, 12, 2), P(15, 15, 8, 3), P(30, 15, 9, 3), P(46, 14, 7, 4),
          P(61, 13, 8, 5), P(78, 14, 6, 4), P(92, 12, 8, 6), P(108, 11, 14, 7),
          P(10, 11, 3, 1, "crystal"), P(25, 10, 4, 1, "crystal"), P(42, 8, 3, 1, "crystal"),
          P(57, 8, 4, 1, "crystal"), P(73, 7, 3, 1, "crystal"), P(88, 7, 4, 1, "crystal"),
          B(39, 14, 3, 1), B(69, 12, 3, 1), B(101, 10, 2, 2),
        ],
        coins: [
          C(10, 9), C(26, 8, "gem"), C(33, 13), C(43, 6), C(58, 6, "gem"), C(63, 11),
          C(73, 5), C(79, 12), C(89, 5, "gem"), C(96, 10), C(109, 9), C(117, 9, "gem"),
        ],
        powerups: [F(21, 13, "berry"), F(51, 12, "core"), F(82, 12, "moon"), F(107, 9, "bell")],
        enemies: [E(18, 14, 200), E(34, 14, 170, "ember"), E(63, 12, 220), E(81, 13, 120, "ember"), E(112, 10, 210)],
        springs: [S(54, 14, 1120), S(104, 11, 1160)],
        hazards: [H(24, 16, 5, 1, "lava"), H(54, 16, 6, 1, "lava"), H(86, 16, 5, 1, "lava")],
        moving: [M(23, 12, 3, 5, 100), M(72, 10, 3, 5, 94), M(99, 8, 4, 4, 86, "y")],
      },
      {
        id: "auroracitadel",
        world: W1,
        name: "终章 极光天城",
        vibe: "极光王座",
        hint: "综合考验：风场、移动平台、晶块和连续跳跃。",
        width: 138 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 660 },
        goal: { x: 132 * TILE, y: 4 * TILE, w: 76, h: 132 },
        palette: ["#101528", "#283778", "#8c7bff", "#ffe46b"],
        wind: [{ x: 37 * TILE, y: 0, w: 11 * TILE, h: 18 * TILE, force: -300 }, { x: 94 * TILE, y: 0, w: 14 * TILE, h: 18 * TILE, force: 310 }],
        platforms: [
          P(0, 18, 10, 2), P(14, 17, 7, 3), P(28, 16, 6, 4), P(42, 15, 6, 4),
          P(55, 16, 6, 3), P(68, 14, 8, 4), P(85, 13, 7, 5), P(101, 12, 8, 5),
          P(118, 10, 20, 8), P(11, 13, 3, 1, "aurora"), P(24, 11, 3, 1, "aurora"),
          P(37, 9, 3, 1, "aurora"), P(51, 8, 4, 1, "aurora"), P(64, 7, 3, 1, "aurora"),
          P(80, 7, 4, 1, "aurora"), P(96, 6, 3, 1, "aurora"), P(112, 6, 3, 1, "aurora"),
          B(76, 13, 2, 1), B(110, 9, 2, 1),
        ],
        coins: [
          C(11, 11), C(18, 15), C(25, 9, "gem"), C(37, 7), C(43, 13), C(52, 6, "gem"),
          C(66, 5), C(72, 12), C(82, 5, "gem"), C(90, 11), C(97, 4), C(108, 10),
          C(113, 4, "gem"), C(124, 8), C(133, 8, "gem"),
        ],
        powerups: [F(15, 15, "berry"), F(46, 13, "moon"), F(70, 12, "core"), F(100, 10, "bell"), F(120, 8, "moon")],
        enemies: [E(18, 16, 160), E(31, 15, 190, "wisp"), E(58, 15, 160, "ember"), E(72, 13, 180), E(88, 12, 210, "wisp"), E(121, 9, 260, "ember")],
        springs: [S(35, 16, 1180), S(62, 16, 1150), S(115, 10, 1220)],
        hazards: [H(35, 18, 5, 1), H(49, 18, 5, 1), H(78, 16, 5, 1), H(110, 15, 5, 1)],
        moving: [M(21, 13, 3, 6, 112), M(48, 11, 4, 5, 98, "y"), M(77, 9, 3, 7, 118), M(93, 8, 4, 4, 90, "y"), M(109, 7, 3, 5, 100)],
      },
      {
        id: "stargatecove",
        world: W2,
        name: "第六章 星门浅湾",
        vibe: "潮汐星门",
        hint: "成对星门会接合两处路线，穿过后保持动量。",
        width: 106 * TILE,
        height: 18 * TILE,
        start: { x: 100, y: 560 },
        goal: { x: 101 * TILE, y: 8 * TILE, w: 72, h: 124 },
        palette: ["#10213a", "#1f5a77", "#6dd6ee", "#ffe9a8"],
        portals: [
          G("cove-a", "cove-b", 19, 15, "cyan"),
          G("cove-b", "cove-a", 34, 14, "gold"),
          G("cove-c", "cove-d", 54, 13, "jade"),
          G("cove-d", "cove-c", 74, 14, "rose"),
        ],
        platforms: [
          P(0, 16, 12, 2), P(14, 15, 8, 3), P(28, 14, 9, 4), P(43, 15, 7, 3),
          P(56, 13, 9, 5), P(72, 14, 8, 4), P(88, 12, 18, 6),
          P(10, 12, 3, 1, "cloud"), P(24, 10, 4, 1, "cloud"), P(39, 9, 3, 1, "cloud"),
          P(53, 8, 4, 1, "cloud"), P(68, 9, 4, 1, "cloud"), P(84, 8, 3, 1, "cloud"),
        ],
        coins: [
          C(8, 14), C(15, 13), C(24, 8, "gem"), C(32, 12), C(39, 7), C(47, 13),
          C(55, 6, "gem"), C(62, 11), C(70, 7), C(76, 12), C(85, 6, "gem"), C(98, 10),
        ],
        powerups: [F(16, 13, "bell"), F(45, 13, "berry"), F(70, 12, "moon"), F(91, 10, "core")],
        enemies: [E(17, 14, 150), E(45, 14, 130, "wisp"), E(60, 12, 190), E(93, 11, 180)],
        springs: [S(26, 15, 1080), S(82, 14, 1120)],
        hazards: [H(38, 16, 3, 1), H(67, 15, 3, 1)],
        moving: [M(22, 12, 3, 4, 86, "x", "cloud"), M(50, 10, 3, 4, 78, "y", "cloud"), M(79, 10, 4, 4, 86, "x", "cloud")],
      },
      {
        id: "loopinglighthouse",
        world: W2,
        name: "第七章 回环灯塔",
        vibe: "回环灯塔",
        hint: "星门分出上下路线，收集路径会考验滑翔和冲刺。",
        width: 120 * TILE,
        height: 18 * TILE,
        start: { x: 96, y: 560 },
        goal: { x: 115 * TILE, y: 6 * TILE, w: 72, h: 126 },
        palette: ["#121b32", "#3c4a7a", "#f2d389", "#82e3b8"],
        portals: [
          G("light-a", "light-b", 18, 15, "gold"),
          G("light-b", "light-a", 35, 14, "cyan"),
          G("light-c", "light-d", 53, 15, "jade"),
          G("light-d", "light-c", 71, 13, "rose"),
          G("light-e", "light-f", 87, 12, "cyan"),
          G("light-f", "light-e", 101, 10, "gold"),
        ],
        platforms: [
          P(0, 16, 12, 2), P(15, 15, 9, 3), P(30, 14, 8, 4), P(45, 15, 9, 3),
          P(62, 13, 9, 5), P(79, 12, 8, 6), P(96, 10, 24, 8),
          P(11, 11, 3, 1, "stone"), P(24, 9, 4, 1, "stone"), P(39, 8, 4, 1, "stone"),
          P(55, 8, 3, 1, "stone"), P(70, 7, 4, 1, "stone"), P(86, 6, 3, 1, "stone"),
          B(41, 13, 2, 1), B(76, 11, 3, 1), B(105, 9, 2, 1),
        ],
        coins: [
          C(11, 9), C(20, 13), C(25, 7, "gem"), C(36, 12), C(40, 6), C(50, 13),
          C(56, 6, "gem"), C(66, 11), C(72, 5), C(82, 10), C(87, 4, "gem"), C(99, 8),
          C(107, 8), C(115, 8, "gem"),
        ],
        powerups: [F(16, 13, "berry"), F(47, 13, "bell"), F(73, 11, "core"), F(100, 8, "moon")],
        enemies: [E(18, 14, 190), E(34, 13, 170, "wisp"), E(50, 14, 150, "ember"), E(68, 12, 190), E(101, 9, 220)],
        springs: [S(28, 14, 1120), S(91, 12, 1160)],
        hazards: [H(25, 16, 4, 1), H(58, 16, 4, 1), H(89, 14, 4, 1)],
        moving: [M(23, 11, 3, 5, 94), M(57, 10, 4, 5, 90, "y"), M(84, 8, 3, 5, 98), M(102, 7, 3, 3, 82, "y")],
      },
      {
        id: "ringconservatory",
        world: W2,
        name: "第八章 星环温室",
        vibe: "星环温室",
        hint: "星门、风场、移动平台和晶块会在同一条路线里交替出现。",
        width: 136 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 660 },
        goal: { x: 130 * TILE, y: 5 * TILE, w: 76, h: 128 },
        palette: ["#0e1a2f", "#244e57", "#ffadc7", "#b6f5d8"],
        wind: [{ x: 40 * TILE, y: 0, w: 11 * TILE, h: 18 * TILE, force: 300 }, { x: 92 * TILE, y: 0, w: 13 * TILE, h: 18 * TILE, force: -320 }],
        portals: [
          G("ring-a", "ring-b", 20, 17, "jade"),
          G("ring-b", "ring-a", 37, 15, "gold"),
          G("ring-c", "ring-d", 63, 14, "rose"),
          G("ring-d", "ring-c", 82, 13, "cyan"),
          G("ring-e", "ring-f", 101, 12, "gold"),
          G("ring-f", "ring-e", 119, 10, "jade"),
        ],
        platforms: [
          P(0, 18, 11, 2), P(15, 17, 8, 3), P(31, 15, 8, 4), P(47, 16, 7, 3),
          P(61, 14, 8, 5), P(78, 13, 9, 5), P(96, 12, 8, 5), P(114, 10, 22, 8),
          P(12, 13, 3, 1, "aurora"), P(25, 11, 4, 1, "aurora"), P(40, 9, 4, 1, "aurora"),
          P(56, 8, 3, 1, "aurora"), P(72, 7, 4, 1, "aurora"), P(88, 7, 3, 1, "aurora"),
          P(105, 6, 4, 1, "aurora"), P(121, 6, 3, 1, "aurora"),
          B(54, 15, 2, 1), B(90, 12, 2, 1), B(111, 9, 2, 1),
        ],
        coins: [
          C(12, 11), C(19, 15), C(26, 9, "gem"), C(38, 13), C(41, 7), C(53, 14),
          C(57, 6, "gem"), C(67, 12), C(73, 5), C(84, 11), C(89, 5, "gem"), C(98, 10),
          C(106, 4), C(113, 8), C(122, 4, "gem"), C(131, 8),
        ],
        powerups: [F(16, 15, "berry"), F(45, 14, "bell"), F(70, 12, "core"), F(99, 10, "moon"), F(121, 8, "heart")],
        enemies: [E(18, 16, 160), E(34, 14, 170, "wisp"), E(50, 15, 150, "ember"), E(66, 13, 180), E(84, 12, 170, "wisp"), E(101, 11, 220, "ember"), E(122, 9, 230)],
        springs: [S(29, 17, 1140), S(58, 16, 1160), S(108, 12, 1200)],
        hazards: [H(24, 18, 5, 1), H(55, 18, 5, 1), H(89, 15, 5, 1), H(112, 14, 5, 1)],
        moving: [M(24, 13, 3, 6, 104), M(45, 12, 4, 5, 92, "y"), M(74, 9, 3, 6, 110), M(94, 8, 4, 5, 92, "y"), M(109, 7, 3, 5, 98)],
      },
      {
        id: "starbridgetide",
        world: W2,
        name: "第九章 星桥潮汐",
        vibe: "潮汐星桥",
        hint: "风场会改写星门后的落点，顺势保留动量。",
        width: 128 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 660 },
        goal: { x: 122 * TILE, y: 6 * TILE, w: 76, h: 128 },
        palette: ["#0d1c34", "#1f5a77", "#9ee7ff", "#ffe9a8"],
        wind: [{ x: 24 * TILE, y: 0, w: 12 * TILE, h: 18 * TILE, force: 310 }, { x: 78 * TILE, y: 0, w: 12 * TILE, h: 18 * TILE, force: -330 }],
        portals: [
          G("bridge-a", "bridge-b", 18, 17, "cyan"),
          G("bridge-b", "bridge-a", 32, 15, "gold"),
          G("bridge-c", "bridge-d", 51, 16, "jade"),
          G("bridge-d", "bridge-c", 70, 14, "rose"),
          G("bridge-e", "bridge-f", 91, 13, "cyan"),
          G("bridge-f", "bridge-e", 109, 11, "gold"),
        ],
        platforms: [
          P(0, 18, 11, 2), P(14, 17, 8, 3), P(30, 15, 8, 5), P(44, 16, 8, 4),
          P(58, 14, 9, 6), P(74, 14, 9, 5), P(89, 13, 8, 5), P(106, 11, 22, 7),
          P(11, 13, 3, 1, "cloud"), P(25, 11, 4, 1, "cloud"), P(40, 10, 3, 1, "cloud"),
          P(55, 9, 3, 1, "cloud"), P(69, 8, 4, 1, "cloud"), P(86, 7, 3, 1, "cloud"),
          P(102, 7, 4, 1, "cloud"), P(116, 6, 3, 1, "cloud"),
        ],
        coins: [
          C(12, 11), C(18, 15), C(26, 9, "gem"), C(33, 13), C(41, 8), C(49, 14),
          C(56, 7, "gem"), C(65, 12), C(70, 6), C(80, 12), C(87, 5, "gem"), C(95, 11),
          C(103, 5), C(111, 9), C(117, 4, "gem"), C(124, 9),
        ],
        powerups: [F(16, 15, "bell"), F(46, 14, "berry"), F(76, 12, "moon"), F(103, 9, "core"), F(118, 9, "heart")],
        enemies: [E(17, 16, 170), E(34, 14, 180, "wisp"), E(47, 15, 160), E(61, 13, 200, "ember"), E(79, 13, 170, "wisp"), E(111, 10, 210)],
        springs: [S(28, 17, 1120), S(54, 16, 1140), S(101, 13, 1160)],
        hazards: [H(23, 18, 4, 1), H(52, 18, 5, 1), H(84, 16, 5, 1), H(104, 15, 4, 1)],
        moving: [M(23, 13, 3, 5, 96, "x", "cloud"), M(67, 10, 4, 5, 88, "y", "cloud"), M(97, 9, 3, 5, 94, "x", "cloud")],
      },
      {
        id: "islandstarcore",
        world: W2,
        name: "第十章 群岛星核",
        vibe: "星核群岛",
        hint: "星门、风场、晶块与移动平台完成星门群岛的终局路线。",
        width: 146 * TILE,
        height: 21 * TILE,
        start: { x: 100, y: 710 },
        goal: { x: 140 * TILE, y: 5 * TILE, w: 78, h: 132 },
        palette: ["#101528", "#24416b", "#82e3b8", "#ffe46b"],
        wind: [{ x: 35 * TILE, y: 0, w: 12 * TILE, h: 19 * TILE, force: -300 }, { x: 92 * TILE, y: 0, w: 14 * TILE, h: 19 * TILE, force: 330 }],
        portals: [
          G("core-a", "core-b", 19, 18, "gold"),
          G("core-b", "core-a", 38, 16, "cyan"),
          G("core-c", "core-d", 59, 16, "jade"),
          G("core-d", "core-c", 79, 14, "rose"),
          G("core-e", "core-f", 101, 13, "cyan"),
          G("core-f", "core-e", 122, 11, "gold"),
          G("core-g", "core-h", 113, 13, "jade"),
          G("core-h", "core-g", 134, 9, "rose"),
        ],
        platforms: [
          P(0, 19, 12, 2), P(15, 18, 8, 3), P(34, 16, 8, 5), P(50, 16, 10, 4),
          P(68, 14, 10, 5), P(86, 14, 10, 5), P(100, 13, 9, 5), P(119, 11, 12, 6), P(134, 9, 12, 8),
          P(12, 14, 3, 1, "aurora"), P(28, 12, 4, 1, "aurora"), P(45, 10, 3, 1, "aurora"),
          P(62, 9, 4, 1, "aurora"), P(80, 8, 3, 1, "aurora"), P(96, 7, 4, 1, "aurora"),
          P(113, 7, 3, 1, "aurora"), P(129, 6, 3, 1, "aurora"),
          B(47, 15, 2, 1), B(82, 13, 3, 1), B(111, 12, 2, 1), B(132, 8, 2, 1),
        ],
        coins: [
          C(12, 12), C(20, 16), C(29, 10, "gem"), C(39, 14), C(46, 8), C(55, 14),
          C(63, 7, "gem"), C(72, 12), C(81, 6), C(91, 12), C(97, 5, "gem"), C(104, 11),
          C(114, 5), C(123, 9), C(130, 4, "gem"), C(138, 7), C(142, 7, "gem"),
        ],
        powerups: [F(18, 16, "bell"), F(53, 14, "berry"), F(77, 12, "core"), F(104, 11, "moon"), F(127, 9, "heart")],
        enemies: [E(18, 17, 160), E(36, 15, 180, "wisp"), E(55, 15, 170, "ember"), E(72, 13, 190), E(90, 13, 170, "wisp"), E(105, 12, 190, "ember"), E(124, 10, 220), E(138, 8, 170, "wisp")],
        springs: [S(31, 18, 1140), S(66, 16, 1160), S(115, 13, 1180), S(132, 11, 1220)],
        hazards: [H(24, 19, 5, 1), H(61, 18, 5, 1), H(96, 16, 5, 1), H(118, 15, 5, 1), H(132, 12, 4, 1)],
        moving: [M(26, 14, 3, 6, 104), M(61, 11, 4, 5, 96, "y"), M(94, 9, 3, 6, 108), M(117, 8, 4, 4, 92, "y")],
      },
      {
        id: "phaseshallows",
        world: W3,
        name: "第十一章 相位浅滩",
        vibe: "相位浅滩",
        hint: "星潮会交替点亮两组桥面，先看节奏再出发。",
        width: 112 * TILE,
        height: 18 * TILE,
        start: { x: 100, y: 560 },
        goal: { x: 107 * TILE, y: 7 * TILE, w: 74, h: 126 },
        palette: ["#071827", "#16455a", "#9ee7ff", "#dff9ff"],
        phaseTide: { period: 3.6, offset: 0, warning: 0.55 },
        platforms: [
          P(0, 16, 12, 2), P(17, 15, 7, 3), P(32, 15, 8, 3), P(48, 14, 8, 4),
          P(64, 13, 8, 4), P(81, 12, 8, 5), P(98, 11, 14, 6),
          P(12, 12, 4, 1, "phase", "a"), P(25, 10, 4, 1, "phase", "b"), P(39, 11, 4, 1, "phase", "a"),
          P(54, 9, 4, 1, "phase", "b"), P(70, 8, 4, 1, "phase", "a"), P(87, 7, 4, 1, "phase", "b"),
          P(101, 7, 3, 1, "phase", "a"),
        ],
        coins: [
          C(12, 10, "coin", "a"), C(18, 13), C(25, 8, "gem", "b"), C(34, 13), C(40, 9, "coin", "a"),
          C(51, 12), C(55, 7, "gem", "b"), C(66, 11), C(71, 6, "coin", "a"), C(83, 10),
          C(88, 5, "gem", "b"), C(101, 5, "coin", "a"), C(108, 9),
        ],
        powerups: [F(19, 13, "berry"), F(50, 12, "bell"), F(82, 10, "moon"), F(100, 9, "core")],
        enemies: [E(20, 14, 170), E(36, 14, 150, "wisp"), E(52, 13, 160), E(84, 11, 180)],
        springs: [S(30, 15, 1080), S(94, 12, 1120)],
        hazards: [H(28, 16, 4, 1, "spike", "b"), H(60, 15, 4, 1, "spike", "a"), H(91, 14, 4, 1, "spike", "b")],
        moving: [M(44, 12, 3, 4, 82, "x", "jade"), M(74, 10, 3, 4, 78, "y", "jade")],
      },
      {
        id: "tidecorridor",
        world: W3,
        name: "第十二章 潮汐回廊",
        vibe: "星潮回廊",
        hint: "星露也会随相位显隐，耐心等到正确的潮线。",
        width: 122 * TILE,
        height: 19 * TILE,
        start: { x: 100, y: 610 },
        goal: { x: 116 * TILE, y: 6 * TILE, w: 74, h: 128 },
        palette: ["#081522", "#1a5262", "#b6f5d8", "#9ee7ff"],
        phaseTide: { period: 3.25, offset: 0.4, warning: 0.5 },
        platforms: [
          P(0, 17, 12, 2), P(15, 16, 8, 3), P(30, 15, 8, 4), P(46, 15, 8, 4),
          P(62, 14, 8, 4), P(78, 13, 8, 5), P(94, 12, 8, 5), P(109, 10, 13, 7),
          P(12, 12, 4, 1, "phase", "a"), P(25, 10, 4, 1, "phase", "b"), P(41, 9, 4, 1, "phase", "a"),
          P(57, 10, 4, 1, "phase", "b"), P(73, 8, 4, 1, "phase", "a"), P(89, 7, 4, 1, "phase", "b"),
          P(104, 6, 4, 1, "phase", "a"),
        ],
        coins: [
          C(12, 10, "gem", "a"), C(16, 14), C(25, 8, "coin", "b"), C(32, 13), C(42, 7, "gem", "a"),
          C(49, 13), C(58, 8, "coin", "b"), C(65, 12), C(74, 6, "gem", "a"), C(82, 11),
          C(90, 5, "coin", "b"), C(98, 10), C(105, 4, "gem", "a"), C(115, 8),
        ],
        powerups: [F(17, 14, "bell"), F(45, 13, "berry"), F(77, 11, "core"), F(108, 8, "heart")],
        enemies: [E(18, 15, 160), E(34, 14, 170, "wisp"), E(50, 14, 150, "ember"), E(80, 12, 180), E(112, 9, 200)],
        springs: [S(28, 16, 1100), S(60, 15, 1120), S(102, 12, 1150)],
        hazards: [H(24, 17, 4, 1, "spike", "b"), H(55, 16, 4, 1, "spike", "a"), H(87, 15, 4, 1, "spike", "b"), H(103, 13, 4, 1, "spike", "a")],
        moving: [M(39, 12, 3, 5, 88, "x", "jade", "a"), M(70, 10, 3, 5, 82, "y", "jade", "b"), M(99, 8, 3, 4, 88, "x", "jade")],
      },
      {
        id: "moonmirrorbreak",
        world: W3,
        name: "第十三章 月镜断桥",
        vibe: "月镜断桥",
        hint: "风场和相位桥会一起改变落点，先找安全平台。",
        width: 132 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 660 },
        goal: { x: 126 * TILE, y: 6 * TILE, w: 76, h: 128 },
        palette: ["#071526", "#1d4263", "#6dd6ee", "#fff7d1"],
        phaseTide: { period: 3.05, offset: 0.7, warning: 0.45 },
        wind: [{ x: 34 * TILE, y: 0, w: 12 * TILE, h: 18 * TILE, force: 300 }, { x: 83 * TILE, y: 0, w: 12 * TILE, h: 18 * TILE, force: -320 }],
        platforms: [
          P(0, 18, 12, 2), P(15, 17, 8, 3), P(31, 16, 8, 4), P(48, 15, 8, 4),
          P(64, 15, 8, 4), P(80, 14, 8, 5), P(96, 13, 8, 5), P(114, 11, 18, 7),
          P(12, 13, 3, 1, "phase", "a"), P(27, 11, 4, 1, "phase", "b"), P(43, 10, 4, 1, "phase", "a"),
          P(59, 9, 4, 1, "phase", "b"), P(75, 8, 4, 1, "phase", "a"), P(91, 7, 4, 1, "phase", "b"),
          P(107, 7, 4, 1, "phase", "a"), P(121, 6, 3, 1, "phase", "b"),
        ],
        coins: [
          C(12, 11, "coin", "a"), C(19, 15), C(28, 9, "gem", "b"), C(35, 14), C(44, 8, "coin", "a"),
          C(52, 13), C(60, 7, "gem", "b"), C(68, 13), C(76, 6, "coin", "a"), C(84, 12),
          C(92, 5, "gem", "b"), C(100, 11), C(108, 5, "coin", "a"), C(116, 9), C(122, 4, "gem", "b"),
        ],
        powerups: [F(18, 15, "bell"), F(50, 13, "berry"), F(82, 12, "moon"), F(113, 9, "core")],
        enemies: [E(18, 16, 170), E(35, 15, 160, "wisp"), E(51, 14, 170), E(68, 14, 160, "ember"), E(100, 12, 190, "wisp"), E(119, 10, 220)],
        springs: [S(29, 17, 1140), S(62, 15, 1160), S(109, 13, 1180)],
        hazards: [H(24, 18, 4, 1, "spike", "b"), H(55, 17, 5, 1, "spike", "a"), H(88, 16, 5, 1, "spike", "b"), H(108, 15, 4, 1, "spike", "a")],
        moving: [M(24, 13, 3, 5, 100, "x", "jade"), M(56, 11, 4, 4, 88, "y", "jade", "b"), M(92, 9, 3, 5, 102, "x", "jade", "a")],
      },
      {
        id: "twinstarclocktower",
        world: W3,
        name: "第十四章 双星钟塔",
        vibe: "双星钟塔",
        hint: "星门负责换位，相位桥负责时机，别急着冲进下一扇门。",
        width: 140 * TILE,
        height: 21 * TILE,
        start: { x: 100, y: 710 },
        goal: { x: 134 * TILE, y: 6 * TILE, w: 78, h: 130 },
        palette: ["#08131f", "#213a5d", "#9ee7ff", "#f2d389"],
        phaseTide: { period: 2.9, offset: 0.2, warning: 0.45 },
        portals: [
          G("clock-a", "clock-b", 18, 18, "cyan"),
          G("clock-b", "clock-a", 36, 16, "gold"),
          G("clock-c", "clock-d", 61, 15, "jade"),
          G("clock-d", "clock-c", 83, 13, "rose"),
          G("clock-e", "clock-f", 104, 12, "cyan"),
          G("clock-f", "clock-e", 125, 10, "gold"),
        ],
        platforms: [
          P(0, 19, 12, 2), P(15, 18, 8, 3), P(34, 16, 8, 5), P(52, 15, 9, 5),
          P(78, 13, 9, 6), P(100, 12, 9, 6), P(122, 10, 18, 8),
          P(12, 14, 4, 1, "phase", "a"), P(27, 12, 4, 1, "phase", "b"), P(44, 11, 4, 1, "phase", "a"),
          P(65, 10, 4, 1, "phase", "b"), P(91, 8, 4, 1, "phase", "a"), P(112, 7, 4, 1, "phase", "b"),
          P(129, 6, 3, 1, "phase", "a"),
          B(48, 14, 2, 1), B(96, 11, 2, 1), B(118, 9, 2, 1),
        ],
        coins: [
          C(12, 12, "coin", "a"), C(18, 16), C(28, 10, "gem", "b"), C(37, 14), C(45, 9, "coin", "a"),
          C(54, 13), C(66, 8, "gem", "b"), C(82, 11), C(92, 6, "coin", "a"), C(103, 10),
          C(113, 5, "gem", "b"), C(124, 8), C(130, 4, "coin", "a"), C(136, 8, "gem"),
        ],
        powerups: [F(18, 16, "berry"), F(55, 13, "bell"), F(85, 11, "core"), F(124, 8, "moon")],
        enemies: [E(18, 17, 160), E(37, 15, 150, "wisp"), E(56, 14, 170, "ember"), E(82, 12, 180), E(105, 11, 170, "wisp"), E(127, 9, 210)],
        springs: [S(31, 18, 1120), S(74, 15, 1160), S(116, 12, 1180)],
        hazards: [H(24, 19, 4, 1, "spike", "b"), H(61, 17, 5, 1, "spike", "a"), H(93, 15, 4, 1, "spike", "b"), H(112, 14, 4, 1, "spike", "a")],
        moving: [M(25, 14, 3, 5, 98, "x", "jade"), M(70, 11, 4, 5, 90, "y", "jade", "b"), M(111, 8, 3, 5, 102, "x", "jade", "a")],
      },
      {
        id: "phasetidecourt",
        world: W3,
        name: "第十五章 星潮王庭",
        vibe: "星潮王庭",
        hint: "最终路线会把星门、风场、晶块和相位桥编在同一段星潮里。",
        width: 154 * TILE,
        height: 22 * TILE,
        start: { x: 100, y: 760 },
        goal: { x: 148 * TILE, y: 5 * TILE, w: 80, h: 136 },
        palette: ["#07111e", "#173c58", "#6dd6ee", "#fff7d1"],
        phaseTide: { period: 2.8, offset: 0.55, warning: 0.42 },
        wind: [{ x: 38 * TILE, y: 0, w: 12 * TILE, h: 20 * TILE, force: 300 }, { x: 102 * TILE, y: 0, w: 14 * TILE, h: 20 * TILE, force: -330 }],
        portals: [
          G("court-a", "court-b", 20, 19, "gold"),
          G("court-b", "court-a", 41, 17, "cyan"),
          G("court-c", "court-d", 68, 16, "jade"),
          G("court-d", "court-c", 92, 14, "rose"),
          G("court-e", "court-f", 113, 13, "cyan"),
          G("court-f", "court-e", 136, 10, "gold"),
        ],
        platforms: [
          P(0, 20, 12, 2), P(15, 19, 9, 3), P(38, 17, 9, 5), P(58, 16, 10, 5),
          P(86, 14, 10, 6), P(110, 13, 10, 6), P(132, 10, 22, 9),
          P(12, 15, 4, 1, "phase", "a"), P(28, 13, 4, 1, "phase", "b"), P(49, 12, 4, 1, "phase", "a"),
          P(72, 10, 4, 1, "phase", "b"), P(100, 9, 4, 1, "phase", "a"), P(124, 7, 4, 1, "phase", "b"),
          P(142, 6, 3, 1, "phase", "a"),
          B(54, 15, 2, 1), B(82, 13, 3, 1), B(122, 12, 2, 1), B(140, 9, 2, 1),
        ],
        coins: [
          C(12, 13, "coin", "a"), C(21, 17), C(29, 11, "gem", "b"), C(42, 15), C(50, 10, "coin", "a"),
          C(61, 14), C(73, 8, "gem", "b"), C(89, 12), C(101, 7, "coin", "a"), C(114, 11),
          C(125, 5, "gem", "b"), C(136, 8), C(143, 4, "coin", "a"), C(149, 8, "gem"),
        ],
        powerups: [F(18, 17, "bell"), F(60, 14, "berry"), F(91, 12, "core"), F(116, 11, "moon"), F(136, 8, "heart")],
        enemies: [E(18, 18, 160), E(42, 16, 170, "wisp"), E(62, 15, 170, "ember"), E(90, 13, 190), E(114, 12, 170, "wisp"), E(138, 9, 220, "ember")],
        springs: [S(34, 19, 1140), S(78, 16, 1180), S(126, 13, 1200)],
        hazards: [H(25, 20, 5, 1, "spike", "b"), H(68, 18, 5, 1, "spike", "a"), H(102, 16, 5, 1, "spike", "b"), H(124, 15, 4, 1, "spike", "a"), H(140, 13, 4, 1, "spike", "b")],
        moving: [M(30, 15, 3, 6, 104, "x", "jade"), M(76, 12, 4, 5, 92, "y", "jade", "b"), M(105, 10, 3, 6, 106, "x", "jade", "a"), M(128, 8, 4, 4, 92, "y", "jade")],
      },
      // --- World 4: the Silver River ------------------------------------------
      {
        id: "riverford",
        world: W4,
        name: "第十六章 银汉渡口",
        vibe: "银汉渡口",
        hint: "鹊群托起的桥一踏即散，落脚就要继续前行；扶摇之风会托你上云。",
        width: 122 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 17 * TILE - 80 },
        goal: goalOn(114, 10),
        palette: ["#080a1c", "#1c2350", "#b8c4ff", "#fff4dc"],
        platforms: [
          P(0, 17, 14, 3), P(23, 16, 10, 4), P(36, 15, 8, 5), P(54, 14, 9, 6),
          P(67, 9, 10, 11), P(80, 12, 8, 8), P(96, 11, 10, 9), P(108, 10, 14, 10),
          P(40, 11, 3, 1, "stone"), P(57, 10, 3, 1, "stone"), P(84, 8, 3, 1, "stone"),
        ],
        bridges: [Q(14, 17, 4), Q(18, 17, 5), Q(44, 15, 5), Q(49, 15, 5), Q(88, 12, 4), Q(92, 12, 4)],
        updrafts: [U(63, 3, 4, 17)],
        coins: [
          C(5, 15), C(9, 15), C(16, 15), C(20, 15), C(26, 14), C(30, 14), C(41, 9, "gem"), C(46, 13),
          C(51, 13), C(58, 12), C(64, 10), C(64, 6), C(71, 7), C(75, 7), C(85, 6, "gem"), C(90, 10),
          C(94, 10), C(100, 9), C(112, 8), C(118, 8, "gem"),
        ],
        powerups: [F(25, 14, "bell"), F(70, 7, "berry"), F(99, 9, "core")],
        enemies: [E(28, 15, 150), E(39, 14, 120, "wisp"), E(72, 8, 170, "ember"), E(100, 10, 150)],
        springs: [S(31, 15)],
        hazards: [H(60, 13, 2, 1), H(103, 10, 2, 1)],
        moving: [],
      },
      {
        id: "magpiebridge",
        world: W4,
        name: "第十七章 鹊桥初成",
        vibe: "鹊桥初成",
        hint: "连成一线的鹊桥要一口气跑过；两道扶摇风把路线托向更高的星野。",
        width: 132 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 16 * TILE - 80 },
        goal: goalOn(126, 9),
        palette: ["#080a1c", "#20285a", "#c6d0ff", "#fff4dc"],
        platforms: [
          P(0, 16, 12, 4), P(24, 15, 8, 5), P(36, 9, 9, 11), P(53, 10, 8, 10), P(64, 12, 7, 8),
          P(83, 11, 9, 9), P(96, 6, 10, 14), P(109, 8, 8, 12), P(120, 9, 12, 11),
          P(27, 11, 3, 1, "stone"), P(58, 6, 3, 1, "stone"), P(86, 7, 3, 1, "stone"),
        ],
        bridges: [Q(12, 16, 4), Q(16, 16, 4), Q(20, 16, 4), Q(45, 9, 4), Q(49, 9, 4), Q(71, 12, 4), Q(75, 12, 4), Q(79, 12, 4)],
        updrafts: [U(32, 3, 4, 17), U(92, 2, 4, 18)],
        coins: [
          C(6, 14), C(14, 14), C(18, 14), C(22, 14), C(28, 9, "gem"), C(33, 10), C(33, 6), C(40, 7),
          C(47, 7), C(51, 7), C(56, 8), C(67, 10), C(73, 10), C(77, 10), C(81, 10), C(87, 5, "gem"),
          C(93, 8), C(93, 4), C(100, 4), C(112, 6), C(124, 7), C(129, 7, "gem"),
        ],
        powerups: [F(37, 7, "moon"), F(85, 9, "bell"), F(110, 6, "heart")],
        enemies: [E(28, 14, 140), E(40, 8, 170, "ember"), E(66, 11, 120), E(87, 10, 140, "wisp"), E(100, 5, 180), E(124, 8, 160, "ember")],
        springs: [S(59, 9)],
        hazards: [H(89, 10, 2, 1), H(113, 7, 2, 1)],
        moving: [],
      },
      {
        id: "weaverloom",
        world: W4,
        name: "第十八章 织女机杼",
        vibe: "织女机杼",
        hint: "青玉梭往复穿行，像织机上的经纬；看准梭子的节拍再起跳。",
        width: 140 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 16 * TILE - 80 },
        goal: goalOn(132, 8),
        palette: ["#0a0a1e", "#2a2458", "#d6c8ff", "#fff4dc"],
        platforms: [
          P(0, 16, 12, 4), P(20, 14, 8, 6), P(34, 10, 9, 10), P(51, 11, 8, 9), P(67, 10, 9, 10),
          P(80, 5, 8, 15), P(91, 8, 8, 12), P(107, 9, 9, 11), P(123, 8, 17, 12),
          P(24, 10, 3, 1, "stone"), P(55, 7, 3, 1, "stone"),
        ],
        bridges: [Q(43, 10, 4), Q(47, 10, 4), Q(99, 8, 4), Q(103, 8, 4)],
        updrafts: [U(76, 2, 4, 18)],
        coins: [
          C(6, 14), C(14, 12), C(17, 12), C(23, 12), C(25, 8, "gem"), C(31, 9), C(38, 8), C(45, 8),
          C(49, 8), C(54, 9), C(60, 9), C(63, 9), C(71, 8), C(77, 8), C(77, 4), C(84, 3, "gem"),
          C(95, 6), C(101, 6), C(105, 6), C(111, 7), C(118, 7), C(128, 6), C(135, 6, "gem"),
        ],
        powerups: [F(22, 12, "berry"), F(69, 8, "bell"), F(110, 7, "core")],
        enemies: [E(23, 13, 130), E(37, 9, 160, "wisp"), E(54, 10, 140, "ember"), E(70, 9, 150), E(83, 4, 160, "ember"), E(94, 7, 140, "wisp"), E(110, 8, 150)],
        springs: [S(73, 9)],
        hazards: [H(40, 9, 2, 1), H(127, 7, 2, 1)],
        moving: [M(13, 14, 3, 3, 110, "x"), M(30, 12, 3, 3, 90, "y"), M(60, 11, 3, 4, 120, "x"), M(117, 9, 3, 3, 110, "x")],
      },
      {
        id: "herdsmanfield",
        world: W4,
        name: "第十九章 牵牛星野",
        vibe: "牵牛星野",
        hint: "星野上顺风逆风交替，罡风之中鹊桥更短，扶摇风托你越过断崖。",
        width: 146 * TILE,
        height: 20 * TILE,
        start: { x: 100, y: 16 * TILE - 80 },
        goal: goalOn(140, 8),
        palette: ["#080c1c", "#1e2e52", "#c4dcff", "#fff4dc"],
        wind: [{ x: 26 * TILE, y: 0, w: 12 * TILE, h: 20 * TILE, force: 330 }, { x: 79 * TILE, y: 0, w: 12 * TILE, h: 20 * TILE, force: -320 }],
        platforms: [
          P(0, 16, 14, 4), P(17, 15, 9, 5), P(30, 14, 6, 6), P(44, 13, 10, 7), P(58, 7, 10, 13),
          P(71, 9, 8, 11), P(81, 9, 6, 11), P(95, 10, 10, 10), P(109, 5, 9, 15), P(121, 7, 8, 13),
          P(133, 8, 13, 12),
          P(46, 9, 3, 1, "stone"), P(62, 3, 3, 1, "stone"),
        ],
        bridges: [Q(36, 14, 4), Q(40, 14, 4), Q(87, 9, 4), Q(91, 9, 4), Q(129, 7, 4)],
        updrafts: [U(54, 2, 4, 18), U(105, 1, 4, 19)],
        coins: [
          C(6, 14), C(10, 14), C(20, 13), C(28, 11), C(33, 12), C(38, 12), C(42, 12), C(47, 7, "gem"),
          C(51, 11), C(55, 9), C(55, 5), C(63, 1, "gem"), C(66, 5), C(75, 7), C(84, 7), C(89, 7),
          C(93, 7), C(99, 8), C(106, 7), C(106, 3), C(113, 3), C(125, 5), C(131, 5), C(138, 6, "gem"),
        ],
        powerups: [F(19, 13, "bell"), F(60, 5, "core"), F(97, 8, "moon"), F(122, 5, "heart")],
        enemies: [E(20, 14, 140), E(47, 12, 150, "ember"), E(61, 6, 160, "wisp"), E(74, 8, 140), E(98, 9, 150, "ember"), E(112, 4, 160), E(124, 6, 140, "wisp")],
        springs: [S(50, 12)],
        hazards: [H(23, 14, 2, 1), H(101, 9, 2, 1)],
        moving: [],
      },
      {
        id: "tiangoumoon",
        world: W4,
        name: "第二十章 天狗食月",
        vibe: "天狗食月",
        hint: "银汉尽头，天狗衔月而来。踏散的鹊桥、扶摇的风与最后的星门，都在这一夜。",
        width: 160 * TILE,
        height: 22 * TILE,
        start: { x: 100, y: 19 * TILE - 80 },
        goal: goalOn(152, 12),
        palette: ["#06081a", "#1a1f48", "#ffd9a8", "#fff4dc"],
        wind: [{ x: 88 * TILE, y: 0, w: 12 * TILE, h: 22 * TILE, force: 320 }],
        platforms: [
          P(0, 19, 12, 3), P(20, 18, 9, 4), P(33, 12, 9, 10), P(45, 13, 7, 9), P(59, 12, 8, 10),
          P(79, 11, 9, 11), P(91, 11, 6, 11), P(101, 10, 9, 12), P(114, 6, 8, 16), P(124, 9, 6, 13),
          P(132, 12, 28, 10),
          P(37, 8, 3, 1, "stone"), P(105, 6, 3, 1, "stone"),
        ],
        bridges: [Q(12, 19, 4), Q(16, 19, 4), Q(67, 12, 4), Q(71, 12, 4), Q(75, 12, 4), Q(97, 11, 4)],
        updrafts: [U(29, 4, 4, 18), U(110, 3, 4, 19)],
        coins: [
          C(6, 17), C(14, 17), C(18, 17), C(23, 16), C(30, 12), C(30, 7), C(38, 6, "gem"), C(42, 10),
          C(48, 11), C(55, 10), C(62, 10), C(69, 10), C(73, 10), C(77, 10), C(84, 9), C(92, 9),
          C(99, 9), C(104, 8), C(111, 8), C(111, 4), C(118, 4, "gem"), C(127, 7), C(140, 10), C(146, 10, "gem"),
        ],
        powerups: [F(22, 16, "berry"), F(61, 10, "bell"), F(103, 8, "core"), F(126, 7, "heart")],
        enemies: [E(23, 17, 140), E(36, 11, 160, "ember"), E(48, 12, 120, "wisp"), E(62, 11, 140), E(83, 10, 150, "ember"), E(104, 9, 150), E(117, 5, 150, "wisp")],
        springs: [S(40, 11)],
        hazards: [H(25, 17, 2, 1), H(85, 10, 2, 1)],
        moving: [M(53, 13, 3, 3, 110, "x")],
      },
    ];

    // v2.0.0 — chapter tuning applied after authoring so the level literals above
    // stay readable. `par` is the gold trial target in seconds, `marrow` is the
    // hidden star-marrow tile, `extra` adds the two new hostile types, and
    // `warden` seals a world finale behind its guardian.
    const TUNING = {
      sakura: { par: 20, marrow: [40, 8] },
      moonruin: { par: 24, marrow: [70, 4] },
      cloudsea: { par: 28, marrow: [23, 12] },
      crystalforge: { par: 30, marrow: [104, 6], extra: [A(47, 13), A(94, 11, 190)] },
      auroracitadel: {
        par: 55,
        marrow: [62, 11],
        extra: [A(86, 12, 200)],
        warden: {
          id: "aurorawarden",
          name: "烛龙",
          title: "第一星域 · 极光守望",
          profile: "aurora",
          palette: "aurora",
          health: 16,
          arena: { x: 118 * TILE, w: 20 * TILE },
          ground: 10 * TILE,
          home: { x: 126 * TILE, y: 5 * TILE },
          sigil: "烛",
        },
      },
      stargatecove: { par: 24, marrow: [82, 9] },
      loopinglighthouse: { par: 28, marrow: [29, 9], extra: [T(66, 12)] },
      ringconservatory: { par: 32, marrow: [58, 11], extra: [A(64, 13, 190)] },
      starbridgetide: { par: 30, marrow: [101, 8], extra: [T(92, 12)] },
      islandstarcore: {
        par: 65,
        marrow: [66, 11],
        extra: [A(104, 12, 190), T(88, 13)],
        warden: {
          id: "corewarden",
          name: "巨鳌",
          title: "第二星域 · 群岛守望",
          profile: "core",
          palette: "core",
          health: 20,
          arena: { x: 134 * TILE, w: 12 * TILE },
          ground: 9 * TILE,
          home: { x: 139 * TILE, y: 4 * TILE },
          sigil: "鳌",
        },
      },
      phaseshallows: { par: 32, marrow: [30, 10], extra: [T(66, 12)] },
      tidecorridor: { par: 36, marrow: [62, 10], extra: [A(64, 13, 180)] },
      moonmirrorbreak: { par: 40, marrow: [109, 9], extra: [T(82, 13)] },
      twinstarclocktower: { par: 42, marrow: [75, 10], extra: [A(80, 12, 190)] },
      riverford: { par: 32, marrow: [58, 8], extra: [T(110, 9)] },
      magpiebridge: { par: 38, marrow: [59, 4], extra: [A(86, 10, 150)] },
      weaverloom: { par: 44, marrow: [56, 5], extra: [T(86, 4), A(127, 7, 190)] },
      herdsmanfield: { par: 48, marrow: [63, 1], extra: [A(99, 9, 160), T(116, 4)] },
      phasetidecourt: {
        par: 78,
        marrow: [82, 11],
        extra: [T(88, 13), A(112, 12, 190)],
        warden: {
          id: "tidewarden",
          name: "鲲",
          title: "第三星域 · 星潮守望",
          profile: "tide",
          palette: "tide",
          health: 24,
          arena: { x: 132 * TILE, w: 22 * TILE },
          ground: 10 * TILE,
          home: { x: 143 * TILE, y: 5 * TILE },
          sigil: "鲲",
        },
      },
      tiangoumoon: {
        par: 70,
        marrow: [106, 4],
        extra: [A(84, 10, 150), T(119, 5)],
        warden: {
          id: "tiangouwarden",
          name: "天狗",
          title: "第四星域 · 银汉守望",
          profile: "river",
          palette: "river",
          health: 26,
          arena: { x: 136 * TILE, w: 22 * TILE },
          ground: 12 * TILE,
          home: { x: 148 * TILE, y: 6 * TILE },
          sigil: "月",
        },
      },
    };

    // Warden difficulty ramps by remaining health: each stage speeds the cadence
    // and widens the attack pool. Patterns stay data-driven so the three
    // encounters share one simulation path.
    const WARDEN_STAGE_PROFILES = {
      aurora: [
        { above: 0.66, cadence: 2.4, patterns: ["volley", "sweep"] },
        { above: 0.33, cadence: 2.0, patterns: ["volley", "rain", "sweep"] },
        { above: 0, cadence: 1.65, patterns: ["rain", "sweep", "volley", "summon"] },
      ],
      core: [
        { above: 0.66, cadence: 2.5, patterns: ["sweep", "volley"] },
        { above: 0.33, cadence: 2.05, patterns: ["sweep", "summon", "volley"] },
        { above: 0, cadence: 1.7, patterns: ["volley", "summon", "sweep", "rain"] },
      ],
      river: [
        { above: 0.66, cadence: 2.2, patterns: ["volley", "rain"] },
        { above: 0.33, cadence: 1.85, patterns: ["sweep", "rain", "volley"] },
        { above: 0, cadence: 1.5, patterns: ["volley", "summon", "rain", "sweep"] },
      ],
      tide: [
        { above: 0.66, cadence: 2.3, patterns: ["rain", "volley"] },
        { above: 0.33, cadence: 1.9, patterns: ["rain", "sweep", "volley"] },
        { above: 0, cadence: 1.55, patterns: ["rain", "volley", "summon", "sweep"] },
      ],
    };

    for (const level of chapters) {
      const tuning = TUNING[level.id];
      if (!tuning) continue;
      level.par = tuning.par;
      const [mx, my] = tuning.marrow;
      level.marrow = {
        x: mx * TILE + (TILE - MARROW_SIZE) / 2,
        y: my * TILE + (TILE - MARROW_SIZE) / 2,
        w: MARROW_SIZE,
        h: MARROW_SIZE,
        taken: false,
      };
      if (tuning.extra) level.enemies = level.enemies.concat(tuning.extra);

      // v2.0.0 — 星灯 checkpoints. A fall used to end the whole attempt; now it
      // costs one heart and returns the player to the last lit lantern. Lanterns
      // are derived from the authored main platforms so no chapter needs
      // re-laying out, and they never sit over a hazard.
      const hosts = level.platforms.filter(
        (p) => !p.phase && p.h >= TILE * 2 && p.w >= TILE * 5 && p.type !== "breakable"
      );
      const hazardBlocks = (rect) => level.hazards.some((h) => !h.phase && rectsOverlapRaw(rect, h));
      const lanternAt = (targetX) => {
        const ranked = hosts
          .slice()
          .sort((a, b) => Math.abs(a.x + a.w / 2 - targetX) - Math.abs(b.x + b.w / 2 - targetX));
        for (const host of ranked) {
          const rect = { x: host.x + host.w / 2 - 13, y: host.y - 52, w: 26, h: 52, lit: false };
          if (!hazardBlocks(rect)) return rect;
        }
        return null;
      };
      const anchors = [0.34, 0.64];
      if (tuning.warden) anchors.push((tuning.warden.arena.x - TILE * 3) / level.width);
      const lanterns = [];
      for (const fraction of anchors) {
        const lantern = lanternAt(level.width * fraction);
        if (!lantern) continue;
        if (lantern.x < TILE * 6) continue;
        if (lanterns.some((existing) => Math.abs(existing.x - lantern.x) < TILE * 6)) continue;
        lanterns.push(lantern);
      }
      level.lanterns = lanterns;
      if (tuning.warden) {
        const stages = WARDEN_STAGE_PROFILES[tuning.warden.profile];
        level.warden = {
          ...tuning.warden,
          w: 104,
          h: 96,
          stages: stages.map((stage) => ({ ...stage, patterns: [...stage.patterns] })),
        };
      }
    }

    return chapters;
  }


  const api = {
    TILE,
    ENEMY_WIDTH,
    ENEMY_HEIGHT,
    WISP_FLOAT_GAP,
    WISP_HOVER_RANGE,
    MARROW_SIZE,
    SENTRY_COOLDOWN,
    patrolPhase,
    buildChapters,
  };

  root.NiniYuanChapters = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
