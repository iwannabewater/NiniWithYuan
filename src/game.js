(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const screens = {
    menu: document.getElementById("menu"),
    characters: document.getElementById("characterScreen"),
    levels: document.getElementById("levelScreen"),
    settings: document.getElementById("settingsScreen"),
  };
  const hud = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  const touchControls = document.getElementById("touchControls");
  const toast = document.getElementById("toast");
  const hudEls = {
    character: document.getElementById("hudCharacter"),
    health: document.getElementById("hudHealth"),
    coins: document.getElementById("hudCoins"),
    ammo: document.getElementById("hudAmmo"),
    time: document.getElementById("hudTime"),
    status: document.getElementById("hudStatus"),
    skill: document.getElementById("hudSkill"),
    bar: document.querySelector("#chapterBar span"),
    intro: document.getElementById("chapterIntro"),
    introEyebrow: document.getElementById("chapterIntroEyebrow"),
    introTitle: document.getElementById("chapterIntroTitle"),
    introText: document.getElementById("chapterIntroText"),
    introMeta: document.getElementById("chapterIntroMeta"),
  };

  const Storage = window.NiniYuanStorage;
  const Audio = window.NiniYuanAudio;
  const Hud = window.NiniYuanHud;
  const TILE = 48;
  const FIXED_DT = 1 / 120;
  const PICKUP_REACH_X = 10;
  const PICKUP_REACH_TOP = 46;
  const PICKUP_REACH_BOTTOM = 16;
  const YUAN_DASH_SPEED = 820;
  const YUAN_DASH_TIME = 0.18;
  const YUAN_DASH_MIN_DISTANCE = 130;
  const YUAN_DASH_MAX_DISTANCE = 170;
  const NINI_GLIDE_DURATION = 1.25;
  const NINI_GLIDE_FALL_SPEED = 190;
  const ENEMY_WIDTH = 38;
  const ENEMY_HEIGHT = 34;
  const WISP_FLOAT_GAP = 24;
  const WISP_HOVER_RANGE = 6;
  const WIND_REFERENCE_FORCE = 320;
  const WIND_GROUND_DRIFT = 0.14;
  const WIND_AIR_DRIFT = 0.38;
  const WIND_MAX_SPEED = 1.3;
  const WIND_ARROW_SPACING = 72;
  const WIND_ARROW_SPEED = 18;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const snap = (n) => Math.round(n);
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  let view = { w: 1280, h: 720, dpr: 1 };
  let screen = "menu";
  let mode = "menu";
  let currentLevelIndex = 0;
  let activeLevel = null;
  let player = null;
  let camera = { x: 0, y: 0, shake: 0 };
  let particles = [];
  let floatTexts = [];
  let keys = Object.create(null);
  let inputs = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
    jumpReleased: false,
    skill: false,
    skillPressed: false,
    shoot: false,
    shootPressed: false,
  };
  let last = performance.now();
  let accumulator = 0;
  let pageHidden = document.hidden;
  let toastTimer = 0;
  let introTimer = 0;
  let projectiles = [];

  const characters = {
    nini: {
      id: "nini",
      name: "妮妮",
      subtitle: "星羽旅者",
      accent: "#ff86bd",
      accent2: "#ffe07a",
      speed: 445,
      accel: 3450,
      jump: 1040,
      gravity: 2250,
      maxFall: 1360,
      skillName: "星羽滑翔",
      projectileName: "星露弹",
      projectileSpeed: 760,
      projectileDamage: 1,
      projectilePierce: 0,
      airJumps: 1,
      skillCooldown: 0.7,
    },
    yuan: {
      id: "yuan",
      name: "源源",
      subtitle: "青岚剑心",
      accent: "#66d8ff",
      accent2: "#7ff1ba",
      speed: 485,
      accel: 3720,
      jump: 980,
      gravity: 2300,
      maxFall: 1460,
      skillName: "青岚冲刺",
      projectileName: "青岚弹",
      projectileSpeed: 640,
      projectileDamage: 2,
      projectilePierce: 1,
      airJumps: 0,
      skillCooldown: 0.95,
    },
  };

  const characterSprites = {
    nini: loadSprite("./assets/characters/nini-v2.png"),
    yuan: loadSprite("./assets/characters/yuan-v2.png"),
  };
  const characterAtlases = {
    nini: loadAtlas("./assets/characters/nini/atlas.json"),
    yuan: loadAtlas("./assets/characters/yuan/atlas.json"),
  };

  const levels = buildLevels();
  let save = loadSave();
  const audioBus = Audio.createAudioBus({
    getVolume: () => save.settings.volume,
    getBgmVolume: () => save.settings.bgmVolume,
  });
  audioBus.setBgmSource("./assets/audio/fairy-adventure.ogg");

  function loadSprite(src) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    return image;
  }

  function loadAtlas(src) {
    const atlas = { ready: false, data: null };
    fetch(src)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        atlas.ready = Boolean(data);
        atlas.data = data;
      })
      .catch(() => {
        atlas.ready = false;
      });
    return atlas;
  }

  function storageOptions() {
    return {
      levelCount: levels.length,
      levelIds: levels.map((level) => level.id),
      onError: () => toastMsg("本地存档暂不可用，本次进度仍可继续游玩"),
    };
  }

  function loadSave() {
    return Storage.loadSave(storageOptions());
  }

  function persist() {
    return Storage.persist(save, storageOptions());
  }

  function buildLevels() {
    const P = (x, y, w, h, type = "ground") => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE, type });
    const C = (x, y, kind = "coin") => ({ x: x * TILE + 18, y: y * TILE + 16, w: 22, h: 22, kind, taken: false });
    const F = (x, y, kind = "berry") => ({ x: x * TILE + 10, y: y * TILE + 10, w: 30, h: 30, kind, taken: false });
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
        phase: Math.random() * 10,
      };
    };
    const S = (x, y, power = 1050) => ({ x: x * TILE, y: y * TILE + 20, w: TILE, h: 18, power });
    const M = (x, y, w, range, speed, axis = "x", type = "jade") => ({
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
    });
    const H = (x, y, w = 1, h = 1, type = "spike") => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE, type });
    const B = (x, y, w = 1, h = 1) => P(x, y, w, h, "breakable");

    return [
      {
        id: "sakura",
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
    ];
  }

  function resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    view = { w: innerWidth, h: innerHeight, dpr };
    canvas.width = Math.floor(view.w * dpr);
    canvas.height = Math.floor(view.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  function showScreen(name) {
    screen = name;
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle("active", key === name));
    hud.classList.toggle("active", mode === "play");
    touchControls.classList.toggle("playing", mode === "play");
    renderMenus();
  }

  function startLevel(index) {
    currentLevelIndex = index;
    activeLevel = cloneLevel(levels[index]);
    const ch = characters[save.selected];
    player = {
      x: activeLevel.start.x,
      y: activeLevel.start.y,
      w: 34,
      h: 56,
      baseW: 34,
      baseH: 56,
      vx: 0,
      vy: 0,
      spawn: { ...activeLevel.start },
      health: 3,
      maxHealth: 3,
      ammo: 14,
      ammoRegen: 0,
      invuln: 0,
      superInvuln: 0,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      airJumps: ch.airJumps,
      facing: 1,
      dashDir: 1,
      skillCd: 0,
      skillTimer: 0,
      shootCd: 0,
      turnTimer: 0,
      glide: 0,
      bigTimer: 0,
      ammoTimer: 0,
      boostTimer: 0,
      windTimer: 0,
      carrier: null,
      coins: 0,
      gems: 0,
      elapsed: 0,
      completed: false,
      hurtFlash: 0,
    };
    particles = [];
    floatTexts = [];
    projectiles = [];
    camera = { x: 0, y: 0, shake: 0 };
    keys = Object.create(null);
    mode = "play";
    modal.classList.remove("active");
    showScreen("");
    showChapterIntro();
    audioBus.playBgm();
  }

  function cloneLevel(level) {
    return {
      ...level,
      platforms: level.platforms.map((p) => ({ ...p })),
      coins: level.coins.map((c) => ({ ...c, taken: false })),
      powerups: (level.powerups || []).map((p) => ({ ...p, taken: false })),
      enemies: level.enemies.map((e) => ({ ...e })),
      springs: level.springs.map((s) => ({ ...s })),
      hazards: level.hazards.map((h) => ({ ...h })),
      moving: level.moving.map((m) => ({ ...m })),
      wind: (level.wind || []).map((w) => ({ ...w })),
    };
  }

  function update(dt) {
    if (mode !== "play" || !player || !activeLevel) return;
    player.elapsed += dt;
    updateInputs();
    updateMoving(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups();
    updateParticles(dt);
    updateCamera(dt);
    updateChapterIntro(dt);
    updateHud();
  }

  function updateInputs() {
    inputs.left = !!(keys.ArrowLeft || keys.KeyA || keys.left);
    inputs.right = !!(keys.ArrowRight || keys.KeyD || keys.right);
    inputs.jump = !!(keys.Space || keys.ArrowUp || keys.KeyW || keys.jump);
    inputs.skill = !!(keys.KeyJ || keys.ShiftLeft || keys.ShiftRight || keys.skill);
    inputs.shoot = !!(keys.KeyK || keys.Enter || keys.shoot);
  }

  function consumePressed() {
    inputs.jumpPressed = false;
    inputs.jumpReleased = false;
    inputs.skillPressed = false;
    inputs.shootPressed = false;
  }

  function allSolids() {
    return activeLevel.platforms.concat(activeLevel.moving);
  }

  function updateMoving(dt) {
    for (const m of activeLevel.moving) {
      const oldX = m.x;
      const oldY = m.y;
      if (m.axis === "y") {
        m.y += m.dir * m.speed * dt;
        if (Math.abs(m.y - m.oy) > m.range) {
          m.y = m.oy + Math.sign(m.y - m.oy) * m.range;
          m.dir *= -1;
        }
      } else {
        m.x += m.dir * m.speed * dt;
        if (Math.abs(m.x - m.ox) > m.range) {
          m.x = m.ox + Math.sign(m.x - m.ox) * m.range;
          m.dir *= -1;
        }
      }
      m.dx = m.x - oldX;
      m.dy = m.y - oldY;
    }
  }

  function updatePlayer(dt) {
    const ch = characters[save.selected];
    const leftRight = (inputs.right ? 1 : 0) - (inputs.left ? 1 : 0);
    if (leftRight) {
      const nextFacing = Math.sign(leftRight);
      if (nextFacing !== player.facing) player.turnTimer = 0.16;
      player.facing = nextFacing;
    }

    if (inputs.jumpPressed) player.jumpBuffer = 0.14;
    player.jumpBuffer -= dt;
    player.coyote -= dt;
    player.skillCd = Math.max(0, player.skillCd - dt);
    player.skillTimer = Math.max(0, player.skillTimer - dt);
    player.shootCd = Math.max(0, player.shootCd - dt);
    player.turnTimer = Math.max(0, player.turnTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.superInvuln = Math.max(0, player.superInvuln - dt);
    player.bigTimer = Math.max(0, player.bigTimer - dt);
    player.ammoTimer = Math.max(0, player.ammoTimer - dt);
    player.boostTimer = Math.max(0, player.boostTimer - dt);
    player.windTimer = Math.max(0, player.windTimer - dt);
    player.ammoRegen += dt;
    if (player.ammo < 14 && player.ammoRegen >= 1.6) {
      player.ammo += 1;
      player.ammoRegen = 0;
    }
    player.hurtFlash = Math.max(0, player.hurtFlash - dt);
    updatePlayerSize();

    let gravity = ch.gravity;
    const playerRect = bodyRect(player);
    const windZone = activeWindZone(playerRect);
    const windDirection = windZone ? Math.sign(windZone.force) : 0;
    const windStrength = windZone ? clamp(Math.abs(windZone.force) / WIND_REFERENCE_FORCE, 0.75, 1.25) : 0;
    const windTarget = windDirection * ch.speed * (player.onGround ? WIND_GROUND_DRIFT : WIND_AIR_DRIFT) * windStrength;
    const target = clamp(leftRight * ch.speed + windTarget, -ch.speed * WIND_MAX_SPEED, ch.speed * WIND_MAX_SPEED);
    const accel = player.onGround ? ch.accel : ch.accel * 0.74;
    player.vx = moveToward(player.vx, target, accel * dt);
    if (!leftRight && player.onGround && !windDirection) player.vx = moveToward(player.vx, 0, 2800 * dt);
    if (windZone) {
      player.windTimer = 0.18;
      spawnWind(player.x + player.w / 2, player.y + player.h / 2, windDirection);
    }

    const skillCooldown = ch.skillCooldown * (player.boostTimer > 0 ? 0.55 : 1);
    const canNiniGlide =
      save.selected === "nini" &&
      inputs.skill &&
      !player.onGround &&
      player.glide < NINI_GLIDE_DURATION &&
      (player.skillCd <= 0 || player.glide > 0);
    if (canNiniGlide) {
      if (player.glide === 0) {
        player.skillCd = skillCooldown;
        burst(player.x + player.w / 2, player.y + player.h / 2, ch.accent, 14);
        toastMsg("星羽滑翔！");
      }
      player.glide = Math.min(NINI_GLIDE_DURATION, player.glide + dt);
      gravity *= player.vy < -80 ? 0.68 : 0.26;
      if (player.vy > -70) player.vy = Math.min(player.vy, NINI_GLIDE_FALL_SPEED);
      if (save.settings.fx) spawnSpark(player.x + 16, player.y + 28, ch.accent, 1);
    } else if (!inputs.skill && !player.onGround) {
      player.glide = 0;
    } else if (player.onGround) {
      player.glide = 0;
    }

    if (inputs.skillPressed && player.skillCd <= 0) {
      if (save.selected === "yuan") {
        player.skillTimer = YUAN_DASH_TIME;
        player.dashDir = player.facing;
        player.skillCd = skillCooldown;
        player.vx = player.dashDir * YUAN_DASH_SPEED;
        player.vy *= 0.45;
        camera.shake = Math.max(camera.shake, 7);
        burst(player.x + player.w / 2, player.y + player.h / 2, ch.accent, 22);
        toastMsg("青岚冲刺！");
      } else if (!player.onGround) {
        player.skillCd = skillCooldown;
        player.vy = Math.min(player.vy, 120);
        burst(player.x + player.w / 2, player.y + player.h / 2, ch.accent, 14);
        toastMsg("星羽滑翔！");
      }
    }

    if (save.selected === "yuan" && player.skillTimer > 0) {
      if (dashShouldStopAtEdge()) {
        player.skillTimer = 0;
        player.vx = moveToward(player.vx, 0, 5200 * dt);
        burst(player.x + player.w / 2, player.y + player.h, "#7ff1ba", 8);
      } else {
        const dashSpeed = YUAN_DASH_SPEED * (player.boostTimer > 0 ? 1.08 : 1);
        player.vx = player.dashDir * Math.max(Math.abs(player.vx), dashSpeed);
      }
    }

    if (inputs.shootPressed) shootProjectile();

    if (player.jumpBuffer > 0 && (player.coyote > 0 || player.airJumps > 0)) {
      const usedAir = player.coyote <= 0;
      player.vy = -ch.jump * (usedAir ? 0.9 : 1);
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      if (usedAir) player.airJumps -= 1;
      burst(player.x + player.w / 2, player.y + player.h, ch.accent2, 12);
      beep(540, 0.045);
    }
    if (inputs.jumpReleased && player.vy < -160) player.vy *= 0.56;

    player.vy = Math.min(ch.maxFall, player.vy + gravity * dt);
    moveAxis("x", player.vx * dt);
    moveAxis("y", player.vy * dt);

    for (const spring of activeLevel.springs) {
      if (rectsOverlap(bodyRect(player), spring) && player.vy >= 0) {
        player.y = spring.y - player.h;
        player.vy = -spring.power;
        player.onGround = false;
        player.coyote = 0;
        camera.shake = 5;
        burst(spring.x + spring.w / 2, spring.y, "#fff070", 24);
        beep(780, 0.06);
      }
    }

    for (const h of activeLevel.hazards) {
      if (rectsOverlap(bodyRect(player), h)) hurt(h.type === "lava" ? 2 : 1);
    }
    for (const e of activeLevel.enemies) {
      if (!e.alive || !rectsOverlap(bodyRect(player), e)) continue;
      const stomp = player.vy > 160 && player.y + player.h - e.y < 28;
      if (stomp) {
        e.alive = false;
        player.vy = -620;
        player.coins += 2;
        burst(e.x + e.w / 2, e.y + e.h / 2, "#ffd36d", 20);
        floatText("+2", e.x, e.y, "#ffd36d");
        beep(680, 0.04);
      } else if (player.superInvuln > 0) {
        e.alive = false;
        player.coins += 2;
        burst(e.x + e.w / 2, e.y + e.h / 2, "#fff2a6", 28);
        floatText("无敌", e.x, e.y, "#fff2a6");
      } else if (player.skillTimer > 0 && save.selected === "yuan") {
        e.alive = false;
        player.coins += 3;
        burst(e.x + e.w / 2, e.y + e.h / 2, "#7ff1ba", 24);
        floatText("破击", e.x, e.y, "#7ff1ba");
      } else {
        hurt(1);
      }
    }

    if (save.selected === "yuan" && player.skillTimer > 0) {
      for (const p of activeLevel.platforms) {
        if (p.type === "breakable" && !p.broken && rectsOverlap(bodyRect(player), p)) {
          p.broken = true;
          player.vx *= 0.55;
          player.skillTimer = Math.min(player.skillTimer, 0.06);
          camera.shake = 11;
          burst(p.x + p.w / 2, p.y + p.h / 2, "#ffbe66", 30);
          floatText("碎晶", p.x, p.y, "#ffbe66");
        }
      }
    }

    if (player.y > activeLevel.height + 260) hurt(3, true);
    if (!player.completed && rectsOverlap(bodyRect(player), activeLevel.goal)) completeLevel();
    consumePressed();
  }

  function moveToward(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    if (value > target) return Math.max(target, value - amount);
    return value;
  }

  function updatePlayerSize() {
    const targetW = player.bigTimer > 0 ? 43 : player.baseW;
    const targetH = player.bigTimer > 0 ? 72 : player.baseH;
    if (player.w === targetW && player.h === targetH) return;
    const snapshot = { x: player.x, y: player.y, w: player.w, h: player.h };
    const oldBottom = player.y + player.h;
    const oldCenter = player.x + player.w / 2;
    player.w = targetW;
    player.h = targetH;
    player.x = clamp(oldCenter - player.w / 2, 0, activeLevel.width - player.w);
    player.y = oldBottom - player.h;
    const blocked = allSolids().some((p) => !p.broken && rectsOverlap(bodyRect(player), p));
    if (blocked && (targetW > snapshot.w || targetH > snapshot.h)) {
      Object.assign(player, snapshot);
    }
  }

  function shootProjectile() {
    const ch = characters[save.selected];
    if (player.shootCd > 0 || player.ammo <= 0) return;
    player.shootCd = player.ammoTimer > 0 ? 0.12 : save.selected === "nini" ? 0.22 : 0.34;
    player.ammo -= 1;
    player.ammoRegen = 0;
    const pierce = ch.projectilePierce + (player.ammoTimer > 0 ? 1 : 0);
    const speed = ch.projectileSpeed * (player.ammoTimer > 0 ? 1.15 : 1);
    projectiles.push({
      x: player.x + player.w / 2 + player.facing * 22,
      y: player.y + player.h * 0.42,
      w: save.selected === "nini" ? 18 : 24,
      h: save.selected === "nini" ? 14 : 18,
      vx: player.facing * speed,
      vy: save.selected === "nini" ? -22 : 0,
      life: 1.25,
      owner: save.selected,
      pierce,
      damage: ch.projectileDamage + (player.ammoTimer > 0 ? 1 : 0),
      color: player.ammoTimer > 0 ? "#fff2a6" : ch.accent2,
    });
    burst(player.x + player.w / 2 + player.facing * 18, player.y + player.h * 0.42, ch.accent2, 8);
    beep(save.selected === "nini" ? 860 : 520, 0.035);
  }

  function bodyRect(p) {
    return { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 3 };
  }

  function pickupRect(p) {
    return {
      x: p.x - PICKUP_REACH_X,
      y: p.y - PICKUP_REACH_TOP,
      w: p.w + PICKUP_REACH_X * 2,
      h: p.h + PICKUP_REACH_TOP + PICKUP_REACH_BOTTOM,
    };
  }

  function dashShouldStopAtEdge() {
    if (!player.onGround || inputs.jump || player.vy < -40) return false;
    const probe = {
      x: player.dashDir > 0 ? player.x + player.w + 8 : player.x - 26,
      y: player.y + player.h + 4,
      w: 18,
      h: 8,
    };
    return !allSolids().some((p) => !p.broken && rectsOverlap(probe, p));
  }

  function activeWindZone(rect) {
    let zone = null;
    for (const w of activeLevel.wind) {
      if (!rectsOverlap(rect, w)) continue;
      if (!zone || Math.abs(w.force) > Math.abs(zone.force)) zone = w;
    }
    return zone;
  }

  function moveAxis(axis, amount) {
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / 14));
    const step = amount / steps;
    for (let i = 0; i < steps; i += 1) moveAxisStep(axis, step);
  }

  function moveAxisStep(axis, amount) {
    player[axis] += amount;
    let groundedByPlatform = null;
    for (const p of allSolids()) {
      if (p.broken || !rectsOverlap(bodyRect(player), p)) continue;
      if (axis === "x") {
        if (amount > 0) player.x = p.x - player.w + 3;
        if (amount < 0) player.x = p.x + p.w - 3;
        player.vx = 0;
      } else {
        if (amount > 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.coyote = 0.12;
          player.airJumps = characters[save.selected].airJumps;
          groundedByPlatform = p;
        }
        if (amount < 0) {
          player.y = p.y + p.h - 3;
          player.vy = Math.max(0, player.vy);
        }
      }
    }
    if (axis === "y" && amount >= 0 && !groundedByPlatform) {
      const foot = { x: player.x + 5, y: player.y + player.h + 2, w: player.w - 10, h: 4 };
      player.onGround = allSolids().some((p) => !p.broken && rectsOverlap(foot, p));
    }
    if (groundedByPlatform && "dx" in groundedByPlatform) {
      player.x += groundedByPlatform.dx;
      player.y += groundedByPlatform.dy;
    }
    player.x = clamp(player.x, 0, activeLevel.width - player.w);
  }

  function updateProjectiles(dt) {
    for (const pr of projectiles) {
      pr.life -= dt;
      if (pr.owner === "nini") {
        const nearest = nearestEnemy(pr);
        if (nearest) pr.vy = lerp(pr.vy, clamp((nearest.y + nearest.h / 2 - pr.y) * 4, -180, 180), 0.035);
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      for (const p of allSolids()) {
        if (p.broken || !rectsOverlap(pr, p)) continue;
        if (p.type === "breakable" && (pr.owner === "yuan" || pr.damage > 2)) {
          p.broken = true;
          pr.life = 0;
          burst(p.x + p.w / 2, p.y + p.h / 2, "#ffbe66", 22);
          floatText("碎晶", p.x, p.y, "#ffbe66");
        } else {
          pr.life = 0;
        }
      }
      for (const e of activeLevel.enemies) {
        if (!e.alive || pr.life <= 0 || !rectsOverlap(pr, e)) continue;
        e.hp = (e.hp || (e.type === "ember" ? 3 : 2)) - pr.damage;
        burst(e.x + e.w / 2, e.y + e.h / 2, pr.color, 14);
        if (e.hp <= 0) {
          e.alive = false;
          player.coins += 2 + pr.damage;
          floatText(`+${2 + pr.damage}`, e.x, e.y, "#ffd36d");
        }
        if (pr.pierce > 0) pr.pierce -= 1;
        else pr.life = 0;
      }
    }
    projectiles = projectiles.filter((pr) => pr.life > 0 && pr.x > camera.x - 160 && pr.x < camera.x + view.w + 260);
  }

  function nearestEnemy(pr) {
    let best = null;
    let bestDist = 999999;
    for (const e of activeLevel.enemies) {
      if (!e.alive || Math.sign(e.x - pr.x) !== Math.sign(pr.vx)) continue;
      const d = Math.abs(e.x - pr.x) + Math.abs(e.y - pr.y) * 1.5;
      if (d < bestDist && d < 420) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  function updateEnemies(dt) {
    for (const e of activeLevel.enemies) {
      if (!e.alive) continue;
      e.phase += dt;
      if (e.type === "wisp") {
        e.y = e.baseY + Math.sin(e.phase * 4) * WISP_HOVER_RANGE;
        e.x += e.vx * dt;
        if (Math.abs(e.x - e.baseX) > e.patrol) {
          e.x = e.baseX + Math.sign(e.x - e.baseX) * e.patrol;
          e.vx *= -1;
        }
        continue;
      }

      const support = enemySupportPlatform(e);
      if (!support) {
        e.vx *= -1;
        continue;
      }

      e.y = support.y - e.h;
      const minX = support.x + 3;
      const maxX = support.x + support.w - e.w - 3;
      if (maxX <= minX) {
        e.x = clamp(e.x, support.x, support.x + Math.max(0, support.w - e.w));
        continue;
      }
      let nextX = e.x + e.vx * dt;
      if (nextX < minX || nextX > maxX) {
        nextX = clamp(nextX, minX, maxX);
        e.vx *= -1;
      }
      e.x = nextX;
      e.y = support.y - e.h;
    }
  }

  function enemySupportPlatform(e) {
    const probe = { x: e.x + 4, y: e.y + e.h - 2, w: e.w - 8, h: TILE + 4 };
    let support = null;
    for (const p of allSolids()) {
      if (p.broken || p.y < e.y + e.h - 3 || !rectsOverlap(probe, p)) continue;
      if (!support || p.y < support.y) support = p;
    }
    return support;
  }

  function updatePickups() {
    const reach = pickupRect(player);
    for (const c of activeLevel.coins) {
      if (c.taken || !rectsOverlap(reach, c)) continue;
      c.taken = true;
      const amount = c.kind === "gem" ? 5 : 1;
      player.coins += amount;
      if (c.kind === "gem") player.gems += 1;
      floatText(`+${amount}`, c.x, c.y, c.kind === "gem" ? "#8cf6ff" : "#ffd36d");
      burst(c.x + 10, c.y + 10, c.kind === "gem" ? "#8cf6ff" : "#ffd36d", c.kind === "gem" ? 18 : 9);
      beep(c.kind === "gem" ? 920 : 720, 0.035);
    }
    for (const p of activeLevel.powerups || []) {
      if (p.taken || !rectsOverlap(reach, p)) continue;
      p.taken = true;
      applyPowerup(p.kind);
    }
  }

  function applyPowerup(kind) {
    const labels = {
      berry: "星莓：身体变大，生命上限提升",
      moon: "月糖：短时间无敌",
      core: "晶核：弹药强化",
      bell: "风铃果：技能冷却刷新",
      heart: "生命包：生命恢复",
    };
    if (kind === "berry") {
      player.bigTimer = 20;
      player.maxHealth = Math.max(player.maxHealth, 4);
      player.health = Math.min(player.maxHealth, player.health + 1);
    }
    if (kind === "moon") {
      player.superInvuln = 8;
      player.invuln = Math.max(player.invuln, 8);
    }
    if (kind === "core") {
      player.ammoTimer = 12;
      player.ammo = Math.min(24, player.ammo + 8);
    }
    if (kind === "bell") {
      player.boostTimer = 15;
      player.skillCd = 0;
      player.ammo = Math.min(24, player.ammo + 4);
    }
    if (kind === "heart") {
      player.health = Math.min(player.maxHealth, player.health + 1);
    }
    burst(player.x + player.w / 2, player.y + player.h / 2, powerupColor(kind), 28);
    toastMsg(labels[kind] || "获得强化");
    beep(980, 0.075);
  }

  function hurt(damage, forceRespawn = false) {
    if (player.superInvuln > 0 && !forceRespawn) {
      camera.shake = Math.max(camera.shake, 5);
      burst(player.x + player.w / 2, player.y + player.h / 2, "#fff2a6", 12);
      return;
    }
    if (player.invuln > 0 && !forceRespawn) return;
    player.health -= damage;
    player.invuln = 1.1;
    player.hurtFlash = 0.3;
    player.vx = -player.facing * 360;
    player.vy = -540;
    camera.shake = 13;
    burst(player.x + player.w / 2, player.y + player.h / 2, "#ff5c7a", 24);
    beep(180, 0.08);
    if (player.health <= 0 || forceRespawn) {
      if (player.health <= 0) {
        openModal("再试一次", "星光暂时黯淡，但路线已经记住了。", [
          ["重新挑战", () => startLevel(currentLevelIndex), "primary"],
          ["返回菜单", backToMenu],
        ], "挑战失败");
      } else {
        respawn();
      }
    }
  }

  function respawn() {
    player.x = player.spawn.x;
    player.y = player.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.invuln = 1.2;
    player.skillTimer = 0;
    player.glide = 0;
    player.dashDir = player.facing;
    camera.shake = 9;
  }

  function completeLevel() {
    player.completed = true;
    const id = activeLevel.id;
    const prev = save.bestTimes[id];
    if (!prev || player.elapsed < prev) save.bestTimes[id] = player.elapsed;
    save.unlocked = Math.max(save.unlocked, currentLevelIndex + 2);
    save.totalCoins += player.coins;
    save.levelStars[id] = Math.max(save.levelStars[id] || 0, starCount());
    persist();
    burst(activeLevel.goal.x + 35, activeLevel.goal.y + 50, "#ffe46b", 80);
    beep(980, 0.1);
    openModal(
      "通关完成",
      `${activeLevel.name} 已通关。获得星露 ${player.coins}，评级 ${"★".repeat(starCount())}${"☆".repeat(3 - starCount())}。`,
      [
        currentLevelIndex < levels.length - 1 ? ["下一章", () => startLevel(currentLevelIndex + 1), "primary"] : ["回到菜单", backToMenu, "primary"],
        ["重玩本章", () => startLevel(currentLevelIndex)],
        ["选择关卡", () => { mode = "menu"; modal.classList.remove("active"); showScreen("levels"); }],
      ],
      "胜利"
    );
  }

  function starCount() {
    const ratio = player.coins / activeLevel.coins.reduce((s, c) => s + (c.kind === "gem" ? 5 : 1), 0);
    return ratio > 0.82 ? 3 : ratio > 0.52 ? 2 : 1;
  }

  function updateCamera(dt) {
    const targetX = clamp(player.x - view.w * 0.38, 0, Math.max(0, activeLevel.width - view.w));
    const targetY = clamp(player.y - view.h * 0.55, 0, Math.max(0, activeLevel.height - view.h));
    camera.x = lerp(camera.x, targetX, 1 - Math.pow(0.001, dt));
    camera.y = lerp(camera.y, targetY, 1 - Math.pow(0.001, dt));
    camera.shake = Math.max(0, camera.shake - 35 * dt);
  }

  function render() {
    ctx.clearRect(0, 0, view.w, view.h);
    if (!activeLevel) {
      renderAttract();
      return;
    }
    const shakeX = camera.shake ? snap((Math.random() - 0.5) * camera.shake) : 0;
    const shakeY = camera.shake ? snap((Math.random() - 0.5) * camera.shake) : 0;
    const camX = snap(camera.x);
    const camY = snap(camera.y);
    renderBackground(activeLevel, camX, camY);
    ctx.save();
    ctx.translate(-camX + shakeX, -camY + shakeY);
    renderWorld(activeLevel);
    renderParticles();
    renderPlayer();
    renderFloatTexts();
    ctx.restore();
    if (mode !== "play") renderVignette();
  }

  function renderAttract() {
    const t = performance.now() / 1000;
    const grd = ctx.createLinearGradient(0, 0, view.w, view.h);
    grd.addColorStop(0, "#16213d");
    grd.addColorStop(0.56, "#25395f");
    grd.addColorStop(1, "#101426");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, view.w, view.h);
    drawSkyMotifs(t, 0.3);
    renderVignette();
  }

  function renderBackground(level, camX, camY) {
    const p = level.palette;
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    g.addColorStop(0, p[0]);
    g.addColorStop(0.52, p[1]);
    g.addColorStop(1, "#101220");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    drawSkyMotifs(performance.now() / 1000, save.settings.fx ? 1 : 0.4);

    for (let layer = 0; layer < 3; layer++) {
      const depth = [0.13, 0.25, 0.42][layer];
      const baseY = view.h * (0.55 + layer * 0.12) - camY * depth;
      ctx.beginPath();
      ctx.moveTo(-80, view.h);
      for (let x = -120; x < view.w + 160; x += 120) {
        const wx = x + (camX * depth) % 120;
        const peak = baseY + Math.sin((x + layer * 200) * 0.02) * 28;
        ctx.lineTo(wx + 60, peak - 90 - layer * 20);
        ctx.lineTo(wx + 130, baseY + 20);
      }
      ctx.lineTo(view.w + 100, view.h);
      ctx.closePath();
      ctx.fillStyle = `rgba(${layer === 0 ? "255,255,255" : "23,33,62"}, ${0.1 + layer * 0.12})`;
      ctx.fill();
    }
  }

  function drawSkyMotifs(t, intensity) {
    ctx.save();
    ctx.globalAlpha = 0.55 * intensity;
    for (let i = 0; i < 26; i++) {
      const x = (i * 173 + t * 16 * (i % 3 + 1)) % (view.w + 160) - 80;
      const y = (i * 83) % Math.max(220, view.h * 0.6);
      const r = 1.5 + (i % 5) * 0.7;
      ctx.fillStyle = i % 4 === 0 ? "#ffd36d" : "#dff9ff";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.16 * intensity;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 420 - t * 36) % (view.w + 360)) - 120;
      const y = 120 + i * 70;
      ctx.fillStyle = i % 2 ? "#ff7fb1" : "#61e5ff";
      ellipse(x, y, 170, 28, 0);
    }
    ctx.restore();
  }

  function renderWorld(level) {
    for (const w of level.wind || []) drawWind(w);
    drawGoal(level.goal);
    for (const p of level.platforms) if (!p.broken) drawPlatform(p);
    for (const m of level.moving) drawPlatform(m);
    for (const h of level.hazards) drawHazard(h);
    for (const s of level.springs) drawSpring(s);
    for (const c of level.coins) if (!c.taken) drawCoin(c);
    for (const p of level.powerups || []) if (!p.taken) drawPowerup(p);
    for (const pr of projectiles) drawProjectile(pr);
    for (const e of level.enemies) if (e.alive) drawEnemy(e);
  }

  function drawPlatform(p) {
    const colors = {
      ground: ["#2d4a4f", "#17252d"],
      grass: ["#6cdfa1", "#1f6c64"],
      stone: ["#93d9ff", "#284b74"],
      cloud: ["#f1fbff", "#8cc8e9"],
      crystal: ["#8cf6d5", "#613e78"],
      breakable: ["#ffbf68", "#6a3d44"],
      aurora: ["#c2b1ff", "#30478c"],
      jade: ["#78f0bd", "#21546a"],
    };
    const c = colors[p.type] || colors.ground;
    const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    g.addColorStop(0, c[0]);
    g.addColorStop(1, c[1]);
    roundRect(p.x, p.y, p.w, p.h, 8, g);
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, Math.min(10, p.h - 2));
    if (p.type === "breakable") {
      ctx.strokeStyle = "rgba(90,50,45,.35)";
      for (let x = p.x + 16; x < p.x + p.w; x += 38) {
        ctx.beginPath();
        ctx.moveTo(x, p.y + 8);
        ctx.lineTo(x + 14, p.y + p.h - 10);
        ctx.stroke();
      }
    }
  }

  function drawHazard(h) {
    ctx.fillStyle = h.type === "lava" ? "#ff6a36" : "#dff7ff";
    if (h.type === "lava") {
      roundRect(h.x, h.y + h.h * 0.25, h.w, h.h * 0.75, 4, "#d43f31");
      ctx.fillStyle = "#ffd36d";
      for (let x = h.x; x < h.x + h.w; x += 24) {
        ctx.beginPath();
        ctx.arc(x + 12, h.y + 18 + Math.sin(performance.now() / 170 + x) * 3, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    for (let x = h.x; x < h.x + h.w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, h.y + h.h);
      ctx.lineTo(x + 12, h.y + 8);
      ctx.lineTo(x + 24, h.y + h.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSpring(s) {
    roundRect(s.x + 5, s.y + 8, s.w - 10, s.h, 6, "#ffe46b");
    ctx.strokeStyle = "#f06f9f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.x + 12, s.y + 20);
    ctx.lineTo(s.x + 24, s.y + 8);
    ctx.lineTo(s.x + 36, s.y + 20);
    ctx.lineTo(s.x + 48, s.y + 8);
    ctx.stroke();
  }

  function drawCoin(c) {
    const t = performance.now() / 240;
    const bob = Math.sin(t + c.x) * 5;
    ctx.save();
    ctx.translate(c.x + 11, c.y + 11 + bob);
    ctx.scale(Math.abs(Math.cos(t)) * 0.55 + 0.45, 1);
    const grd = ctx.createRadialGradient(-4, -5, 2, 0, 0, 16);
    grd.addColorStop(0, "#fff9c5");
    grd.addColorStop(1, c.kind === "gem" ? "#61e5ff" : "#ffb84d");
    ctx.fillStyle = grd;
    ctx.beginPath();
    if (c.kind === "gem") {
      ctx.moveTo(0, -14); ctx.lineTo(13, -2); ctx.lineTo(7, 14); ctx.lineTo(-7, 14); ctx.lineTo(-13, -2);
    } else {
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function powerupColor(kind) {
    return {
      berry: "#ff7fb1",
      moon: "#fff2a6",
      core: "#8cf6ff",
      bell: "#7ff1ba",
      heart: "#ff5c7a",
    }[kind] || "#ffd36d";
  }

  function drawPowerup(p) {
    const t = performance.now() / 280;
    const color = powerupColor(p.kind);
    const bob = Math.sin(t + p.x) * 5;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + bob);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (p.kind === "berry") {
      ctx.arc(0, 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7ff1ba";
      ellipse(8, -10, 7, 4, -0.4);
    } else if (p.kind === "moon") {
      ctx.arc(1, 0, 14, 0.55, Math.PI * 1.65);
      ctx.arc(-4, -2, 12, Math.PI * 1.67, 0.5, true);
      ctx.fill();
    } else if (p.kind === "core") {
      ctx.moveTo(0, -16); ctx.lineTo(15, 0); ctx.lineTo(0, 16); ctx.lineTo(-15, 0);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.lineTo(8, 12); ctx.lineTo(-8, 12);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#fff7d1";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 19); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawProjectile(pr) {
    ctx.save();
    ctx.translate(pr.x + pr.w / 2, pr.y + pr.h / 2);
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = pr.color;
    if (pr.owner === "nini") {
      ctx.rotate(performance.now() / 120);
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + i * Math.PI * 0.8;
        const r = i % 2 ? 5 : 12;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ellipse(0, 0, 15, 7, 0);
      ctx.fillStyle = "rgba(255,255,255,.72)";
      ellipse(5, -2, 5, 2, 0);
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.type === "wisp") {
      drawWispEnemy(e);
      return;
    }
    drawGroundEnemy(e);
  }

  function drawGroundEnemy(e) {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    const footY = e.h / 2;
    const color = e.type === "ember" ? "#ff855f" : "#a5f0a1";
    ctx.fillStyle = "rgba(0,0,0,.26)";
    ellipse(0, footY + 1, e.w * 0.46, 4, 0);
    ctx.fillStyle = e.type === "ember" ? "#b84c3f" : "#5fae72";
    ellipse(-9, footY - 1, 6, 4, 0);
    ellipse(9, footY - 1, 6, 4, 0);
    ctx.fillStyle = color;
    ellipse(0, 2, e.w * 0.55, e.h * 0.45, 0);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ellipse(-8, -4, 5, 6, 0);
    ellipse(8, -4, 5, 6, 0);
    ctx.fillStyle = "#1b2433";
    ellipse(-8 + Math.sign(e.vx) * 1.5, -3, 2, 3, 0);
    ellipse(8 + Math.sign(e.vx) * 1.5, -3, 2, 3, 0);
    ctx.restore();
  }

  function drawWispEnemy(e) {
    const phase = e.phase || 0;
    const dir = Math.sign(e.vx) || 1;
    const footY = e.h / 2;
    const hoverOffset = Math.sin(phase * 4) * WISP_HOVER_RANGE;
    const wingLift = Math.sin(phase * 11) * 3;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#8cf6ff";
    ellipse(0, footY + WISP_FLOAT_GAP - hoverOffset + 2, e.w * 0.34, 3.5, 0);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(140,246,255,.46)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      const y = 8 + i * 4;
      ctx.globalAlpha = 0.42 - i * 0.08;
      ctx.beginPath();
      ctx.moveTo(-dir * 4, y - i);
      ctx.quadraticCurveTo(-dir * (14 + i * 5), y + Math.sin(phase * 6 + i) * 4, -dir * (24 + i * 4), y - 5);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.48;
    ctx.fillStyle = "rgba(158,231,255,.72)";
    ellipse(-15, -2 - wingLift, 10, 17, -0.7);
    ellipse(15, -2 + wingLift, 10, 17, 0.7);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ellipse(-12, -7 - wingLift * 0.5, 3, 8, -0.7);
    ellipse(12, -7 + wingLift * 0.5, 3, 8, 0.7);

    ctx.globalAlpha = 1;
    ctx.shadowColor = "#8cf6ff";
    ctx.shadowBlur = 16;
    const core = ctx.createRadialGradient(-4, -6, 2, 0, 0, 20);
    core.addColorStop(0, "#f6feff");
    core.addColorStop(0.45, "#8cf6ff");
    core.addColorStop(1, "#2f9fd0");
    ctx.fillStyle = core;
    ellipse(0, 0, e.w * 0.38, e.h * 0.44, 0);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,.82)";
    ellipse(-5, -6, 3, 4, 0);
    ellipse(5, -6, 3, 4, 0);
    ctx.fillStyle = "#143047";
    ellipse(-5 + dir, -5, 1.4, 2.2, 0);
    ellipse(5 + dir, -5, 1.4, 2.2, 0);
    ctx.strokeStyle = "rgba(246,254,255,.72)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(5, -3);
    ctx.lineTo(0, 11);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawGoal(g) {
    const t = performance.now() / 1000;
    ctx.save();
    ctx.translate(g.x + g.w / 2, g.y + g.h / 2);
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ["#61e5ff", "#ffd36d", "#ff7fb1", "#7ff1ba"][i];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 28 + i * 9, 55 + Math.sin(t + i) * 4, t * 0.4 + i, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, 68);
    grd.addColorStop(0, "#fff5bd");
    grd.addColorStop(0.45, "#61e5ff");
    grd.addColorStop(1, "rgba(97,229,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWind(w) {
    const t = performance.now() / 300;
    const dir = Math.sign(w.force) || 1;
    const arrowPhase = (t * WIND_ARROW_SPEED) % WIND_ARROW_SPACING;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#d9fbff";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#d9fbff";
    ctx.lineWidth = 3;
    for (let y = w.y + 80; y < w.y + w.h; y += 92) {
      ctx.beginPath();
      for (let x = w.x; x < w.x + w.w; x += 42) {
        const yy = y + Math.sin((x + t * w.force) * 0.025) * 18;
        if (x === w.x) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.76;
    ctx.fillStyle = "#f2fbff";
    ctx.strokeStyle = "rgba(17,66,92,.34)";
    ctx.lineWidth = 2;
    for (let y = w.y + 72; y < w.y + w.h; y += 110) {
      for (let i = -1; i <= Math.ceil(w.w / WIND_ARROW_SPACING) + 1; i += 1) {
        const localX = i * WIND_ARROW_SPACING + (dir > 0 ? arrowPhase : -arrowPhase);
        const px = w.x + localX;
        if (px < w.x + 14 || px > w.x + w.w - 14) continue;
        const bob = Math.sin(t * 2 + y * 0.04) * 7;
        ctx.beginPath();
        ctx.moveTo(px + dir * 17, y + bob);
        ctx.lineTo(px - dir * 9, y - 12 + bob);
        ctx.lineTo(px - dir * 4, y + bob);
        ctx.lineTo(px - dir * 9, y + 12 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function renderPlayer() {
    if (!player) return;
    if (player.invuln > 0 && Math.floor(player.invuln * 16) % 2 === 0) return;
    if (player.superInvuln > 0) {
      ctx.save();
      ctx.globalAlpha = 0.42 + Math.sin(performance.now() / 90) * 0.12;
      ctx.strokeStyle = "#fff2a6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.92, player.h * 0.66, performance.now() / 500, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawCharacterArt(save.selected, snap(player.x + player.w / 2), snap(player.y + player.h), player.facing, 0.72 * (player.h / player.baseH), {
      vx: player.vx,
      vy: player.vy,
      onGround: player.onGround,
      turnTimer: player.turnTimer,
    });
  }

  function drawCharacterArt(id, x, y, facing, scale, pose = null) {
    if (drawCharacterSprite(id, x, y, facing, scale, pose)) return;
    const ch = characters[id];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);
    const bob = Math.sin(performance.now() / 120) * 1.2;
    ctx.translate(0, bob);
    ctx.shadowColor = ch.accent;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ellipse(0, 4, 28, 7, 0);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = id === "nini" ? "#4b2d62" : "#203963";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-12, -48); ctx.lineTo(-24, -18);
    ctx.moveTo(12, -48); ctx.lineTo(24, -18);
    ctx.stroke();

    const outfit = ctx.createLinearGradient(0, -62, 0, -10);
    outfit.addColorStop(0, ch.accent);
    outfit.addColorStop(1, id === "nini" ? "#7f5bff" : "#206f9c");
    ctx.fillStyle = outfit;
    roundRect(-18, -68, 36, 50, 14, outfit);
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath();
    ctx.moveTo(-12, -62); ctx.quadraticCurveTo(0, -49, 12, -62); ctx.lineTo(9, -54); ctx.quadraticCurveTo(0, -46, -9, -54);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#ffe0c9";
    ellipse(0, -90, 22, 24, 0);
    ctx.fillStyle = id === "nini" ? "#2b214f" : "#172b59";
    ellipse(-2, -100, 27, 20, -0.15);
    ctx.beginPath();
    ctx.moveTo(-25, -96); ctx.quadraticCurveTo(-38, -74, -21, -63); ctx.lineTo(-6, -84); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -99); ctx.quadraticCurveTo(35, -84, 18, -66); ctx.lineTo(6, -85); ctx.fill();

    ctx.fillStyle = "#fff7f0";
    ellipse(-8, -91, 4, 5, 0);
    ellipse(8, -91, 4, 5, 0);
    ctx.fillStyle = id === "nini" ? "#b04e88" : "#246a9c";
    ellipse(-8, -90, 2, 3, 0);
    ellipse(8, -90, 2, 3, 0);
    ctx.strokeStyle = "#a95e57";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -82, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();

    if (id === "nini") {
      ctx.strokeStyle = "#ffe07a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -113, 18, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      ctx.fillStyle = "#ff86bd";
      ellipse(-23, -97, 7, 4, -0.4);
      ellipse(23, -97, 7, 4, 0.4);
    } else {
      ctx.strokeStyle = "#7ff1ba";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-22, -78); ctx.quadraticCurveTo(-42, -58, -25, -33);
      ctx.moveTo(22, -78); ctx.quadraticCurveTo(44, -57, 25, -31);
      ctx.stroke();
    }

    ctx.strokeStyle = "#1d2739";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-9, -20); ctx.lineTo(-14, 0);
    ctx.moveTo(9, -20); ctx.lineTo(14, 0);
    ctx.stroke();

    ctx.strokeStyle = ch.accent2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -56);
    ctx.quadraticCurveTo(0, -47, 14, -56);
    ctx.stroke();

    if (id === "nini") {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#ffd1e6";
      ellipse(-23, -58, 13, 24, -0.35);
      ellipse(23, -58, 13, 24, 0.35);
    } else {
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = "#7ff1ba";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(22, -57); ctx.lineTo(40, -72);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = ch.accent2;
    ellipse(0, -35, 5, 5, 0);
    ctx.restore();
  }

  function drawCharacterSprite(id, x, y, facing, scale, pose = null) {
    const image = characterSprites[id];
    if (!image || !image.complete || !image.naturalWidth) return false;
    const atlas = characterAtlases[id]?.data;
    const animName = characterAnimName(id, pose);
    const sourceFrame = atlasFrame(atlas, animName, image);
    const targetH = (id === "nini" ? 238 : 232) * scale;
    const targetW = targetH * (image.naturalWidth / image.naturalHeight);
    const movement = pose ? clamp((pose.vx || 0) / characters[id].speed, -1, 1) : 0;
    const stride = Math.abs(movement);
    const turning = pose ? clamp((pose.turnTimer || 0) / 0.16, 0, 1) : 0;
    const bob = pose && pose.onGround ? Math.sin(performance.now() / (stride > 0.18 ? 72 : 140)) * (1.2 + stride * 3.2) * scale : 0;
    const airborne = pose && !pose.onGround ? clamp((pose.vy || 0) / 1000, -0.8, 0.8) : 0;
    const lean = movement * 0.07 + facing * Math.sin(turning * Math.PI) * 0.08 + airborne * 0.035;
    const stretchX = 1 + stride * 0.035 + turning * 0.035;
    const stretchY = 1 + (pose && !pose.onGround ? 0.025 : 0) - turning * 0.025;
    const lift = targetH * (id === "nini" ? 0.045 : 0.03);
    ctx.save();
    ctx.translate(snap(x), snap(y + lift + bob));
    ctx.scale(facing, 1);
    ctx.rotate(lean);
    ctx.scale(stretchX, stretchY);
    ctx.shadowColor = characters[id].accent;
    ctx.shadowBlur = 14 * scale;
    ctx.drawImage(
      image,
      sourceFrame.sx,
      sourceFrame.sy,
      sourceFrame.sw,
      sourceFrame.sh,
      -targetW / 2,
      -targetH,
      targetW,
      targetH
    );
    ctx.restore();
    return true;
  }

  function characterAnimName(id, pose) {
    if (!pose) return "idle";
    if (player?.hurtFlash > 0) return "hurt";
    if (id === "nini" && player?.glide > 0) return "skill";
    if (id === "yuan" && player?.skillTimer > 0) return "skill";
    if (!pose.onGround) return pose.vy > 120 ? "fall" : "jump";
    return Math.abs(pose.vx || 0) > characters[id].speed * 0.18 ? "run" : "idle";
  }

  function atlasFrame(atlas, animName, image) {
    if (!atlas?.frame || !atlas.animations) return { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
    const frameW = Number(atlas.frame.w) || image.naturalWidth;
    const frameH = Number(atlas.frame.h) || image.naturalHeight;
    if (frameW <= 1 || frameH <= 1) return { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
    const anim = atlas.animations[animName] || atlas.animations.idle;
    const frames = anim?.frames?.length ? anim.frames : [0];
    const fps = Number(anim.fps) || 1;
    const frame = frames[Math.floor((performance.now() / 1000) * fps) % frames.length];
    const columns = Math.max(1, Math.floor(image.naturalWidth / frameW));
    return {
      sx: (frame % columns) * frameW,
      sy: Math.floor(frame / columns) * frameH,
      sw: frameW,
      sh: frameH,
    };
  }

  function ellipse(x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
    ctx.fill();
  }

  function renderVignette() {
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.2, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function burst(x, y, color, count) {
    if (!save.settings.fx) count = Math.ceil(count * 0.45);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 420;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 2 + Math.random() * 4, life: 0.35 + Math.random() * 0.55, max: 0.9, color });
    }
  }

  function spawnSpark(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: -player.facing * (50 + Math.random() * 120), vy: 80 + Math.random() * 70, r: 2, life: 0.28, max: 0.28, color });
  }

  function spawnWind(x, y, dir) {
    if (!save.settings.fx || Math.random() > 0.28) return;
    particles.push({ x, y, vx: -dir * (70 + Math.random() * 70), vy: -20 + Math.random() * 40, r: 1.5, life: 0.35, max: 0.35, color: "#d9fbff" });
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const f of floatTexts) {
      f.life -= dt;
      f.y -= 46 * dt;
    }
    floatTexts = floatTexts.filter((f) => f.life > 0);
  }

  function renderParticles() {
    ctx.save();
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function floatText(text, x, y, color) {
    floatTexts.push({ text, x, y, color, life: 0.8 });
  }

  function renderFloatTexts() {
    ctx.save();
    ctx.font = "700 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const f of floatTexts) {
      ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function beep(freq, duration) {
    audioBus.beep(freq, duration);
  }

  function updateHud() {
    hudEls.character.textContent = characters[save.selected].name;
    hudEls.health.textContent = heartLabel(player.health, player.maxHealth);
    hudEls.coins.textContent = player.coins;
    hudEls.ammo.textContent = player.ammo;
    hudEls.time.textContent = formatTime(player.elapsed);
    hudEls.status.textContent = statusLabel();
    hudEls.skill.textContent = skillLabel();
    hudEls.skill.classList.toggle("cooling", player.skillCd > 0);
    const progress = clamp((player.x + player.w / 2) / activeLevel.width, 0, 1);
    hudEls.bar.style.width = `${progress * 100}%`;
  }

  function heartLabel(health, maxHealth) {
    const hearts = Math.max(0, Math.ceil(health));
    if (maxHealth > 5 || hearts > 5) return `×${hearts}`;
    return "❤".repeat(hearts) || "0";
  }

  function showChapterIntro() {
    const ch = characters[save.selected];
    introTimer = 2.7;
    hudEls.introEyebrow.textContent = `${currentLevelIndex + 1} / ${levels.length} · ${activeLevel.vibe}`;
    hudEls.introTitle.textContent = activeLevel.name;
    hudEls.introText.textContent = activeLevel.hint;
    Hud.renderChapterIntroMeta(hudEls.introMeta, [
      `${ch.name}：${ch.skillName}`,
      ch.projectileName,
      `${activeLevel.coins.length} 处星露`,
    ]);
    hudEls.intro.classList.add("active");
  }

  function updateChapterIntro(dt) {
    if (introTimer <= 0) return;
    introTimer = Math.max(0, introTimer - dt);
    if (introTimer === 0) hudEls.intro.classList.remove("active");
  }

  function statusLabel() {
    const states = [];
    if (player.windTimer > 0) states.push("风场");
    if (player.bigTimer > 0) states.push(`巨大 ${Math.ceil(player.bigTimer)}`);
    if (player.superInvuln > 0) states.push(`无敌 ${Math.ceil(player.superInvuln)}`);
    if (player.ammoTimer > 0) states.push(`强化 ${Math.ceil(player.ammoTimer)}`);
    if (player.boostTimer > 0) states.push(`疾风 ${Math.ceil(player.boostTimer)}`);
    return states.length ? states.join(" · ") : characters[save.selected].projectileName;
  }

  function skillLabel() {
    if (player.skillCd <= 0) return `技能 ${characters[save.selected].skillName}`;
    return `冷却 ${player.skillCd.toFixed(1)}`;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function toastMsg(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function openModal(title, text, actions, eyebrow = "暂停") {
    mode = "paused";
    document.getElementById("modalEyebrow").textContent = eyebrow;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalText").textContent = text;
    const box = document.getElementById("modalActions");
    if (typeof box.replaceChildren === "function") box.replaceChildren();
    else box.textContent = "";
    for (const [label, fn, type] of actions) {
      const btn = document.createElement("button");
      if (type) btn.className = type;
      btn.textContent = label;
      btn.addEventListener("click", fn);
      box.appendChild(btn);
    }
    modal.classList.add("active");
    hud.classList.remove("active");
    hudEls.intro.classList.remove("active");
    touchControls.classList.remove("playing");
    audioBus.pauseBgm();
  }

  function pauseGame() {
    if (mode !== "play") return;
    const ch = characters[save.selected];
    openModal("暂停", `${activeLevel.name} · ${ch.skillName} · ${ch.projectileName}。键盘：方向/WASD 移动，空格跳跃，J 技能，K 发射。`, [
      ["继续", () => { mode = "play"; modal.classList.remove("active"); hud.classList.add("active"); touchControls.classList.add("playing"); audioBus.playBgm(); }, "primary"],
      ["重新开始", () => startLevel(currentLevelIndex)],
      ["返回菜单", backToMenu],
    ]);
  }

  function backToMenu() {
    mode = "menu";
    activeLevel = null;
    player = null;
    introTimer = 0;
    hudEls.intro.classList.remove("active");
    modal.classList.remove("active");
    audioBus.pauseBgm();
    showScreen("menu");
  }

  function renderMenus() {
    document.querySelectorAll(".character-card").forEach((card) => card.classList.toggle("selected", card.dataset.character === save.selected));
    const levelList = document.getElementById("levelList");
    Hud.renderSaveStrip(document.getElementById("saveStrip"), save, characters, levels);
    Hud.renderLevelList(levelList, { levels, save, startLevel, formatTime });
    document.getElementById("volumeRange").value = save.settings.volume;
    document.getElementById("bgmRange").value = save.settings.bgmVolume;
    document.getElementById("touchRange").value = save.settings.touch;
    document.getElementById("fxToggle").checked = save.settings.fx;
    document.documentElement.style.setProperty("--touch-size", `${save.settings.touch}px`);
  }

  function bindUi() {
    document.addEventListener("click", (e) => {
      const action = e.target?.dataset?.action;
      if (!action) return;
      if (action === "play") startLevel(Math.min(save.unlocked - 1, levels.length - 1));
      if (action === "levels") showScreen("levels");
      if (action === "characters") showScreen("characters");
      if (action === "settings") showScreen("settings");
      if (action === "back") showScreen("menu");
      if (action === "pause") pauseGame();
      if (action === "reset" && confirm("确定清除所有本地存档？")) {
        save = Storage.cloneDefaultSave();
        const stored = persist();
        renderMenus();
        if (stored) toastMsg("存档已清除");
      }
    });
    document.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        save.selected = btn.dataset.pick;
        const stored = persist();
        renderMenus();
        if (stored) toastMsg(`已选择 ${characters[save.selected].name}`);
      });
    });
    document.getElementById("volumeRange").addEventListener("input", (e) => {
      save.settings.volume = Number(e.target.value);
      audioBus.syncBgmVolume();
      persist();
    });
    document.getElementById("bgmRange").addEventListener("input", (e) => {
      save.settings.bgmVolume = Number(e.target.value);
      audioBus.syncBgmVolume();
      persist();
    });
    document.getElementById("touchRange").addEventListener("input", (e) => {
      save.settings.touch = Number(e.target.value);
      document.documentElement.style.setProperty("--touch-size", `${save.settings.touch}px`);
      persist();
    });
    document.getElementById("fxToggle").addEventListener("change", (e) => {
      save.settings.fx = e.target.checked;
      persist();
    });
  }

  function bindControls() {
    window.addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") pauseGame();
      if (!keys[e.code]) {
        if (["Space", "ArrowUp", "KeyW"].includes(e.code)) inputs.jumpPressed = true;
        if (["KeyJ", "ShiftLeft", "ShiftRight"].includes(e.code)) inputs.skillPressed = true;
        if (["KeyK", "Enter"].includes(e.code)) inputs.shootPressed = true;
      }
      keys[e.code] = true;
    }, { passive: false });
    window.addEventListener("keyup", (e) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) inputs.jumpReleased = true;
      keys[e.code] = false;
    });

    const touchState = new Map();
    const hapticTouches = new Set(["jump", "skill", "shoot"]);
    for (const btn of document.querySelectorAll("[data-touch]")) {
      const name = btn.dataset.touch;
      const down = (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        touchState.set(e.pointerId, name);
        if (!keys[name] && name === "jump") inputs.jumpPressed = true;
        if (!keys[name] && name === "skill") inputs.skillPressed = true;
        if (!keys[name] && name === "shoot") inputs.shootPressed = true;
        keys[name] = true;
        if (hapticTouches.has(name)) haptic();
        btn.classList.add("active");
      };
      const up = (e) => {
        e.preventDefault();
        if (touchState.get(e.pointerId) === name) {
          if (name === "jump") inputs.jumpReleased = true;
          keys[name] = false;
          touchState.delete(e.pointerId);
          btn.classList.remove("active");
        }
      };
      btn.addEventListener("pointerdown", down, { passive: false });
      btn.addEventListener("pointerup", up, { passive: false });
      btn.addEventListener("pointercancel", up, { passive: false });
      btn.addEventListener("pointerleave", up, { passive: false });
    }
    window.addEventListener("blur", () => { keys = Object.create(null); });
  }

  function haptic(duration = 8) {
    try {
      if ("vibrate" in navigator) navigator.vibrate(duration);
    } catch {
      // Haptics are optional and unavailable on many desktop browsers.
    }
  }

  function handleVisibilityChange() {
    pageHidden = document.hidden === true;
    keys = Object.create(null);
    accumulator = 0;
    last = performance.now();
    if (pageHidden) audioBus.suspend();
    else audioBus.resume();
  }

  function registerServiceWorker() {
    const localHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!("serviceWorker" in navigator) || (location.protocol !== "https:" && !localHost)) return;
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  function loop(now) {
    if (pageHidden) {
      last = now;
      accumulator = 0;
      render();
      requestAnimationFrame(loop);
      return;
    }
    const frameDt = clamp((now - last) / 1000, 0, 0.08);
    last = now;
    accumulator = Math.min(accumulator + frameDt, FIXED_DT * 4);
    while (accumulator >= FIXED_DT) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    render();
    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", () => {
      pageHidden = true;
      accumulator = 0;
      audioBus.suspend();
    });
    window.addEventListener("pageshow", handleVisibilityChange);
    bindUi();
    bindControls();
    registerServiceWorker();
    showScreen("menu");
    requestAnimationFrame(loop);
  }

  init();
})();
