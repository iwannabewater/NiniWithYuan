(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const shell = document.getElementById("shell");
  const screens = {
    menu: document.getElementById("menu"),
    characters: document.getElementById("characterScreen"),
    levels: document.getElementById("levelScreen"),
    settings: document.getElementById("settingsScreen"),
  };
  const hud = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  const touchControls = document.getElementById("touchControls");
  const rotatePrompt = document.getElementById("rotatePrompt");
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
  const InputState = window.NiniInputState;
  const Rules = window.NiniRules;
  const FixedStep = window.NiniFixedStep;
  const Hud = window.NiniYuanHud;
  const CharacterMotion = window.NiniYuanCharacterMotion;
  const Playfield = window.NiniYuanPlayfieldMaterial;
  const GameFeel = window.NiniYuanGameFeel;
  const RespawnVeil = window.NiniYuanRespawnVeil;
  const TILE = 48;
  const PICKUP_REACH_X = 10;
  const PICKUP_REACH_TOP = 46;
  const PICKUP_REACH_BOTTOM = 16;
  const YUAN_DASH_SPEED = 820;
  const YUAN_DASH_TIME = 0.18;
  const YUAN_DASH_MIN_DISTANCE = 130;
  const YUAN_DASH_MAX_DISTANCE = 170;
  const NINI_GLIDE_DURATION = 1.25;
  const NINI_GLIDE_FALL_SPEED = 190;
  const NINI_GLIDE_MIN_TAP = 0.12;
  const TURN_POSE_DURATION = 0.1;
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
  const PORTAL_COOLDOWN = 0.34;
  const PHASE_DEFAULT_PERIOD = 3.2;
  const PHASE_WARNING_DEFAULT = 0.45;
  const ENEMY_HIT_FLASH_DURATION = 0.18;
  const SUPER_GUARD_FEEDBACK_COOLDOWN = 0.18;
  const SETTINGS_PERSIST_DELAY = 150;
  const ACCESSIBLE_TOUCH_HOLD = 140;
  const CANVAS_FONT_FAMILY = '"LXGW WenKai Local", "LXGW WenKai", "Noto Serif SC", "Noto Sans SC", "PingFang SC", sans-serif';
  const CANVAS_MATERIAL = Playfield.MATERIAL;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const snap = (n) => Math.round(n);
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  let view = { w: 1280, h: 720, dpr: 1, isMobileLandscape: false, reducedMotion: false };
  let screen = "menu";
  let mode = "menu";
  let currentLevelIndex = 0;
  let activeLevel = null;
  let player = null;
  let camera = { x: 0, y: 0, shake: 0, lookX: 0, lookY: 0 };
  let presentation = {
    ready: false,
    playerX: 0,
    playerY: 0,
    cameraX: 0,
    cameraY: 0,
    snapPlayer: false,
    snapCamera: false,
    motionState: { name: "idle", enteredAt: 0 },
    resolvedMotionPose: null,
    displayMotionPose: null,
    snapMotionPose: true,
  };
  let renderAlpha = 1;
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
  let persistTimer = 0;
  let introTimer = 0;
  let portraitOverride = false;
  let orientationGated = false;
  let projectiles = [];
  // v1.2.4 — track HUD state so we can fire one-shot pulses only on real transitions.
  let hudState = { character: null, cooling: null, phaseCritical: null, values: Object.create(null) };
  const physicalKeys = new Set();
  const suppressedKeys = new Set();
  const actionInputs = InputState.createActionInputState(["left", "right", "jump", "skill", "shoot"]);
  const dialogIsolationState = new Map();

  const characters = {
    nini: {
      id: "nini",
      name: "妮妮",
      subtitle: "璇玑星旅",
      accent: CANVAS_MATERIAL.dustyRose,
      accent2: CANVAS_MATERIAL.agedGold,
      speed: 445,
      accel: 3450,
      jump: 1040,
      gravity: 2250,
      maxFall: 1360,
      skillName: "璇玑星渡",
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
      subtitle: "青衡剑心",
      accent: CANVAS_MATERIAL.phaseBlue,
      accent2: CANVAS_MATERIAL.carvedJade,
      speed: 485,
      accel: 3720,
      jump: 980,
      gravity: 2300,
      maxFall: 1460,
      skillName: "青衡破风",
      projectileName: "青岚弹",
      projectileSpeed: 640,
      projectileDamage: 2,
      projectilePierce: 1,
      airJumps: 0,
      skillCooldown: 0.95,
    },
  };

  const characterSprites = {
    nini: loadSprite("./assets/characters/nini/nini-atlas-v1.png"),
    yuan: loadSprite("./assets/characters/yuan/yuan-atlas-v1.png"),
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

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      persistTimer = 0;
      persist();
    }, SETTINGS_PERSIST_DELAY);
  }

  function flushPersist() {
    if (!persistTimer) return true;
    clearTimeout(persistTimer);
    persistTimer = 0;
    return persist();
  }

  function buildLevels() {
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
        phase: Math.random() * 10,
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

    return [
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
    ];
  }

  function resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const media = typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
    view = {
      w: innerWidth,
      h: innerHeight,
      dpr,
      isMobileLandscape: media ? media("(max-width: 900px) and (orientation: landscape)").matches : false,
      reducedMotion: media ? media("(prefers-reduced-motion: reduce)").matches : false,
    };
    canvas.width = Math.floor(view.w * dpr);
    canvas.height = Math.floor(view.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    syncOrientationGate();
  }

  function syncOrientationGate() {
    const gated = mode === "play"
      && !portraitOverride
      && typeof matchMedia === "function"
      && matchMedia("(pointer: coarse) and (orientation: portrait) and (max-width: 680px)").matches;
    const wasGated = orientationGated;
    orientationGated = gated;
    shell.classList.toggle("portrait-gated", gated);
    syncDialogIsolation();
    if (gated === wasGated) return;
    resetControlState();
    accumulator = 0;
    if (gated) rotatePrompt.querySelector("button")?.focus({ preventScroll: true });
    else if (mode === "play") focusGameplay();
  }

  function syncDialogIsolation() {
    const externalDialog = document.querySelector(".love-letter:not([aria-hidden='true'])");
    const activeDialog = externalDialog || (modal.classList.contains("active")
      ? modal
      : orientationGated
        ? rotatePrompt
        : null);
    for (const surface of [shell, modal, rotatePrompt]) {
      setDialogSurfaceInert(surface, !!activeDialog && surface !== activeDialog);
    }
    setDialogSurfaceInert(document.querySelector(".skip-link"), !!activeDialog);
  }

  function setDialogSurfaceInert(surface, shouldBeInert) {
    if (!surface) return;
    if (shouldBeInert) {
      if (!dialogIsolationState.has(surface)) dialogIsolationState.set(surface, surface.inert);
      surface.inert = true;
      return;
    }
    if (!dialogIsolationState.has(surface)) return;
    const previous = dialogIsolationState.get(surface);
    dialogIsolationState.delete(surface);
    surface.inert = previous;
  }

  function showScreen(name, options = {}) {
    const previousScreen = screen;
    screen = name;
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle("active", key === name));
    hud.classList.toggle("active", mode === "play");
    touchControls.classList.toggle("playing", mode === "play");
    syncDialogIsolation();
    renderMenus();
    if (options.focus !== false) focusScreen(name, previousScreen);
  }

  function focusScreen(name, previousScreen) {
    const activeScreen = screens[name];
    if (!activeScreen) return;
    let target = null;
    if (name === "menu" && screens[previousScreen]) {
      target = activeScreen.querySelector(`[data-action="${previousScreen}"]`);
    }
    if (!target) target = activeScreen.querySelector("h1, h2");
    if (!target) target = activeScreen.querySelector("button, input, [href]");
    if (!target) return;
    if (!target.matches("button, input, a, select, textarea")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  function focusGameplay() {
    canvas.focus({ preventScroll: true });
  }

  function groundedStartForLevel(level, playerWidth, playerHeight) {
    const start = { ...level.start };
    const centerX = start.x + playerWidth / 2;
    const support = level.platforms
      .filter((platform) => !platform.phase && centerX >= platform.x && centerX <= platform.x + platform.w)
      .sort((a, b) => a.y - b.y)[0];
    if (support) start.y = Rules.groundedSpawnY(support.y, playerHeight);
    return start;
  }

  function startLevel(index) {
    currentLevelIndex = index;
    activeLevel = cloneLevel(levels[index]);
    const ch = characters[save.selected];
    const spawn = groundedStartForLevel(activeLevel, 34, 56);
    player = {
      x: spawn.x,
      y: spawn.y,
      w: 34,
      h: 56,
      baseW: 34,
      baseH: 56,
      vx: 0,
      vy: 0,
      spawn,
      health: 3,
      maxHealth: 3,
      ammo: Rules.BASE_AMMO_CAP,
      ammoRegen: 0,
      invuln: 0,
      superInvuln: 0,
      onGround: true,
      coyote: 0.12,
      jumpBuffer: 0,
      airJumps: ch.airJumps,
      facing: 1,
      moveIntent: 0,
      dashDir: 1,
      skillCd: 0,
      skillTimer: 0,
      shootCd: 0,
      shootTimer: 0,
      turnTimer: 0,
      landingTimer: 0,
      glide: 0,
      glideIntent: 0,
      bigTimer: 0,
      ammoTimer: 0,
      boostTimer: 0,
      windTimer: 0,
      portalCd: 0,
      portalTimer: 0,
      portalLock: "",
      tidePhase: "",
      carrier: null,
      coins: 0,
      collectedValue: 0,
      gems: 0,
      elapsed: 0,
      completed: false,
      hurtFlash: 0,
      prevVy: 0,
      dashFreeze: 0,
      gaitPhase: 0,
      guardFeedbackCd: 0,
      settledOutcome: null,
    };
    particles = [];
    floatTexts = [];
    projectiles = [];
    camera = { x: 0, y: 0, shake: 0, lookX: 0, lookY: 0 };
    const initialCamera = cameraTarget(0);
    camera.x = initialCamera.x;
    camera.y = initialCamera.y;
    syncPresentationState();
    resetControlState();
    hudState = { character: null, cooling: null, phaseCritical: null, values: Object.create(null) };
    GameFeel?.resetHitstop?.();
    mode = "play";
    modal.classList.remove("active");
    showScreen("", { focus: false });
    focusGameplay();
    syncOrientationGate();
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
      portals: (level.portals || []).map((p) => ({ ...p })),
    };
  }

  function update(dt) {
    if (mode !== "play" || orientationGated || !player || !activeLevel) return;
    player.elapsed += dt;
    updateInputs();
    if (inputs.left || inputs.right || inputs.jump || inputs.skill || inputs.shoot) dismissChapterIntro();
    updateMoving(dt);
    const wasOnGround = player.onGround;
    player.prevVy = player.vy;
    updatePlayer(dt);
    if (mode !== "play" || player.settledOutcome) return;
    if (player.onGround && !wasOnGround && player.prevVy > 380) {
      player.landingTimer = 0.18;
      GameFeel?.landingPuff?.(
        spawnSpark,
        player.x + player.w / 2,
        player.y + player.h,
        clamp((player.prevVy - 380) / 800, 0.2, 1),
        save.settings.fx
      );
    }
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups();
    updateParticles(dt);
    updateCamera(dt);
    updateChapterIntro(dt);
  }

  function updateInputs() {
    const direction = actionInputs.direction();
    inputs.left = direction < 0;
    inputs.right = direction > 0;
    inputs.jump = actionInputs.isActive("jump");
    inputs.skill = actionInputs.isActive("skill");
    inputs.shoot = actionInputs.isActive("shoot");
  }

  function consumePressed() {
    inputs.jumpPressed = false;
    inputs.jumpReleased = false;
    inputs.skillPressed = false;
    inputs.shootPressed = false;
  }

  function allSolids() {
    const tide = phaseTideState();
    return activeLevel.platforms.concat(activeLevel.moving).filter((p) => phaseIsActive(p, tide));
  }

  function phaseTideState(level = activeLevel, elapsed = player?.elapsed || 0) {
    if (!level?.phaseTide) return { active: "", progress: 0, warning: false, enabled: false };
    const period = Math.max(0.8, Number(level.phaseTide.period) || PHASE_DEFAULT_PERIOD);
    const warningWindow = Math.max(0, Number(level.phaseTide.warning) || PHASE_WARNING_DEFAULT);
    const offset = Number(level.phaseTide.offset) || 0;
    const cycle = period * 2;
    const t = ((elapsed + offset) % cycle + cycle) % cycle;
    const active = t < period ? "a" : "b";
    const phaseTime = t % period;
    const remaining = Math.max(0, period - phaseTime);
    return {
      active,
      progress: phaseTime / period,
      remaining,
      warning: warningWindow > 0 && remaining <= warningWindow,
      urgency: warningWindow > 0 ? clamp(1 - remaining / warningWindow, 0, 1) : 0,
      enabled: true,
      period,
    };
  }

  function phaseIsActive(item, tide = phaseTideState()) {
    if (!item?.phase || !tide.enabled) return true;
    return item.phase === tide.active;
  }

  function isPhaseItem(item) {
    return item?.phase === "a" || item?.phase === "b";
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
    player.moveIntent = leftRight;
    if (leftRight) {
      const nextFacing = Math.sign(leftRight);
      if (nextFacing !== player.facing) player.turnTimer = TURN_POSE_DURATION;
      player.facing = nextFacing;
    }

    if (inputs.jumpPressed) player.jumpBuffer = 0.14;
    player.jumpBuffer -= dt;
    player.coyote -= dt;
    player.skillCd = Math.max(0, player.skillCd - dt);
    player.skillTimer = Math.max(0, player.skillTimer - dt);
    player.glideIntent = Rules.advanceIntentWindow(player.glideIntent, {
      pressed: inputs.skillPressed,
      eligible: save.selected === "nini" && player.skillCd <= 0 && (!player.onGround || inputs.jumpPressed),
      dt,
      minimum: NINI_GLIDE_MIN_TAP,
    });
    player.dashFreeze = Math.max(0, (player.dashFreeze || 0) - dt);
    player.shootCd = Math.max(0, player.shootCd - dt);
    player.shootTimer = Math.max(0, player.shootTimer - dt);
    player.turnTimer = Math.max(0, player.turnTimer - dt);
    player.landingTimer = Math.max(0, player.landingTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.superInvuln = Math.max(0, player.superInvuln - dt);
    player.bigTimer = Math.max(0, player.bigTimer - dt);
    player.ammoTimer = Math.max(0, player.ammoTimer - dt);
    player.boostTimer = Math.max(0, player.boostTimer - dt);
    player.windTimer = Math.max(0, player.windTimer - dt);
    player.portalCd = Math.max(0, player.portalCd - dt);
    player.portalTimer = Math.max(0, player.portalTimer - dt);
    player.guardFeedbackCd = Math.max(0, player.guardFeedbackCd - dt);
    player.ammoRegen += dt;
    if (player.ammo < Rules.BASE_AMMO_CAP && player.ammoRegen >= 1.6) {
      player.ammo += 1;
      player.ammoRegen = 0;
    }
    player.hurtFlash = Math.max(0, player.hurtFlash - dt);
    updatePlayerSize();
    updatePhaseTransition();

    let gravity = ch.gravity;
    const playerRect = bodyRect(player);
    const windZone = activeWindZone(playerRect);
    const windDirection = windZone ? Math.sign(windZone.force) : 0;
    const windStrength = windZone ? clamp(Math.abs(windZone.force) / WIND_REFERENCE_FORCE, 0.75, 1.25) : 0;
    const windTarget = windDirection * ch.speed * (player.onGround ? WIND_GROUND_DRIFT : WIND_AIR_DRIFT) * windStrength;
    const target = clamp(leftRight * ch.speed + windTarget, -ch.speed * WIND_MAX_SPEED, ch.speed * WIND_MAX_SPEED);
    const accel = player.onGround ? ch.accel : ch.accel * 0.74;
    player.vx = GameFeel?.horizontalVelocity?.(player.vx, target, {
      baseAcceleration: accel,
      grounded: player.onGround,
      intent: leftRight,
      turning: player.turnTimer > 0,
    }, dt) ?? moveToward(player.vx, target, accel * dt);
    if (windZone) {
      player.windTimer = 0.18;
      spawnWind(player.x + player.w / 2, player.y + player.h / 2, windDirection);
    }

    const skillCooldown = ch.skillCooldown * (player.boostTimer > 0 ? 0.55 : 1);
    const canNiniGlide =
      save.selected === "nini" &&
      (inputs.skill || player.glideIntent > 0) &&
      !player.onGround &&
      player.glide < NINI_GLIDE_DURATION &&
      (player.skillCd <= 0 || player.glide > 0);
    if (canNiniGlide) {
      if (player.glide === 0) {
        player.skillCd = skillCooldown;
        burst(player.x + player.w / 2, player.y + player.h / 2, ch.accent, 14);
        toastMsg("璇玑星渡");
      }
      player.glide = Math.min(NINI_GLIDE_DURATION, player.glide + dt);
      gravity *= player.vy < -80 ? 0.68 : 0.26;
      if (player.vy > -70) player.vy = Math.min(player.vy, NINI_GLIDE_FALL_SPEED);
      if (save.settings.fx) spawnSpark(player.x + 16, player.y + 28, ch.accent, 1);
    } else if (!inputs.skill && !player.onGround) {
      player.glide = 0;
    } else if (player.onGround) {
      player.glide = 0;
      if (!inputs.jumpPressed) player.glideIntent = 0;
    }

    if (inputs.skillPressed && player.skillCd <= 0 && save.selected === "yuan") {
      player.skillTimer = YUAN_DASH_TIME;
      player.dashDir = player.facing;
      player.skillCd = skillCooldown;
      player.dashFreeze = 0.045;
      GameFeel?.requestHitstop?.(45);
      player.vx = player.dashDir * YUAN_DASH_SPEED;
      player.vy *= 0.45;
      shake(7);
      burst(player.x + player.w / 2, player.y + player.h / 2, ch.accent, 22);
      cue("dash");
      toastMsg("青衡破风");
    }

    if (save.selected === "yuan" && player.skillTimer > 0) {
      if (dashShouldStopAtEdge()) {
        player.skillTimer = 0;
        player.vx = moveToward(player.vx, 0, 5200 * dt);
        burst(player.x + player.w / 2, player.y + player.h, CANVAS_MATERIAL.carvedJade, 8);
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
      cue("jump");
    }
    if (inputs.jumpReleased && player.vy < -160) player.vy *= 0.56;

    player.vy = Math.min(ch.maxFall, player.vy + gravity * dt);
    const previousX = player.x;
    moveAxis("x", player.vx * dt);
    if (player.onGround) player.gaitPhase = (player.gaitPhase + Math.abs(player.x - previousX) / 22) % (Math.PI * 2);
    moveAxis("y", player.vy * dt);

    for (const spring of activeLevel.springs) {
      if (rectsOverlap(bodyRect(player), spring) && player.vy >= 0) {
        player.y = spring.y - player.h;
        player.vy = -spring.power;
        player.onGround = false;
        player.coyote = 0;
        shake(5);
        burst(spring.x + spring.w / 2, spring.y, "#fff070", 24);
        cue("spring");
      }
    }

    updatePortals();

    for (const h of activeLevel.hazards) {
      if (!phaseIsActive(h)) continue;
      if (rectsOverlap(bodyRect(player), h)) {
        hurt(h.type === "lava" ? 2 : 1);
        if (mode !== "play") {
          consumePressed();
          return;
        }
      }
    }
    for (const e of activeLevel.enemies) {
      if (!e.alive || !rectsOverlap(bodyRect(player), e)) continue;
      const stomp = player.vy > 160 && player.y + player.h - e.y < 28;
      if (stomp) {
        e.alive = false;
        player.vy = -620;
        player.coins += 2;
        GameFeel?.requestHitstop?.(50);
        burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.agedGold, 20);
        floatText("+2", e.x, e.y, CANVAS_MATERIAL.agedGold);
        cue("stomp");
      } else if (player.superInvuln > 0) {
        e.alive = false;
        player.coins += 2;
        burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.moonWhite, 28);
        floatText("无敌", e.x, e.y, CANVAS_MATERIAL.moonWhite);
      } else if (player.skillTimer > 0 && save.selected === "yuan") {
        e.alive = false;
        player.coins += 3;
        burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.carvedJade, 24);
        floatText("破击", e.x, e.y, CANVAS_MATERIAL.carvedJade);
      } else {
        hurt(1);
        if (mode !== "play") {
          consumePressed();
          return;
        }
      }
    }

    if (save.selected === "yuan" && player.skillTimer > 0) {
      for (const p of activeLevel.platforms) {
        if (p.type === "breakable" && !p.broken && rectsOverlap(bodyRect(player), p)) {
          p.broken = true;
          player.vx *= 0.55;
          player.skillTimer = Math.min(player.skillTimer, 0.06);
          GameFeel?.requestHitstop?.(35);
          shake(11);
          burst(p.x + p.w / 2, p.y + p.h / 2, CANVAS_MATERIAL.agedGold, 30);
          floatText("碎晶", p.x, p.y, CANVAS_MATERIAL.agedGold);
          cue("break_crystal");
        }
      }
    }

    if (player.y > activeLevel.height + 260) hurt(3, true);
    if (mode !== "play") {
      consumePressed();
      return;
    }
    const outcome = Rules.resolveTerminalOutcome({
      isDead: player.health <= 0,
      reachedGoal: !player.completed && rectsOverlap(bodyRect(player), activeLevel.goal),
      settledOutcome: player.settledOutcome,
    });
    if (outcome === Rules.OUTCOME_COMPLETE) completeLevel();
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

  function updatePhaseTransition() {
    const tide = phaseTideState();
    if (!tide.enabled) return;
    if (!player.tidePhase) {
      player.tidePhase = tide.active;
      return;
    }
    if (player.tidePhase === tide.active) return;
    player.tidePhase = tide.active;
    const blockers = activeLevel.platforms
      .concat(activeLevel.moving)
      .filter((p) => !p.broken && isPhaseItem(p) && phaseIsActive(p, tide) && rectsOverlap(bodyRect(player), p));
    if (!blockers.length) return;
    for (const blocker of blockers) {
      if (tryPhaseEscape(blocker)) return;
    }
    respawn();
    toastMsg("星潮回卷");
  }

  function tryPhaseEscape(blocker) {
    const snapshot = { x: player.x, y: player.y };
    const candidates = [
      { x: player.x, y: blocker.y - player.h },
      { x: blocker.x - player.w + 3, y: player.y },
      { x: blocker.x + blocker.w - 3, y: player.y },
      { x: player.x, y: blocker.y + blocker.h - 3 },
    ];
    for (const candidate of candidates) {
      player.x = clamp(candidate.x, 0, activeLevel.width - player.w);
      player.y = clamp(candidate.y, 0, activeLevel.height - player.h);
      if (!allSolids().some((p) => !p.broken && rectsOverlap(bodyRect(player), p))) {
        refreshGroundedState();
        return true;
      }
    }
    Object.assign(player, snapshot);
    return false;
  }

  function shootProjectile() {
    const ch = characters[save.selected];
    if (player.shootCd > 0 || player.ammo <= 0) return;
    player.shootCd = player.ammoTimer > 0 ? 0.12 : save.selected === "nini" ? 0.22 : 0.34;
    player.shootTimer = save.selected === "nini" ? 0.18 : 0.22;
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
      color: player.ammoTimer > 0 ? CANVAS_MATERIAL.moonWhite : ch.accent2,
    });
    burst(player.x + player.w / 2 + player.facing * 18, player.y + player.h * 0.42, ch.accent2, 8);
    cue(save.selected === "nini" ? "shoot_nini" : "shoot_yuan");
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

  function updatePortals() {
    const portal = activePortalForPlayer();
    if (!portal) {
      player.portalLock = "";
      return;
    }
    if (player.portalLock === portal.id || player.portalCd > 0) return;
    const target = pairedPortal(portal);
    if (!target) return;
    const exit = portalExitPosition(target);
    const candidate = { ...player, x: exit.x, y: exit.y };
    if (!portalExitRectIsSafe(candidate)) return;
    player.x = exit.x;
    player.y = exit.y;
    requestPresentationSnap(true);
    player.portalCd = PORTAL_COOLDOWN;
    player.portalTimer = 0.42;
    player.portalLock = target.id;
    GameFeel?.cameraLookaheadReset?.(camera);
    refreshGroundedState();
    shake(4);
    const color = portalColor(target);
    burst(player.x + player.w / 2, player.y + player.h / 2, color, 16);
    floatText("星门", player.x + player.w / 2, player.y, color);
    cue("portal");
  }

  function activePortalForPlayer() {
    for (const portal of activeLevel.portals || []) {
      if (rectsOverlap(bodyRect(player), portal)) return portal;
    }
    return null;
  }

  function pairedPortal(portal) {
    return (activeLevel.portals || []).find((candidate) => candidate.id === portal.pair) || null;
  }

  function portalExitPosition(portal) {
    return {
      x: portal.x + portal.w / 2 - player.w / 2,
      y: portal.y + portal.h - player.h,
    };
  }

  function portalExitRectIsSafe(candidate) {
    if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.w > activeLevel.width || candidate.y + candidate.h > activeLevel.height) return false;
    return !allSolids().some((p) => !p.broken && rectsOverlap(bodyRect(candidate), p));
  }

  function refreshGroundedState() {
    const foot = { x: player.x + 5, y: player.y + player.h + 2, w: player.w - 10, h: 4 };
    player.onGround = allSolids().some((p) => !p.broken && rectsOverlap(foot, p));
    if (player.onGround) {
      player.coyote = 0.12;
      player.airJumps = characters[save.selected].airJumps;
    }
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
          GameFeel?.requestHitstop?.(35);
          burst(p.x + p.w / 2, p.y + p.h / 2, CANVAS_MATERIAL.agedGold, 22);
          floatText("碎晶", p.x, p.y, CANVAS_MATERIAL.agedGold);
          cue("break_crystal");
        } else {
          pr.life = 0;
        }
      }
      for (const e of activeLevel.enemies) {
        if (!e.alive || pr.life <= 0 || !rectsOverlap(pr, e)) continue;
        e.hp = (e.hp || (e.type === "ember" ? 3 : 2)) - pr.damage;
        e.hitTimer = ENEMY_HIT_FLASH_DURATION;
        GameFeel?.requestHitstop?.(35);
        burst(e.x + e.w / 2, e.y + e.h / 2, pr.color, 14);
        cue("hit_take");
        if (e.hp <= 0) {
          e.alive = false;
          player.coins += 2 + pr.damage;
          floatText(`+${2 + pr.damage}`, e.x, e.y, CANVAS_MATERIAL.agedGold);
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
      e.hitTimer = Math.max(0, (e.hitTimer || 0) - dt);
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
      if (c.taken || !phaseIsActive(c) || !rectsOverlap(reach, c)) continue;
      c.taken = true;
      const amount = c.kind === "gem" ? 5 : 1;
      player.coins += amount;
      player.collectedValue += amount;
      if (c.kind === "gem") player.gems += 1;
      const pickupColor = c.kind === "gem" ? CANVAS_MATERIAL.carvedJade : CANVAS_MATERIAL.agedGold;
      floatText(`+${amount}`, c.x, c.y, pickupColor);
      burst(c.x + 10, c.y + 10, pickupColor, c.kind === "gem" ? 18 : 9);
      cue(c.kind === "gem" ? "pickup_gem" : "pickup_coin");
    }
    for (const p of activeLevel.powerups || []) {
      if (p.taken || !phaseIsActive(p) || !rectsOverlap(reach, p)) continue;
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
      player.ammo = Rules.clampAmmo(player.ammo + 8, Rules.RESERVE_AMMO_CAP);
    }
    if (kind === "bell") {
      player.boostTimer = 15;
      player.skillCd = 0;
      player.ammo = Rules.clampAmmo(player.ammo + 4, Rules.RESERVE_AMMO_CAP);
    }
    if (kind === "heart") {
      player.health = Math.min(player.maxHealth, player.health + 1);
    }
    burst(player.x + player.w / 2, player.y + player.h / 2, powerupColor(kind), 28);
    toastMsg(labels[kind] || "获得强化");
    cue("pickup_powerup");
  }

  function hurt(damage, forceRespawn = false) {
    if (player.superInvuln > 0 && !forceRespawn) {
      if (player.guardFeedbackCd > 0) return;
      player.guardFeedbackCd = SUPER_GUARD_FEEDBACK_COOLDOWN;
      shake(5);
      burst(player.x + player.w / 2, player.y + player.h / 2, CANVAS_MATERIAL.moonWhite, 12);
      cue("hit_super");
      return;
    }
    if (player.invuln > 0 && !forceRespawn) return;
    GameFeel?.requestHitstop?.(70);
    player.health -= damage;
    player.invuln = 1.1;
    player.hurtFlash = 0.3;
    player.vx = -player.facing * 360;
    player.vy = -540;
    shake(13);
    burst(player.x + player.w / 2, player.y + player.h / 2, CANVAS_MATERIAL.danger, 24);
    cue("hit_take");
    if (player.health <= 0 || forceRespawn) {
      if (player.health <= 0) {
        player.settledOutcome = Rules.OUTCOME_DEATH;
        cue("fail");
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
    RespawnVeil?.flash?.(180);
    player.x = player.spawn.x;
    player.y = player.spawn.y;
    player.vx = 0;
    player.vy = 0;
    requestPresentationSnap(true);
    player.invuln = 1.2;
    player.skillTimer = 0;
    player.glide = 0;
    player.glideIntent = 0;
    player.dashDir = player.facing;
    player.guardFeedbackCd = 0;
    refreshGroundedState();
    GameFeel?.cameraLookaheadReset?.(camera);
    GameFeel?.resetHitstop?.();
    shake(9);
  }

  function completeLevel() {
    if (player.settledOutcome === Rules.OUTCOME_DEATH || player.completed) return;
    player.settledOutcome = Rules.OUTCOME_COMPLETE;
    player.completed = true;
    const id = activeLevel.id;
    const prev = save.bestTimes[id];
    if (!prev || player.elapsed < prev) save.bestTimes[id] = player.elapsed;
    save.unlocked = Math.max(save.unlocked, currentLevelIndex + 2);
    save.totalCoins += player.coins;
    save.levelStars[id] = Math.max(save.levelStars[id] || 0, starCount());
    persist();
    burst(activeLevel.goal.x + 35, activeLevel.goal.y + 50, CANVAS_MATERIAL.agedGold, 80);
    cue("complete");
    openModal(
      "通关完成",
      `${activeLevel.name} 已通关。获得星露 ${player.coins}，收藏评级 ${"★".repeat(starCount())}${"☆".repeat(3 - starCount())}。`,
      [
        currentLevelIndex < levels.length - 1 ? ["下一章", () => startLevel(currentLevelIndex + 1), "primary"] : ["回到菜单", backToMenu, "primary"],
        ["重玩本章", () => startLevel(currentLevelIndex)],
        ["选择关卡", () => { mode = "menu"; modal.classList.remove("active"); showScreen("levels"); }],
      ],
      "胜利"
    );
  }

  function starCount() {
    const totalCollectibleValue = activeLevel.coins.reduce((sum, coin) => sum + (coin.kind === "gem" ? 5 : 1), 0);
    return Rules.calculateStarRating(player.collectedValue, totalCollectibleValue);
  }

  function cameraTarget(dt) {
    const lookahead = GameFeel?.cameraLookaheadOffset?.(player, view, dt, camera) || { x: 0, y: 0 };
    return {
      x: clamp(player.x + lookahead.x - view.w * 0.38, 0, Math.max(0, activeLevel.width - view.w)),
      y: clamp(player.y + lookahead.y - view.h * 0.55, 0, Math.max(0, activeLevel.height - view.h)),
    };
  }

  function updateCamera(dt) {
    const target = cameraTarget(dt);
    if (presentation.snapCamera) {
      camera.x = target.x;
      camera.y = target.y;
    } else {
      camera.x = lerp(camera.x, target.x, 1 - Math.pow(0.001, dt));
      camera.y = lerp(camera.y, target.y, 1 - Math.pow(0.001, dt));
    }
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
    const quantum = 1 / Math.max(1, view.dpr || 1);
    const camX = GameFeel?.interpolateCoordinate?.(presentation.cameraX, camera.x, renderAlpha, {
      snap: presentation.snapCamera,
      quantum,
    }) ?? snap(camera.x);
    const camY = GameFeel?.interpolateCoordinate?.(presentation.cameraY, camera.y, renderAlpha, {
      snap: presentation.snapCamera,
      quantum,
    }) ?? snap(camera.y);
    const playerX = GameFeel?.interpolateCoordinate?.(presentation.playerX, player.x, renderAlpha, {
      snap: presentation.snapPlayer,
      quantum,
    }) ?? player.x;
    const playerY = GameFeel?.interpolateCoordinate?.(presentation.playerY, player.y, renderAlpha, {
      snap: presentation.snapPlayer,
      quantum,
    }) ?? player.y;
    updateHud();
    renderBackground(activeLevel, camX, camY);
    ctx.save();
    ctx.translate(-camX + shakeX, -camY + shakeY);
    renderWorld(activeLevel);
    renderParticles();
    renderPlayer({ x: playerX, y: playerY });
    renderFloatTexts();
    ctx.restore();
    if (mode !== "play") renderVignette();
    settlePresentationSnap();
  }

  function renderAttract() {
    Playfield.drawBackground(ctx, { view, time: performance.now() / 1000, intensity: 0.3, attract: true });
    renderVignette();
  }

  function sceneTime() {
    return player && activeLevel ? player.elapsed : performance.now() / 1000;
  }

  function syncPresentationState() {
    presentation.ready = !!player;
    presentation.playerX = player?.x || 0;
    presentation.playerY = player?.y || 0;
    presentation.cameraX = camera.x;
    presentation.cameraY = camera.y;
    presentation.snapPlayer = false;
    presentation.snapCamera = false;
    presentation.motionState = { name: "idle", enteredAt: player?.elapsed || 0 };
    presentation.resolvedMotionPose = null;
    presentation.displayMotionPose = null;
    presentation.snapMotionPose = true;
    renderAlpha = 1;
  }

  function beginPresentationStep() {
    if (!player) return;
    if (!presentation.ready) syncPresentationState();
    presentation.playerX = player.x;
    presentation.playerY = player.y;
    presentation.cameraX = camera.x;
    presentation.cameraY = camera.y;
  }

  function syncPresentationCoordinates() {
    if (player) {
      presentation.playerX = player.x;
      presentation.playerY = player.y;
    }
    presentation.cameraX = camera.x;
    presentation.cameraY = camera.y;
  }

  function requestPresentationSnap(includeCamera = false) {
    presentation.snapPlayer = true;
    presentation.snapMotionPose = true;
    if (includeCamera) presentation.snapCamera = true;
  }

  function settlePresentationSnap() {
    if (presentation.snapPlayer && player) {
      presentation.playerX = player.x;
      presentation.playerY = player.y;
    }
    if (presentation.snapCamera) {
      presentation.cameraX = camera.x;
      presentation.cameraY = camera.y;
    }
    presentation.snapPlayer = false;
    presentation.snapCamera = false;
  }

  function renderBackground(level, camX, camY) {
    Playfield.drawBackground(ctx, {
      view,
      palette: level.palette,
      camX,
      camY,
      time: sceneTime(),
      intensity: save.settings.fx ? 1 : 0.4,
    });
  }

  function renderWorld(level) {
    const tide = phaseTideState(level);
    drawPhaseTide(level, tide);
    for (const w of level.wind || []) drawWind(w);
    drawGoal(level.goal);
    for (const p of level.platforms) if (!p.broken && isPhaseItem(p) && !phaseIsActive(p, tide)) drawPhaseGhostPlatform(p, tide);
    for (const m of level.moving) if (isPhaseItem(m) && !phaseIsActive(m, tide)) drawPhaseGhostPlatform(m, tide);
    for (const p of level.platforms) if (!p.broken && phaseIsActive(p, tide)) drawPlatform(p);
    for (const m of level.moving) if (phaseIsActive(m, tide)) drawPlatform(m);
    for (const h of level.hazards) {
      if (phaseIsActive(h, tide)) drawHazard(h);
      else if (isPhaseItem(h)) drawPhaseGhostHazard(h, tide);
    }
    for (const s of level.springs) drawSpring(s);
    for (const portal of level.portals || []) drawPortal(portal);
    for (const c of level.coins) if (!c.taken && phaseIsActive(c, tide)) drawCoin(c);
    for (const c of level.coins) if (!c.taken && isPhaseItem(c) && !phaseIsActive(c, tide)) drawPhaseGhostPickup(c, tide);
    for (const p of level.powerups || []) if (!p.taken && phaseIsActive(p, tide)) drawPowerup(p);
    for (const p of level.powerups || []) if (!p.taken && isPhaseItem(p) && !phaseIsActive(p, tide)) drawPhaseGhostPickup(p, tide);
    for (const pr of projectiles) drawProjectile(pr);
    for (const e of level.enemies) if (e.alive) drawEnemy(e);
  }

  function phaseColor(phase) {
    return Playfield.phaseColor(phase);
  }

  function drawPhaseTide(level, tide) {
    if (!tide.enabled) return;
    const color = phaseColor(tide.active);
    const t = sceneTime();
    const startX = Math.floor((camera.x - 160) / 220) * 220;
    ctx.save();
    const urgency = tide.warning ? tide.urgency || 0 : 0;
    ctx.globalAlpha = tide.warning ? 0.18 + urgency * 0.08 : 0.11;
    ctx.strokeStyle = color;
    ctx.lineWidth = tide.warning ? 2 + urgency * 2 : 2;
    for (let x = startX; x < camera.x + view.w + 220; x += 220) {
      ctx.beginPath();
      for (let y = -80; y < level.height + 120; y += 44) {
        const px = x + Math.sin(y * 0.018 + t * 1.6 + tide.progress * Math.PI * 2) * 18;
        if (y === -80) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlatform(p) {
    Playfield.drawPlatform(ctx, p);
  }

  function drawPhaseGhostPlatform(p) {
    const color = phaseColor(p.phase);
    ctx.save();
    ctx.globalAlpha = 0.28;
    const g = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
    g.addColorStop(0, "rgba(255,255,255,.08)");
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(255,255,255,.02)");
    roundRect(p.x, p.y, p.w, p.h, 8, g);
    ctx.globalAlpha = 0.58;
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, Math.max(4, p.h - 4));
    ctx.restore();
  }

  function drawPhaseGhostHazard(h) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    drawHazard(h);
    ctx.restore();
  }

  function drawPhaseGhostPickup(p) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(sceneTime() * 4.5 + p.x) * 0.05;
    if (p.kind === "coin" || p.kind === "gem") drawCoin(p);
    else drawPowerup(p);
    ctx.restore();
  }

  function drawHazard(h) {
    Playfield.drawHazard(ctx, h, sceneTime());
  }

  function drawSpring(s) {
    Playfield.drawSpring(ctx, s);
  }

  function drawCoin(c) {
    Playfield.drawCoin(ctx, c, {
      time: sceneTime(),
      reducedMotion: view.reducedMotion,
      fx: save.settings.fx,
    });
  }

  function powerupColor(kind) {
    return Playfield.powerupColor(kind);
  }

  function drawPowerup(p) {
    Playfield.drawPowerup(ctx, p, {
      time: sceneTime(),
      reducedMotion: view.reducedMotion,
      fx: save.settings.fx,
    });
  }

  function drawProjectile(pr) {
    ctx.save();
    ctx.translate(pr.x + pr.w / 2, pr.y + pr.h / 2);
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = save.settings.fx ? 7 : 0;
    ctx.fillStyle = pr.color;
    if (pr.owner === "nini") {
      ctx.rotate(sceneTime() * 8.3);
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
    drawEnemyIntent(e);
    if (e.hitTimer > 0) drawEnemyHitFlash(e);
    if (e.type === "wisp") {
      drawWispEnemy(e);
      return;
    }
    drawGroundEnemy(e);
  }

  function enemyPalette(type) {
    if (type === "ember") {
      return {
        body: "#ad6859",
        bodyDark: "#673b38",
        foot: "#4c2f32",
        eye: CANVAS_MATERIAL.lacquer,
        intent: CANVAS_MATERIAL.agedGold,
        core: "#d9b987",
      };
    }
    return {
      body: CANVAS_MATERIAL.carvedJade,
      bodyDark: "#365b51",
      foot: "#29463e",
      eye: CANVAS_MATERIAL.lacquer,
      intent: "#9bbcad",
      core: "#b6cec4",
    };
  }

  function drawEnemyIntent(e) {
    const dir = Math.sign(e.vx) || 1;
    const hit = clamp((e.hitTimer || 0) / ENEMY_HIT_FLASH_DURATION, 0, 1);
    ctx.save();
    if (e.type === "wisp") {
      const color = CANVAS_MATERIAL.phaseBlue;
      const centerX = e.x + e.w / 2;
      const centerY = e.y + e.h * 0.72;
      const tetherY = e.baseY + e.h + WISP_FLOAT_GAP + 2;
      ctx.globalAlpha = 0.18 + hit * 0.18;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(centerX - dir * 18, tetherY - 18, centerX - dir * 30, tetherY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ellipse(centerX - dir * 30, tetherY, 5, 2.5, 0);
      ctx.restore();
      return;
    }

    const support = enemySupportPlatform(e);
    const palette = enemyPalette(e.type);
    const y = support ? support.y - 4 : e.y + e.h + 3;
    const minX = support ? support.x + 10 : e.x - 28;
    const maxX = support ? support.x + support.w - 10 : e.x + e.w + 28;
    const arrowX = clamp(e.x + e.w / 2 + dir * 21, minX + 10, maxX - 10);
    ctx.globalAlpha = 0.16 + hit * 0.18;
    ctx.strokeStyle = palette.intent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
    ctx.globalAlpha = 0.36 + hit * 0.22;
    ctx.beginPath();
    ctx.moveTo(minX, y - 4);
    ctx.lineTo(minX, y + 4);
    ctx.moveTo(maxX, y - 4);
    ctx.lineTo(maxX, y + 4);
    ctx.stroke();
    ctx.fillStyle = palette.intent;
    ctx.beginPath();
    ctx.moveTo(arrowX + dir * 8, y - 8);
    ctx.lineTo(arrowX - dir * 5, y - 13);
    ctx.lineTo(arrowX - dir * 2, y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemyHitFlash(e) {
    const t = clamp((e.hitTimer || 0) / ENEMY_HIT_FLASH_DURATION, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.56 * t;
    ctx.strokeStyle = "#fff7d1";
    ctx.lineWidth = 2 + t * 2;
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w * (0.62 + t * 0.16), e.h * (0.54 + t * 0.12), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGroundEnemy(e) {
    const palette = enemyPalette(e.type);
    const hit = clamp((e.hitTimer || 0) / ENEMY_HIT_FLASH_DURATION, 0, 1);
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    ctx.translate(0, e.h / 2);
    ctx.scale(1.28, 1.28);
    ctx.translate(0, -e.h / 2);
    const footY = e.h / 2;
    ctx.fillStyle = "rgba(0,0,0,.26)";
    ellipse(0, footY + 1, e.w * 0.46, 4, 0);
    ctx.fillStyle = palette.foot;
    ellipse(-9, footY - 1, 6, 4, 0);
    ellipse(9, footY - 1, 6, 4, 0);
    const body = ctx.createRadialGradient(-6, -7, 3, 0, 3, e.w * 0.58);
    body.addColorStop(0, hit > 0 ? "#fff7d1" : palette.core);
    body.addColorStop(0.36, palette.body);
    body.addColorStop(1, palette.bodyDark);
    ctx.fillStyle = body;
    ellipse(0, 2, e.w * 0.55, e.h * 0.45, 0);
    if (e.type === "ember") {
      ctx.fillStyle = CANVAS_MATERIAL.agedGold;
      ctx.beginPath();
      ctx.moveTo(-7, -11);
      ctx.quadraticCurveTo(-3, -23, 2, -11);
      ctx.quadraticCurveTo(8, -20, 10, -7);
      ctx.quadraticCurveTo(2, -11, -7, -11);
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(182,206,196,.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, -9);
      ctx.quadraticCurveTo(0, -17, 13, -9);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(238,231,213,.86)";
    ellipse(-7, -4, 3.4, 4.5, 0);
    ellipse(7, -4, 3.4, 4.5, 0);
    ctx.fillStyle = palette.eye;
    ellipse(-7 + Math.sign(e.vx), -3, 1.3, 2.2, 0);
    ellipse(7 + Math.sign(e.vx), -3, 1.3, 2.2, 0);
    ctx.globalAlpha = 0.56;
    ctx.strokeStyle = CANVAS_MATERIAL.agedGold;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4, -10);
    ctx.lineTo(0, -6);
    ctx.lineTo(-4, -10);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawWispEnemy(e) {
    const phase = e.phase || 0;
    const dir = Math.sign(e.vx) || 1;
    const hit = clamp((e.hitTimer || 0) / ENEMY_HIT_FLASH_DURATION, 0, 1);
    const footY = e.h / 2;
    const hoverOffset = Math.sin(phase * 4) * WISP_HOVER_RANGE;
    const wingLift = Math.sin(phase * 11) * 3;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    ctx.scale(1.18, 1.18);

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = CANVAS_MATERIAL.phaseBlue;
    ellipse(0, footY + WISP_FLOAT_GAP - hoverOffset + 2, e.w * 0.34, 3.5, 0);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(120,147,164,.52)";
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
    ctx.fillStyle = "rgba(120,147,164,.72)";
    ellipse(-15, -2 - wingLift, 10, 17, -0.7);
    ellipse(15, -2 + wingLift, 10, 17, 0.7);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ellipse(-12, -7 - wingLift * 0.5, 3, 8, -0.7);
    ellipse(12, -7 + wingLift * 0.5, 3, 8, 0.7);

    ctx.globalAlpha = 1;
    ctx.shadowColor = CANVAS_MATERIAL.phaseBlue;
    ctx.shadowBlur = 8 + hit * 6;
    const core = ctx.createRadialGradient(-4, -6, 2, 0, 0, 20);
    core.addColorStop(0, hit > 0 ? CANVAS_MATERIAL.moonWhite : "#d7e0dc");
    core.addColorStop(0.45, CANVAS_MATERIAL.phaseBlue);
    core.addColorStop(1, "#355364");
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
    Playfield.drawGoal(ctx, g, { time: sceneTime(), reducedMotion: view.reducedMotion });
  }

  function drawWind(w) {
    Playfield.drawWind(ctx, w, {
      time: sceneTime(),
      arrowSpacing: WIND_ARROW_SPACING,
      arrowSpeed: WIND_ARROW_SPEED,
    });
  }

  function portalColor(portal) {
    return Playfield.portalColor(portal);
  }

  function drawPortal(portal) {
    Playfield.drawPortal(ctx, portal, { time: sceneTime(), reducedMotion: view.reducedMotion });
  }

  function renderPlayer(renderPosition = player) {
    if (!player) return;
    const renderX = Number(renderPosition?.x) || 0;
    const renderY = Number(renderPosition?.y) || 0;
    ctx.save();
    ctx.globalAlpha = player.onGround ? 0.38 : 0.18;
    ctx.fillStyle = "rgba(4, 8, 14, 0.72)";
    ellipse(renderX + player.w / 2, renderY + player.h + 2, player.w * 0.92, player.onGround ? 6 : 3.8, 0);
    ctx.restore();
    if (player.invuln > 0 && Math.floor(player.invuln * 16) % 2 === 0) return;
    if (player.superInvuln > 0) {
      ctx.save();
      ctx.globalAlpha = 0.42 + Math.sin(sceneTime() * 11) * 0.12;
      ctx.strokeStyle = CANVAS_MATERIAL.moonWhite;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(renderX + player.w / 2, renderY + player.h / 2, player.w * 0.92, player.h * 0.66, sceneTime() * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const authoredHeight = save.selected === "nini" ? 248 : 242;
    const defaultScale = 0.9 * (player.h / player.baseH);
    const maxViewportShare = player.bigTimer > 0 ? 0.4 : 0.34;
    const responsiveScale = view.isMobileLandscape ? (view.h * maxViewportShare) / authoredHeight : defaultScale;
    const artScale = Math.min(defaultScale, responsiveScale);
    const motionFacing = CharacterMotion?.resolveMotionFacing?.({
      id: save.selected,
      facing: player.facing,
      dashDir: player.dashDir,
      skillTimer: player.skillTimer,
    }) ?? player.facing;
    const simulationTime = sceneTime();
    const pose = {
      vx: player.vx,
      vy: player.vy,
      onGround: player.onGround,
      turnTimer: player.turnTimer,
      turnDuration: TURN_POSE_DURATION,
      landingTimer: player.landingTimer,
      shootTimer: player.shootTimer,
      glide: player.glide,
      skillTimer: player.skillTimer,
      hurtFlash: player.hurtFlash,
      gaitPhase: player.gaitPhase,
      simulationTime,
    };
    const resolvedMotion = CharacterMotion?.resolveCharacterMotion?.({
      id: save.selected,
      facing: motionFacing,
      speed: characters[save.selected].speed,
      now: simulationTime * 1000,
      ...pose,
    });
    const animationName = resolvedMotion?.animation || characterAnimName(save.selected, pose);
    const previousAnimation = presentation.motionState?.name;
    presentation.motionState = CharacterMotion?.advanceAnimationState?.(
      presentation.motionState,
      animationName,
      simulationTime,
    ) || presentation.motionState;
    const motionElapsed = CharacterMotion?.animationElapsed?.(presentation.motionState, simulationTime) || 0;
    const discretePoseJump =
      previousAnimation !== animationName &&
      (/^hurt_|^skill_|^land_/.test(animationName) || /^hurt_|^skill_/.test(previousAnimation || ""));
    if (presentation.snapMotionPose || discretePoseJump || !presentation.resolvedMotionPose) {
      presentation.displayMotionPose = resolvedMotion || CharacterMotion?.emptyMotionPose?.() || null;
      presentation.snapMotionPose = false;
    } else {
      presentation.displayMotionPose = CharacterMotion?.blendMotionPose?.(
        presentation.resolvedMotionPose,
        resolvedMotion,
        0.72,
      ) || resolvedMotion;
    }
    presentation.resolvedMotionPose = resolvedMotion || null;
    const motion = {
      ...(resolvedMotion || {}),
      ...(presentation.displayMotionPose || {}),
      animation: animationName,
      artifact: resolvedMotion?.artifact,
      direction: resolvedMotion?.direction,
      gaitWave: resolvedMotion?.gaitWave,
      stride: resolvedMotion?.stride,
      forward: resolvedMotion?.forward,
    };
    drawCharacterArt(save.selected, renderX + player.w / 2, renderY + player.h, motionFacing, artScale, {
      ...pose,
      motion,
      animationName,
      motionElapsed,
    });
  }

  function drawCharacterArt(id, x, y, facing, scale, pose = null) {
    if (drawCharacterSprite(id, x, y, facing, scale, pose)) return;
    const ch = characters[id];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);
    const bob = Math.sin(sceneTime() * 8.3) * 1.2;
    ctx.translate(0, bob);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ellipse(0, 4, 28, 7, 0);

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
      ctx.fillStyle = CANVAS_MATERIAL.dustyRose;
      ellipse(-23, -97, 7, 4, -0.4);
      ellipse(23, -97, 7, 4, 0.4);
    } else {
      ctx.strokeStyle = CANVAS_MATERIAL.carvedJade;
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
      ctx.strokeStyle = CANVAS_MATERIAL.carvedJade;
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
    const simulationTime = Math.max(0, Number(pose?.simulationTime) || sceneTime());
    const motion = pose?.motion || CharacterMotion?.resolveCharacterMotion?.({
      id,
      facing,
      speed: characters[id].speed,
      now: simulationTime * 1000,
      ...pose,
    });
    const animName = pose?.animationName || motion?.animation || characterAnimName(id, pose);
    const motionElapsed = Math.max(0, Number(pose?.motionElapsed) || 0);
    const image = characterSprites[id];
    if (!image || !image.complete || !image.naturalWidth) return false;
    const atlas = characterAtlases[id]?.data;
    const animConfig = atlas?.animations?.[animName] || atlas?.animations?.idle;
    const sourceFrame = atlasFrame(atlas, animName, image, motionElapsed);
    const orientation = CharacterMotion?.resolveSpriteOrientation?.(animName, facing, animConfig) || {
      frameScaleX: facing,
      leanScale: 1,
      artifactScale: facing,
    };
    const frameAspect = Math.max(0.25, (sourceFrame.sw || 1) / Math.max(1, sourceFrame.sh || 1));
    const targetH = (id === "nini" ? 248 : 242) * scale;
    const targetW = targetH * frameAspect;
    const bob = (motion?.bob || 0) * scale;
    const lean = motion?.lean || 0;
    const stretchX = motion?.scaleX || 1;
    const stretchY = motion?.scaleY || 1;
    const lift = targetH * (id === "nini" ? 0.03 : 0.02) + (motion?.lift || 0) * scale;
    const quantum = 1 / Math.max(1, view.dpr || 1);
    const align = (value) => Math.round(Number(value) / quantum) * quantum;
    ctx.save();
    ctx.translate(align(x), align(y + lift + bob));
    ctx.scale(orientation.frameScaleX, 1);
    ctx.rotate(lean * orientation.leanScale);
    ctx.scale(stretchX, stretchY);
    // Keep the silhouette crisp: never apply canvas shadowBlur to the sprite bitmap.
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    drawMovementTrace(id, motion, targetW, targetH, scale);
    drawMotionArtifact(id, motion?.artifact, targetW, targetH, scale, orientation.artifactScale, simulationTime, motionElapsed);
    const destW = align(targetW);
    const destH = align(targetH);
    ctx.drawImage(
      image,
      sourceFrame.sx,
      sourceFrame.sy,
      sourceFrame.sw,
      sourceFrame.sh,
      -destW / 2,
      -destH,
      destW,
      destH
    );
    ctx.restore();
    return true;
  }

  function drawMovementTrace(id, motion, targetW, targetH, scale) {
    const stride = Number(motion?.stride) || 0;
    if (stride < 0.28 || view.reducedMotion) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.22, 0.08 + stride * 0.09);
    ctx.strokeStyle = id === "nini" ? "rgba(184,123,134,.72)" : "rgba(109,168,149,.72)";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.lineCap = "round";
    for (let line = 0; line < 3; line += 1) {
      const y = -targetH * (0.15 + line * 0.12);
      const length = targetW * (0.16 + stride * 0.11 + line * 0.04);
      ctx.beginPath();
      ctx.moveTo(-targetW * 0.18, y);
      ctx.quadraticCurveTo(-length * 0.6, y + (line - 1) * 3, -length, y + (line - 1) * 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMotionArtifact(id, artifact, targetW, targetH, scale, directionScale = 1, time = 0, motionElapsed = 0) {
    if (!artifact || artifact === "rest") return;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineCap = "round";
    if (artifact.startsWith("star-dial")) {
      const open = artifact === "star-dial-open" ? 1 : 0.72;
      const radius = targetW * (0.42 + open * 0.08);
      ctx.translate(targetW * 0.18 * directionScale, -targetH * 0.58);
      ctx.rotate((time / 0.9) * directionScale);
      ctx.strokeStyle = "rgba(195,164,104,.72)";
      ctx.lineWidth = Math.max(1, 1.4 * scale);
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * (1 - ring * 0.18), radius * (0.42 + ring * 0.07), ring * 0.6, 0, Math.PI * 1.72);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(184,123,134,.80)";
      ctx.beginPath();
      ctx.arc(radius * 0.72, 0, Math.max(2, 3 * scale), 0, Math.PI * 2);
      ctx.fill();
    } else if (artifact.startsWith("gui-sword")) {
      const cut = artifact === "gui-sword-cut";
      ctx.translate(0, -targetH * 0.46);
      ctx.scale(directionScale, 1);
      ctx.strokeStyle = cut ? "rgba(109,168,149,.82)" : "rgba(195,164,104,.62)";
      ctx.lineWidth = Math.max(1.2, (cut ? 3 : 1.5) * scale);
      ctx.beginPath();
      ctx.moveTo(-targetW * 0.58, targetH * 0.18);
      ctx.quadraticCurveTo(targetW * 0.12, -targetH * 0.25, targetW * 0.72, -targetH * 0.03);
      ctx.stroke();
      if (cut) {
        for (let echo = 1; echo <= 3; echo += 1) {
          ctx.globalAlpha = Math.max(0.08, 0.34 - echo * 0.07) * Math.min(1, 0.45 + motionElapsed * 8);
          ctx.beginPath();
          ctx.moveTo(-targetW * (0.48 + echo * 0.06), targetH * (0.24 + echo * 0.015));
          ctx.quadraticCurveTo(targetW * 0.18, -targetH * (0.16 - echo * 0.01), targetW * (0.62 - echo * 0.035), targetH * (0.02 + echo * 0.015));
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function characterAnimName(id, pose) {
    if (!pose) return "idle";
    if (player?.hurtFlash > 0) return "hurt";
    if (id === "nini" && player?.glide > 0) return "skill";
    if (id === "yuan" && player?.skillTimer > 0) return "skill";
    if (!pose.onGround) return pose.vy > 120 ? "fall" : "jump";
    return Math.abs(pose.vx || 0) > characters[id].speed * 0.18 ? "run" : "idle";
  }

  function atlasFrame(atlas, animName, image, elapsed = 0) {
    if (!atlas?.frame || !atlas.animations) return { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
    const frameW = Number(atlas.frame.w) || image.naturalWidth;
    const frameH = Number(atlas.frame.h) || image.naturalHeight;
    if (frameW <= 1 || frameH <= 1) return { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
    const anim = atlas.animations[animName] || atlas.animations.idle;
    const frame = CharacterMotion?.sampleAnimationFrame?.(anim, elapsed) ?? anim?.frames?.[0] ?? 0;
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
    // v1.2.4 — single composite-add glow ring on warm pickup bursts so coins feel collected.
    if (save.settings.fx && [CANVAS_MATERIAL.agedGold, CANVAS_MATERIAL.carvedJade, CANVAS_MATERIAL.moonWhite].includes(color)) {
      particles.push({ x, y, vx: 0, vy: 0, r: 18, life: 0.28, max: 0.28, color, glow: true });
    }
  }

  function spawnSpark(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: -player.facing * (50 + Math.random() * 120), vy: 80 + Math.random() * 70, r: 2, life: 0.28, max: 0.28, color });
  }

  function spawnWind(x, y, dir) {
    if (!save.settings.fx || Math.random() > 0.28) return;
    particles.push({ x, y, vx: -dir * (70 + Math.random() * 70), vy: -20 + Math.random() * 40, r: 1.5, life: 0.35, max: 0.35, color: CANVAS_MATERIAL.moonWhiteSoft });
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
      if (p.glow) {
        // v1.2.4 — soft additive halo ring for warm pickup bursts.
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * 1.6);
        grd.addColorStop(0, p.color);
        grd.addColorStop(0.55, "rgba(255, 247, 213, 0.45)");
        grd.addColorStop(1, "rgba(255, 247, 213, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
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
    ctx.textAlign = "center";
    for (const f of floatTexts) {
      const alpha = clamp(f.life / 0.8, 0, 1);
      // v1.2.4 — gilded edge: italic gold underprint at low alpha, then the regular color on top.
      if (save.settings.fx) {
        ctx.font = `italic 700 20px ${CANVAS_FONT_FAMILY}`;
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = "#f2d389";
        ctx.fillText(f.text, f.x + 1, f.y + 1);
      }
      ctx.font = `700 20px ${CANVAS_FONT_FAMILY}`;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function beep(freq, duration) {
    audioBus.beep(freq, duration);
  }

  function cue(name) {
    audioBus.cue?.(name);
  }

  function shake(amount) {
    if (!save.settings.shake) return;
    camera.shake = GameFeel?.clampShake?.(camera.shake, amount, view.isMobileLandscape, view.reducedMotion) ?? Math.max(camera.shake, amount);
  }

  function updateHud() {
    const characterName = characters[save.selected].name;
    const timeText = formatTime(player.elapsed);
    const statusText = statusLabel();
    const skillText = skillLabel();
    if (hudState.character !== null && hudState.character !== characterName) Hud.pulseHudPill?.(hudEls.character.parentElement);
    hudState.character = characterName;
    setHudText("character", hudEls.character, characterName);
    setHudText("health", hudEls.health, heartLabel(player.health, player.maxHealth));
    setHudText("coins", hudEls.coins, player.coins);
    setHudText("ammo", hudEls.ammo, player.ammo);
    setHudText("time", hudEls.time, timeText);
    setHudText("status", hudEls.status, statusText);
    setHudText("skill", hudEls.skill, skillText);
    setHudLabel("characterLabel", hudEls.character.parentElement, `同行 ${characterName}`);
    setHudLabel("healthLabel", hudEls.health.parentElement, `生命 ${player.health} / ${player.maxHealth}`);
    setHudLabel("coinsLabel", hudEls.coins.parentElement, `星露 ${player.coins}`);
    setHudLabel("ammoLabel", hudEls.ammo.parentElement, `星弹 ${player.ammo}`);
    setHudLabel("timeLabel", hudEls.time.parentElement, `时间 ${timeText}`);
    setHudLabel("statusLabel", hudEls.status, `状态 ${statusText}`);
    setHudLabel("skillLabel", hudEls.skill, skillText);
    const phaseCritical = phaseTideState().enabled;
    if (hudState.phaseCritical !== phaseCritical) {
      hudEls.status.classList.toggle("phase-critical", phaseCritical);
      hudState.phaseCritical = phaseCritical;
    }
    const cooling = player.skillCd > 0;
    if (hudState.cooling !== null && hudState.cooling !== cooling) {
      Hud.pulseHudPill?.(hudEls.skill);
      if (hudState.cooling && !cooling) cue("skill_ready");
    }
    hudState.cooling = cooling;
    if (hudEls.skill.classList.contains("cooling") !== cooling) hudEls.skill.classList.toggle("cooling", cooling);
    const progress = clamp((player.x + player.w / 2) / activeLevel.width, 0, 1);
    const progressPercent = Math.round(progress * 400) / 4;
    if (hudState.values.progress !== progressPercent) {
      hudEls.bar.style.width = `${progressPercent}%`;
      hudState.values.progress = progressPercent;
    }
  }

  function setHudText(key, element, value) {
    const text = String(value);
    if (hudState.values[key] === text) return;
    element.textContent = text;
    hudState.values[key] = text;
  }

  function setHudLabel(key, element, value) {
    if (!element) return;
    const text = String(value);
    if (hudState.values[key] === text) return;
    element.setAttribute("aria-label", text);
    hudState.values[key] = text;
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
    const meta = [
      `${ch.name}：${ch.skillName}`,
      ch.projectileName,
      `${activeLevel.coins.length} 处星露`,
    ];
    if (activeLevel.phaseTide) meta.push("星潮相位");
    if (activeLevel.portals?.length) meta.push("星门接合");
    Hud.renderChapterIntroMeta(hudEls.introMeta, meta);
    hudEls.intro.classList.add("active");
  }

  function dismissChapterIntro() {
    if (introTimer <= 0) return;
    introTimer = 0;
    hudEls.intro.classList.remove("active");
  }

  function updateChapterIntro(dt) {
    if (introTimer <= 0) return;
    introTimer = Math.max(0, introTimer - dt);
    if (introTimer === 0) hudEls.intro.classList.remove("active");
  }

  function statusLabel() {
    const states = [];
    const tide = phaseTideState();
    if (tide.enabled) states.push(phaseTideLabel(tide));
    if (player.windTimer > 0) states.push("风场");
    if (player.portalTimer > 0) states.push("星门");
    if (player.bigTimer > 0) states.push(`巨大 ${Math.ceil(player.bigTimer)}`);
    if (player.superInvuln > 0) states.push(`无敌 ${Math.ceil(player.superInvuln)}`);
    if (player.ammoTimer > 0) states.push(`强化 ${Math.ceil(player.ammoTimer)}`);
    if (player.boostTimer > 0) states.push(`疾风 ${Math.ceil(player.boostTimer)}`);
    return states.length ? states.join(" · ") : characters[save.selected].projectileName;
  }

  function phaseTideLabel(tide) {
    const phaseName = tide.active === "a" ? "甲相" : "乙相";
    const remaining = Math.max(0, Number(tide.remaining) || 0);
    return `星潮 ${phaseName} ${remaining.toFixed(1)}`;
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
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      toast.textContent = "";
    }, 2400);
  }

  function openModal(title, text, actions, eyebrow = "暂停") {
    resetControlState();
    mode = "paused";
    modal.dataset.modalKind = eyebrow === "胜利" ? "complete" : eyebrow === "挑战失败" ? "fail" : title === "暂停" ? "pause" : "notice";
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
    syncOrientationGate();
    box.querySelector(".primary, button")?.focus({ preventScroll: true });
  }

  function resumeGame() {
    if (!player || !activeLevel || player.settledOutcome) return;
    resetControlState();
    mode = "play";
    modal.classList.remove("active");
    hud.classList.add("active");
    touchControls.classList.add("playing");
    audioBus.playBgm();
    syncOrientationGate();
    if (!orientationGated) focusGameplay();
  }

  function pauseGame() {
    if (mode !== "play") return;
    const ch = characters[save.selected];
    const touchHint = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const controls = touchHint
      ? "触控：左侧星盘可按住滑动换向，右侧依次为跳跃、技能与星弹。"
      : "键盘：方向键或 WASD 移动，空格跳跃，J 技能，K 发射。";
    openModal("暂停", `${activeLevel.name} · ${ch.skillName} · ${ch.projectileName}。${controls}`, [
      ["继续", resumeGame, "primary"],
      ["重新开始", () => startLevel(currentLevelIndex)],
      ["返回菜单", backToMenu],
    ]);
  }

  function trapDialogFocus(event, dialog) {
    const actions = [...dialog.querySelectorAll("button:not([disabled])")].filter((button) => button.getClientRects().length > 0);
    if (!actions.length) {
      event.preventDefault();
      return;
    }
    const first = actions[0];
    const last = actions[actions.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function backToMenu() {
    resetControlState();
    mode = "menu";
    activeLevel = null;
    player = null;
    introTimer = 0;
    portraitOverride = false;
    hudEls.intro.classList.remove("active");
    modal.classList.remove("active");
    audioBus.pauseBgm();
    syncOrientationGate();
    showScreen("menu");
  }

  function renderMenus() {
    document.querySelectorAll(".character-card").forEach((card) => {
      const selected = card.dataset.character === save.selected;
      card.classList.toggle("selected", selected);
      const pick = card.querySelector("[data-pick]");
      pick?.setAttribute("aria-pressed", String(selected));
      if (pick) {
        pick.textContent = selected ? `已选 · ${characters[card.dataset.character].name}` : `选择${characters[card.dataset.character].name}`;
        pick.classList.toggle("primary", selected);
      }
    });
    const levelList = document.getElementById("levelList");
    Hud.renderSaveStrip(document.getElementById("saveStrip"), save, characters, levels);
    Hud.renderLevelList(levelList, { levels, save, startLevel, formatTime });
    document.getElementById("volumeRange").value = save.settings.volume;
    document.getElementById("bgmRange").value = save.settings.bgmVolume;
    document.getElementById("touchRange").value = save.settings.touch;
    document.getElementById("touchOpacityRange").value = save.settings.touchOpacity;
    document.getElementById("hudScaleRange").value = save.settings.hudScale;
    document.getElementById("fxToggle").checked = save.settings.fx;
    document.getElementById("shakeToggle").checked = save.settings.shake;
    const continueIndex = Math.min(save.unlocked - 1, levels.length - 1);
    const continueButton = document.getElementById("continueAction");
    continueButton.textContent = `继续冒险 · 第 ${continueIndex + 1} 章`;
    continueButton.setAttribute("aria-label", `继续冒险：${levels[continueIndex].name}`);
    applySettingsToDocument();
    updateSettingOutputs();
  }

  function bindUi() {
    document.addEventListener("click", (e) => {
      const action = e.target?.dataset?.action;
      if (!action) return;
      if (action === "play") startLevel(Math.min(save.unlocked - 1, levels.length - 1));
      if (action === "levels") showScreen("levels");
      if (action === "characters") showScreen("characters");
      if (action === "settings") showScreen("settings");
      if (action === "back") {
        flushPersist();
        showScreen("menu");
      }
      if (action === "pause") pauseGame();
      if (action === "exit-game") backToMenu();
      if (action === "continue-portrait") {
        portraitOverride = true;
        syncOrientationGate();
      }
      if (action === "reset" && confirm("确定清除所有本地存档？")) {
        flushPersist();
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
      updateSettingOutputs();
      schedulePersist();
    });
    document.getElementById("bgmRange").addEventListener("input", (e) => {
      save.settings.bgmVolume = Number(e.target.value);
      audioBus.syncBgmVolume();
      updateSettingOutputs();
      schedulePersist();
    });
    document.getElementById("touchRange").addEventListener("input", (e) => {
      save.settings.touch = Number(e.target.value);
      applySettingsToDocument();
      updateSettingOutputs();
      schedulePersist();
    });
    document.getElementById("touchOpacityRange").addEventListener("input", (e) => {
      save.settings.touchOpacity = Number(e.target.value);
      applySettingsToDocument();
      updateSettingOutputs();
      schedulePersist();
    });
    document.getElementById("hudScaleRange").addEventListener("input", (e) => {
      save.settings.hudScale = Number(e.target.value);
      applySettingsToDocument();
      updateSettingOutputs();
      schedulePersist();
    });
    document.getElementById("fxToggle").addEventListener("change", (e) => {
      save.settings.fx = e.target.checked;
      persist();
    });
    document.getElementById("shakeToggle").addEventListener("change", (e) => {
      save.settings.shake = e.target.checked;
      if (!save.settings.shake) camera.shake = 0;
      persist();
    });
    for (const range of document.querySelectorAll(".settings-list input[type='range']")) {
      range.addEventListener("change", flushPersist);
    }
  }

  function applySettingsToDocument() {
    document.documentElement.style.setProperty("--touch-size", `${save.settings.touch}px`);
    document.documentElement.style.setProperty("--touch-opacity", String(save.settings.touchOpacity / 100));
    document.documentElement.style.setProperty("--hud-scale", String(save.settings.hudScale / 100));
  }

  function updateSettingOutputs() {
    document.getElementById("volumeValue").value = `${save.settings.volume}%`;
    document.getElementById("bgmValue").value = `${save.settings.bgmVolume}%`;
    document.getElementById("touchValue").value = `${save.settings.touch} px`;
    document.getElementById("touchOpacityValue").value = `${save.settings.touchOpacity}%`;
    document.getElementById("hudScaleValue").value = `${save.settings.hudScale}%`;
  }

  function bindControls() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Tab") {
        const activeDialog = mode === "paused" && modal.classList.contains("active")
          ? modal
          : orientationGated
            ? rotatePrompt
            : null;
        if (activeDialog) {
          trapDialogFocus(e, activeDialog);
          return;
        }
      }
      if (e.code === "Escape") {
        if (e.repeat) {
          e.preventDefault();
          return;
        }
        if (mode === "play") {
          e.preventDefault();
          pauseGame();
        }
        return;
      }
      if (InputState.isGameplayKeyCode(e.code)) {
        const wasPhysicallyHeld = physicalKeys.has(e.code);
        physicalKeys.add(e.code);
        if (e.repeat && !wasPhysicallyHeld) suppressedKeys.add(e.code);
      }
      if (!InputState.isGameplayKeyEvent(e, mode)) return;
      e.preventDefault();
      if (suppressedKeys.has(e.code)) return;
      const action = InputState.actionForGameplayCode(e.code);
      const result = actionInputs.press(`key:${e.code}`, action);
      applyActionPress(result);
      keys[e.code] = true;
      syncTouchControlState();
    }, { passive: false });
    window.addEventListener("keyup", (e) => {
      const wasHeld = !!keys[e.code];
      physicalKeys.delete(e.code);
      suppressedKeys.delete(e.code);
      if (!wasHeld && !InputState.isGameplayKeyEvent(e, mode)) return;
      if (mode === "play") e.preventDefault();
      applyActionRelease(actionInputs.release(`key:${e.code}`));
      keys[e.code] = false;
      syncTouchControlState();
    }, { passive: false });

    const hapticTouches = new Set(["jump", "skill", "shoot"]);
    const activationTimers = new Map();
    for (const btn of document.querySelectorAll("[data-touch]")) {
      const name = btn.dataset.touch;
      const down = (e) => {
        e.preventDefault();
        if (mode !== "play" || orientationGated) return;
        btn.setPointerCapture?.(e.pointerId);
        const result = actionInputs.press(`pointer:${e.pointerId}`, name);
        if (!result.accepted) return;
        applyActionPress(result);
        if (result.added && hapticTouches.has(name)) haptic();
        syncTouchControlState();
      };
      const move = (e) => {
        if (name !== "left" && name !== "right") return;
        const sourceId = `pointer:${e.pointerId}`;
        const heldAction = actionInputs.actionForSource(sourceId);
        if (heldAction !== "left" && heldAction !== "right") return;
        e.preventDefault();
        const rail = btn.closest(".touch-left");
        const rect = rail?.getBoundingClientRect();
        if (!rect?.width) return;
        const nextAction = e.clientX < rect.left + rect.width / 2 ? "left" : "right";
        if (nextAction === heldAction) return;
        actionInputs.press(sourceId, nextAction);
        syncTouchControlState();
      };
      const up = (e) => {
        e.preventDefault();
        applyActionRelease(actionInputs.release(`pointer:${e.pointerId}`));
        syncTouchControlState();
      };
      btn.addEventListener("pointerdown", down, { passive: false });
      btn.addEventListener("pointermove", move, { passive: false });
      btn.addEventListener("pointerup", up, { passive: false });
      btn.addEventListener("pointercancel", up, { passive: false });
      btn.addEventListener("lostpointercapture", up, { passive: false });
      btn.addEventListener("click", (e) => {
        if (e.detail !== 0 || mode !== "play" || orientationGated) return;
        e.preventDefault();
        const sourceId = `activation:${name}`;
        clearTimeout(activationTimers.get(sourceId));
        const result = actionInputs.press(sourceId, name);
        applyActionPress(result);
        if (result.added && hapticTouches.has(name)) haptic();
        syncTouchControlState();
        activationTimers.set(sourceId, setTimeout(() => {
          activationTimers.delete(sourceId);
          applyActionRelease(actionInputs.release(sourceId));
          syncTouchControlState();
        }, ACCESSIBLE_TOUCH_HOLD));
      });
    }
    document.addEventListener("focusin", (e) => {
      if (mode !== "play" || e.target === canvas || e.target?.closest?.("[data-touch]")) return;
      resetControlState();
    });
    window.addEventListener("blur", resetPhysicalControlState);
  }

  function applyActionPress(result) {
    if (!result?.becameActive) return;
    if (result.action === "jump") inputs.jumpPressed = true;
    if (result.action === "skill") inputs.skillPressed = true;
    if (result.action === "shoot") inputs.shootPressed = true;
  }

  function applyActionRelease(result) {
    if (result?.becameInactive && result.action === "jump") inputs.jumpReleased = true;
  }

  function syncTouchControlState() {
    document.querySelectorAll("[data-touch]").forEach((button) => {
      button.classList.toggle("active", actionInputs.isActive(button.dataset.touch));
    });
  }

  function resetControlState() {
    InputState.resetTransientState({ keys, inputs, actionInputs });
    for (const key of Object.keys(inputs)) inputs[key] = false;
    suppressedKeys.clear();
    for (const code of physicalKeys) suppressedKeys.add(code);
    syncTouchControlState();
  }

  function resetPhysicalControlState() {
    physicalKeys.clear();
    suppressedKeys.clear();
    resetControlState();
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
    resetPhysicalControlState();
    accumulator = 0;
    last = performance.now();
    GameFeel?.resetHitstop?.();
    GameFeel?.cameraLookaheadReset?.(camera);
    RespawnVeil?.clear?.();
    if (pageHidden) {
      flushPersist();
      audioBus.suspend();
    }
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
    const frameDt = clamp((now - last) / 1000, 0, FixedStep.MAX_FRAME_DT);
    last = now;
    const gameplayActive = mode === "play" && !orientationGated;
    if (!gameplayActive) {
      accumulator = 0;
      render();
      requestAnimationFrame(loop);
      return;
    }
    const hitstopBeforeFrame = GameFeel?.getHitstopRemaining?.() || 0;
    const simulationDt = GameFeel?.consumeHitstop?.(frameDt) ?? frameDt;
    const hitstopAfterConsume = GameFeel?.getHitstopRemaining?.() || 0;
    if (simulationDt <= 0) {
      if (GameFeel?.shouldSyncPresentationAfterHitstop?.({
        before: hitstopBeforeFrame,
        after: hitstopAfterConsume,
        steps: 0,
      })) {
        syncPresentationCoordinates();
      }
      renderAlpha = 1;
      render();
      requestAnimationFrame(loop);
      return;
    }
    const frame = FixedStep.runFrame(accumulator, simulationDt, (dt) => {
      const hitstopBefore = GameFeel?.getHitstopRemaining?.() || 0;
      beginPresentationStep();
      update(dt);
      const hitstopAfter = GameFeel?.getHitstopRemaining?.() || 0;
      return hitstopAfter > hitstopBefore;
    });
    accumulator = frame.accumulator;
    const resumedWithoutStep = GameFeel?.shouldSyncPresentationAfterHitstop?.({
      before: hitstopBeforeFrame,
      after: hitstopAfterConsume,
      steps: frame.steps,
    });
    if (resumedWithoutStep) syncPresentationCoordinates();
    renderAlpha = frame.hitstopRequested || resumedWithoutStep
      ? 1
      : clamp(frame.accumulator / FixedStep.FIXED_DT, 0, 1);
    render();
    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("nini:dialog-change", syncDialogIsolation);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", () => {
      pageHidden = true;
      resetPhysicalControlState();
      flushPersist();
      accumulator = 0;
      GameFeel?.resetHitstop?.();
      GameFeel?.cameraLookaheadReset?.(camera);
      RespawnVeil?.clear?.();
      audioBus.suspend();
    });
    window.addEventListener("pageshow", handleVisibilityChange);
    bindUi();
    bindControls();
    audioBus.armAutoplayRetry?.();
    registerServiceWorker();
    showScreen("menu", { focus: false });
    requestAnimationFrame(loop);
  }

  init();
})();
