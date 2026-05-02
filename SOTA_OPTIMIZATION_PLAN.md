# SOTA Optimization Plan · v1.0.0 → v1.1.0

> 妮妮源源历险记 / Nini & Yuan — 从 v1.0.0 可玩原型升级为「同类独立游戏品质标杆」的施工蓝图。

| 字段 | 值 |
| --- | --- |
| 起点版本 | `v1.0.0` (commit `067fb8e`) |
| 目标版本 | `v1.1.0` |
| 备份引用 | `tag backup/before-sota-optimization` |
| 计划生成日期 | 2026-05-02 |
| 生成方式 | Waza 八技能链：think / check / design / hunt / health / write / learn |
| 当前测试状态 | `npm test` 全绿（physics, mechanics, android-wrapper, browser-smoke 共 7 项断言通过） |

本计划只承诺改造方案与可执行的 diff/代码片段，不在本次提交中执行实质重构。所有 P0 修复在路线图中明确给出实施顺序，并在阶段四给出验收标准。

---

## 0 · Executive Summary

**当前定位**  现存代码库是一份完成度不错的 Canvas 平台跳跃原型：单文件 `src/game.js` (1776 行) 实现了双角色物理、五章关卡、风场/移动平台/弹药/食物增益/敌人系统；CI 与四套回归测试齐全；Android WebView 包装可以打出可签 APK。架构能跑通流程，但工程化、安全、美学三条线均存在显著上行空间。

**距离 SOTA 的差距**  集中在五个维度：

1. **安全**：Android WebView 启用了多个文件 URL 跨源开关 (`setAllowFileAccessFromFileURLs(true)` / `setAllowUniversalAccessFromFileURLs(true)`) + manifest 的 `usesCleartextTraffic="true"`。该游戏完全离线，三项均为净增攻击面。
2. **可复现性**：`npm start` 依赖 `npx http-server`，但 http-server 既不在 dependencies，也未安装到 `node_modules`。新机首次启动会去网络拉取，CI/离线环境会失败。
3. **可扩展性**：1776 行 IIFE + 模块顶层 `let` 状态 + 169 行的 `updatePlayer`。再加两章关卡或一种新增益就会逼近"修一处碰七处"。
4. **美学辨识度**：现有色板 (`#10182a` + 4 个 hex) 在同类作品里非常「标准夜空」，字体 Noto Sans SC 端正但缺乏角色辨识度，没有任何 micro-interaction 与品牌母题。
5. **上架就绪度**：PWA 没有 icons 数组与 ServiceWorker；PRIVACY.md 不满足 Google Play Data Safety 表单的分类要求；APK 是 debug 签名。

**v1.1.0 范围**  本计划解决以上五条全部 P0/P1，并交付一套可继续迭代的设计系统与文档模板。**不在范围内**：在线对战、云存档、付费墙、第二语言（保留中文文案为主）、新增章节（关卡内容冻结到 v1.2）、Capacitor/Cordova 重构（本计划继续走纯 WebView，原因见 §1.1）。

---

## 阶段一 · 架构与代码健壮性 (think + check)

### 1.1 `/think`：架构与扩展性评估

#### 现状画像

```
index.html (157 行)
└─ <script src="./src/game.js"> (1776 行 IIFE)
    ├─ 模块顶层 let: save / view / mode / player / camera / particles / floatTexts / keys / inputs / projectiles / activeLevel / ...
    ├─ 数据层: characters{} / levels[] / defaultSave (在闭包内)
    ├─ 系统函数:
    │   ├─ updateInputs / updateMoving / updatePlayer (169 行) / updateEnemies / updateProjectiles / updatePickups / updateParticles / updateCamera / updateChapterIntro / updateHud
    │   └─ render / renderBackground / renderWorld / renderPlayer / drawPlatform / drawCoin / drawPowerup / ...
    ├─ UI 绑定: bindUi / bindControls
    └─ 主循环: loop (固定步长 1/120s)
```

**好的部分**（保留）：

- `FIXED_DT = 1/120` + 累加器 — 物理稳定性强于变步长。
- `loadSave` 用 `try/catch` + 默认合并 — 存档读取容错合格。
- `cloneLevel` 在每次 `startLevel` 重新克隆，避免关卡静态数据被运行时污染。
- `dashEdgeBlocked()` 把"地面冲刺不应飞出短台"做成显式约束并被 mechanics-balance 测试守护。
- 触摸控件的 `pointercapture` + `pointerleave` 处理已经覆盖了绝大多数移动浏览器的丢手指场景。

**风险评估**（按可扩展性影响排序）：

1. **`updatePlayer` 是事实上的"上帝函数"**（`src/game.js:479-647`）。一帧内的输入消化、风场作用、技能（妮妮滑翔 / 源源冲刺）、跳跃、重力、轴向移动、弹簧、危险物、敌人、可破坏平台、出界检测、过关判定全在里面。再加一种"水下"或"双段冲刺"机制就会插入 50+ 行新 if。
2. **状态全是模块顶层 `let`**。没有 GameState 容器，意味着：
    - 不可能做"状态快照 → 暂停回放"或"录像"。
    - 多人本地协作（split-screen）扩展时所有 `player`、`projectiles`、`keys` 都要重写。
    - 关卡之间通过 `startLevel` 重新装填全部全局状态，存档逻辑分散在 `completeLevel`、`pauseGame`、`backToMenu` 三处。
3. **关注点未分离**：
    - 渲染知道游戏逻辑（`renderBackground` 直接读 `save.settings.fx`）。
    - 输入与音效粘在 `updatePlayer` 里（`beep(540, 0.045)` 跳跃成功时直接播）。
    - HUD 每帧通过 `textContent` 写 6 个 DOM 节点，没有脏检查。
4. **存档迁移没有版本号**。`STORAGE_KEY = "nini-yuan-save-v1"` 命名是 v1，但格式如果在 v1.1 加 `bgmVolume` 字段，要么写迁移函数，要么靠 `defaultSave` 并集兜底（现行做法）。后者在删除字段时会留下死键。
5. **`scripts/build-android.sh` 是 bash 单脚本**，对 Windows 开发机不友好。`mapfile -t CLASS_FILES < <(...)` 是 bash 4+ 特性，git-bash for Windows 默认是 3.x。Android 构建已经强依赖 `aapt2/aapt/d8/zipalign/apksigner`，这个面无法用 npm script 抹平。
6. **WebView 兼容性**：MainActivity 用了 `setAllowFileAccessFromFileURLs(true)` / `setAllowUniversalAccessFromFileURLs(true)` + `usesCleartextTraffic="true"`。本游戏全部资源走 `file:///android_asset/...`，没有任何远程资源；这三项都没有运行时收益，只放大攻击面。详见 §1.2 安全审查。

#### 推荐架构（v1.1 可落地，不强制 v1.0 → v1.1 一次到位）

```
src/
├─ core/
│   ├─ engine.js        # GameState, Loop, FixedTimestep, RNG (确定性)
│   ├─ input.js         # Keyboard + Touch 抽象成统一 Input 设备
│   ├─ audio.js         # AudioBus: bgm + sfx 通道
│   ├─ storage.js       # versioned save: load / migrate / persist
│   └─ events.js        # 简易 EventEmitter (玩家受伤 / 拾取 / 通关广播)
├─ systems/
│   ├─ physics.js       # moveAxis, allSolids, collide
│   ├─ player.js        # updatePlayer 拆分: input → skill → physics → collisions
│   ├─ enemies.js
│   ├─ projectiles.js
│   ├─ pickups.js
│   ├─ particles.js
│   └─ camera.js
├─ render/
│   ├─ scene.js         # render() 顶层调度
│   ├─ world.js         # platforms/hazards/springs/goal
│   ├─ entities.js      # player/enemies/projectiles
│   ├─ effects.js       # particles, vignette, sky motifs
│   └─ hud.js           # 仅 DOM 操作（脏检查 + dataset diff）
├─ data/
│   ├─ characters.js    # nini, yuan
│   ├─ levels.js        # buildLevels()
│   └─ powerups.js
├─ ui/
│   ├─ menu.js          # 主菜单 / 关卡 / 角色 / 设置 屏幕切换
│   └─ modal.js
└─ main.js              # 串起 init, bind, requestAnimationFrame
```

**迁移策略**：保持单文件 `src/game.js` 作为 v1.0 兼容入口，新增 `src/core/`, `src/systems/` 等模块用 ES Modules，`<script type="module" src="./src/main.js">`。Android 构建脚本只需要把 `src/` 整个 cp 进 assets 即可，不需要 bundler。**首版只拆 `core/storage.js`、`core/audio.js`、`render/hud.js` 三个文件**，验证模块化路径不破坏 WebView (Android 5.0+ 的 Chromium 已支持 ES Modules)，再分阶段拆其余系统。**前提假设**：`file:///android_asset/index.html` 加载的页面里 `<script type="module">` 在 API 23+ 上能解析。该假设通过实测脚本验证（hunt-android-modules.js，见 §3.2）。

#### 玩家存档安全性

**当前缺陷**：`save.selected` 不被验证（如果 localStorage 被人为篡改成 `"<script>"`，`characters[save.selected]` 是 `undefined`，进入游戏后 `.name` 立即抛错）。`save.unlocked` 没有上界与类型校验。`save.totalCoins` 同理。

**修复方案**（写入 `src/core/storage.js`）：

```js
// 决定：localStorage 没有完整性签名能力（无服务器），所以只做 schema 校验 + 越界裁剪。
// 攻击者既然能写 localStorage 也能直接修改 .apk 内的 game.js，签名没有意义。
const SAVE_SCHEMA_VERSION = 2;

const SAVE_SHAPE = {
  selected:    (v) => (v === "nini" || v === "yuan") ? v : "nini",
  unlocked:    (v) => Number.isInteger(v) ? Math.max(1, Math.min(5, v)) : 1,
  totalCoins:  (v) => Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0,
  bestTimes:   (v) => sanitizeRecord(v, isFinitePositive),
  levelStars:  (v) => sanitizeRecord(v, (n) => Number.isInteger(n) && n >= 0 && n <= 3),
  settings: {
    volume:    (v) => clamp(Number(v) || 70, 0, 100),
    touch:     (v) => clamp(Number(v) || 98, 60, 140),
    fx:        (v) => v !== false,                     // tristate -> bool
    bgmVolume: (v) => clamp(Number(v) || 60, 0, 100),  // v1.1 新增字段
  },
};

export function loadSave() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return structuredClone(defaultSave); }

  if (raw.schemaVersion === SAVE_SCHEMA_VERSION) return applySchema(raw);
  return migrate(raw);
}

function migrate(raw) {
  // v1 → v2: 没有 bgmVolume，加默认；其他字段已被 SAVE_SHAPE 过滤
  return applySchema({ ...raw, schemaVersion: SAVE_SCHEMA_VERSION });
}
```

