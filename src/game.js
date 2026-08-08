(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const shell = document.getElementById("shell");
  const screens = {
    menu: document.getElementById("menu"),
    characters: document.getElementById("characterScreen"),
    levels: document.getElementById("levelScreen"),
    record: document.getElementById("recordScreen"),
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
    chain: document.getElementById("hudChain"),
    chainCount: document.getElementById("hudChainCount"),
    chainMult: document.getElementById("hudChainMult"),
    chainFill: document.getElementById("hudChainFill"),
    wardenBar: document.getElementById("wardenBar"),
    wardenName: document.getElementById("wardenName"),
    wardenPhase: document.getElementById("wardenPhase"),
    wardenTrack: document.getElementById("wardenTrack"),
    wardenFill: document.getElementById("wardenFill"),
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
  const Progression = window.NiniProgression;
  const FixedStep = window.NiniFixedStep;
  const Hud = window.NiniYuanHud;
  const CharacterMotion = window.NiniYuanCharacterMotion;
  const CharacterEffects = window.NiniYuanCharacterEffects;
  const Playfield = window.NiniYuanPlayfieldMaterial;
  const CreatureArt = window.NiniYuanCreatureMaterial;
  const GameFeel = window.NiniYuanGameFeel;
  const RespawnVeil = window.NiniYuanRespawnVeil;
  const WardenArt = window.NiniYuanWarden;
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
  // v2.0.0 — Astral Echo. Warden encounters, chain scoring, and hidden star marrow.
  const WARDEN_TELEGRAPH = 0.55;
  const WARDEN_RECOVER = 0.7;
  const WARDEN_HIT_FLASH = 0.16;
  const WARDEN_CONTACT_COOLDOWN = 0.5;
  const WARDEN_BOLT_SPEED = 330;
  const WARDEN_SHARD_SPEED = 520;
  const WARDEN_SWEEP_SPEED = 520;
  const MARROW_SIZE = 30;
  const GOAL_REACH_X = 22;
  const GOAL_REACH_Y = 34;
  const SENTRY_COOLDOWN = 2.1;
  const SENTRY_TELEGRAPH = 0.45;
  const COMBO_DECAY_GRACE = 0.35;
  const SENTRY_RANGE = 560;
  const PROJECTILE_CULL_RADIUS = 1400;
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
    motionRenderedAt: 0,
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
  // v2.0.0 — Astral Echo runtime state. `warden` is the active world-finale
  // guardian, `wardenBolts` its projectiles, `combo` the chain scoring window,
  // and `run` the per-attempt facts the completion screen and records read.
  let warden = null;
  let wardenBolts = [];
  let combo = { chain: 0, remaining: 0, multiplier: 1, best: 0, flash: 0 };
  let run = { damaged: false, stomps: 0, marrow: false, deaths: 0, assist: false };
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

  // --- v2.0.0 星辉护佑 / assist mode ----------------------------------------
  // Assist never changes authored level geometry. It relaxes failure pressure
  // only, and any run that used it is excluded from best times and trial medals
  // so records stay comparable.

  function assistSettings() {
    return save.settings.assist || {};
  }

  function assistActive() {
    return assistSettings().enabled === true;
  }

  function assistOn(key) {
    const assist = assistSettings();
    return assist.enabled === true && assist[key] === true;
  }

  /** Simulation time scale. Assist can slow the whole fixed-step clock. */
  function assistTimeScale() {
    if (!assistActive()) return 1;
    return clamp((Number(assistSettings().speed) || 100) / 100, 0.6, 1);
  }

  /** Air-jump budget for the selected character, plus the assist bonus jump. */
  function airJumpBudget() {
    return characters[save.selected].airJumps + (assistOn("extraJump") ? 1 : 0);
  }

  /** A run that used assist never writes best times, medals, or the solo route. */
  function recordsAreRanked() {
    return run.assist !== true;
  }

  function storageOptions() {
    return {
      levelCount: levels.length,
      levelIds: levels.map((level) => level.id),
      achievementIds: Progression.ACHIEVEMENT_IDS,
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
          name: "极光守望者",
          title: "第一星域 · 守望",
          profile: "aurora",
          palette: "aurora",
          health: 16,
          arena: { x: 118 * TILE, w: 20 * TILE },
          ground: 10 * TILE,
          home: { x: 126 * TILE, y: 5 * TILE },
          sigil: "极",
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
          name: "群岛守望者",
          title: "第二星域 · 守望",
          profile: "core",
          palette: "core",
          health: 20,
          arena: { x: 134 * TILE, w: 12 * TILE },
          ground: 9 * TILE,
          home: { x: 139 * TILE, y: 4 * TILE },
          sigil: "核",
        },
      },
      phaseshallows: { par: 32, marrow: [30, 10], extra: [T(66, 12)] },
      tidecorridor: { par: 36, marrow: [62, 10], extra: [A(64, 13, 180)] },
      moonmirrorbreak: { par: 40, marrow: [109, 9], extra: [T(82, 13)] },
      twinstarclocktower: { par: 42, marrow: [75, 10], extra: [A(80, 12, 190)] },
      phasetidecourt: {
        par: 78,
        marrow: [82, 11],
        extra: [T(88, 13), A(112, 12, 190)],
        warden: {
          id: "tidewarden",
          name: "星潮守望者",
          title: "第三星域 · 守望",
          profile: "tide",
          palette: "tide",
          health: 24,
          arena: { x: 132 * TILE, w: 22 * TILE },
          ground: 10 * TILE,
          home: { x: 143 * TILE, y: 5 * TILE },
          sigil: "潮",
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
      airJumps: airJumpBudget(),
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
    wardenBolts = [];
    warden = createWardenState(activeLevel);
    combo = { chain: 0, remaining: 0, multiplier: 1, best: 0, flash: 0 };
    run = { damaged: false, stomps: 0, marrow: false, deaths: 0, assist: assistActive() };
    camera = { x: 0, y: 0, shake: 0, lookX: 0, lookY: 0 };
    const initialCamera = cameraTarget(0);
    camera.x = initialCamera.x;
    camera.y = initialCamera.y;
    syncPresentationState();
    resetControlState();
    clearToast();
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
      lanterns: (level.lanterns || []).map((l) => ({ ...l, lit: false })),
      marrow: level.marrow ? { ...level.marrow, taken: false } : null,
      warden: level.warden ? { ...level.warden, arena: { ...level.warden.arena }, home: { ...level.warden.home } } : null,
    };
  }

  /**
   * Runtime state for one warden encounter. The authored record stays immutable;
   * everything that changes during the fight lives here so a restart is a fresh
   * object rather than a partially reset one.
   */
  function createWardenState(level) {
    const warden = level.warden;
    if (!warden) return null;
    return {
      data: warden,
      x: warden.home.x,
      y: warden.home.y,
      w: warden.w,
      h: warden.h,
      homeX: warden.home.x,
      homeY: warden.home.y,
      health: warden.health,
      maxHealth: warden.health,
      active: false,
      defeated: false,
      hitTimer: 0,
      contactCd: 0,
      phase: "idle",
      phaseTimer: 1.1,
      attack: "",
      attackIndex: 0,
      sweepDir: -1,
      hurtCount: 0,
      bob: 0,
      markers: [],
    };
  }

  function activeWarden() {
    return warden && !warden.defeated ? warden : null;
  }

  function wardenStage() {
    if (!warden) return null;
    const ratio = warden.maxHealth > 0 ? warden.health / warden.maxHealth : 0;
    const stages = warden.data.stages;
    for (const stage of stages) {
      if (ratio > stage.above) return stage;
    }
    return stages[stages.length - 1];
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
    // Sentries fire in chapters without a warden, so bolts advance on their own
    // schedule rather than inside the encounter update.
    updateHostileBolts(dt);
    if (mode !== "play" || player.settledOutcome) return;
    updateWarden(dt);
    if (mode !== "play" || player.settledOutcome) return;
    updateProjectiles(dt);
    updatePickups();
    updateCombo(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateChapterIntro(dt);
  }

  // --- v2.0.0 chain scoring -------------------------------------------------
  // The chain only ever multiplies star dew. Collection rating still reads
  // `player.collectedValue`, which chain rewards never touch.

  /** The full chain window, grace included. One source for HUD, decay, and refresh. */
  function chainWindow() {
    return Progression.COMBO_WINDOW + COMBO_DECAY_GRACE;
  }

  function updateCombo(dt) {
    const next = Progression.decayCombo(combo, dt);
    if (combo.chain > 0 && next.chain === 0) cue("combo_end");
    combo.chain = next.chain;
    combo.remaining = next.remaining;
    combo.multiplier = next.multiplier;
    combo.flash = Math.max(0, combo.flash - dt);
  }

  /**
   * Register one chain link and return the star dew it is worth.
   * `base` is the authored reward before the multiplier.
   */
  function chainReward(base, x, y, color) {
    const previousMultiplier = combo.multiplier;
    const next = Progression.advanceCombo(combo, { window: Progression.COMBO_WINDOW });
    combo.chain = next.chain;
    combo.remaining = chainWindow();
    combo.multiplier = next.multiplier;
    combo.best = Math.max(combo.best, combo.chain);
    combo.flash = 0.32;
    if (combo.multiplier > previousMultiplier) {
      cue("combo_up");
      floatText(`连星 ×${combo.multiplier}`, x, y - 26, CANVAS_MATERIAL.agedGold);
    }
    const amount = Progression.comboReward(base, combo.chain);
    player.coins += amount;
    floatText(`+${amount}`, x, y, color);
    return amount;
  }

  function breakCombo() {
    if (combo.chain === 0) return;
    combo.chain = 0;
    combo.remaining = 0;
    combo.multiplier = 1;
    combo.flash = 0;
  }

  // --- v2.0.0 warden encounters ---------------------------------------------

  function wardenArenaRect() {
    const data = warden?.data;
    if (!data) return null;
    return { x: data.arena.x, y: 0, w: data.arena.w, h: activeLevel.height + 400 };
  }

  function updateWarden(dt) {
    if (!warden || warden.defeated) return;
    warden.hitTimer = Math.max(0, warden.hitTimer - dt);
    warden.contactCd = Math.max(0, warden.contactCd - dt);
    warden.bob += dt;
    if (!warden.active) {
      if (player.x + player.w > warden.data.arena.x + TILE) {
        warden.active = true;
        warden.phase = "wait";
        warden.phaseTimer = 1.2;
        shake(10);
        cue("warden_wake");
        toastMsg(`${warden.data.name} · 星门已封`);
      }
      return;
    }
    const stage = wardenStage();
    warden.phaseTimer -= dt;
    if (warden.phase === "wait" && warden.phaseTimer <= 0) beginWardenAttack(stage);
    else if (warden.phase === "telegraph" && warden.phaseTimer <= 0) fireWardenAttack(stage);
    else if (warden.phase === "act") advanceWardenAct(dt, stage);
    else if (warden.phase === "recover" && warden.phaseTimer <= 0) {
      warden.phase = "wait";
      warden.phaseTimer = stage.cadence;
    }
    if (warden.phase !== "act" || warden.attack !== "sweep") driftWardenHome(dt);
    resolveWardenContact();
  }

  /**
   * Hover behaviour. The guardian rides high while it winds up and drops into
   * player reach during its recovery beat, so every exchange has one readable
   * opening instead of a war of attrition at an unreachable altitude.
   */
  function driftWardenHome(dt) {
    const openingY = warden.data.ground - warden.h - 26;
    const restingY = warden.homeY + Math.sin(warden.bob * 1.5) * 10;
    const targetY = warden.phase === "recover" ? openingY : restingY;
    const targetX = clamp(
      player.x + player.w / 2 - warden.w / 2,
      warden.data.arena.x + TILE,
      warden.data.arena.x + warden.data.arena.w - warden.w - TILE
    );
    const settle = warden.phase === "recover" ? 0.0006 : 0.02;
    warden.x = lerp(warden.x, lerp(warden.homeX, targetX, 0.55), 1 - Math.pow(0.02, dt));
    warden.y = lerp(warden.y, targetY, 1 - Math.pow(settle, dt));
  }

  /** True while the guardian is inside its punishable recovery window. */
  function wardenIsOpen() {
    return Boolean(warden && warden.active && !warden.defeated && warden.phase === "recover");
  }

  function beginWardenAttack(stage) {
    const patterns = stage.patterns;
    warden.attack = patterns[warden.attackIndex % patterns.length];
    warden.attackIndex += 1;
    warden.phase = "telegraph";
    warden.phaseTimer = WARDEN_TELEGRAPH;
    if (warden.attack === "rain") {
      const arena = warden.data.arena;
      warden.markers = [0, 1, 2, 3].map((i) => arena.x + TILE * 2 + ((arena.w - TILE * 4) / 3) * i);
    } else if (warden.attack === "sweep") {
      warden.sweepDir = player.x + player.w / 2 < warden.x + warden.w / 2 ? -1 : 1;
    }
    cue("warden_charge");
  }

  function fireWardenAttack(stage) {
    const center = { x: warden.x + warden.w / 2, y: warden.y + warden.h / 2 };
    if (warden.attack === "volley") {
      const dx = player.x + player.w / 2 - center.x;
      const dy = player.y + player.h / 2 - center.y;
      const base = Math.atan2(dy, dx);
      const count = stage.patterns.length >= 4 ? 5 : 3;
      for (let i = 0; i < count; i += 1) {
        const angle = base + (i - (count - 1) / 2) * 0.22;
        wardenBolts.push({
          x: center.x - 9,
          y: center.y - 9,
          w: 18,
          h: 18,
          vx: Math.cos(angle) * WARDEN_BOLT_SPEED,
          vy: Math.sin(angle) * WARDEN_BOLT_SPEED,
          life: 3.4,
          kind: "bolt",
        });
      }
      warden.phase = "recover";
      warden.phaseTimer = WARDEN_RECOVER;
      cue("warden_volley");
    } else if (warden.attack === "rain") {
      for (const markerX of warden.markers) {
        wardenBolts.push({
          x: markerX - 11,
          y: warden.y + warden.h * 0.5,
          w: 22,
          h: 26,
          vx: 0,
          vy: WARDEN_SHARD_SPEED,
          life: 3.4,
          kind: "shard",
        });
      }
      warden.markers = [];
      warden.phase = "recover";
      warden.phaseTimer = WARDEN_RECOVER;
      cue("warden_rain");
    } else if (warden.attack === "summon") {
      spawnWardenMinions();
      warden.phase = "recover";
      warden.phaseTimer = WARDEN_RECOVER;
      cue("warden_summon");
    } else {
      warden.phase = "act";
      warden.phaseTimer = 1.35;
      cue("warden_sweep");
    }
  }

  function advanceWardenAct(dt, stage) {
    const arena = warden.data.arena;
    const groundY = warden.data.ground - warden.h - 6;
    warden.y = moveToward(warden.y, groundY, 900 * dt);
    warden.x += warden.sweepDir * WARDEN_SWEEP_SPEED * dt;
    const minX = arena.x + 8;
    const maxX = arena.x + arena.w - warden.w - 8;
    if (warden.x <= minX || warden.x >= maxX) {
      warden.x = clamp(warden.x, minX, maxX);
      warden.sweepDir *= -1;
      spawnSpark(warden.x + warden.w / 2, groundY + warden.h, CANVAS_MATERIAL.agedGold, 10);
      shake(6);
    }
    if (warden.phaseTimer <= 0) {
      warden.phase = "recover";
      warden.phaseTimer = WARDEN_RECOVER + 0.25;
      warden.attack = "";
    }
  }

  function spawnWardenMinions() {
    const arena = warden.data.arena;
    const living = activeLevel.enemies.filter((enemy) => enemy.summoned && enemy.alive).length;
    if (living >= 4) return;
    for (const offset of [TILE * 3, arena.w - TILE * 4]) {
      activeLevel.enemies.push({
        x: arena.x + offset,
        y: warden.data.ground - TILE * 3,
        w: ENEMY_WIDTH,
        h: ENEMY_HEIGHT,
        baseX: arena.x + offset,
        baseY: warden.data.ground - TILE * 3,
        vx: 70,
        patrol: TILE * 2,
        type: "wisp",
        alive: true,
        phase: 0,
        summoned: true,
      });
    }
  }

  function updateHostileBolts(dt) {
    for (const bolt of wardenBolts) {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0) continue;
      if (bolt.y > activeLevel.height + 200) bolt.life = 0;
      if (rectsOverlap(bodyRect(player), bolt)) {
        bolt.life = 0;
        hurt(1);
        if (mode !== "play" || player.settledOutcome) return;
      }
    }
    wardenBolts = wardenBolts.filter((bolt) => bolt.life > 0);
  }

  function resolveWardenContact() {
    if (!rectsOverlap(bodyRect(player), warden)) return;
    const stomping = player.vy > 140 && player.y + player.h - warden.y < 34;
    if (stomping) {
      damageWarden(2, "stomp");
      player.vy = -640;
      return;
    }
    if (player.superInvuln > 0 || (save.selected === "yuan" && player.skillTimer > 0)) {
      if (warden.contactCd > 0) return;
      warden.contactCd = WARDEN_CONTACT_COOLDOWN;
      damageWarden(save.selected === "yuan" && player.skillTimer > 0 ? 2 : 1, "impact");
      return;
    }
    hurt(1);
  }

  function damageWarden(amount, source) {
    if (!warden || warden.defeated) return false;
    if (!wardenIsOpen()) {
      // The shell uses the same established deflection language as 石胄: a
      // moon-white flash, armour label, and the shared deflect cue. Contact and
      // projectile callers keep their own bounce, cooldown, and pierce rules.
      warden.hitTimer = WARDEN_HIT_FLASH;
      burst(warden.x + warden.w / 2, warden.y + warden.h / 2, CANVAS_MATERIAL.moonWhite, 8);
      floatText("护甲", warden.x, warden.y, CANVAS_MATERIAL.moonWhite);
      cue("deflect");
      return false;
    }
    warden.health = Math.max(0, warden.health - amount);
    warden.hitTimer = WARDEN_HIT_FLASH;
    warden.hurtCount += 1;
    GameFeel?.requestHitstop?.(source === "stomp" ? 60 : 40);
    shake(source === "stomp" ? 9 : 6);
    burst(warden.x + warden.w / 2, warden.y + warden.h / 2, CANVAS_MATERIAL.agedGold, source === "stomp" ? 22 : 14, {
      shape: source === "stomp" ? "ring" : "shard",
      gravity: source === "stomp" ? 120 : 520,
    });
    chainReward(3, warden.x + warden.w / 2, warden.y, CANVAS_MATERIAL.agedGold);
    cue(source === "stomp" ? "stomp" : "hit_enemy");
    if (warden.health <= 0) defeatWarden();
    return true;
  }

  function defeatWarden() {
    warden.defeated = true;
    warden.active = false;
    wardenBolts = [];
    for (const enemy of activeLevel.enemies) if (enemy.summoned) enemy.alive = false;
    shake(18);
    burst(warden.x + warden.w / 2, warden.y + warden.h / 2, CANVAS_MATERIAL.agedGold, 90, { shape: "shard", gravity: 620 });
    floatText(`${warden.data.name} 归位`, warden.x, warden.y, CANVAS_MATERIAL.agedGold);
    cue("warden_fall");
    toastMsg(`${warden.data.name} 已归位 · 星门开启`);
    save.wardens[activeLevel.id] = 1;
    if (!run.damaged) {
      save.stats.wardenFlawless = Math.min(9999999, (save.stats.wardenFlawless || 0) + 1);
    }
    persist();
  }

  function goalIsSealed() {
    return Boolean(warden && !warden.defeated);
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
    player.skillCd = assistOn("infiniteSkill") ? 0 : Math.max(0, player.skillCd - dt);
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
      burst(player.x + player.w / 2, player.y + player.h / 2, ch.accent, 22, { shape: "streak", gravity: 180, drag: 2.4 });
      cue("dash");
      toastMsg("青衡破风");
    }

    if (save.selected === "yuan" && player.skillTimer > 0) {
      if (dashShouldStopAtEdge()) {
        player.skillTimer = 0;
        player.vx = moveToward(player.vx, 0, 5200 * dt);
        burst(player.x + player.w / 2, player.y + player.h, CANVAS_MATERIAL.carvedJade, 8, { shape: "shard" });
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
      burst(player.x + player.w / 2, player.y + player.h, ch.accent2, 12, { shape: "ring", gravity: 0, drag: 4 });
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
        burst(spring.x + spring.w / 2, spring.y, CANVAS_MATERIAL.agedGold, 24, { shape: "ring", gravity: 120, drag: 3 });
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
        run.stomps += 1;
        GameFeel?.requestHitstop?.(50);
        burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.agedGold, 20, { shape: "shard" });
        chainReward(enemyReward(e), e.x, e.y, CANVAS_MATERIAL.agedGold);
        cue("stomp");
      } else if (player.superInvuln > 0) {
        e.alive = false;
        burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.moonWhite, 28, { shape: "ring", gravity: 90, drag: 2 });
        chainReward(enemyReward(e), e.x, e.y, CANVAS_MATERIAL.moonWhite);
      } else if (player.skillTimer > 0 && save.selected === "yuan") {
        e.alive = false;
        burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.carvedJade, 24, { shape: "streak", gravity: 220, drag: 2 });
        chainReward(enemyReward(e) + 1, e.x, e.y, CANVAS_MATERIAL.carvedJade);
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
          burst(p.x + p.w / 2, p.y + p.h / 2, CANVAS_MATERIAL.agedGold, 30, { shape: "shard", gravity: 760 });
          floatText("碎晶", p.x, p.y, CANVAS_MATERIAL.agedGold);
          cue("break_crystal");
        }
      }
    }

    if (player.y > activeLevel.height + 260) hurt(1, true);
    if (mode !== "play") {
      consumePressed();
      return;
    }
    holdInsideArena();
    lightLanterns();
    collectMarrow();
    const outcome = Rules.resolveTerminalOutcome({
      isDead: player.health <= 0,
      reachedGoal: !player.completed && !goalIsSealed() && rectsOverlap(bodyRect(player), goalReachRect()),
      settledOutcome: player.settledOutcome,
    });
    if (outcome === Rules.OUTCOME_COMPLETE) completeLevel();
    consumePressed();
  }

  /**
   * The gate is drawn at its authored rect but accepts a slightly larger reach,
   * the same forgiveness pickups already get. Grazing the beacon's edge at speed
   * now finishes the chapter instead of sliding past a 70 px column.
   */
  function goalReachRect() {
    const goal = activeLevel.goal;
    return {
      x: goal.x - GOAL_REACH_X,
      y: goal.y - GOAL_REACH_Y,
      w: goal.w + GOAL_REACH_X * 2,
      h: goal.h + GOAL_REACH_Y * 2,
    };
  }

  /** While a warden is awake its arena edge is solid, so the fight cannot be skipped. */
  function holdInsideArena() {
    const active = activeWarden();
    if (!active || !active.active) return;
    const edge = active.data.arena.x;
    if (player.x >= edge) return;
    player.x = edge;
    if (player.vx < 0) player.vx = 0;
    syncPresentationCoordinates();
  }

  /**
   * Light any star lantern the player touches and move the respawn anchor there.
   * Lanterns are one-way: progress is never taken back by walking left.
   */
  function lightLanterns() {
    for (const lantern of activeLevel.lanterns || []) {
      if (lantern.lit || !rectsOverlap(bodyRect(player), lantern)) continue;
      lantern.lit = true;
      player.spawn = {
        x: clamp(lantern.x + lantern.w / 2 - player.baseW / 2, 0, activeLevel.width - player.baseW),
        y: lantern.y + lantern.h - player.baseH,
      };
      burst(lantern.x + lantern.w / 2, lantern.y + 12, CANVAS_MATERIAL.agedGold, 26);
      cue("lantern");
      toastMsg("星灯已点亮 · 从此处重启");
    }
  }

  function collectMarrow() {
    const marrow = activeLevel.marrow;
    if (!marrow || marrow.taken || !rectsOverlap(pickupRect(player), marrow)) return;
    marrow.taken = true;
    run.marrow = true;
    save.marrow[activeLevel.id] = 1;
    persist();
    shake(6);
    burst(marrow.x + marrow.w / 2, marrow.y + marrow.h / 2, CANVAS_MATERIAL.dustyRose, 44);
    floatText("星髓", marrow.x, marrow.y, CANVAS_MATERIAL.dustyRose);
    cue("marrow");
    toastMsg("拾得星髓 · 已记入星录");
  }

  /** Star dew a hostile is worth before the chain multiplier. */
  function enemyReward(enemy) {
    if (enemy.type === "warder") return 4;
    if (enemy.type === "sentry") return 3;
    if (enemy.type === "wisp") return 3;
    return 2;
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
      player.airJumps = airJumpBudget();
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
          player.airJumps = airJumpBudget();
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
          burst(p.x + p.w / 2, p.y + p.h / 2, CANVAS_MATERIAL.agedGold, 22, { shape: "shard", gravity: 760 });
          floatText("碎晶", p.x, p.y, CANVAS_MATERIAL.agedGold);
          cue("break_crystal");
        } else {
          pr.life = 0;
        }
      }
      for (const e of activeLevel.enemies) {
        if (!e.alive || pr.life <= 0 || !rectsOverlap(pr, e)) continue;
        if (enemyResistsProjectiles(e)) {
          // 石胄 shells deflect star bolts; the fight has to be answered with impact.
          e.hitTimer = ENEMY_HIT_FLASH_DURATION;
          pr.life = 0;
          burst(e.x + e.w / 2, e.y + e.h / 2, CANVAS_MATERIAL.moonWhite, 8);
          floatText("护甲", e.x, e.y, CANVAS_MATERIAL.moonWhite);
          cue("deflect");
          continue;
        }
        e.hp = (e.hp || enemyHitPoints(e)) - pr.damage;
        e.hitTimer = ENEMY_HIT_FLASH_DURATION;
        GameFeel?.requestHitstop?.(35);
        burst(e.x + e.w / 2, e.y + e.h / 2, pr.color, 14, { shape: e.hp <= 0 ? "shard" : "orb" });
        cue("hit_take");
        if (e.hp <= 0) {
          e.alive = false;
          chainReward(enemyReward(e) + pr.damage, e.x, e.y, CANVAS_MATERIAL.agedGold);
        }
        if (pr.pierce > 0) pr.pierce -= 1;
        else pr.life = 0;
      }
      const guardian = activeWarden();
      if (guardian && guardian.active && pr.life > 0 && rectsOverlap(pr, guardian)) {
        damageWarden(pr.damage, "bolt");
        if (pr.pierce > 0) pr.pierce -= 1;
        else pr.life = 0;
      }
    }
    // World-space cull radius rather than a viewport-relative one: a projectile
    // must not survive longer on a wide monitor than on a phone. The radius sits
    // beyond the furthest a boosted shot can travel inside its own lifetime, so
    // `pr.life` stays the real limit and this is only a safety net.
    projectiles = projectiles.filter(
      (pr) => pr.life > 0 && Math.abs(pr.x - (player.x + player.w / 2)) < PROJECTILE_CULL_RADIUS
    );
  }

  function enemyHitPoints(enemy) {
    if (enemy.type === "sentry") return 2;
    if (enemy.type === "ember") return 3;
    return 2;
  }

  function nearestEnemy(pr) {
    // Nini's mild homing tracks the open guardian too, so the recovery window is
    // usable without pixel-accurate aiming.
    if (wardenIsOpen()) return warden;
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
      if (e.type === "sentry") {
        updateSentry(e, dt);
        continue;
      }
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

  /**
   * v2.0.0 — 哨星 sentry. A fixed emplacement that faces the player, telegraphs
   * for a readable beat, then fires one slow bolt. It never moves, so the answer
   * is always positioning rather than reaction speed.
   */
  function updateSentry(e, dt) {
    const support = enemySupportPlatform(e);
    if (support) e.y = support.y - e.h;
    const toPlayer = player.x + player.w / 2 - (e.x + e.w / 2);
    if (Math.abs(toPlayer) > 24) e.facing = Math.sign(toPlayer);
    // World-space range. Reading the viewport here would make the same chapter
    // play differently on a wide desktop than on a phone.
    const inRange = Math.abs(toPlayer) < SENTRY_RANGE && Math.abs(player.y - e.y) < TILE * 6;
    if (!inRange) {
      e.fireTimer = Math.min(e.fireTimer, e.cadence * 0.5);
      return;
    }
    e.fireTimer -= dt;
    if (e.fireTimer > 0) return;
    e.fireTimer = e.cadence;
    wardenBolts.push({
      x: e.x + e.w / 2 - 8 + e.facing * 16,
      y: e.y + e.h * 0.34,
      w: 16,
      h: 16,
      vx: e.facing * WARDEN_BOLT_SPEED * 0.82,
      vy: -30,
      life: 2.6,
      kind: "sentry",
    });
    burst(e.x + e.w / 2 + e.facing * 18, e.y + e.h * 0.4, CANVAS_MATERIAL.danger, 6);
    cue("sentry_fire");
  }

  /** Shelled hostiles ignore projectiles; only impact answers them. */
  function enemyResistsProjectiles(enemy) {
    return enemy?.type === "warder";
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
      // The collection rating reads `collectedValue`, which always takes the
      // authored value. Only star dew is allowed to grow with the chain.
      player.collectedValue += amount;
      const pickupColor = c.kind === "gem" ? CANVAS_MATERIAL.carvedJade : CANVAS_MATERIAL.agedGold;
      if (c.kind === "gem") {
        player.gems += 1;
        chainReward(amount, c.x, c.y, pickupColor);
      } else {
        player.coins += amount;
        // Common star dew keeps a live chain breathing without extending it.
        if (combo.chain > 0) combo.remaining = chainWindow();
        floatText(`+${amount}`, c.x, c.y, pickupColor);
      }
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
    if (assistOn("invulnerable")) {
      // Assist absorbs the damage. A fall still returns the player to the last
      // lit lantern, because the level below the floor has nowhere to stand.
      if (forceRespawn) {
        respawn();
        return;
      }
      if (player.guardFeedbackCd > 0) return;
      player.guardFeedbackCd = SUPER_GUARD_FEEDBACK_COOLDOWN;
      burst(player.x + player.w / 2, player.y + player.h / 2, CANVAS_MATERIAL.moonWhite, 10);
      cue("hit_super");
      return;
    }
    GameFeel?.requestHitstop?.(70);
    run.damaged = true;
    breakCombo();
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
        save.stats.deaths = Math.min(9999999, (save.stats.deaths || 0) + 1);
        persist();
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
    wardenBolts = [];
    breakCombo();
    player.x = player.spawn.x;
    // Spawn anchors are authored for the base silhouette. Bottom-align instead of
    // copying the y directly, so respawning while enlarged does not start the
    // player inside the platform.
    player.y = player.spawn.y + player.baseH - player.h;
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
    const stars = starCount();
    const previousBest = save.bestTimes[id];
    const ranked = recordsAreRanked();
    // Assist runs still unlock chapters, star ratings, and star marrow. They do
    // not write best times or trial medals, so ranked records stay comparable.
    const newRecord = ranked && (!previousBest || player.elapsed < previousBest);
    if (newRecord) save.bestTimes[id] = player.elapsed;
    save.unlocked = Math.max(save.unlocked, currentLevelIndex + 2);
    save.totalCoins += player.coins;
    save.levelStars[id] = Math.max(save.levelStars[id] || 0, stars);
    save.clears[save.selected][id] = 1;
    save.stats.bestCombo = Math.max(save.stats.bestCombo || 0, combo.best);
    save.stats.stomps = Math.min(9999999, (save.stats.stomps || 0) + run.stomps);
    if (!run.damaged) save.flawless[id] = 1;
    if (run.assist) save.assistUsed = true;
    const unlockedNow = Progression.newlyUnlocked(save, levels);
    for (const achievementId of unlockedNow) save.achievements[achievementId] = 1;
    persist();
    burst(activeLevel.goal.x + 35, activeLevel.goal.y + 50, CANVAS_MATERIAL.agedGold, 80);
    cue("complete");
    const medal = ranked ? Progression.medalForTime(save.bestTimes[id], activeLevel.par) : "";
    Hud.renderOutcomeReport(document.getElementById("modalReport"), {
      stars,
      coins: player.coins,
      elapsed: player.elapsed,
      best: save.bestTimes[id],
      newRecord,
      medal,
      medalLabel: Progression.medalLabel(medal),
      par: activeLevel.par,
      marrow: run.marrow,
      marrowFound: Boolean(save.marrow[id]),
      flawless: !run.damaged,
      bestCombo: combo.best,
      assist: run.assist,
      achievements: unlockedNow.map((achievementId) => Progression.achievementById(achievementId)).filter(Boolean),
      formatTime,
    });
    openModal(
      "通关完成",
      `${activeLevel.name} 已通关。`,
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
    presentation.motionRenderedAt = player?.elapsed || 0;
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
    Playfield.drawScenery?.(ctx, level, {
      time: sceneTime(),
      reducedMotion: view.reducedMotion,
      fx: save.settings.fx,
    });
    drawPhaseTide(level, tide);
    for (const w of level.wind || []) drawWind(w);
    drawGoal(level.goal);
    for (const lantern of level.lanterns || []) drawLantern(lantern);
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
    drawMarrow(level);
    for (const pr of projectiles) drawProjectile(pr);
    for (const e of level.enemies) if (e.alive) drawEnemy(e);
    drawWardenScene(level);
  }

  function drawLantern(lantern) {
    WardenArt?.drawLantern?.(ctx, lantern, { time: sceneTime() });
  }

  function drawMarrow(level) {
    if (!level.marrow || level.marrow.taken) return;
    WardenArt?.drawMarrow?.(ctx, level.marrow, { time: sceneTime() });
  }

  function drawWardenScene(level) {
    const time = sceneTime();
    for (const bolt of wardenBolts) WardenArt?.drawHostileBolt?.(ctx, bolt, time);
    if (!warden) return;
    const arena = warden.data.arena;
    WardenArt?.drawArenaSeal?.(ctx, {
      x: arena.x,
      top: Math.max(0, camera.y - 80),
      bottom: level.height + 40,
      time,
      active: warden.active && !warden.defeated,
    });
    if (warden.defeated) return;
    if (warden.phase === "telegraph" && warden.attack === "rain") {
      WardenArt?.drawWardenMarkers?.(ctx, warden.markers, {
        groundY: warden.data.ground,
        progress: 1 - clamp(warden.phaseTimer / WARDEN_TELEGRAPH, 0, 1),
      });
    }
    WardenArt?.drawWarden?.(ctx, { ...warden, palette: warden.data.palette }, {
      time,
      telegraph: warden.phase === "telegraph" ? 1 - clamp(warden.phaseTimer / WARDEN_TELEGRAPH, 0, 1) : 0,
      flash: warden.hitTimer,
      sigil: warden.data.sigil,
      phase: warden.phase,
      attack: warden.attack,
      open: wardenIsOpen(),
      healthRatio: warden.health / Math.max(1, warden.maxHealth),
      reducedMotion: view.reducedMotion,
      fontFamily: CANVAS_FONT_FAMILY,
    });
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
    if (e.type === "sentry") {
      WardenArt?.drawSentry?.(ctx, e, {
        time: sceneTime(),
        charge: clamp(1 - e.fireTimer / Math.max(0.01, SENTRY_TELEGRAPH), 0, 1),
        flash: e.hitTimer || 0,
        reducedMotion: view.reducedMotion,
      });
      return;
    }
    if (e.type === "warder") {
      WardenArt?.drawWarder?.(ctx, e, {
        time: sceneTime(),
        flash: e.hitTimer || 0,
        reducedMotion: view.reducedMotion,
      });
      return;
    }
    const playerCenter = player ? player.x + player.w / 2 : e.x;
    const focus = clamp(1 - Math.abs(playerCenter - (e.x + e.w / 2)) / 360, 0, 1);
    CreatureArt.drawEnemy(ctx, e, {
      time: sceneTime(),
      hitDuration: ENEMY_HIT_FLASH_DURATION,
      floatGap: WISP_FLOAT_GAP,
      hoverRange: WISP_HOVER_RANGE,
      reducedMotion: view.reducedMotion,
      focus,
      support: e.type === "wisp" ? null : enemySupportPlatform(e),
    });
  }

  function drawGoal(g) {
    const sealed = goalIsSealed();
    Playfield.drawGoal(ctx, g, { time: sceneTime(), reducedMotion: view.reducedMotion, sealed });
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
    const motionDelta = clamp(simulationTime - (Number(presentation.motionRenderedAt) || simulationTime), 0, 0.1);
    const discretePoseJump =
      previousAnimation !== animationName &&
      (/^hurt_|^skill_|^land_/.test(animationName) || /^hurt_|^skill_/.test(previousAnimation || ""));
    if (presentation.snapMotionPose || discretePoseJump || !presentation.displayMotionPose) {
      presentation.displayMotionPose = resolvedMotion || CharacterMotion?.emptyMotionPose?.() || null;
      presentation.snapMotionPose = false;
    } else {
      const blendAlpha = CharacterMotion?.dampedBlendAlpha?.(motionDelta, 22) ?? 1;
      presentation.displayMotionPose = CharacterMotion?.blendMotionPose?.(
        presentation.displayMotionPose,
        resolvedMotion,
        blendAlpha,
        { linear: true },
      ) || resolvedMotion;
    }
    presentation.resolvedMotionPose = resolvedMotion || null;
    presentation.motionRenderedAt = simulationTime;
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
    const destW = align(targetW);
    const destH = align(targetH);
    const effectPlan = CharacterEffects?.resolveEffectPlan?.({
      id,
      animation: animName,
      elapsed: motionElapsed,
      stride: motion?.stride,
      reducedMotion: view.reducedMotion || !save.settings.fx,
    });
    const effectStill = view.reducedMotion || !save.settings.fx;
    const localDirection = facing * orientation.frameScaleX;
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
    CharacterEffects?.drawUnderlay?.(ctx, {
      id,
      plan: effectPlan,
      width: destW,
      height: destH,
      time: simulationTime,
      direction: localDirection,
      reducedMotion: effectStill,
    });
    drawMovementTrace(id, motion, targetW, targetH, scale);
    CharacterEffects?.drawAfterimages?.(ctx, image, sourceFrame, {
      id,
      plan: effectPlan,
      width: destW,
      height: destH,
      direction: facing,
      frameScaleX: orientation.frameScaleX,
    });
    const signatureArtifact = effectPlan?.orbit > 0 || effectPlan?.slash > 0 ? "rest" : motion?.artifact;
    drawMotionArtifact(id, signatureArtifact, targetW, targetH, scale, {
      directionScale: orientation.artifactScale,
      time: simulationTime,
      motionElapsed,
      reducedMotion: effectStill,
    });
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
    CharacterEffects?.drawOverlay?.(ctx, {
      id,
      plan: effectPlan,
      width: destW,
      height: destH,
      direction: localDirection,
    });
    ctx.restore();
    return true;
  }

  function drawMovementTrace(id, motion, targetW, targetH, scale) {
    const stride = Number(motion?.stride) || 0;
    if (stride < 0.28 || motion?.artifact === "gui-sword-cut" || view.reducedMotion || !save.settings.fx) return;
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

  function drawMotionArtifact(id, artifact, targetW, targetH, scale, options = {}) {
    if (!artifact || artifact === "rest") return;
    const directionScale = options.directionScale < 0 ? -1 : 1;
    const time = Math.max(0, Number(options.time) || 0);
    const motionElapsed = Math.max(0, Number(options.motionElapsed) || 0);
    const artifactTime = options.reducedMotion === true ? 0 : time;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineCap = "round";
    if (artifact.startsWith("star-dial")) {
      const open = artifact === "star-dial-open" ? 1 : 0.72;
      const radius = targetW * (0.42 + open * 0.08);
      ctx.translate(targetW * 0.18 * directionScale, -targetH * 0.58);
      ctx.rotate((artifactTime / 0.9) * directionScale);
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

  function burst(x, y, color, count, options = {}) {
    if (!save.settings.fx) count = Math.ceil(count * 0.45);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 420;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: 2 + Math.random() * 4,
        life: 0.35 + Math.random() * 0.55,
        max: 0.9,
        color,
        shape: options.shape || "orb",
        gravity: Number.isFinite(options.gravity) ? options.gravity : 520,
        drag: Math.max(0, Number(options.drag) || 0),
        rotation: a,
        spin: (Math.random() - 0.5) * 9,
      });
    }
    // v1.2.4 — single composite-add glow ring on warm pickup bursts so coins feel collected.
    if (save.settings.fx && [CANVAS_MATERIAL.agedGold, CANVAS_MATERIAL.carvedJade, CANVAS_MATERIAL.moonWhite].includes(color)) {
      particles.push({ x, y, vx: 0, vy: 0, r: 18, life: 0.28, max: 0.28, color, glow: true });
    }
  }

  function spawnSpark(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push({
      x,
      y,
      vx: -player.facing * (50 + Math.random() * 120),
      vy: 80 + Math.random() * 70,
      r: 2,
      life: 0.28,
      max: 0.28,
      color,
      shape: "streak",
      gravity: 420,
      rotation: player.facing > 0 ? Math.PI : 0,
    });
  }

  function spawnWind(x, y, dir) {
    if (!save.settings.fx || Math.random() > 0.28) return;
    particles.push({
      x,
      y,
      vx: -dir * (70 + Math.random() * 70),
      vy: -20 + Math.random() * 40,
      r: 1.5,
      life: 0.35,
      max: 0.35,
      color: CANVAS_MATERIAL.moonWhiteSoft,
      shape: "streak",
      gravity: 0,
      rotation: dir > 0 ? Math.PI : 0,
    });
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (Number.isFinite(p.gravity) ? p.gravity : 520) * dt;
      if (p.drag > 0) {
        const damping = Math.exp(-p.drag * dt);
        p.vx *= damping;
        p.vy *= damping;
      }
      p.rotation = (Number(p.rotation) || 0) + (Number(p.spin) || 0) * dt;
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
      Playfield.drawParticle(ctx, p, { alpha: clamp(p.life / p.max, 0, 1) });
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
    updateChainHud();
    updateWardenHud();
  }

  function updateChainHud() {
    const live = combo.chain > 0;
    if (hudState.values.chainLive !== live) {
      hudEls.chain.hidden = !live;
      hudState.values.chainLive = live;
    }
    if (!live) return;
    setHudText("chainCount", hudEls.chainCount, combo.chain);
    setHudText("chainMult", hudEls.chainMult, `×${combo.multiplier}`);
    const remaining = Math.round(clamp(combo.remaining / chainWindow(), 0, 1) * 100);
    if (hudState.values.chainFill !== remaining) {
      hudEls.chainFill.style.width = `${remaining}%`;
      hudState.values.chainFill = remaining;
    }
  }

  function updateWardenHud() {
    const showing = Boolean(warden && warden.active && !warden.defeated);
    if (hudState.values.wardenShowing !== showing) {
      hudEls.wardenBar.hidden = !showing;
      hudState.values.wardenShowing = showing;
    }
    if (!showing) return;
    setHudText("wardenName", hudEls.wardenName, warden.data.name);
    setHudText("wardenPhase", hudEls.wardenPhase, wardenPhaseLabel());
    const ratio = Math.round(clamp(warden.health / warden.maxHealth, 0, 1) * 100);
    if (hudState.values.wardenFill !== ratio) {
      hudEls.wardenFill.style.width = `${ratio}%`;
      hudEls.wardenTrack.setAttribute("aria-valuenow", String(ratio));
      hudEls.wardenTrack.setAttribute("aria-valuetext", `${warden.data.name} 残余星力 ${ratio}%`);
      hudState.values.wardenFill = ratio;
    }
  }

  function wardenPhaseLabel() {
    if (warden.phase === "telegraph") return "蓄势";
    if (warden.phase === "act") return "横扫";
    if (warden.phase === "recover") return "破绽";
    return "对峙";
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

  function clearToast() {
    clearTimeout(toastTimer);
    toastTimer = 0;
    toast.classList.remove("show");
    toast.textContent = "";
  }

  function toastMsg(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastTimer = 0;
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
    // The completion report is written before openModal; every other dialog clears it.
    if (eyebrow !== "胜利") Hud.clearOutcomeReport(document.getElementById("modalReport"));
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
    Hud.renderSaveStrip(document.getElementById("saveStrip"), save, characters, levels, Progression);
    Hud.renderLevelList(levelList, { levels, save, startLevel, formatTime, progression: Progression });
    Hud.renderRecordScreen(document.getElementById("recordSummary"), document.getElementById("recordGroups"), {
      progression: Progression,
      save,
      levels,
      formatTime,
    });
    document.getElementById("volumeRange").value = save.settings.volume;
    document.getElementById("bgmRange").value = save.settings.bgmVolume;
    document.getElementById("touchRange").value = save.settings.touch;
    document.getElementById("touchOpacityRange").value = save.settings.touchOpacity;
    document.getElementById("hudScaleRange").value = save.settings.hudScale;
    document.getElementById("fxToggle").checked = save.settings.fx;
    document.getElementById("shakeToggle").checked = save.settings.shake;
    syncAssistControls();
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
      if (action === "record") showScreen("record");
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
    bindAssistControls();
    for (const range of document.querySelectorAll(".settings-list input[type='range']")) {
      range.addEventListener("change", flushPersist);
    }
  }

  const ASSIST_TOGGLES = [
    ["assistToggle", "enabled"],
    ["assistInvulnToggle", "invulnerable"],
    ["assistSkillToggle", "infiniteSkill"],
    ["assistJumpToggle", "extraJump"],
  ];

  function bindAssistControls() {
    for (const [elementId, key] of ASSIST_TOGGLES) {
      document.getElementById(elementId).addEventListener("change", (e) => {
        save.settings.assist[key] = e.target.checked;
        // Turning a helper on implies the player wants assist active.
        if (key !== "enabled" && e.target.checked) save.settings.assist.enabled = true;
        persist();
        syncAssistControls();
      });
    }
    document.getElementById("assistSpeedRange").addEventListener("input", (e) => {
      save.settings.assist.speed = Number(e.target.value);
      if (save.settings.assist.speed < 100) save.settings.assist.enabled = true;
      updateSettingOutputs();
      syncAssistControls();
      schedulePersist();
    });
  }

  function syncAssistControls() {
    const assist = save.settings.assist;
    for (const [elementId, key] of ASSIST_TOGGLES) {
      const element = document.getElementById(elementId);
      if (element && element.checked !== Boolean(assist[key])) element.checked = Boolean(assist[key]);
    }
    const speed = document.getElementById("assistSpeedRange");
    if (speed && Number(speed.value) !== assist.speed) speed.value = String(assist.speed);
    const group = document.querySelector(".settings-assist");
    if (group) group.classList.toggle("assist-on", assist.enabled === true);
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
    document.getElementById("assistSpeedValue").value = `${save.settings.assist.speed}%`;
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

  /** Records the hidden-letter easter egg and syncs any achievement it unlocks. */
  function recordHiddenLetter() {
    if (save.stats.letters > 0) return;
    save.stats.letters = 1;
    syncAchievements();
  }

  /**
   * Recompute achievement predicates, record anything newly true, and announce it.
   * Safe to call at any point: unlocking is idempotent.
   */
  function syncAchievements() {
    const unlockedNow = Progression.newlyUnlocked(save, levels);
    if (!unlockedNow.length) {
      persist();
      return [];
    }
    for (const id of unlockedNow) save.achievements[id] = 1;
    persist();
    const first = Progression.achievementById(unlockedNow[0]);
    if (first) {
      toastMsg(unlockedNow.length > 1 ? `星录 +${unlockedNow.length} · ${first.name}` : `星录 · ${first.name}`);
    }
    if (screen === "record" || screen === "menu") renderMenus();
    return unlockedNow;
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
    // Assist slows the delivered frame, not the fixed step, so physics constants,
    // coyote time, jump buffer, and step budgets stay exactly as authored.
    const scaledFrameDt = frameDt * assistTimeScale();
    const simulationDt = GameFeel?.consumeHitstop?.(scaledFrameDt) ?? scaledFrameDt;
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
    document.addEventListener("nini:letter", recordHiddenLetter);
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
