((root) => {
  "use strict";

  // v2.0.0 — Astral Echo meta-progression.
  //
  // Everything here is pure: it reads a sanitized save plus static chapter
  // metadata and returns derived values. The runtime owns when to call it; this
  // module never touches storage, the DOM, or gameplay entities. Keeping medal
  // thresholds, combo math, and achievement predicates in one testable place is
  // the same boundary rule the collection rating and ammo caps already follow.

  const MEDAL_STAR = "star";
  const MEDAL_MOON = "moon";
  const MEDAL_DEW = "dew";

  const MEDAL_LABELS = Object.freeze({
    [MEDAL_STAR]: "星章",
    [MEDAL_MOON]: "月章",
    [MEDAL_DEW]: "露章",
  });

  // Multipliers applied to a chapter's authored par time.
  const MEDAL_MOON_FACTOR = 1.25;
  const MEDAL_DEW_FACTOR = 1.6;

  const COMBO_WINDOW = 2.4;
  const COMBO_MAX_MULTIPLIER = 5;
  const COMBO_STEP = 3;

  const WORLD_IDS = Object.freeze(["world1", "world2", "world3"]);

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function countRecord(record, predicate) {
    if (!record || typeof record !== "object") return 0;
    let total = 0;
    for (const value of Object.values(record)) {
      if (predicate ? predicate(value) : Boolean(value)) total += 1;
    }
    return total;
  }

  /**
   * Resolve the trial medal for one finished chapter.
   * Returns "" when the run is slower than the bronze window or the inputs are
   * unusable, so callers never have to special-case missing records.
   */
  function medalForTime(seconds, par) {
    const time = finiteNumber(seconds, 0);
    const target = finiteNumber(par, 0);
    if (time <= 0 || target <= 0) return "";
    if (time <= target) return MEDAL_STAR;
    if (time <= target * MEDAL_MOON_FACTOR) return MEDAL_MOON;
    if (time <= target * MEDAL_DEW_FACTOR) return MEDAL_DEW;
    return "";
  }

  function medalRank(medal) {
    if (medal === MEDAL_STAR) return 3;
    if (medal === MEDAL_MOON) return 2;
    if (medal === MEDAL_DEW) return 1;
    return 0;
  }

  function medalLabel(medal) {
    return MEDAL_LABELS[medal] || "";
  }

  /**
   * Chain length to star-dew multiplier. Three links per step keeps the first
   * upgrade reachable inside one platforming beat while the cap stays honest.
   */
  function comboMultiplier(chain) {
    const links = Math.floor(finiteNumber(chain, 0));
    if (links <= 0) return 1;
    return clamp(1 + Math.floor((links - 1) / COMBO_STEP), 1, COMBO_MAX_MULTIPLIER);
  }

  /**
   * Advance a combo chain by one link, or reset it when the window has lapsed.
   * `remaining` is the time left on the previous link when the event lands.
   */
  function advanceCombo(state = {}, options = {}) {
    const chain = Math.max(0, Math.floor(finiteNumber(state.chain, 0)));
    const remaining = Math.max(0, finiteNumber(state.remaining, 0));
    const window = Math.max(0.1, finiteNumber(options.window, COMBO_WINDOW));
    const next = remaining > 0 ? chain + 1 : 1;
    return { chain: next, remaining: window, multiplier: comboMultiplier(next) };
  }

  function decayCombo(state = {}, dt = 0) {
    const step = Math.max(0, finiteNumber(dt, 0));
    const remaining = Math.max(0, finiteNumber(state.remaining, 0) - step);
    const chain = remaining > 0 ? Math.max(0, Math.floor(finiteNumber(state.chain, 0))) : 0;
    return { chain, remaining, multiplier: comboMultiplier(chain) };
  }

  /**
   * Star dew awarded for one combat or treasure event.
   * `base` is the authored reward; the multiplier only ever adds star dew and
   * never feeds the collection rating.
   */
  function comboReward(base, chain) {
    const amount = Math.max(0, Math.floor(finiteNumber(base, 0)));
    return amount * comboMultiplier(chain);
  }

  const ACHIEVEMENTS = Object.freeze([
    // 征程 — journey
    { id: "firstlight", group: "journey", name: "初次启程", desc: "完成第一章 星露花庭。", test: (c) => c.clearedCount >= 1 },
    { id: "world1", group: "journey", name: "心石重聚", desc: "完成第一星域全部五章。", test: (c) => c.worldClears.world1 >= 5 },
    { id: "world2", group: "journey", name: "群岛归位", desc: "完成第二星域全部五章。", test: (c) => c.worldClears.world2 >= 5 },
    { id: "world3", group: "journey", name: "星潮止息", desc: "完成第三星域全部五章。", test: (c) => c.worldClears.world3 >= 5 },
    { id: "allclear", group: "journey", name: "星穹回响", desc: "完成全部十五章。", test: (c) => c.levelCount > 0 && c.clearedCount >= c.levelCount },

    // 守望 — wardens
    { id: "warden1", group: "warden", name: "极光落幕", desc: "击败极光守望者。", test: (c) => c.wardens.auroracitadel === true },
    { id: "warden2", group: "warden", name: "星核平息", desc: "击败群岛守望者。", test: (c) => c.wardens.islandstarcore === true },
    { id: "warden3", group: "warden", name: "潮汐终章", desc: "击败星潮守望者。", test: (c) => c.wardens.phasetidecourt === true },
    { id: "wardenflawless", group: "warden", name: "无瑕之战", desc: "在未受伤的情况下击败任意一位守望者。", test: (c) => c.stats.wardenFlawless >= 1 },

    // 收集 — collection
    { id: "marrow1", group: "collect", name: "初拾星髓", desc: "找到第一枚隐藏星髓。", test: (c) => c.marrowCount >= 1 },
    { id: "marrow5", group: "collect", name: "星髓五枚", desc: "收集五枚隐藏星髓。", test: (c) => c.marrowCount >= 5 },
    { id: "marrow15", group: "collect", name: "星髓大全", desc: "收集全部十五枚隐藏星髓。", test: (c) => c.levelCount > 0 && c.marrowCount >= c.levelCount },
    { id: "stars3", group: "collect", name: "三星初绽", desc: "任意章节取得三星收藏评级。", test: (c) => c.threeStarCount >= 1 },
    { id: "stars15", group: "collect", name: "满天星斗", desc: "全部章节取得三星收藏评级。", test: (c) => c.levelCount > 0 && c.threeStarCount >= c.levelCount },
    { id: "dew1000", group: "collect", name: "星露千滴", desc: "累计获得 1000 星露。", test: (c) => c.totalCoins >= 1000 },
    { id: "dew5000", group: "collect", name: "星露五千", desc: "累计获得 5000 星露。", test: (c) => c.totalCoins >= 5000 },

    // 试炼 — trials
    { id: "medal1", group: "trial", name: "初获星章", desc: "任意章节达成星章时限。", test: (c) => c.medalCounts.star >= 1 },
    { id: "medal5", group: "trial", name: "星章五枚", desc: "五个章节达成星章时限。", test: (c) => c.medalCounts.star >= 5 },
    { id: "medal15", group: "trial", name: "星章十五枚", desc: "全部章节达成星章时限。", test: (c) => c.levelCount > 0 && c.medalCounts.star >= c.levelCount },
    { id: "swift", group: "trial", name: "疾风之路", desc: "在 30 秒内完成任意章节。", test: (c) => c.fastestClear > 0 && c.fastestClear <= 30 },

    // 技巧 — mastery
    { id: "combo10", group: "mastery", name: "连星十响", desc: "达成 10 连星。", test: (c) => c.stats.bestCombo >= 10 },
    { id: "combo25", group: "mastery", name: "连星廿五", desc: "达成 25 连星。", test: (c) => c.stats.bestCombo >= 25 },
    { id: "flawless1", group: "mastery", name: "白璧无瑕", desc: "全程未受伤完成任意章节。", test: (c) => c.flawlessCount >= 1 },
    { id: "flawless5", group: "mastery", name: "五章无瑕", desc: "全程未受伤完成五个章节。", test: (c) => c.flawlessCount >= 5 },
    { id: "stomp50", group: "mastery", name: "踏星五十", desc: "累计踩踏击败 50 个敌人。", test: (c) => c.stats.stomps >= 50 },
    { id: "ninipath", group: "mastery", name: "璇玑之径", desc: "以妮妮完成十个章节。", test: (c) => c.clears.nini >= 10 },
    { id: "yuanpath", group: "mastery", name: "青衡之径", desc: "以源源完成十个章节。", test: (c) => c.clears.yuan >= 10 },
    { id: "duopath", group: "mastery", name: "双璧同行", desc: "两位角色各完成五个章节。", test: (c) => c.clears.nini >= 5 && c.clears.yuan >= 5 },

    // 秘录 — secrets
    { id: "soloroute", group: "secret", name: "独行星路", desc: "未启用星辉护佑完成一整个星域。", hidden: true, test: (c) => c.assistFreeWorld === true },
    { id: "hiddenletter", group: "secret", name: "星尘密语", desc: "找到藏在星图深处的一封信。", hidden: true, test: (c) => c.stats.letters >= 1 },
  ]);

  const ACHIEVEMENT_GROUPS = Object.freeze([
    { id: "journey", name: "征程", desc: "沿星图走完的路" },
    { id: "warden", name: "守望", desc: "三位星域守望者" },
    { id: "collect", name: "收集", desc: "星露、星髓与评级" },
    { id: "trial", name: "试炼", desc: "时限与章印" },
    { id: "mastery", name: "技巧", desc: "连星、无瑕与双璧" },
    { id: "secret", name: "秘录", desc: "达成后才会显形" },
  ]);

  const ACHIEVEMENT_IDS = Object.freeze(ACHIEVEMENTS.map((entry) => entry.id));

  /**
   * Fold a sanitized save plus chapter metadata into the flat shape the
   * achievement predicates read. `levels` only needs `{ id, world, par }`.
   */
  function buildProgressContext(rawSave = {}, levels = []) {
    // Default parameters only cover `undefined`, so normalize explicitly: this is
    // a public pure API and callers may hand it a null save or level list.
    const save = rawSave && typeof rawSave === "object" && !Array.isArray(rawSave) ? rawSave : {};
    const list = Array.isArray(levels) ? levels : [];
    const levelStars = save.levelStars || {};
    const bestTimes = save.bestTimes || {};
    const marrow = save.marrow || {};
    const wardens = save.wardens || {};
    const flawless = save.flawless || {};
    const stats = save.stats || {};
    const clears = save.clears || {};

    const worldClears = { world1: 0, world2: 0, world3: 0 };
    const medalCounts = { star: 0, moon: 0, dew: 0 };
    let clearedCount = 0;
    let threeStarCount = 0;
    let fastestClear = 0;
    let assistFreeWorld = false;

    const worldTotals = { world1: 0, world2: 0, world3: 0 };
    for (const level of list) {
      const worldId = typeof level?.world === "object" ? level.world?.id : level?.world;
      if (worldId && worldTotals[worldId] !== undefined) worldTotals[worldId] += 1;
      const time = finiteNumber(bestTimes[level?.id], 0);
      const stars = finiteNumber(levelStars[level?.id], 0);
      if (time > 0 || stars > 0) {
        clearedCount += 1;
        if (worldId && worldClears[worldId] !== undefined) worldClears[worldId] += 1;
      }
      if (stars >= 3) threeStarCount += 1;
      if (time > 0 && (fastestClear === 0 || time < fastestClear)) fastestClear = time;
      const medal = medalForTime(time, level?.par);
      if (medal) medalCounts[medal] += 1;
    }

    if (save.assistUsed !== true) {
      for (const worldId of WORLD_IDS) {
        if (worldTotals[worldId] > 0 && worldClears[worldId] >= worldTotals[worldId]) assistFreeWorld = true;
      }
    }

    return {
      levelCount: list.length,
      clearedCount,
      threeStarCount,
      fastestClear,
      worldClears,
      worldTotals,
      medalCounts,
      marrowCount: countRecord(marrow),
      flawlessCount: countRecord(flawless),
      totalCoins: finiteNumber(save.totalCoins, 0),
      assistFreeWorld,
      wardens: {
        auroracitadel: wardens.auroracitadel === 1 || wardens.auroracitadel === true,
        islandstarcore: wardens.islandstarcore === 1 || wardens.islandstarcore === true,
        phasetidecourt: wardens.phasetidecourt === 1 || wardens.phasetidecourt === true,
      },
      clears: {
        nini: countRecord(clears.nini),
        yuan: countRecord(clears.yuan),
      },
      stats: {
        deaths: finiteNumber(stats.deaths, 0),
        stomps: finiteNumber(stats.stomps, 0),
        bestCombo: finiteNumber(stats.bestCombo, 0),
        wardenFlawless: finiteNumber(stats.wardenFlawless, 0),
        letters: finiteNumber(stats.letters, 0),
      },
    };
  }

  /** Every achievement id whose predicate currently holds. */
  function evaluateAchievements(save = {}, levels = []) {
    const context = buildProgressContext(save, levels);
    const unlocked = [];
    for (const entry of ACHIEVEMENTS) {
      let ok = false;
      try {
        ok = entry.test(context) === true;
      } catch {
        ok = false;
      }
      if (ok) unlocked.push(entry.id);
    }
    return unlocked;
  }

  /** Ids that hold now but were not already recorded in the save. */
  function newlyUnlocked(save = {}, levels = []) {
    const recorded = save && typeof save.achievements === "object" && save.achievements ? save.achievements : {};
    return evaluateAchievements(save, levels).filter((id) => !recorded[id]);
  }

  function achievementById(id) {
    return ACHIEVEMENTS.find((entry) => entry.id === id) || null;
  }

  /**
   * Unlocked count against the catalog total, for the menu strip and record head.
   */
  function achievementSummary(save = {}, levels = []) {
    const unlocked = new Set(evaluateAchievements(save, levels));
    return { unlocked: unlocked.size, total: ACHIEVEMENTS.length };
  }

  const api = {
    MEDAL_STAR,
    MEDAL_MOON,
    MEDAL_DEW,
    MEDAL_LABELS,
    MEDAL_MOON_FACTOR,
    MEDAL_DEW_FACTOR,
    COMBO_WINDOW,
    COMBO_STEP,
    COMBO_MAX_MULTIPLIER,
    WORLD_IDS,
    ACHIEVEMENTS,
    ACHIEVEMENT_GROUPS,
    ACHIEVEMENT_IDS,
    medalForTime,
    medalRank,
    medalLabel,
    comboMultiplier,
    advanceCombo,
    decayCombo,
    comboReward,
    buildProgressContext,
    evaluateAchievements,
    newlyUnlocked,
    achievementById,
    achievementSummary,
  };

  root.NiniProgression = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