#### WebView 兼容性陷阱速查（Android 7-14 横跨）

| 风险点 | 现状 | v1.1 处置 |
| --- | --- | --- |
| ES Modules 加载 | 单文件，无 `type="module"` | 验证后启用，否则保留单文件 |
| `localStorage` 写入失败 | `persist()` 已 try/catch 提示 | 保留 |
| `requestAnimationFrame` 在 onPause 后是否暂停 | 浏览器自动暂停；Android WebView 同样 | 加 `visibilitychange` 监听显式暂停游戏，避免回前台时 `accumulator` 跑飞 |
| 触摸 `pointer` 事件 | Android 5+ Chromium 支持，已用 | 保留 |
| `Audio​Context` 在 onResume 触发恢复 | 当前未处理 | `addEventListener('visibilitychange')` 调用 `audioCtx.suspend()/resume()` |
| Predictive Back（Android 14+ 调） | MainActivity 用 `onBackPressed()` deprecated 但不破 | API 33+ 加 `OnBackInvokedDispatcher`；测试白名单中 `bannedRefs` 需要更新 |

---

### 1.2 `/check`：代码与配置审查（强制硬性停止规则）

**审查深度**：Deep（>500 行 + Android 配置 + 安全敏感面）。
**Diff 范围**：当前 `main` 整体 vs 目标 v1.1.0（向前审查）。
**Scope drift**：本审查 on target — 全部发现都属于"成为 SOTA"的合理范畴，不引入与游戏无关的改造。

#### 1.2.1 安全审查

**[!] [P0-SEC-1]  Android WebView 启用了文件 URL 跨源访问**
- 位置：`android/app/src/main/java/com/iwannabewater/niniyuan/MainActivity.java:43-44`
- 现状：
  ```java
  settings.setAllowFileAccessFromFileURLs(true);
  settings.setAllowUniversalAccessFromFileURLs(true);
  ```
- 风险：CVE-2014-6041 同族家族安全问题。这两个设置允许 `file://` 页面读取任意本地文件 / 跨源访问其他 file:// 资源。本游戏所有资源都从 `file:///android_asset/index.html` 同源加载，不需要跨源。Android 4.1+ 默认是 `false`，把它改为 `true` 是主动放权。
- 影响范围：恶意页面（极不可能进入 APK 内，但仍是攻击面）可读取应用沙箱内的任意文件。
- 自动修复分类：**safe_auto**（删除两行）。修复后行为不变，因为没有任何资源依赖跨源。
- 修复 diff：
  ```diff
  - settings.setAllowFileAccessFromFileURLs(true);
  - settings.setAllowUniversalAccessFromFileURLs(true);
  ```

**[!] [P0-SEC-2]  Manifest 启用 cleartext HTTP 流量**
- 位置：`android/app/src/main/AndroidManifest.xml:12`
- 现状：`android:usesCleartextTraffic="true"`
- 风险：游戏完全离线，没有任何 HTTP/HTTPS 请求路径。打开此项是 Google Play Data Safety 与上架审核的红旗（"为什么离线游戏需要明文流量？"）。
- 自动修复分类：**safe_auto**。
- 修复 diff：
  ```diff
  - android:usesCleartextTraffic="true"
  ```
- 验证：构建 APK 后用 `adb logcat` 跟踪启动，确认 WebView 没有 net stack 调用即可。

**[~] [P1-SEC-3]  innerHTML 注入路径**（中等风险）
- 位置：`src/game.js:1644-1648`（`renderMenus`），`src/game.js:1561-1565`（`showChapterIntro`）。
- 现状：
  ```js
  document.getElementById("saveStrip").innerHTML = [
    `<div class="save-chip">已解锁章节<br><strong>${Math.min(save.unlocked, levels.length)} / ${levels.length}</strong></div>`,
    `<div class="save-chip">当前角色<br><strong>${characters[save.selected].name}</strong></div>`,
    ...
  ].join("");
  ```
- 风险：所有插入的值都来自静态数据 (`levels[]`, `characters[]`)，只有 `save.unlocked / totalCoins` 来自存档。`Math.min` 把字符串 → NaN（不是 HTML），`characters[save.selected].name` 在 selected 被篡改后会抛 TypeError 不会注入。所以**当前并无可利用的 XSS 路径**。但留着 `innerHTML` 模式意味着如果未来加一个"自定义角色名字"功能，会是 0-day。
- 自动修复分类：**gated_auto**（同时改写为 `textContent` + 节点构建）。
- 修复方案：见 §3.2 hunt 第 3 项的 `render/hud.js` 重写。

**[-] [P2-SEC-4]  Android 调试 Keystore 在仓库**
- 位置：`android/debug.keystore`
- 现状：`.gitignore` 已忽略，但当前文件 2778 字节存在于工作树（被排除追踪）。
- 风险：不上传到 git，仅本地，**当前合规**。但 README 没明示该文件不能用于发版签名。
- 自动修复分类：**advisory**。
- 处理：在 README "Build Android APK" 段加一句中文/英文双语警告。

#### 1.2.2 边界条件与游戏物理

**[~] [P1-PHYS-1]  极端 dt 下 `updatePlayer` 可能穿墙**
- 位置：`src/game.js:727-731`（`moveAxis`）
- 现状：把位移分割为每步最多 14 像素，避免单帧大位移穿墙。`FIXED_DT=1/120` 时单帧最大 dt 也只有 8.3ms，但当用户切到后台再切回，`accumulator += frameDt` 累积，`while (accumulator >= FIXED_DT)` 可能在循环里多次跑 `update(FIXED_DT)`，每次仍然小步长，所以**实际不穿**。验证后此项降级为 advisory。
- 自动修复分类：**advisory**。
- 处理建议：在主循环加最大累加器上限，避免回到前台时游戏跑 50+ tick 假帧：
  ```js
  // src/game.js:1755 附近
  accumulator = Math.min(accumulator + frameDt, FIXED_DT * 4); // 最多补 4 帧
  ```

**[!] [P0-PHYS-2]  `dashEdgeBlocked` 命名误导**（不影响行为，但 mechanics-balance 测试断言含糊）
- 位置：`src/game.js:716-725`
- 现状：函数名暗示"被阻挡"，但实际返回 `true` 表示"应该刹车"（即"前方没有地面"）。
- 风险：未来贡献者读到 `if (dashEdgeBlocked()) { player.skillTimer = 0; }` 容易理解反。
- 自动修复分类：**safe_auto**（rename）。
- 修复 diff：
  ```diff
  - function dashEdgeBlocked() {
  + function dashShouldStopAtEdge() {
      if (!player.onGround || inputs.jump || player.vy < -40) return false;
      ...
    }
    // 同步更新调用点 src/game.js:563
  ```
  并更新 `tests/mechanics-balance.js:55` 的字符串匹配。

**[~] [P1-PHYS-3]  `updatePlayerSize`（berry 增大）回滚不一定走得回**
- 位置：`src/game.js:655-676`
- 现状：变大时如果新 body 与平台重叠就回滚到旧坐标。**但回滚的旧坐标用的是 `player.x/y`（已经被 baseline 修改前），不是触发本次 size 变化前的真正位置**。具体：函数开头先存 `oldX = player.x`，然后立刻 `player.w = targetW`，若发现 blocked → 写回 `player.w = oldW`，但 `player.x` 已经被中间的 `clamp(...)` 改过。该路径仍可能让人物在变大失败那帧"轻微抖动"。
- 自动修复分类：**gated_auto**。
- 修复方案：把 `oldX`/`oldY` 先保存到本地常量，回滚时一并恢复（实际代码已恢复）。但 clamp 边界裁剪后回滚用的是中间值。重写：
  ```js
  function updatePlayerSize() {
    const targetW = player.bigTimer > 0 ? 43 : player.baseW;
    const targetH = player.bigTimer > 0 ? 72 : player.baseH;
    if (player.w === targetW && player.h === targetH) return;

    const snapshot = { x: player.x, y: player.y, w: player.w, h: player.h };
    const bottom = player.y + player.h;
    const center = player.x + player.w / 2;

    player.w = targetW;
    player.h = targetH;
    player.x = clamp(center - player.w / 2, 0, activeLevel.width - player.w);
    player.y = bottom - player.h;

    const blocked = allSolids().some((p) => !p.broken && rectsOverlap(bodyRect(player), p));
    if (blocked && (targetW > snapshot.w || targetH > snapshot.h)) {
      Object.assign(player, snapshot);
    }
  }
  ```

**[~] [P1-PHYS-4]  风场叠加 `vx` 但未应用 dt 限速**
- 位置：`src/game.js:514-518`
- 现状：`player.vx += w.force * dt;` 当玩家持续在风场内、按住反向键时，`player.vx` 可能远超 `ch.speed`，因为玩家自身的 `moveToward` 不会反向减速到风以下。
- 影响：第三章 cloudsea/auroracitadel 在窗内逆风跑动手感可能不一致（视觉上没问题，但若给 boost 增益则可能瞬间冲出地图）。
- 自动修复分类：**gated_auto**。
- 修复：在风场叠加后限制：
  ```js
  for (const w of activeLevel.wind) {
    if (rectsOverlap(playerRect, w)) {
      player.vx = clamp(player.vx + w.force * dt, -ch.speed * 1.6, ch.speed * 1.6);
      ...
    }
  }
  ```

#### 1.2.3 依赖审查

**[!] [P0-DEP-1]  `npm start` 依赖未声明的 http-server**
- 位置：`package.json:7`
- 现状：`"start": "npx http-server . -p 4173 -c-1"`，但 http-server 既不在 dependencies 也不在 node_modules。
- 风险：
  - 离线 / 内网开发机首次跑 `npm start` 会失败。
  - CI 不跑 start 所以不会暴露，但开发者上手第一步就卡。
  - 与 `tests/browser-smoke.js:8` 的 `python3 -m http.server` 不一致，制造"为什么这两个用法不一样"的认知负担。
