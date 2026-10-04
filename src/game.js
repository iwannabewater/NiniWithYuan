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
    characterSigil: document.getElementById("hudCharacterSigil"),
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
  const Chapters = window.NiniYuanChapters;
  const CharacterData = window.NiniYuanCharacters;
  const Sim = window.NiniYuanSim;
  const Hud = window.NiniYuanHud;
  const CharacterMotion = window.NiniYuanCharacterMotion;
  const CharacterEffects = window.NiniYuanCharacterEffects;
  const CharacterGilding = window.NiniYuanCharacterGilding;
  const Terrain = window.NiniYuanTerrain;
  const Props = window.NiniYuanProps;
  const Effects = window.NiniYuanEffects;
  const CreatureArt = window.NiniYuanCreatureMaterial;
  const GameFeel = window.NiniYuanGameFeel;
  const RespawnVeil = window.NiniYuanRespawnVeil;
  const WardenArt = window.NiniYuanWarden;
  const Camera = window.NiniYuanCamera;
  const Scenery = window.NiniYuanScenery;
  const Art = window.NiniYuanArt;
  const SIM = Sim.CONSTANTS;
  const WISP_FLOAT_GAP = Chapters.WISP_FLOAT_GAP;
  const WISP_HOVER_RANGE = Chapters.WISP_HOVER_RANGE;
  const WIND_ARROW_SPACING = 72;
  const WIND_ARROW_SPEED = 18;
  const SETTINGS_PERSIST_DELAY = 150;
  const MAX_CANVAS_PIXELS = 3.7e6;
  const ACCESSIBLE_TOUCH_HOLD = 140;
  const CANVAS_FONT_FAMILY = '"LXGW WenKai Local", "LXGW WenKai", "Noto Serif SC", "Noto Sans SC", "PingFang SC", sans-serif';
  const CANVAS_MATERIAL = Props.MATERIAL;
  const FLOAT_FONT = `700 20px ${CANVAS_FONT_FAMILY}`;
  const FLOAT_FONT_ITALIC = `italic 700 20px ${CANVAS_FONT_FAMILY}`;
  // Glow rings accompany warm pickup bursts so collection reads as a reward.
  const GLOW_BURST_COLORS = new Set(["#c3a468", "#6da895", "#eee7d5"]);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const snap = (n) => Math.round(n);

  let view = { w: 1280, h: 720, dpr: 1, isMobileLandscape: false, reducedMotion: false };
  let screen = "menu";
  let mode = "menu";
  let currentLevelIndex = 0;
  // `world` owns one chapter attempt. `player`, `activeLevel`, and `warden` are
  // stable references into it for the presentation code below; arrays the
  // simulation replaces (projectiles, bolts) are always read through `world`.
  let world = null;
  let activeLevel = null;
  let player = null;
  let warden = null;
  let camera = Camera.create();
  // Painted chapter backdrop and the animated menu landscape. Both are
  // composed once per chapter (or viewport) and blitted each frame.
  let scene = null;
  let menuScene = null;
  // Chapter terrain recipes (paths and gradients), prepared once per attempt.
  let terrain = null;
  // Screen-space post layers, rebuilt only when the viewport changes.
  let vignette = null;
  const screenFlash = Effects.createFlash();
  // Reused per frame: the padded world rectangle on screen, and draw options.
  const cullRect = { x: 0, y: 0, w: 0, h: 0 };
  const propFrame = { time: 0, reducedMotion: false, fx: true, rect: cullRect, color: "", sealed: false, arrowSpacing: WIND_ARROW_SPACING, arrowSpeed: WIND_ARROW_SPEED };
  let lastRenderAt = performance.now();
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
  const particles = Effects.createParticlePool();
  const floatTexts = Effects.createTextPool();
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
  // v1.2.4 — track HUD state so we can fire one-shot pulses only on real transitions.
  let hudState = { character: null, cooling: null, phaseCritical: null, values: Object.create(null) };
  const physicalKeys = new Set();
  const suppressedKeys = new Set();
  const actionInputs = InputState.createActionInputState(["left", "right", "jump", "skill", "shoot"]);
  const dialogIsolationState = new Map();

  const characters = CharacterData.CHARACTERS;
  // Presentation accents per character. Gameplay stats never read these.
  const CHARACTER_TONES = {
    nini: { accent: CANVAS_MATERIAL.dustyRose, accent2: CANVAS_MATERIAL.agedGold },
    yuan: { accent: CANVAS_MATERIAL.phaseBlue, accent2: CANVAS_MATERIAL.carvedJade },
  };

  const characterSprites = {
    nini: loadSprite("./assets/characters/nini/nini-atlas-v1.png"),
    yuan: loadSprite("./assets/characters/yuan/yuan-atlas-v1.png"),
  };
  const characterAtlases = {
    nini: loadAtlas("./assets/characters/nini/atlas.json"),
    yuan: loadAtlas("./assets/characters/yuan/atlas.json"),
  };

  const levels = Chapters.buildChapters();
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

  /**
   * Assist slows the delivered frame, never the fixed step, so physics
   * constants, coyote time, jump buffer, and step budgets stay as authored.
   */
  function assistTimeScale() {
    const assist = save.settings.assist || {};
    if (assist.enabled !== true) return 1;
    return clamp((Number(assist.speed) || 100) / 100, 0.6, 1);
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

  function resize() {
    // Device pixels are capped near 1440p: past that, fill rate costs more
    // than the extra sharpness is worth, and the DOM HUD stays crisp anyway.
    const cssPixels = Math.max(1, innerWidth * innerHeight);
    const dpr = Math.min(clamp(window.devicePixelRatio || 1, 1, 2), Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / cssPixels)));
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
    // Bilinear by default: backdrops blit 1:1 and glows are soft. Bitmap
    // character frames opt into high-quality filtering where they draw.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    Camera.configure(camera, view);
    menuScene = null;
    vignette = Effects.createVignette(view);
    if (activeLevel) composeChapterScene();
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

  function startLevel(index) {
    currentLevelIndex = index;
    world = Sim.createWorld(levels[index], {
      character: characters[save.selected],
      assist: save.settings.assist,
    });
    activeLevel = world.level;
    player = world.player;
    warden = world.warden;
    Effects.clear(particles);
    Effects.clearTexts(floatTexts);
    screenFlash.intensity = 0;
    camera = Camera.configure(Camera.create(), view);
    Camera.frameImmediately(camera, player, activeLevel);
    composeChapterScene();
    terrain = Terrain.prepare(ctx, activeLevel);
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

  function update(dt) {
    if (mode !== "play" || orientationGated || !world) return;
    updateInputs();
    if (inputs.left || inputs.right || inputs.jump || inputs.skill || inputs.shoot) dismissChapterIntro();
    Sim.step(world, inputs, dt);
    applySimEvents();
    if (mode !== "play" || player.settledOutcome) return;
    spawnContinuousEffects();
    updateParticles(dt);
    updateCamera(dt);
    updateChapterIntro(dt);
  }

  /** Semantic event tones resolve to the active palette here, not in the simulation. */
  function toneColor(tone) {
    if (tone === "gold") return CANVAS_MATERIAL.agedGold;
    if (tone === "jade") return CANVAS_MATERIAL.carvedJade;
    if (tone === "moon") return CANVAS_MATERIAL.moonWhite;
    if (tone === "rose") return CANVAS_MATERIAL.dustyRose;
    if (tone === "danger") return CANVAS_MATERIAL.danger;
    if (tone === "accent") return CHARACTER_TONES[save.selected].accent;
    if (tone === "accent2") return CHARACTER_TONES[save.selected].accent2;
    if (typeof tone === "string" && tone.startsWith("portal:")) return Props.portalColor({ palette: tone.slice(7) });
    if (typeof tone === "string" && tone.startsWith("powerup:")) return Props.powerupColor(tone.slice(8));
    return CANVAS_MATERIAL.agedGold;
  }

  /**
   * Drain the simulation's event queue into presentation, audio, notices, and
   * persistent records. Runs inside the fixed step, so a hit-stop request is
   * visible to the frame scheduler before the next step begins.
   */
  function applySimEvents() {
    for (const event of Sim.drainEvents(world)) {
      switch (event.type) {
        case "burst":
          burst(event.x, event.y, toneColor(event.tone), event.count, event);
          break;
        case "float":
          floatText(event.text, event.x, event.y, toneColor(event.tone));
          break;
        case "cue":
          cue(event.name);
          break;
        case "shake":
          shake(event.amount);
          break;
        case "hitstop":
          GameFeel?.requestHitstop?.(event.ms);
          break;
        case "hitstopReset":
          GameFeel?.resetHitstop?.();
          break;
        case "landing":
          GameFeel?.landingPuff?.(spawnDust, event.x, event.y, event.intensity, save.settings.fx);
          break;
        case "hurt":
          if (!view.reducedMotion) Effects.triggerFlash(screenFlash, CANVAS_MATERIAL.danger, 0.16, 5);
          break;
        case "respawn":
          RespawnVeil?.flash?.(180);
          break;
        case "snap":
          requestPresentationSnap(event.camera === true);
          break;
        case "cameraReset":
          GameFeel?.cameraLookaheadReset?.(camera);
          break;
        case "syncPresentation":
          syncPresentationCoordinates();
          break;
        case "skill":
          toastMsg(characters[event.id]?.skillName || "");
          break;
        case "powerup":
          toastMsg(event.label);
          break;
        case "lantern":
          toastMsg("星灯已点亮 · 从此处重启");
          break;
        case "marrow":
          save.marrow[event.levelId] = 1;
          persist();
          toastMsg("拾得星髓 · 已记入星录");
          break;
        case "tideRecall":
          toastMsg("星潮回卷");
          break;
        case "wardenWake":
          toastMsg(`${event.name} · 星门已封`);
          break;
        case "wardenDefeated":
          if (!view.reducedMotion) Effects.triggerFlash(screenFlash, CANVAS_MATERIAL.moonWhite, 0.22, 2.5);
          toastMsg(`${event.name} 已归位 · 星门开启`);
          save.wardens[event.levelId] = 1;
          if (event.flawless) save.stats.wardenFlawless = Math.min(9999999, (save.stats.wardenFlawless || 0) + 1);
          persist();
          break;
        case "outcome":
          if (event.outcome === Rules.OUTCOME_DEATH) handleDeath();
          else if (event.outcome === Rules.OUTCOME_COMPLETE) handleCompletion();
          break;
        default:
          break;
      }
    }
  }

  /** Continuous presentation derived from simulation state rather than events. */
  function spawnContinuousEffects() {
    if (player.glide > 0 && save.settings.fx) spawnSpark(player.x + 16, player.y + 28, CHARACTER_TONES[save.selected].accent, 1);
    if (player.windDir) spawnWind(player.x + player.w / 2, player.y + player.h / 2, player.windDir);
  }

  function updateInputs() {
    const direction = actionInputs.direction();
    inputs.left = direction < 0;
    inputs.right = direction > 0;
    inputs.jump = actionInputs.isActive("jump");
    inputs.skill = actionInputs.isActive("skill");
    inputs.shoot = actionInputs.isActive("shoot");
  }

  function handleDeath() {
    save.stats.deaths = Math.min(9999999, (save.stats.deaths || 0) + 1);
    persist();
    cue("fail");
    openModal("再试一次", "星光暂时黯淡，但路线已经记住了。", [
      ["重新挑战", () => startLevel(currentLevelIndex), "primary"],
      ["返回菜单", backToMenu],
    ], "挑战失败");
  }

  function handleCompletion() {
    const id = activeLevel.id;
    const run = world.run;
    const combo = world.combo;
    const stars = Sim.starCount(world);
    const previousBest = save.bestTimes[id];
    // Assist runs still unlock chapters, star ratings, and star marrow. They do
    // not write best times or trial medals, so ranked records stay comparable.
    const ranked = run.assist !== true;
    const newRecord = ranked && (!previousBest || player.elapsed < previousBest);
    if (newRecord) save.bestTimes[id] = player.elapsed;
    save.unlocked = Math.max(save.unlocked, currentLevelIndex + 2);
    save.totalCoins += player.coins;
    save.levelStars[id] = Math.max(save.levelStars[id] || 0, stars);
    save.clears[world.characterId][id] = 1;
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

  function composeChapterScene() {
    scene = Scenery.composeScene(Scenery.sceneFor(activeLevel.id, activeLevel.world.id), view, { fx: save.settings.fx });
  }

  function updateCamera(dt) {
    const lookahead = GameFeel?.cameraLookaheadOffset?.(player, view, dt, camera) || null;
    Camera.step(camera, player, activeLevel, dt, { snap: presentation.snapCamera, lookahead });
  }

  function render() {
    const now = performance.now();
    const frameDt = Math.min(0.1, Math.max(0, (now - lastRenderAt) / 1000));
    lastRenderAt = now;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (!activeLevel) {
      renderAttract(now / 1000, frameDt);
      return;
    }
    const { scale, quantum } = Camera.renderScale(camera, view.dpr);
    const shakeX = camera.shake ? (Math.random() - 0.5) * camera.shake : 0;
    const shakeY = camera.shake ? (Math.random() - 0.5) * camera.shake : 0;
    const camX = GameFeel?.interpolateCoordinate?.(presentation.cameraX, camera.x, renderAlpha, {
      snap: presentation.snapCamera,
      quantum,
    }) ?? camera.x;
    const camY = GameFeel?.interpolateCoordinate?.(presentation.cameraY, camera.y, renderAlpha, {
      snap: presentation.snapCamera,
      quantum,
    }) ?? camera.y;
    const playerX = GameFeel?.interpolateCoordinate?.(presentation.playerX, player.x, renderAlpha, {
      snap: presentation.snapPlayer,
      quantum,
    }) ?? player.x;
    const playerY = GameFeel?.interpolateCoordinate?.(presentation.playerY, player.y, renderAlpha, {
      snap: presentation.snapPlayer,
      quantum,
    }) ?? player.y;
    updateHud();
    const time = sceneTime();
    Scenery.drawScene(ctx, scene, {
      view,
      camX,
      camY,
      zoom: camera.zoom,
      refCamY: Math.max(0, activeLevel.height - camera.visibleH),
      time,
      dt: mode === "play" ? frameDt : 0,
      reducedMotion: view.reducedMotion,
      fx: save.settings.fx,
    });
    const originX = Math.round((-camX + shakeX) * scale);
    const originY = Math.round((-camY + shakeY) * scale);
    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    Camera.visibleRect(camX, camY, camera, 48, cullRect);
    propFrame.time = time;
    propFrame.reducedMotion = view.reducedMotion;
    propFrame.fx = save.settings.fx;
    renderWorld(activeLevel);
    Effects.draw(ctx, particles, cullRect);
    renderPlayer({ x: playerX, y: playerY });
    Effects.drawTexts(ctx, floatTexts, { font: FLOAT_FONT, italicFont: FLOAT_FONT_ITALIC, fx: save.settings.fx });
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    // The baked sky already frames play; menus and pauses dim the edges further.
    if (mode !== "play") Effects.drawVignette(ctx, vignette, 1);
    Effects.drawFlash(ctx, screenFlash, view, frameDt);
    settlePresentationSnap();
  }

  /**
   * The menu sits on a living landscape: the same scroll renderer as play,
   * panning slowly across a dedicated night panorama.
   */
  function renderAttract(time, frameDt) {
    if (!menuScene) menuScene = Scenery.composeScene(Scenery.sceneFor("menu", "world1"), view, { fx: save.settings.fx });
    Scenery.drawScene(ctx, menuScene, {
      view,
      camX: view.reducedMotion ? 0 : time * 14,
      camY: 0,
      zoom: 1,
      refCamY: 0,
      time,
      dt: frameDt,
      reducedMotion: view.reducedMotion,
      fx: save.settings.fx,
    });
    Effects.drawVignette(ctx, vignette, 1);
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

  function isActivePhase(item) {
    return Sim.phaseIsActive(item, world.tide);
  }

  /** World-space playfield, back to front, culled to the padded view rectangle. */
  function renderWorld(level) {
    const rect = cullRect;
    const time = propFrame.time;
    const tide = world.tide;
    Props.drawPhaseTide(ctx, tide, propFrame);
    for (const w of level.wind || []) {
      if (Camera.intersects(rect, w.x, w.y, w.w, w.h)) Props.drawWind(ctx, w, propFrame);
    }
    const goal = level.goal;
    if (Camera.intersects(rect, goal.x - 80, goal.y - 80, goal.w + 160, goal.h + 160)) {
      propFrame.sealed = Sim.goalIsSealed(world);
      Props.drawGoal(ctx, goal, propFrame);
    }
    for (const lantern of level.lanterns || []) {
      if (Camera.intersects(rect, lantern.x - 40, lantern.y - 40, lantern.w + 80, lantern.h + 80)) {
        WardenArt?.drawLantern?.(ctx, lantern, { time });
      }
    }
    Terrain.draw(ctx, terrain, rect, time, isActivePhase, propFrame.fx);
    Terrain.drawHazards(ctx, terrain, rect, time, isActivePhase, propFrame.fx);
    Terrain.drawSprings(ctx, level.springs, rect, time, propFrame.fx);
    for (const portal of level.portals || []) {
      if (Camera.intersects(rect, portal.x - 40, portal.y - 40, portal.w + 80, portal.h + 80)) Props.drawPortal(ctx, portal, propFrame);
    }
    for (const c of level.coins) {
      if (c.taken || !Camera.intersects(rect, c.x - 24, c.y - 24, c.w + 48, c.h + 48)) continue;
      if (Sim.phaseIsActive(c, tide)) Props.drawCoin(ctx, c, propFrame);
      else if (Sim.isPhaseItem(c)) Props.drawPickupGhost(ctx, c, propFrame);
    }
    for (const p of level.powerups || []) {
      if (p.taken || !Camera.intersects(rect, p.x - 30, p.y - 30, p.w + 60, p.h + 60)) continue;
      if (Sim.phaseIsActive(p, tide)) Props.drawPowerup(ctx, p, propFrame);
      else if (Sim.isPhaseItem(p)) Props.drawPickupGhost(ctx, p, propFrame);
    }
    drawMarrow(level);
    for (const pr of world.projectiles) {
      propFrame.color = toneColor(pr.tone);
      Props.drawProjectile(ctx, pr, propFrame);
    }
    for (const e of level.enemies) {
      if (e.alive && Camera.intersects(rect, e.x - 80, e.y - 80, e.w + 160, e.h + 160)) drawEnemy(e);
    }
    drawWardenScene(level);
  }

  function drawMarrow(level) {
    if (!level.marrow || level.marrow.taken) return;
    WardenArt?.drawMarrow?.(ctx, level.marrow, { time: sceneTime() });
  }

  function drawWardenScene(level) {
    const time = sceneTime();
    for (const bolt of world.bolts) WardenArt?.drawHostileBolt?.(ctx, bolt, time);
    if (!warden) return;
    const arena = warden.data.arena;
    WardenArt?.drawArenaSeal?.(ctx, {
      x: arena.x,
      top: Math.max(0, cullRect.y - 80),
      bottom: level.height + 40,
      time,
      active: warden.active && !warden.defeated,
    });
    if (warden.defeated) return;
    if (warden.phase === "telegraph" && warden.attack === "rain") {
      WardenArt?.drawWardenMarkers?.(ctx, warden.markers, {
        groundY: warden.data.ground,
        progress: 1 - clamp(warden.phaseTimer / SIM.WARDEN_TELEGRAPH, 0, 1),
      });
    }
    WardenArt?.drawWarden?.(ctx, { ...warden, palette: warden.data.palette }, {
      time,
      telegraph: warden.phase === "telegraph" ? 1 - clamp(warden.phaseTimer / SIM.WARDEN_TELEGRAPH, 0, 1) : 0,
      flash: warden.hitTimer,
      sigil: warden.data.sigil,
      phase: warden.phase,
      attack: warden.attack,
      open: Sim.wardenIsOpen(world),
      healthRatio: warden.health / Math.max(1, warden.maxHealth),
      reducedMotion: view.reducedMotion,
      fontFamily: CANVAS_FONT_FAMILY,
    });
  }

  function drawEnemy(e) {
    if (e.type === "sentry") {
      WardenArt?.drawSentry?.(ctx, e, {
        time: sceneTime(),
        charge: Sim.sentryCharge(e),
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
      hitDuration: SIM.ENEMY_HIT_FLASH_DURATION,
      floatGap: WISP_FLOAT_GAP,
      hoverRange: WISP_HOVER_RANGE,
      reducedMotion: view.reducedMotion,
      focus,
      support: e.type === "wisp" ? null : Sim.supportPlatform(world, e),
    });
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
    // World-space figure size; the camera zoom adapts it to the device.
    const artScale = 0.36 * (player.h / player.baseH);
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
      turnDuration: SIM.TURN_POSE_DURATION,
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
    const ch = CHARACTER_TONES[id];
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
    const quantum = Camera.renderScale(camera, view.dpr).quantum;
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
    const rhythm = CharacterGilding?.resolveCharacterRhythm?.({
      id,
      time: simulationTime,
      stride: motion?.stride,
    }, { reducedMotion: effectStill });
    CharacterGilding?.drawCharacterVignette?.(ctx, {
      id,
      width: destW,
      height: destH,
      time: simulationTime,
      direction: facing,
      reducedMotion: effectStill,
      stride: motion?.stride,
      rhythm,
      px: Math.max(0.75, scale),
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

  function burst(x, y, color, count, options = {}) {
    const scaled = save.settings.fx ? count : Math.ceil(count * 0.45);
    Effects.burst(particles, x, y, color, scaled, {
      shape: options.shape,
      gravity: options.gravity,
      drag: options.drag,
      glow: save.settings.fx && GLOW_BURST_COLORS.has(color),
    });
  }

  function spawnSpark(x, y, color, count) {
    const rotation = player.facing > 0 ? Math.PI : 0;
    for (let i = 0; i < count; i++) {
      Effects.emit(
        particles, x, y,
        -player.facing * (50 + Math.random() * 120), 80 + Math.random() * 70,
        2, 0.28, color, "streak", 420, 0, rotation, 0, false,
      );
    }
  }

  /** Landing dust: soft motes that skid out along the ground on both sides. */
  function spawnDust(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      Effects.emit(
        particles, x + side * (4 + Math.random() * 8), y - 2,
        side * (40 + Math.random() * 110), -(10 + Math.random() * 45),
        1.6 + Math.random() * 2.4, 0.32 + Math.random() * 0.2, color, "orb", 60, 4, 0, 0, false,
      );
    }
  }

  function spawnWind(x, y, dir) {
    if (!save.settings.fx || Math.random() > 0.28) return;
    Effects.emit(
      particles, x, y,
      -dir * (70 + Math.random() * 70), -20 + Math.random() * 40,
      1.5, 0.35, CANVAS_MATERIAL.moonWhiteSoft, "streak", 0, 0, dir > 0 ? Math.PI : 0, 0, false,
    );
  }

  function updateParticles(dt) {
    Effects.update(particles, dt);
    Effects.updateTexts(floatTexts, dt);
  }

  function floatText(text, x, y, color) {
    Effects.addText(floatTexts, text, x, y, color);
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
    const instrument = CharacterGilding?.resolveCharacterInstrument?.(save.selected);
    if (hudState.character !== null && hudState.character !== characterName) Hud.pulseHudPill?.(hudEls.character.parentElement);
    hudState.character = characterName;
    setHudText("character", hudEls.character, characterName);
    setHudText("characterSigil", hudEls.characterSigil, instrument?.mark || (save.selected === "nini" ? "璇" : "青"));
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
    const phaseCritical = world.tide.enabled;
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
    const combo = world.combo;
    const live = combo.chain > 0;
    if (hudState.values.chainLive !== live) {
      hudEls.chain.hidden = !live;
      hudState.values.chainLive = live;
    }
    if (!live) return;
    setHudText("chainCount", hudEls.chainCount, combo.chain);
    setHudText("chainMult", hudEls.chainMult, `×${combo.multiplier}`);
    const remaining = Math.round(clamp(combo.remaining / Sim.chainWindow(), 0, 1) * 100);
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
    const tide = world.tide;
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
    world = null;
    activeLevel = null;
    player = null;
    warden = null;
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
