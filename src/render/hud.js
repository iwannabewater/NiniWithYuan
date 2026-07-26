((root) => {
  "use strict";

  function clear(el) {
    if (typeof el.replaceChildren === "function") el.replaceChildren();
    else el.textContent = "";
  }

  function appendText(parent, tagName, text, className) {
    const el = document.createElement(tagName);
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function renderSaveStrip(container, save, characters, levels, progression) {
    clear(container);
    const selected = characters[save.selected] || characters.nini;
    const unlocked = Math.min(save.unlocked, levels.length);
    const current = levels[Math.max(0, unlocked - 1)];
    const progress = levels.length ? Math.round((unlocked / levels.length) * 100) : 0;
    const currentBlock = document.createElement("div");
    currentBlock.className = "journey-current";
    appendText(currentBlock, "span", "当前星路", "journey-kicker");
    appendText(currentBlock, "strong", current?.name || "第一章", "journey-title");

    const route = document.createElement("div");
    route.className = "journey-route";
    route.setAttribute("role", "progressbar");
    route.setAttribute("aria-label", "章节解锁进度");
    route.setAttribute("aria-valuemin", "0");
    route.setAttribute("aria-valuemax", String(levels.length));
    route.setAttribute("aria-valuenow", String(unlocked));
    const routeFill = document.createElement("span");
    routeFill.style.setProperty("--journey-progress", `${progress}%`);
    route.appendChild(routeFill);

    const stats = document.createElement("div");
    stats.className = "journey-stats";
    // Four readings keep the strip to a single row on a short landscape phone.
    // Star marrow already has a per-chapter mark and a record-screen total.
    const record = progression ? progression.achievementSummary(save, levels) : null;
    const entries = [
      ["章节", `${unlocked} / ${levels.length}`],
      ["同行", selected.name],
      ["星露", String(save.totalCoins)],
    ];
    if (record) entries.push(["星录", `${record.unlocked} / ${record.total}`]);
    for (const [label, value] of entries) {
      const stat = document.createElement("span");
      appendText(stat, "small", label);
      appendText(stat, "strong", value);
      stats.appendChild(stat);
    }
    container.append(currentBlock, route, stats);
  }

  function renderChapterIntroMeta(container, items) {
    clear(container);
    for (const item of items) appendText(container, "span", item);
  }

  // v2.0.0 — Astral Echo surfaces: chapter medals and marrow marks, the 星录
  // achievement screen, and the completion report. Every builder below is a pure
  // DOM writer: it reads the values it is handed and never touches the save.

  const MEDAL_GLYPHS = { star: "星", moon: "月", dew: "露" };
  const MEDAL_GLYPH_EMPTY = "章";

  function appendStat(parent, label, value, className) {
    const stat = document.createElement("div");
    stat.className = className ? `record-stat ${className}` : "record-stat";
    appendText(stat, "small", label);
    appendText(stat, "strong", value);
    parent.appendChild(stat);
    return stat;
  }

  function medalBadge(medal, label) {
    const badge = document.createElement("span");
    badge.className = `medal-badge medal-${medal || "none"}`;
    badge.textContent = MEDAL_GLYPHS[medal] || MEDAL_GLYPH_EMPTY;
    badge.setAttribute("aria-label", medal ? `章印 ${label}` : "章印 未达成");
    badge.title = medal ? `章印 ${label}` : "章印 未达成";
    return badge;
  }

  function renderRecordScreen(summaryEl, groupsEl, options) {
    const { progression, save, levels, formatTime } = options;
    const context = progression.buildProgressContext(save, levels);
    const unlocked = new Set(progression.evaluateAchievements(save, levels));

    clear(summaryEl);
    appendStat(summaryEl, "成就", `${unlocked.size} / ${progression.ACHIEVEMENTS.length}`, "primary");
    appendStat(summaryEl, "星髓", `${context.marrowCount} / ${levels.length}`);
    appendStat(summaryEl, "星章", `${context.medalCounts.star} / ${levels.length}`);
    appendStat(summaryEl, "三星", `${context.threeStarCount} / ${levels.length}`);
    appendStat(summaryEl, "无瑕", `${context.flawlessCount} / ${levels.length}`);
    appendStat(summaryEl, "累计星露", String(context.totalCoins));
    appendStat(summaryEl, "最长连星", String(context.stats.bestCombo));
    if (typeof formatTime === "function" && context.fastestClear > 0) {
      appendStat(summaryEl, "最快通关", formatTime(context.fastestClear));
    }
    appendStat(summaryEl, "重启次数", String(context.stats.deaths));

    clear(groupsEl);
    for (const group of progression.ACHIEVEMENT_GROUPS) {
      const entries = progression.ACHIEVEMENTS.filter((entry) => entry.group === group.id);
      if (!entries.length) continue;
      const section = document.createElement("section");
      section.className = "record-group";
      section.dataset.group = group.id;
      const heading = document.createElement("header");
      heading.className = "record-group-head";
      const headingId = `record-group-${group.id}`;
      const name = appendText(heading, "h3", group.name, "record-group-name");
      name.id = headingId;
      appendText(heading, "span", group.desc, "record-group-desc");
      const done = entries.filter((entry) => unlocked.has(entry.id)).length;
      appendText(heading, "strong", `${done} / ${entries.length}`, "record-group-count");
      section.setAttribute("aria-labelledby", headingId);
      section.appendChild(heading);

      const list = document.createElement("ul");
      list.className = "record-items";
      for (const entry of entries) {
        const done = unlocked.has(entry.id);
        const hidden = entry.hidden === true && !done;
        const item = document.createElement("li");
        item.className = `record-item${done ? " unlocked" : ""}${hidden ? " sealed" : ""}`;
        const mark = document.createElement("span");
        mark.className = "record-mark";
        mark.textContent = done ? "✦" : hidden ? "?" : "◇";
        mark.setAttribute("aria-hidden", "true");
        const copy = document.createElement("div");
        copy.className = "record-copy";
        appendText(copy, "strong", hidden ? "尚未显形" : entry.name);
        appendText(copy, "span", hidden ? "达成后才会记入星录。" : entry.desc);
        item.append(mark, copy);
        item.setAttribute("aria-label", hidden ? "隐藏成就，尚未显形" : `${entry.name}，${done ? "已达成" : "未达成"}：${entry.desc}`);
        list.appendChild(item);
      }
      section.appendChild(list);
      groupsEl.appendChild(section);
    }
  }

  function clearOutcomeReport(container) {
    if (!container) return;
    clear(container);
    container.hidden = true;
  }

  function renderOutcomeReport(container, report) {
    if (!container) return;
    clear(container);
    container.hidden = false;
    const { formatTime } = report;

    const grid = document.createElement("div");
    grid.className = "report-grid";
    const starText = `${"★".repeat(report.stars)}${"☆".repeat(3 - report.stars)}`;
    appendStat(grid, "收藏评级", starText, "primary");
    appendStat(grid, "本次星露", `+${report.coins}`);
    appendStat(grid, "用时", formatTime(report.elapsed));
    appendStat(grid, "最佳", report.best ? formatTime(report.best) : "--:--");
    appendStat(grid, "章印时限", formatTime(report.par));
    appendStat(grid, "最长连星", String(report.bestCombo));
    container.appendChild(grid);

    const marks = document.createElement("div");
    marks.className = "report-marks";
    const medal = document.createElement("span");
    medal.className = `report-mark medal-${report.medal || "none"}`;
    medal.append(medalBadge(report.medal, report.medalLabel));
    appendText(medal, "span", report.medal ? report.medalLabel : "未达章印");
    marks.appendChild(medal);

    for (const [ok, label, doneLabel] of [
      [report.marrowFound, "星髓未寻", report.marrow ? "星髓 · 本次寻得" : "星髓 已收录"],
      [report.flawless, "本次受伤", "无瑕通关"],
      [report.newRecord, "未破纪录", "刷新最佳用时"],
    ]) {
      const mark = document.createElement("span");
      mark.className = `report-mark${ok ? " achieved" : ""}`;
      appendText(mark, "span", ok ? doneLabel : label);
      marks.appendChild(mark);
    }
    if (report.assist) {
      const mark = document.createElement("span");
      mark.className = "report-mark assist";
      appendText(mark, "span", "星辉护佑 · 本次不计入排名");
      marks.appendChild(mark);
    }
    container.appendChild(marks);

    if (report.achievements?.length) {
      const unlocked = document.createElement("div");
      unlocked.className = "report-achievements";
      appendText(unlocked, "span", "新入星录", "report-achievements-kicker");
      const list = document.createElement("ul");
      for (const entry of report.achievements) {
        const item = document.createElement("li");
        appendText(item, "strong", entry.name);
        appendText(item, "span", entry.desc);
        list.appendChild(item);
      }
      unlocked.appendChild(list);
      container.appendChild(unlocked);
    }
  }

  function renderLevelList(container, options) {
    clear(container);
    const { levels, save, startLevel, formatTime, progression } = options;
    const featuredIndex = Math.max(0, Math.min(levels.length - 1, save.unlocked - 1));
    let lastWorldId = "";
    let worldTrack = null;
    levels.forEach((level, i) => {
      const world = typeof level.world === "object" && level.world ? level.world : { id: "world1", name: "第一星域 破碎星图", subtitle: "" };
      if (world.id !== lastWorldId) {
        lastWorldId = world.id;
        const group = document.createElement("section");
        group.className = "level-world-group";
        group.dataset.world = world.id;
        const heading = document.createElement("header");
        heading.className = "level-world";
        heading.dataset.world = world.id;
        const headingId = `level-world-${world.id}`;
        const worldName = appendText(heading, "h3", world.name, "level-world-name");
        worldName.id = headingId;
        if (world.subtitle) appendText(heading, "strong", world.subtitle, "level-world-subtitle");
        worldTrack = document.createElement("div");
        worldTrack.className = "level-world-track";
        group.setAttribute("aria-labelledby", headingId);
        group.append(heading, worldTrack);
        container.appendChild(group);
      }
      const locked = i >= save.unlocked;
      const button = document.createElement("button");
      button.className = `level-item${i === featuredIndex ? " featured" : ""}${locked ? " locked" : ""}`;
      button.disabled = locked;
      button.dataset.world = world.id;
      button.style.setProperty("--level-banner", levelBanner(level.palette));

      const intro = document.createElement("span");
      intro.className = "level-copy";
      appendText(intro, "span", String(i + 1).padStart(2, "0"), "level-index");
      appendText(intro, "strong", level.name);
      appendText(intro, "span", level.vibe, "level-vibe");
      appendText(intro, "span", level.hint, "level-hint");

      const stars = save.levelStars[level.id] || 0;
      const best = save.bestTimes[level.id] ? formatTime(save.bestTimes[level.id]) : "--:--";
      const meta = document.createElement("span");
      meta.className = "level-meta";
      const starGroup = document.createElement("span");
      starGroup.className = "level-stars";
      starGroup.setAttribute("aria-label", `星级 ${stars} / 3`);
      for (let s = 0; s < 3; s += 1) {
        const star = document.createElement("span");
        star.className = `star ${s < stars ? "filled" : "empty"}`;
        star.textContent = s < stars ? "★" : "☆";
        starGroup.appendChild(star);
      }
      meta.appendChild(starGroup);
      const sep = document.createElement("span");
      sep.className = "level-sep";
      sep.textContent = "·";
      meta.appendChild(sep);
      const bestGroup = document.createElement("span");
      bestGroup.className = "level-best";
      const bestLabel = document.createElement("span");
      bestLabel.className = "level-best-label";
      bestLabel.textContent = "最佳";
      const bestValue = document.createElement("strong");
      bestValue.className = "level-best-value";
      bestValue.textContent = best;
      bestGroup.appendChild(bestLabel);
      bestGroup.appendChild(bestValue);
      meta.appendChild(bestGroup);

      // v2.0.0 — trial medal, star marrow, and warden marks. They live on the
      // card footer opposite the state line so a long chapter name can never
      // push them past the card edge.
      const medal = progression ? progression.medalForTime(save.bestTimes[level.id], level.par) : "";
      const marks = document.createElement("span");
      marks.className = "level-marks";
      marks.appendChild(medalBadge(medal, progression ? progression.medalLabel(medal) : ""));
      const marrow = document.createElement("span");
      const marrowFound = Boolean(save.marrow?.[level.id]);
      marrow.className = `marrow-badge${marrowFound ? " found" : ""}`;
      marrow.textContent = "髓";
      marrow.setAttribute("aria-label", marrowFound ? "星髓 已收录" : "星髓 未寻得");
      marrow.title = marrowFound ? "星髓 已收录" : "星髓 未寻得";
      marks.appendChild(marrow);
      if (level.warden) {
        const wardenMark = document.createElement("span");
        const wardenDown = Boolean(save.wardens?.[level.id]);
        wardenMark.className = `warden-badge${wardenDown ? " cleared" : ""}`;
        wardenMark.textContent = "守";
        wardenMark.setAttribute("aria-label", wardenDown ? "守望者 已归位" : "守望者 镇守中");
        wardenMark.title = wardenDown ? "守望者 已归位" : "守望者 镇守中";
        marks.appendChild(wardenMark);
      }

      const state = document.createElement("span");
      state.className = "level-state";
      state.textContent = locked ? "锁定 · 需完成上一章" : i === featuredIndex ? "当前星路" : stars > 0 ? `已录 · ${stars} 星` : "可挑战";
      if (locked) button.setAttribute("aria-label", `${level.name}，锁定，完成上一章后解锁`);
      if (i === featuredIndex && !locked) button.setAttribute("aria-current", "step");
      const footer = document.createElement("span");
      footer.className = "level-footer";
      footer.append(state, marks);
      button.appendChild(meta);
      button.appendChild(footer);

      button.insertBefore(intro, button.firstChild);
      button.addEventListener("click", () => startLevel(i));
      worldTrack?.appendChild(button);
    });
  }

  function levelBanner(palette) {
    const [top, mid, accent, glow] = palette;
    return [
      `radial-gradient(circle at 72% 18%, ${glow}66 0 12%, transparent 13%)`,
      `linear-gradient(135deg, ${top}, ${mid} 54%, ${accent}99)`,
    ].join(", ");
  }

  function pulseHudPill(el) {
    if (!el) return;
    el.classList.remove("pulse");
    // Force reflow so the keyframe restarts cleanly when called twice in quick succession.
    void el.offsetWidth;
    el.classList.add("pulse");
    el.addEventListener(
      "animationend",
      () => el.classList.remove("pulse"),
      { once: true }
    );
  }

  const api = {
    renderSaveStrip,
    renderChapterIntroMeta,
    renderLevelList,
    renderRecordScreen,
    renderOutcomeReport,
    clearOutcomeReport,
    pulseHudPill,
  };
  root.NiniYuanHud = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