- 自动修复分类：**gated_auto**（要么加依赖、要么改用 python3、要么写 Node 自实现）。
- 推荐方案 A（加 devDep）：
  ```json
  "devDependencies": {
    "http-server": "^14.1.1",
    "playwright": "^1.59.1"
  },
  "scripts": {
    "start": "http-server . -p 4173 -c-1 --cors -s"
  }
  ```
  并删除 `npx`，让本地依赖优先。理由：与 browser-smoke 的目的不同（开发者现场访问 vs CI 自动化），各用各的没问题。
- **不推荐**统一用 python3：Windows 开发机不一定装 python3。
- **不推荐**自实现：增加维护负担。

**[-] [P2-DEP-2]  Playwright 是 devDep**，但 `npx playwright install chromium` 是 README 手动步骤
- 现状合规，仅记录在文档中。
- 处理：在 README 加一句 "首次安装后须执行 `npx playwright install chromium`" — 当前 README 第 39 行已有此步骤。**已合规，advisory**。

**[-] [P2-DEP-3]  `@fontsource/noto-sans-sc` 在 dependencies 但项目未使用 npm 路径加载**
- 位置：`package.json:12`，实际加载在 `styles.css:1-15` 用相对路径 `./assets/fonts/...`。
- 现状：节包对应的 woff2 文件被手动 cp 到 `assets/fonts/`，包本身只是用来从 npm 拉文件的"安装介质"。
- 风险：发版时 node_modules 不打进 APK，但开发者升级 fontsource 后会忘记同步 assets。
- 处理建议：写一行 `scripts/sync-fonts.sh`：
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  cp node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-{400,700}-normal.woff2 assets/fonts/
  ```
  并把字体改用 LXGW WenKai（详见 §2.3）后此项可移除。

#### 1.2.4 自动修复矩阵汇总

| ID | 类别 | 严重度 | 文件:行 | 处理 |
| --- | --- | --- | --- | --- |
| P0-SEC-1 | safe_auto | 致命 | MainActivity.java:43-44 | 立即删除两行 |
| P0-SEC-2 | safe_auto | 致命 | AndroidManifest.xml:12 | 立即删除属性 |
| P0-PHYS-2 | safe_auto | 致命 | game.js:716-725 | 立即重命名 |
| P0-DEP-1 | gated_auto | 致命 | package.json:7-15 | 单次确认后批改 |
| P1-SEC-3 | gated_auto | 重要 | game.js:1644+ | 与 hud.js 重写一并 |
| P1-PHYS-3 | gated_auto | 重要 | game.js:655-676 | 单次确认后批改 |
| P1-PHYS-4 | gated_auto | 重要 | game.js:514-518 | 单次确认后批改 |
| P2-DEP-3 | advisory | 优化 | package.json:12 | 文档记录 |
| P2-SEC-4 | advisory | 优化 | README.md | 文档警告 |
| P1-PHYS-1 | advisory | 重要 | game.js:1755 | 加累加器上限 |

---

## 阶段二 · 美学体系 (design)

### 2.1 美学方向锁定（不再问 5 个问题，因为项目已上线，方向必须基于现有美术 + 角色定位推导）

#### 视觉论题（Visual Thesis）

> **「夜行星图」**（Stellar Atlas, Nightbound）— 一份在午夜青黛色绢面上以金线勾勒的星图，主角是两个在星图里穿梭的小旅人。情绪：好奇 + 庄重；材质：绢、星砂、玉、铜；能量：克制的、缓慢呼吸的（不是高饱和马力欧式的活泼）。

**为什么是这个方向**：

1. 主角设定已经给出锚点——妮妮（星羽 / 星露 / 月糖 / 粉金）= 夜空的暖色调；源源（青岚 / 风铃果 / 玉青）= 夜空的冷色调。两人合在一起就是"星图里的一对北斗"。
2. 同类参考产品（不抄，只取其骨架）：
    - **《Sky · 光遇》(Sky: Children of the Light)** — 取其"羽毛 + 星光 + 浅色发光描边"的层次叙事。
    - **《崩坏：星穹铁道》"星海会议室" 主菜单** — 取其"金线 + 玉色 + 深底"的高级感。
    - **《原神》璃月港 UI** — 取其"中文显示字 + 古典装饰边角 + 留白"的版式骨架。
    - **《Celeste》像素 UI** — 取其"信息密度 + 色彩节制 + 强反馈微动效"的功能感。
3. 项目内已有的视觉资产（`renderBackground` 三层视差山线、`drawSkyMotifs` 26 颗星 + 4 朵云、character-card 的径向渐变）天然契合，不需要重画地图，只需要重统一色板与字。

#### 三个标志性元素（必须在第一屏出现至少两个）

1. **金线描边的发光面板**：所有 `.panel` 用 1px 内描边 + 18% 透明度的金 (#D9B66A) `inset 0 0 0 1px`，外发光 `0 28px 90px hsla(220, 50%, 4%, .7)`，背景是青黛绢底纹（`linear-gradient` + 一层 `radial-gradient` 模拟绢光）。
2. **毛笔字标题**（display font）：使用霞鹜文楷（LXGW WenKai），字重 700，字距 `letter-spacing: 0.04em`。这是品牌的最强差异点。
3. **悬浮星砂粒子**：所有静态屏（菜单 / 角色选择 / 关卡选择）背景持续有 12-16 颗淡金色微粒做正弦上下浮动，密度低、不分散注意力，但是任何截图都能立即认出这是 NiniWithYuan 的 UI。

#### 一句话留下的记忆

> 「在午夜的星图前，被一行毛笔字唤住名字。」

### 2.2 OKLCH 调色板与设计 Tokens

**为什么用 OKLCH 不用 HSL**：OKLCH 是感知均匀的，调亮度（L 通道）不会同时让颜色"偏色"或"偏暗"，做暗色 / 亮色双主题切换、做悬停态、做禁用态时不需要逐色微调。Chrome 111+ / Safari 15.4+ / Firefox 113+ 已支持 `oklch()` 原生 CSS 函数（覆盖 95%+ 移动端，Android WebView 自 Chrome 115 起支持，min-sdk 23 的旧设备需要 fallback）。

**双 token 策略**：每个语义色都给出一个 oklch() 主值和一个 hex 兜底值，使用 CSS 变量。低端 WebView 会用 hex；现代浏览器使用 oklch。

```css
/* styles.css 顶部，替换现有 :root */
:root {
  color-scheme: dark;

  /* === Brand canvas === */
  --c-night-900: #0B1024;            /* oklch(18% 0.06 270) */
  --c-night-800: #11182E;            /* oklch(22% 0.06 268) */
  --c-night-700: #1A2342;            /* oklch(28% 0.07 265) */
  --c-night-500: #2D3F75;            /* oklch(40% 0.10 264) */

  /* === Brand accents === */
  --c-gold-400:  #F2D389;            /* oklch(86% 0.10 90) */
  --c-gold-500:  #D9B66A;            /* oklch(78% 0.12 88) */
  --c-gold-600:  #B0904D;            /* oklch(65% 0.12 86) */

  --c-jade-400:  #99F0CF;            /* oklch(89% 0.10 165) */
  --c-jade-500:  #5DD4A8;            /* oklch(78% 0.13 162) */
  --c-jade-600:  #3FA683;            /* oklch(64% 0.13 162) */

  --c-rose-400:  #FFB6CF;            /* oklch(82% 0.10 350) */
  --c-rose-500:  #F08AB0;            /* oklch(72% 0.13 350) */
  --c-rose-600:  #C25D85;            /* oklch(58% 0.14 348) */

  --c-cyan-400:  #9EE7FF;            /* oklch(88% 0.08 230) */
  --c-cyan-500:  #5FCDF2;            /* oklch(78% 0.10 230) */

  /* === Semantic === */
  --bg-base:     var(--c-night-900);
  --bg-panel:    color-mix(in oklch, var(--c-night-800) 88%, transparent);
  --bg-elevated: var(--c-night-700);
  --ink:         #F5F2EA;            /* oklch(95% 0.013 80) — 暖象牙白 */
  --ink-muted:   color-mix(in oklch, var(--ink) 65%, var(--c-night-700));
  --hairline:    color-mix(in oklch, var(--c-gold-500) 28%, transparent);

  /* Player accents (与 game.js 内 character.accent 同步) */
  --c-nini:      var(--c-rose-500);
  --c-yuan:      var(--c-cyan-500);

  /* Status colors */
  --c-danger:    #E2566F;            /* oklch(64% 0.18 12) */
  --c-warning:   var(--c-gold-500);
  --c-success:   var(--c-jade-500);

  /* Spacing scale (4-base) */
  --s-1: 4px;   --s-2: 8px;   --s-3: 12px;  --s-4: 16px;
  --s-5: 24px;  --s-6: 32px;  --s-7: 48px;  --s-8: 64px;

  /* Radii */
  --r-xs: 4px;  --r-s: 6px;   --r-m: 10px;  --r-l: 14px;  --r-xl: 22px;

  /* Type scale */
  --font-display: "LXGW WenKai", "霞鹜文楷", "Noto Serif SC", "Source Han Serif SC", serif;
  --font-text:    "LXGW WenKai", "Noto Sans SC Local", "Noto Sans SC", "PingFang SC", system-ui, sans-serif;

  /* Touch */
  --touch-size: 98px;

  /* Motion */
  --ease-out:     cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --d-fast:    140ms;
  --d-base:    220ms;
  --d-slow:    420ms;

  /* Shadows (calibrated for dark UI) */
  --shadow-1: 0 4px 14px hsl(220 60% 4% / 0.45);
  --shadow-2: 0 18px 50px hsl(220 60% 4% / 0.55);
  --shadow-3: 0 28px 90px hsl(220 60% 4% / 0.7);
  --glow-gold: 0 0 0 1px var(--hairline), 0 12px 32px color-mix(in oklch, var(--c-gold-500) 18%, transparent);
}

@supports (color: oklch(0% 0 0)) {
  :root {
    --c-night-900: oklch(18% 0.06 270);
    --c-night-800: oklch(22% 0.06 268);
    --c-night-700: oklch(28% 0.07 265);
    --c-gold-500:  oklch(78% 0.12 88);
    --c-jade-500:  oklch(78% 0.13 162);
    --c-rose-500:  oklch(72% 0.13 350);
    --c-cyan-500:  oklch(78% 0.10 230);
    --c-danger:    oklch(64% 0.18 12);
  }
}
```

#### 对比度审计（WCAG AA）

| 前景 / 背景 | 比值 | 用途 | 状态 |
| --- | --- | --- | --- |
| `#F5F2EA` / `#0B1024` | 16.4 : 1 | 正文 / 标题 | AAA |
| `#F5F2EA` / `#11182E` | 14.0 : 1 | 面板正文 | AAA |
| `--ink-muted` / `#11182E` | 8.6 : 1 | 副文 | AAA |
| `#D9B66A` / `#11182E` | 8.2 : 1 | 金色主按钮文字（深底浅字） | AAA |
| `#1C2230` / `#F2D389` | 11.4 : 1 | 主按钮（金底深字） | AAA |
| `#5DD4A8` / `#11182E` | 7.9 : 1 | 状态栏 success | AAA |
| `#E2566F` / `#11182E` | 4.7 : 1 | danger 按钮文字 | AA |

所有组合超过 WCAG AA（4.5:1）。Status / hud-pill / chip 等 ≥ 13px 的小字也仍超 AA。

### 2.3 字体替换：从 Noto Sans SC → LXGW WenKai

**为什么换**：
- Noto Sans SC 是 Google + Adobe 联合的工作字体，工程化好，但用在游戏 UI 上等同于"无个性"。
- **LXGW 霞鹜文楷**（lxgw/LxgwWenKai）是开源（OFL-1.1 / SIL）的中文楷书风字体，作者陈帝豪以《霞鹜文楷》系列开源，气质偏笔锋楷书，用在 Genshin / Sky 风格的奇幻题材是行业默认选择之一。
- 文件可控：核心 woff2 子集（GB2312 + 标点）≈ 2.4MB。再做 unicode-range 二级子集化能压到 600-800KB。

**现状对照**：
- `assets/fonts/noto-sans-sc-chinese-simplified-{400,700}-normal.woff2` 各约 1.1 MB。
- 替换方案：**LXGW WenKai Mono Light** 用于正文，**LXGW WenKai Bold** 用于标题与显示字。

**实施 diff**（styles.css）：

```diff
- @font-face {
-   font-family: "Noto Sans SC Local";
-   src: url("./assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2") format("woff2");
-   ...
- }
+ @font-face {
+   font-family: "LXGW WenKai";
+   src: url("./assets/fonts/lxgw-wenkai-light.woff2") format("woff2");
+   font-weight: 400;
+   font-style: normal;
+   font-display: swap;
+   unicode-range: U+0020-007E, U+4E00-9FA5, U+3000-303F, U+FF00-FFEF;
+ }
+ @font-face {
+   font-family: "LXGW WenKai";
+   src: url("./assets/fonts/lxgw-wenkai-bold.woff2") format("woff2");
+   font-weight: 700;
+   font-style: normal;
+   font-display: swap;
+   unicode-range: U+0020-007E, U+4E00-9FA5, U+3000-303F, U+FF00-FFEF;
+ }
```

**子集化命令**（开发者本地一次性，结果 commit 进 `assets/fonts/`）：

```bash
# 需要 fonttools: pip install fonttools brotli
pyftsubset \
  ~/Downloads/LXGWWenKai-Light.ttf \
  --unicodes="U+0020-007E,U+4E00-9FA5,U+3000-303F,U+FF00-FFEF" \
  --layout-features="kern,liga,locl" \
  --flavor=woff2 \
  --output-file=assets/fonts/lxgw-wenkai-light.woff2
```

**备选**：若确认 LXGW WenKai 风格"过于楷书"，备选 **思源宋体 (Source Han Serif SC) Heavy** — 同样开源、显示力强、与"星图"主题契合度也高。最终选择由用户在 v1.1 alpha 阶段在两个真实截图上对比选定。

### 2.4 微交互（Micro-interactions）总表

| 元素 | 触发 | 时长 | 缓动 | 实现 |
| --- | --- | --- | --- | --- |
| 主按钮 hover | `:hover` (only `hover: hover` 媒体) | 220ms | `--ease-out` | `transform: translateY(-1px)` + `box-shadow` 加金光 |
| 主按钮 press | `:active` | 120ms | `linear` | `transform: translateY(2px) scale(.98)` + 一次性发光脉冲 (CSS animation) |
| 屏幕切换 | `.screen.active` 切换 | 380ms | `--ease-spring` | 离开屏 `opacity 0 → translateY(8px)`，进入屏 `opacity 0 + translateY(-12px) → 0`，错峰 60ms |
| 章节介绍卡 | `.chapter-intro.active` | 220ms | `cubic-bezier(0.16,1,0.3,1)` | **已实现**，保留并把 transform-origin 调到中心顶部 |
| 关卡卡选中 | `.level-item:focus-visible` | 200ms | `--ease-out` | 内描边淡入 + 卡片向上 1px |
| 拾取金币 | game.js 内调用 | — | — | `floatText` 上浮 0.8s + `burst` 9 颗粒子，**已实现**，加一个屏幕轻微 chromatic offset 0.06s |
| HUD 数字翻动 | 数字变化 | 240ms | `--ease-out` | 每次 `health/coins/ammo` 变化时把对应 `<span>` 加 `.tick` 类，CSS 用 `transform: scale(1.18)` 后回归 |
| 暂停弹层 | 出现 / 消失 | 280ms | `--ease-spring` | 背景 backdrop-blur 渐入；卡片 `scale(0.96) → 1` |
| Boss bar 进度 | 玩家位置 | 60fps 跟随 | `linear` | **已实现**（`hudEls.bar.style.width`） |
| 触屏按钮按下 | `pointerdown` | 90ms | `linear` | `scale(0.94)` + 内发光，**已实现**，加 haptic API（Android 4.4+）：`navigator.vibrate(8)` |

**全部交互必须遵守**：
- `prefers-reduced-motion: reduce` 时所有 transition 设为 `0.001ms`（已存在，保留）。
- 任何动画时长 > 300ms 的过场必须可被 `Esc` / 触屏点击中断（暂停弹层是个例子，实现：`.modal.active { transition: opacity .28s; } .modal.is-skipping { transition: none; }`）。

### 2.5 关键组件重设计

#### 2.5.1 主菜单 (`#menu`)

**痛点**：当前主菜单把"标题 + 副标题 + 按钮 + 存档片"和"双角色卡片"在 1.04:0.72 的网格里硬挤，桌面端尚可，移动端要把右栏整个塞到上方 190px，视觉重心被打散。

**新版结构**：

```
┌─────────────────────────────────────────────────────────┐
│ [eyebrow: NINI & YUAN]                                  │
│                                                         │
│   妮 妮 源 源                          ┌──────┐ ┌──────┐│
│   历  险  记                            │ 妮妮 │ │ 源源 ││
│   ─────                                 │      │ │      ││
│   双角色幻想平台跳跃 · 五大章节         └──────┘ └──────┘│
│                                                         │
│   ╭─────────╮ ╭─────────╮ ╭─────────╮ ╭─────────╮      │
│   │ 继续冒险 │ │ 选择关卡 │ │ 选择角色 │ │  设置  │      │
│   ╰─────────╯ ╰─────────╯ ╰─────────╯ ╰─────────╯      │
│                                                         │
│   ┌─────┐ ┌─────┐ ┌─────┐                              │
│   │ 已解锁│ │当前 │ │累计 │                              │
│   │ 5/5 │ │妮妮 │ │1234 │                              │
│   └─────┘ └─────┘ └─────┘                              │
└─────────────────────────────────────────────────────────┘
```

- 标题改为竖排上下两行，毛笔字 (LXGW Bold) clamp(72px, 11vw, 144px)。
- 角色卡片缩小到右上、稍微旋转 -3° / +3°，作为「现已签名的明星卡」存在，不再是主视觉。
- 主按钮组从 4 列改为 4 列居中，每个按钮高度 56px，主按钮（继续冒险）金色，其余玻璃态。
- 存档 chip 数字改成 LXGW Bold + tabular-nums（`font-variant-numeric: tabular-nums`）。

#### 2.5.2 角色选择 (`#characterScreen`)

**痛点**：现在两张卡片都使用相同尺寸 + 相同色块，唯一差别是中央人物图。卡片本身没有"选中即承诺"的仪式感。

**新版**：
- 两卡尺寸不变，但**未选中态降低对比度**（卡片 opacity 0.6，灰滤镜 saturate(0.7)），鼠标悬停或键盘 focus 时 0.6 → 1。
- 选中态卡片获得`--glow-gold` + 卡顶冒出一个"已选定"金色徽章 (LXGW Bold)。
- 「选择妮妮 / 选择源源」按钮文案改为「以妮妮的名义出发」「以源源的名义出发」，更像仪式。
- 卡内 `<dl class="ability-list">` 改用 4 行图标（小型 inline SVG）+ 文字，目前是 3 行文字纯描述，视觉密度太纯文本。

#### 2.5.3 关卡选择 (`#levelScreen`)

**痛点**：5 个 `.level-item` 横铺，移动端单列；文案使用 `<br>` 硬换行，没有视觉锚点。

**新版**：
- 关卡列表从 5 列网格 → 1 大 + 4 小的"当前最近关 + 其他章节" 布局。当前最近关 (= `save.unlocked - 1`) 占左侧 60% 宽，包含一张该关卡的"画面缩略图"（用每个 level palette 渲染的横幅 SVG，运行时即可生成），右侧 4 个小卡上下排列。
- 关卡星级用真实的星形 SVG，未达到的填充透明 + 描边。
- 章节副标题（vibe）改成毛笔字小标题，主标题改成 LXGW Bold。

#### 2.5.4 HUD（游戏内顶栏）

**痛点**：当前 8 个 `.hud-pill` 横排，移动端会换行成两行；信息密度高但层级扁平；`生命 3` 用纯数字，缺乏快速识别度。

**新版**：

```
┌────────────────────────────────────────────────────────────────────┐
│  [妮妮]    ❤❤❤   ✦ 12   ◆ 36   ⏱ 02:14   [星莓 18]   [滑翔 就绪]  ⏸  │
└────────────────────────────────────────────────────────────────────┘
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 进度条
```

- 生命改为最多 5 个心形 SVG 横列；超过 5 时显示 `❤×6`。
- 星露用 `✦`，弹药用 `◆`，时间用 `⏱`，状态/技能用[圆角胶囊]。
- 数字字体使用 `tabular-nums` 避免数字跳动时整行抖动。
- 移动端把"控制提示"`#controlTips` 的 5 个小标签从右上移到屏幕底部（触摸键正上方），减少 HUD 区拥挤。
- 暂停按钮 `Ⅱ` 改成 SVG，触摸命中区从 42×42 提到 56×56（Apple HIG 建议 ≥44pt，Google 建议 ≥48dp）。

#### 2.5.5 暂停 / 通关 模态弹层

**痛点**：模态用纯 CSS 透明度淡入，按钮排成一行 wrap，缺乏"剧情语言"。

**新版**：
- 卡片在屏幕中央，背景 backdrop-blur(18px) + 60% 黑覆盖，卡片本身的金色描边 + 微微浮动（`@keyframes panel-breathe { 0%,100% { translateY: 0 } 50% { translateY: -2px } }`，4s 周期）。
- 通关弹层增加大字 `通关` (LXGW Bold 56px) + 三星动画（每颗星错峰 120ms 弹入），收集率 100% 时第三星额外有粒子环绕。
- 按钮顺序固定：主操作（下一章 / 重新挑战）在最右、副操作（重玩本章 / 返回菜单）在左侧。

### 2.6 角色形象升级

**当前**：`assets/characters/nini-v2.png` (1.18MB, 单图 PNG)、`yuan-v2.png` (1.19MB, 单图 PNG)。`drawCharacterSprite` 一次性贴 PNG，靠 stretch/lean 给少量姿态变化。**没有动画帧**。

**问题**：
1. 体积偏大（合计 2.4MB），打进 APK 会让首启 IO 多 1-2 帧。
2. 单帧贴图无法实现"跑动 / 跳跃 / 受伤"等姿态切换；目前所有姿态都靠 `ctx.scale + ctx.rotate` 模拟，远看 OK，近看僵硬。

**v1.1 推荐方案**：

A. **保留 v2 PNG 作为兜底**，但**新增** `assets/characters/{nini,yuan}/{idle,run,jump,fall,hurt,skill}.webp`（精灵图集，每姿态 6 帧；总共 ~600KB / 角色，6 倍图量但 webp 压缩后还更小）。

B. **新增 sprite atlas JSON**：
```json
// assets/characters/nini/atlas.json
{
  "frame": { "w": 96, "h": 128 },
  "anim": {
    "idle":  { "frames": [0,1,2,3,2,1], "fps": 6, "loop": true },
    "run":   { "frames": [4,5,6,7,8,9], "fps": 12, "loop": true },
    "jump":  { "frames": [10,11], "fps": 12, "loop": false },
    "fall":  { "frames": [12,13], "fps": 8, "loop": true },
    "hurt":  { "frames": [14,15], "fps": 14, "loop": false },
    "skill": { "frames": [16,17,18,19], "fps": 16, "loop": false }
  }
}
```

C. **`render/entities.js`** 替换现有 `drawCharacterSprite`：根据 `player.vy / vx / onGround / hurtFlash / skillTimer` 决定当前 anim，并按 `(performance.now() / 1000) % (frames.length / fps)` 计算帧号。

D. **本计划暂不交付帧贴图本身**（这是美术工作），仅交付：
- atlas.json schema 与加载器代码。
- 占位 placeholder：用现有 v2.png 切成 1×1 grid，让代码先跑通"动画系统 + 1 帧 idle"路径，等美术替换。

### 2.7 设计系统交付物

| 交付物 | 路径 | 作用 |
| --- | --- | --- |
| Tokens (CSS 变量) | `styles.css :root` | 单一真相源 |
| Token 文档 | `docs/DESIGN.md`（v1.1 新增） | 给后续美术 / 前端共用的命名规范 |
| 动效规范 | `docs/MOTION.md` | 时长 / 缓动 / 中断规则 |
| 字体子集 | `assets/fonts/lxgw-wenkai-{light,bold}.woff2` | 直接打包进 APK |
| 角色 atlas schema | `docs/CHARACTER_ATLAS.md` | 给美术下一步配套图集 |

---

## 阶段三 · Debug 与项目健康 (hunt + health)

### 3.1 `/hunt`：实测启动 + 测试

**`npm test` 实测输出**（2026-05-02 在 Node 24.15.0 跑）：

```
> nini-yuan-adventure@1.0.0 test
> node --check src/game.js && node tests/physics-balance.js && node tests/mechanics-balance.js && node tests/android-wrapper.js && node tests/browser-smoke.js

physics-balance: nini 240.4px, yuan 208.8px
mechanics-balance: pickup reach, dash distance, and glide responsiveness passed
android-wrapper: startup compatibility checks passed
browser-smoke: 4 passed
```

**√ 全部通过，无警告。**

**`npm start` 实测**：未实测（避免污染网络日志）。**预期失败**因为 http-server 不在 node_modules（见 P0-DEP-1）。已通过静态分析 + `ls node_modules/.bin` 确认（仅 playwright / playwright-core）。

**Hunt 结果汇总**：

| 现象 | Root cause | 文件:行 | 修复 | 状态 |
| --- | --- | --- | --- | --- |
| `npm start` 在新机首次失败 | http-server 未声明 | package.json:7 | 加 devDep | 待修 |
| Android WebView 跨源开关 | 历史 default-on | MainActivity.java:43-44 | 删除 | 待修 |
| Cleartext traffic | manifest 显式 true | AndroidManifest.xml:12 | 删除 | 待修 |
| `dashEdgeBlocked` 命名反向 | 历史命名错位 | game.js:716 | rename | 待修 |
| 累加器在切前后台时跑飞（理论） | 无上限 | game.js:1755 | clamp 4 帧 | 待修 |
| Berry 变大碰撞回滚不完整 | clamp 改了 x 后回滚不一致 | game.js:655-676 | snapshot 整体回滚 | 待修 |
| 风场叠加无速度上限 | 缺 clamp | game.js:514-518 | 风场 clamp 1.6× | 待修 |
| innerHTML 模式（潜在） | 旧式渲染 | game.js:1644 | 改 textContent + 节点构建 | 待修 |

**未覆盖的 happy path 之外的边界**（需要补测试）：

1. **`pause / resume / 切前后台`** — 没有任何测试覆盖 visibilitychange，但有真实风险（accumulator 跑飞 + audioCtx 不暂停）。需要新加 `tests/lifecycle.js`：
   ```js
   await page.evaluate(() => Object.defineProperty(document, 'hidden', { value: true }));
   await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
   await page.waitForTimeout(2000);
   await page.evaluate(() => Object.defineProperty(document, 'hidden', { value: false }));
   await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
   // 断言 player.elapsed 不会暴增 2s
   ```
2. **存档篡改容错** — 没有测试覆盖"localStorage 里塞一个非法 selected 字符串"。新加 `tests/save-tampering.js`：
   ```js
   await page.evaluate(() => localStorage.setItem('nini-yuan-save-v1', JSON.stringify({ selected: '<script>', unlocked: 99 })));
   await page.reload();
   // 断言：游戏正常加载，selected 回退到 'nini'，unlocked 回退到 1
   ```
3. **每章 100% 收集星露后通关** — 没有测试断言星级判定与 `save.levelStars` 写入。新加 stars 测试。
4. **触屏按住跳跃可跳变跳** — 浮空滑翔的"释放跳跃后变滑翔"路径没有测试断言滑翔实际启动。

### 3.2 `/health`：项目健康度审计

**Tier 评估**：~50 文件、单贡献者、有 GitHub Actions CI = **Standard** tier。期望：CLAUDE.md + 1-2 rules + 2-4 skills + basic hooks。

#### Layer 1: CLAUDE.md
- **状态**：未发现 `CLAUDE.md` 在仓库根目录（`ls -la` 已确认）。
- **建议**：v1.1 增加最小化 CLAUDE.md（贡献者指南 + 编码风格 + 测试命令）。详见 §4 文档章节。

#### Layer 2: 文件健康度

| 检查项 | 现状 | 状态 |
| --- | --- | --- |
| `.gitignore` | 存在，覆盖 node_modules / build / dist / android keystore / .idea / .vscode | √ 充足 |
| `README.md` | 102 行英文为主，结构清晰 | √ 但需要 v1.1 重写（详见 §4.1） |
| `LICENSE` | MIT，作者 "iwannabewater" © 2026 | √ |
| `PRIVACY.md` | 7 行，描述太简略 | × 不满足 Google Play Data Safety |
| `CHANGELOG.md` | 11 行，仅 v1.0 | △ v1.1 需追加 |
| `package.json` | name + scripts + deps OK | △ 缺 `engines` 字段 |
| `manifest.webmanifest` | icons 数组为空 | × PWA 安装无图标 |
| GitHub Actions | 跑 `npm ci` + `playwright install` + `npm test` | √ |

#### Layer 3: package.json scripts

| script | 命令 | 状态 |
| --- | --- | --- |
| start | `npx http-server . -p 4173 -c-1` | × 见 P0-DEP-1 |
| test | `node --check + 4 个 node tests/*.js` | √ |
| build:android | `bash scripts/build-android.sh` | √ 但需要外部 SDK；script 写得不错 |

**v1.1 新增建议 scripts**：

```jsonc
{
  "scripts": {
    "start": "http-server . -p 4173 -c-1 --cors -s",
    "test": "...",
    "test:watch": "node --watch tests/run-all.js",      // v1.1 重组
    "lint": "eslint src/ tests/",                          // v1.1 增加最小 eslint
    "format": "prettier --check .",                        // v1.1 增加
    "format:fix": "prettier --write .",
    "build:android": "bash scripts/build-android.sh",
    "build:fonts": "bash scripts/sync-fonts.sh"
  },
  "engines": {
    "node": ">=20"
  }
}
```

#### Layer 4: 测试覆盖率与有效性

**当前**（4 个测试文件 + 1 syntax check）：

| 文件 | 用途 | 行数 | 评估 |
| --- | --- | --- | --- |
| `physics-balance.js` | 通过正则从源码读 jump/gravity 验证 apex | 42 | √ 巧妙但脆弱：源码格式微调（如缩进）会让正则匹配失败 |
| `mechanics-balance.js` | 拾取 reach、dash 距离、glide 响应性 | 72 | √ 同上，依赖源码字符串包含特定语句 |
| `android-wrapper.js` | manifest 与 Java 文件的字符串断言 | 75 | √ 有效，断言密度高 |
| `browser-smoke.js` | Playwright 4 个真浏览器场景 | 164 | √ 高价值，覆盖了存档失败 / roundRect fallback / 移动端 |

**有效性问题**：
- 物理 / 机制测试用源码正则，绕开了"测真实运行时行为"的承诺。**重构为单元测试**：把 `updatePlayer` / `dashEdgeBlocked` 拆成纯函数后即可在 Node 直接 import 测试。（依赖 §1.1 的模块化重构。）
- 缺乏 Android 实机 / 模拟器烟测（CI 不跑 build:android）。增加 `build-android-smoke.yml` GitHub Actions（macOS runner 装 Android SDK + 跑 `build:android`），失败时 PR 阻断。

**v1.1 新增测试**：

```
tests/
├─ run-all.js                # 替换 npm test 的串接
├─ unit/
│   ├─ storage.test.js       # save schema 校验、迁移
│   ├─ physics.test.js       # 纯函数: moveToward, rectsOverlap, dashShouldStopAtEdge
│   └─ powerups.test.js
├─ integration/
│   ├─ android-wrapper.js    # 保留
│   └─ android-build.yml     # CI 单跑
└─ e2e/
    ├─ browser-smoke.js      # 保留
    ├─ lifecycle.js          # visibilitychange 暂停回放
    ├─ save-tampering.js     # 篡改 localStorage 后启动
    └─ accessibility.js      # 键盘可达 + axe-core 自动扫描
```

#### Health Report 总结

```
[!] Critical (3)
  - WebView dangerous flags         android/app/.../MainActivity.java:43-44
  - Cleartext traffic enabled       android/app/.../AndroidManifest.xml:12
  - npm start broken on fresh clone package.json:7

[~] Structural (5)
  - No CLAUDE.md                    repo root
  - manifest.webmanifest icons[]    project root
  - PRIVACY.md too thin             project root
  - tests use source-string regex   tests/{physics,mechanics}-balance.js
  - No CI for android build         .github/workflows/

[-] Incremental (4)
  - package.json missing engines    package.json
  - debug.keystore note in README   README.md
  - assets too large (2.4MB chars)  assets/characters/
  - No service worker / PWA cache   index.html
```

---

## 阶段四 · 文档与研究 (write + learn)

### 4.1 README.md 重写计划

**新结构**（不在本提案中直接覆写，仅给出大纲与样例段落）：

```
# 妮妮源源历险记 / Nini & Yuan

> 一个可以在网页和 Android 上运行的双角色幻想平台跳跃游戏。
> A web + Android Chinese fantasy platformer for two playable characters.

[徽标 / 4 张关卡截图 / 一个 60s gameplay GIF]

[ 中文 ]            [ English ]

## 玩法 / Gameplay
[2-3 句概览 + 4 个动图：跳跃、滑翔、冲刺、收集]

## 现在开始玩 / Quickstart
### 网页
- 访问 https://niniwithyuan.iwannabewater.com  (TODO: 上线后填入)
- 或本地 `npm install && npm start` → http://127.0.0.1:4173
### Android
- 下载最新 release 的 NiniYuan.apk
- 或本地构建 `npm run build:android`，输出到 `dist/NiniYuan.apk`

## 控制 / Controls
[键盘 + 触屏对照表]

## 项目结构 / Project Structure
[保留现有 ASCII 树，加注释]

## 开发 / Development
- Node ≥ 20, Playwright Chromium for tests, Android SDK 36 + JDK 17 for APK
- `npm test` 跑全部回归测试
- `npm run lint`, `npm run format` 在 v1.1+ 可用

## 安全声明 / Security
- 此游戏完全离线，不收集任何数据。详见 [PRIVACY.md](PRIVACY.md)。
- Android 调试 keystore 仅供本地测试，**不能用于 Play 上架**。

## License
MIT © iwannabewater 2026

## 设计文档 / Design Docs
- [GDD.md](docs/GDD.md) — 游戏设计文档
- [DESIGN.md](docs/DESIGN.md) — UI / 美学设计系统
- [MOTION.md](docs/MOTION.md) — 动效规范
- [ANDROID_TESTING.md](docs/ANDROID_TESTING.md) — Android 实机测试
```

### 4.2 GDD（Game Design Document）骨架

**新文件 `docs/GDD.md`**（v1.1 交付）：

```markdown
# 妮妮源源历险记 — 游戏设计文档

## 一、世界观
- **背景**：星露瀚海中漂浮的群岛王国"夜行星城"。
  亿万年前的创世女神留下一颗"星图心石"，拥有它的人能看见所有可能的航路。
  心石碎成 5 片，散落于王国五大遗境。
- **主角**：
  - **妮妮**（星羽旅者）：天赋是"听得见星语"。靠着双跳与滑翔在最隐秘的航路间穿梭。
  - **源源**（青岚剑心）：天赋是"凝得动空气"。一道青岚冲刺即可破开晶障。
- **任务**：寻回 5 片心石，重铸星图。

## 二、核心机制
### 2.1 物理 (game.js:34-48)
- 固定步长 1/120s，accumulator 累加变 dt → 多次 fixed update。
- 重力：妮妮 2250 px/s²，源源 2300 px/s²。
- Apex：妮妮 240.4px (~5 tile)，源源 208.8px (~4.4 tile)。
### 2.2 主动技能
- **妮妮 · 星羽滑翔**：空中按 J 持续 1.25s，最大下落速度限至 190 px/s。
- **源源 · 青岚冲刺**：地面按 J 0.18s 内位移 ~148 px，自动碎晶 + 破击敌人。
### 2.3 弹药
- **星露弹**（妮妮）：760 px/s + 微弱追踪，伤害 1，无穿透。
- **青岚弹**（源源）：640 px/s 直线，伤害 2，穿透 1。
- 弹药容量 14，1.6s 自动回 1。
### 2.4 食物增益（详见 game.js:852-884）
- **星莓 (berry)**：变大 + 生命上限+1，20s。
- **月糖 (moon)**：超级无敌 + 撞死敌人，8s。
- **晶核 (core)**：弹药+8 + 弹道强化（穿透+1，速度×1.15），12s。
- **风铃果 (bell)**：技能冷却清零 + 冷却×0.55，15s。
- **生命包 (heart)**：恢复 1 心。
### 2.5 关卡元素（敌人 / 危险 / 风场 / 移动平台 / 弹簧 / 可破坏）
[逐一列出参数表，参考 src/game.js:166-339 的 P/C/F/E/S/M/H/B 工厂函数]

## 三、关卡设计
### 第一章 · 星露花庭
- 教学关：二段跳、踩踏敌人、首次拾取。
- 长 88 tile × 16 tile = 4224 × 768 px。
- 调色板 (palette): 黄昏花庭 (`#1c2442 / #425b8f / #ff8fbd / #ffe9a2`)。
[每章重复以上 4 项]

## 四、UI 流程
[ 主菜单 ] → [ 角色 / 关卡 / 设置 ] → [ 游戏内 ] → [ 暂停 / 通关 ] → [ 主菜单 ]

## 五、存档 schema (v2)
[引用 §1.1 的 SAVE_SHAPE]

## 六、平衡与节奏
- 每章关卡完成预期时间：1.5-3 分钟。
- 三星条件：金币 + gem 总收集率 > 82% (game.js:949)。
- 通关共需 ~12 分钟（首通），全收集 ~30 分钟。

## 七、未来路线
- v1.1：本计划（架构 + 美学 + 上架就绪）。
- v1.2：新增第 6 章 + BGM。
- v2.0：成就系统 + 云存档。
```

### 4.3 应用商店描述与隐私政策草稿

#### 4.3.1 Google Play 应用描述（中文 / 英文）

**应用名称**：妮妮源源历险记 / Nini & Yuan

**简短描述**（80 字内，全平台一行展示）：
> 双主角中文奇幻平台跳跃 — 妮妮的二段跳与滑翔，源源的青岚冲刺，跨越 5 大遗境。

> Two-hero Chinese fantasy platformer. Glide as Nini, dash as Yuan, across 5 mystical realms.

**完整描述**（4000 字内，建议 ~600）：
> （中文）
> 在星露瀚海漂浮的群岛王国"夜行星城"，星图心石碎成五片散落各处。带上你最熟悉的伙伴，妮妮 与 源源，在五大遗境间用各自的天赋，找回每一片光。
>
> · 双主角双玩法：妮妮二段跳 + 滞空滑翔，源源青岚冲刺 + 落地破晶。换角色就是换打法。
> · 五章手作关卡：星露花庭、月镜遗迹、云海风帆、辉晶锻炉、极光天城。每章不同的色板、不同的机制密度。
> · 完整离线：无登录、无广告、无氪金。本地存档自动保存。
> · 触屏 + 键盘：手机可单手单脚操作；桌面版支持完整键鼠。
> · 中文为先：所有 UI、提示、剧情皆为中文。
>
> 适合年龄：6 +
> 包大小：约 6 MB
> 不需要联网

**关键词标签（Play 后台）**：platformer, indie, 中文, 平台跳跃, 单机, offline, kids, 双主角

#### 4.3.2 PRIVACY.md v1.1（满足 Google Play Data Safety form）

```markdown
# 隐私政策 / Privacy Policy

最后更新 / Last Updated: 2026-XX-XX

## 中文

《妮妮源源历险记》（"本应用"）由 iwannabewater 开发与维护。本应用是单机离线游戏。

### 我们收集什么

我们**不收集任何个人信息**：
- 不要求账号 / 注册 / 登录
- 不收集联系人、位置、相册、相机、麦克风等任何系统权限
- 不接入任何第三方分析、广告、崩溃上报 SDK
- 不向任何服务器发送数据

### 本地存储

本应用在玩家设备的浏览器 / WebView 本地存储 (localStorage) 中保存以下信息：
- 当前选择的角色（"nini" 或 "yuan"）
- 已解锁章节数（1-5）
- 各章节的最佳时间与星级
- 累计星露数
- 设置（音量、触屏按钮大小、是否开启视觉特效）

清除应用数据 / 卸载应用即彻底清除以上数据。

### Google Play Data Safety 分类

- 个人信息：不收集
- 财务信息：不收集
- 健康与健身：不收集
- 信息：不收集
- 照片和视频：不收集
- 音频文件：不收集
- 文件和文档：不收集
- 日历：不收集
- 联系人：不收集
- 应用活动：不收集
- 网络浏览：不收集
- 应用信息和性能：不收集
- 设备或其他 ID：不收集
- 数据加密传输：不适用（本应用无网络通信）
- 数据删除请求：用户可通过卸载应用 / 清除应用数据自行删除全部数据

### 联系方式

如有疑问，请通过 GitHub issues 联系：
https://github.com/iwannabewater/NiniWithYuan/issues

## English

[同上结构英文翻译]
```

#### 4.3.3 商店截图清单（v1.1 拍摄）

最少 2 张，推荐 5 张（Phone 16:9 1920×1080 或 9:16 1080×1920）：
1. 主菜单（毛笔字标题 + 双角色卡片）
2. 第一章 gameplay（妮妮滑翔过尖刺）
3. 第三章 cloudsea（源源在风场逆风冲刺）
4. 角色选择屏（高对比度展示 UI）
5. 通关弹层（三星 + 时间）

### 4.4 `/learn`：HTML5 独立游戏 + WebView 上架研究

#### 4.4.1 顶级 HTML5 独立游戏的共同最佳实践

**研究范围**：CrossCode（Web demo）、Celeste Classic（itch.io 网页版）、A Short Hike（demo）、Sky Rogue、Ouigo demos、与 Phaser 3 / PixiJS 的官方示例。

**共通最佳实践 12 条**（按对本项目的迁移成本排序）：

1. **固定步长 + 累加器**（已实现 ✓）— `FIXED_DT = 1/120` + `accumulator` 已是行业默认。继续保持。
2. **Coyote time + Jump buffer**（已实现 ✓）— `player.coyote = 0.12s`、`jumpBuffer = 0.14s`。手感关键。
3. **Animation curves on input**（部分实现）— 当前 `moveToward` 已实现线性加速；可升级为指数缓动给"启动 / 急停"更厚的手感。改 30 行代码。
4. **Particle pooling**（未实现）— 现在 `particles.push(...)` + `filter`，每帧产生 / 释放对象。改成对象池能在 hot path 减少 GC。50 行代码。
5. **Asset preloading + loading screen**（未实现）— 现在 PNG 是 `image.src = ...; new Image()`，渲染时若 `!image.complete` 则走 fallback 矢量绘制。改成"首屏先 await 全部资源 promise，再开始 init"。50 行代码。
6. **Frame-rate independence**（已实现 ✓）。
7. **Audio mixing bus + master volume**（部分实现）— 当前 beep gain = `volume / 1000`，但只有 SFX，没有 BGM。需要 §4.4.3 的 BGM 系统。
8. **Sub-pixel rendering on integer scaling**（未实现）— Canvas 默认会导致小角色在小数像素位置上抖动。`ctx.imageSmoothingEnabled = false` + `Math.floor(player.x)` 在绘制时取整。20 行代码。
9. **Post-processing pass**（未实现）— `renderVignette` 已是雏形，但只在非 play 时调用。可选加 chromatic offset / film grain。可选项。
10. **Replay / ghost runs**（不在 v1.1 范围）。
11. **Localization framework**（不需要，本游戏定位中文为主）。
12. **Telemetry-free analytics**（用 client-only metrics 比如 best-time histogram，存 localStorage）— 锦上添花。

**对本项目最值得抄的三条**：8（sub-pixel）、3（input curve）、5（preload）。

#### 4.4.2 Google Play 对 WebView 应用的最新要求与最佳实践

**研究范围**：Android Developers WebView guide、Play Console policy 2025、Google Play 对 "Made for Kids" / 离线游戏的特殊路径、AAB vs APK。

**关键要求与建议**：

1. **target-sdk-version 必须 ≥ 35**（Android 15）2025-08 起。**当前 = 36 ✓**。
2. **min-sdk-version 推荐 ≥ 23**（Android 6+）。**当前 = 23 ✓**。
3. **必须用 App Bundle (AAB) 上传 Play Store**，APK 上架渠道已关。需要扩展 `build-android.sh` 支持 `bundletool`。或者用 Gradle 替换当前手工 aapt2 + d8 流程（中等工作量）。
4. **必须填写 Data Safety Form**（见 §4.3.2 已就绪）。
5. **WebView 安全清单**：
    - `setAllowFileAccess(true)` — 默认 true，加载 `file:///android_asset/` 必需，**保留**。
    - `setAllowFileAccessFromFileURLs(true)` — Android 4.1+ 默认 false，**应删除**（详见 §1.2.1）。
    - `setAllowUniversalAccessFromFileURLs(true)` — 同上**应删除**。
    - `setAllowContentAccess(true)` — 不需要访问 content:// URI，可 `false`，但不影响安全。
    - `setMixedContentMode(MIXED_CONTENT_NEVER_ALLOW)` — **应增加**（虽然没有 mixed content，但显式声明更稳）。
    - `setSafeBrowsingEnabled(false)` — 离线游戏可关，节省 ~5MB 内存。
6. **WebView 启动白屏优化**：
    - 现有方案：splash 用 `TextView` 覆盖在 WebView 上，`onPageFinished` 后淡出。**良好 ✓**。
    - 升级路径：用 Android 12+ 的 SplashScreen API（API 31+），系统级 splash，启动更早。需要 backport 库。**v1.2 再议**。
7. **预测性后退（Predictive Back）**（Android 14+）：
    - 当前：`onBackPressed()` deprecated，但功能正常。
    - 升级：API 33+ 启用 `OnBackInvokedCallback`，但测试 `bannedRefs` 黑名单了。
    - **决定**：v1.1 保持 deprecated API，因为支持 API 23+，新 API 需要 if-version 分支；新加 `OnBackInvokedCallback` 在 API ≥ 33 时启用，把 banned 改为白名单形式。
8. **WebView 生命周期**：
    - `onPause` / `onResume` 中调用 `webView.onPause()` / `webView.onResume()` — **当前未实现，应增加**。否则后台仍消耗 CPU。
    - `onDestroy` 中 `webView.destroy()` — **当前未实现**。

#### 4.4.3 Web 动效与影片化叙事技术调研

**面向 v1.1 / v1.2**：

1. **CSS `view-transition-name` API**（Chrome 111+）— 屏幕之间天然过场，1 行 CSS。可作为 `screen` 切换的"奖励"层（不可用浏览器自动 fallback 到当前的 spring 过场）。
2. **Web Animations API**（标准）— `el.animate(keyframes, options)` 替代纯 CSS animation 时长可编程，更灵活。已经可用，建议用于 floatText / burst 等高频粒子。
3. **Lottie via lottie-web** — 矢量动画，BGM 副屏 / 教学过场动画值得一用，但增加 ~150KB。**v1.2 再议**。
4. **AudioWorklet**（Chrome 66+ / Safari 14.1+）— 真正实时的 DSP，可做 reverb、低通滤波给"水下"关卡用。**v2.0 再议**。
5. **Background AudioContext suspend/resume**（已存在 API）— **本项目必须立即用**，配合 visibilitychange，详见 §1.1。

---

## 五 · 实施路线图

### 5.1 阶段划分（按可独立交付的小批次）

#### Sprint 1 (P0 — 致命修复, 0.5d)
- [ ] **A1** [P0-SEC-1] 删除 WebView 跨源开关 (MainActivity.java)
- [ ] **A2** [P0-SEC-2] 删除 cleartext traffic (AndroidManifest.xml)
- [ ] **A3** [P0-DEP-1] 添加 http-server 到 devDependencies；改 `npm start`
- [ ] **A4** [P0-PHYS-2] 重命名 `dashEdgeBlocked` → `dashShouldStopAtEdge`
- [ ] **A5** 更新 `tests/mechanics-balance.js` 与 `tests/android-wrapper.js` 适配上述命名/字段变更
- [ ] 验收：`npm test` 全绿；`npm run build:android` 成功；APK 在模拟器启动正常

#### Sprint 2 (P1 — 工程基建, 2d)
- [ ] **B1** 引入 `src/core/storage.js` 并迁移 loadSave / persist；新增 schema v2 + migrate
- [ ] **B2** 引入 `src/render/hud.js`；将 `renderMenus` 中的 innerHTML 改为节点构造
- [ ] **B3** 引入 `src/core/audio.js`；接入 visibilitychange 暂停 audioCtx + accumulator clamp 4 帧
- [ ] **B4** [P1-PHYS-3 / P1-PHYS-4] 修复 berry 回滚 + 风场 clamp
- [ ] **B5** 增加 `tests/unit/`、`tests/e2e/lifecycle.js`、`tests/e2e/save-tampering.js`
- [ ] **B6** PWA：填充 `manifest.webmanifest` icons[] + 写最小 `service-worker.js`（cache-first 静态资源）
- [ ] 验收：所有原测试 + 3 项新 e2e 全绿；APK 在切前后台后游戏时间不暴增

#### Sprint 3 (P1 — 美学体系, 3-4d)
- [ ] **C1** 切换字体到 LXGW WenKai；子集化 woff2；删除 Noto Sans SC 依赖
- [ ] **C2** 注入 §2.2 OKLCH token 到 styles.css；删除现有 `--ink/--muted/--gold/--cyan/--rose/--jade` 七色
- [ ] **C3** 重设计主菜单 / 角色选择 / 关卡选择 / 设置（5 个 .panel 全改）
- [ ] **C4** 重设计 HUD（心形 SVG、icon、tabular-nums）
- [ ] **C5** 重设计模态弹层（背景 backdrop-blur + 卡片浮动）
- [ ] **C6** 引入 `assets/characters/{nini,yuan}/atlas.json` 占位 + 加载器
- [ ] 验收：手机 + 桌面双视口截图 5 张；axe-core 自动扫描 0 严重违规

#### Sprint 4 (P1 — 文档与上架就绪, 1d)
- [ ] **D1** README 重写（中英双语，新结构）
- [ ] **D2** 新增 `docs/GDD.md`、`docs/DESIGN.md`、`docs/MOTION.md`、`docs/CHARACTER_ATLAS.md`
- [ ] **D3** PRIVACY.md 重写为 §4.3.2 版本
- [ ] **D4** 新增 `CLAUDE.md` 给后续 AI 协作者
- [ ] **D5** 拍摄 5 张商店截图 + 1 张 feature graphic
- [ ] 验收：所有 docs 链接互通；商店素材审查通过自查表

#### Sprint 5 (P2 — 锦上添花, 1d, 可选)
- [ ] **E1** Sub-pixel rendering: `ctx.imageSmoothingEnabled = false`，绘制坐标取整
- [ ] **E2** 触屏振动反馈：`navigator.vibrate(8)` 在按下技能 / 跳跃
- [ ] **E3** Web Animations API 替换部分 CSS transition
- [ ] **E4** 引入 BGM 单轨（开源音乐，~700KB ogg）
- [ ] **E5** GitHub Actions 增加 `build-android-smoke.yml`
- [ ] 验收：BGM 在静音 / 解除时无爆音；CI 全绿

### 5.2 总工期估算

| Sprint | 工期 | 累计 |
| --- | --- | --- |
| 1 | 0.5d | 0.5d |
| 2 | 2d | 2.5d |
| 3 | 3-4d | 5.5-6.5d |
| 4 | 1d | 6.5-7.5d |
| 5 | 1d | 7.5-8.5d |

**最短可发版**：Sprint 1 + 2 + 4 = ~3.5d 即可发 v1.1.0-rc1。
**完整 SOTA 版**：所有 5 个 Sprint = ~8.5d 发 v1.1.0。

---

## 六 · 风险与回滚

### 6.1 主要风险

| 风险 | 概率 | 影响 | 缓解 |
| --- | --- | --- | --- |
| LXGW WenKai 在某些低端 WebView 不渲染 | 低 | 中 | font-display: swap + Noto Sans SC 兜底字符串 |
| ES Modules 在 Android 5/6 WebView 不支持 | 中 | 高 | Sprint 2 把模块化改造放在最后；先用 multi-`<script>` 直接拼接也可工作 |
| Service Worker 在 file:// 不工作 | 高 | 中（仅影响 Web 版） | Web 版用 https，Android 不依赖 SW |
| Play 上架时 Data Safety 审核拒绝 | 低 | 高 | PRIVACY.md 已对照表填写完整 |
| OKLCH 在低端机回退到 hex 不一致 | 低 | 低 | `@supports` 守卫 + 双 token |

### 6.2 回滚路径

每个 Sprint 一个 commit + 一个 tag：
- `git tag v1.1.0-sprint-1`
- `git tag v1.1.0-sprint-2`
- ...

如某 Sprint 后发现严重回归，`git reset --hard v1.1.0-sprint-{n-1}` 可回到上一稳定点。本 SOTA 计划提交时也带 `v1.1.0-proposal` tag，可永远回到"未开工"快照。

---

## 七 · 附录

### 7.1 附录 A · `package.json` v1.1 完整 diff

```diff
 {
   "name": "nini-yuan-adventure",
-  "version": "1.0.0",
+  "version": "1.1.0",
   "private": true,
   "description": "妮妮源源历险记 / Nini & Yuan",
+  "engines": { "node": ">=20" },
   "scripts": {
-    "start": "npx http-server . -p 4173 -c-1",
-    "test": "node --check src/game.js && node tests/physics-balance.js && node tests/mechanics-balance.js && node tests/android-wrapper.js && node tests/browser-smoke.js",
-    "build:android": "bash scripts/build-android.sh"
+    "start": "http-server . -p 4173 -c-1 --cors -s",
+    "test": "node tests/run-all.js",
+    "test:smoke": "node tests/e2e/browser-smoke.js",
+    "lint": "eslint src/ tests/",
+    "format": "prettier --check .",
+    "format:fix": "prettier --write .",
+    "build:android": "bash scripts/build-android.sh",
+    "build:fonts": "bash scripts/sync-fonts.sh"
   },
   "dependencies": {
-    "@fontsource/noto-sans-sc": "^5.2.9"
   },
   "devDependencies": {
-    "playwright": "^1.59.1"
+    "eslint": "^9.20.0",
+    "http-server": "^14.1.1",
+    "playwright": "^1.59.1",
+    "prettier": "^3.4.2"
   }
 }
```

### 7.2 附录 B · `AndroidManifest.xml` v1.1 完整 diff

```diff
 <manifest xmlns:android="http://schemas.android.com/apk/res/android"
     package="com.iwannabewater.niniyuan"
-    android:versionCode="1"
-    android:versionName="1.0">
+    android:versionCode="2"
+    android:versionName="1.1.0">
     <application
         android:allowBackup="true"
         android:hardwareAccelerated="true"
         android:icon="@mipmap/ic_launcher"
         android:label="@string/app_name"
         android:roundIcon="@mipmap/ic_launcher_round"
         android:theme="@style/AppTheme"
-        android:usesCleartextTraffic="true"
         android:resizeableActivity="true">
         <activity
             android:name=".MainActivity"
             android:configChanges="keyboard|keyboardHidden|orientation|screenSize|smallestScreenSize"
             android:exported="true"
             android:hardwareAccelerated="true">
```

### 7.3 附录 C · `MainActivity.java` v1.1 完整 diff

```diff
@@ -34,15 +34,18 @@
         WebSettings settings = webView.getSettings();
         settings.setJavaScriptEnabled(true);
         settings.setDomStorageEnabled(true);
         settings.setMediaPlaybackRequiresUserGesture(false);
         settings.setAllowFileAccess(true);
         settings.setAllowContentAccess(true);
-        settings.setAllowFileAccessFromFileURLs(true);
-        settings.setAllowUniversalAccessFromFileURLs(true);
+        // setAllowFileAccess(File|Universal)AccessFromFileURLs intentionally NOT enabled.
+        // 本游戏所有资源同源加载于 file:///android_asset/，不需要跨源；
+        // 显式不开启可避免 CVE-2014-6041 同族家族风险。
         settings.setLoadWithOverviewMode(true);
         settings.setUseWideViewPort(true);
+        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
+        settings.setSafeBrowsingEnabled(false);  // 离线游戏，节省 RAM
@@ -82,6 +85,21 @@
         webView.loadUrl("file:///android_asset/index.html");
     }
+
+    @Override
+    protected void onPause() {
+        super.onPause();
+        if (webView != null) webView.onPause();
+    }
+
+    @Override
+    protected void onResume() {
+        super.onResume();
+        if (webView != null) webView.onResume();
+        enterImmersiveMode();
+    }
+
+    @Override
+    protected void onDestroy() {
+        if (webView != null) {
+            webView.removeAllViews();
+            webView.destroy();
+            webView = null;
+        }
+        super.onDestroy();
+    }
```

### 7.4 附录 D · `manifest.webmanifest` v1.1 完整 diff

```diff
 {
   "name": "妮妮源源历险记",
   "short_name": "Nini & Yuan",
   "description": "双角色幻想平台跳跃游戏",
   "start_url": "./index.html",
   "display": "fullscreen",
   "orientation": "landscape",
   "background_color": "#10182a",
   "theme_color": "#10182a",
-  "icons": []
+  "icons": [
+    { "src": "./assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
+    { "src": "./assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
+  ],
+  "categories": ["games", "kids"],
+  "lang": "zh-CN"
 }
```

### 7.5 附录 E · 服务工作者占位 (`service-worker.js`)

仅 Web 版生效，APK 内 file:// 协议下浏览器自动忽略 SW 注册。

```js
// service-worker.js — 注册后给 Web 版提供离线缓存
const CACHE = "nini-yuan-v1.1.0";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/game.js",
  "./manifest.webmanifest",
  "./assets/fonts/lxgw-wenkai-light.woff2",
  "./assets/fonts/lxgw-wenkai-bold.woff2",
  "./assets/characters/nini-v2.png",
  "./assets/characters/yuan-v2.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

注册（在 `index.html` 末尾或 `src/main.js`）：

```js
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
```

### 7.6 附录 F · 关键代码片段索引

| 主题 | 引用文件:行 |
| --- | --- |
| 主循环 + 累加器 | src/game.js:1754-1764 |
| 物理 fixed update 入口 | src/game.js:423-436 |
| 玩家更新（god function） | src/game.js:479-647 |
| Yuan 冲刺刹边 | src/game.js:716-725 |
| 移动平台跟随 | src/game.js:761-764 |
| 拾取扩张 reach | src/game.js:707-714 |
| 风场叠加 | src/game.js:514-519 |
| 存档读写 | src/game.js:141-164 |
| HUD innerHTML | src/game.js:1644-1648 |
| Audio beep | src/game.js:1523-1540 |

---

## 八 · 验收清单（v1.1.0 发版前最后一遍）

- [ ] `npm test` 全绿（含 Sprint 2 新增的 lifecycle / save-tampering / unit）
- [ ] `npm run build:android` 在 Linux + macOS 都成功
- [ ] APK 在 Android 7 (API 24) + Android 14 (API 34) 模拟器启动并通关第一章
- [ ] Web 版在 Chrome 120+, Firefox 120+, Safari 17+ 三大浏览器跑过第一章
- [ ] axe-core 自动扫描所有 5 个 .panel 与 hud：0 个 critical 违规
- [ ] 所有 P0 问题（致命）已修复（5 项）
- [ ] 5 张商店截图就绪
- [ ] PRIVACY.md 与 Data Safety form 一致
- [ ] CHANGELOG.md 列出 v1.1.0 全部变更
- [ ] git tag `v1.1.0` 已打
- [ ] 上游仓库 `iwannabewater/NiniWithYuan` push 成功

---

## 九 · 一句话总结

> 把现有"可玩原型"打磨为 SOTA 独立游戏，需要做的不是更多关卡，而是**安全 + 可扩展性 + 美学辨识度 + 上架就绪度**。本计划用 5 个 Sprint、~8.5 工作日，把这四件事一次做完。

— 本计划生成于 2026-05-02，作为 `tag v1.1.0-proposal` 的固化输出。后续每个 Sprint 完成时，请回到本文件勾选验收清单。
