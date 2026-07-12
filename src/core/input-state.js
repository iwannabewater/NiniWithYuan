((root) => {
  "use strict";

  const ACTION_BY_KEY_CODE = Object.freeze({
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "jump",
    KeyW: "jump",
    Space: "jump",
    KeyJ: "skill",
    ShiftLeft: "skill",
    ShiftRight: "skill",
    KeyK: "shoot",
    Enter: "shoot",
  });
  const GAMEPLAY_KEY_CODES = Object.freeze(Object.keys(ACTION_BY_KEY_CODE));
  const gameplayKeyCodes = new Set(GAMEPLAY_KEY_CODES);
  const BLOCKED_TARGET_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
  const TRANSIENT_FLAGS = Object.freeze([
    "jumpPressed",
    "jumpReleased",
    "skillPressed",
    "shootPressed",
    "dashPressed",
    "superPressed",
  ]);
  const DEFAULT_POINTER_ACTIONS = Object.freeze(["left", "right", "jump", "skill", "shoot", "dash", "super"]);

  function isBlockedTarget(target) {
    let node = target;
    while (node && typeof node === "object") {
      if (BLOCKED_TARGET_TAGS.has(String(node.tagName || "").toUpperCase())) return true;
      if (node.isContentEditable === true) return true;
      const contentEditable = typeof node.getAttribute === "function" ? node.getAttribute("contenteditable") : null;
      if (contentEditable !== null && String(contentEditable).toLowerCase() !== "false") return true;
      node = node.parentElement || null;
    }
    return false;
  }

  function isGameplayKeyEvent(event, mode) {
    return mode === "play"
      && !!event
      && gameplayKeyCodes.has(event.code)
      && !isBlockedTarget(event.target);
  }

  function isGameplayKeyCode(code) {
    return gameplayKeyCodes.has(code);
  }

  function actionForGameplayCode(code) {
    return ACTION_BY_KEY_CODE[code] || null;
  }

  function edgeFromActiveTransition(wasActive, isActive) {
    const previous = !!wasActive;
    const next = !!isActive;
    return {
      pressed: !previous && next,
      released: previous && !next,
      active: next,
    };
  }

  function edgesFromActionCounts(previousCounts = {}, nextCounts = {}, actions = DEFAULT_POINTER_ACTIONS) {
    const list = Array.isArray(actions) ? actions : DEFAULT_POINTER_ACTIONS;
    const edges = Object.create(null);
    for (const action of list) {
      const was = Math.max(0, Number(previousCounts?.[action]) || 0) > 0;
      const is = Math.max(0, Number(nextCounts?.[action]) || 0) > 0;
      edges[action] = edgeFromActiveTransition(was, is);
    }
    return edges;
  }

  function createTransientState() {
    return {
      keys: Object.create(null),
      jumpPressed: false,
      jumpReleased: false,
      skillPressed: false,
      shootPressed: false,
      dashPressed: false,
      superPressed: false,
    };
  }

  function clearKeyRecord(keys) {
    if (!keys || typeof keys !== "object") return Object.create(null);
    for (const key of Reflect.ownKeys(keys)) delete keys[key];
    return keys;
  }

  function resetTransientState(state) {
    const target = state && typeof state === "object" ? state : createTransientState();
    target.keys = clearKeyRecord(target.keys);
    const flags = target.inputs && typeof target.inputs === "object" ? target.inputs : target;
    for (const flag of TRANSIENT_FLAGS) flags[flag] = false;
    (target.actionInputs || target.pointerActions)?.releaseAll?.();
    return target;
  }

  function createActionPointerState(actions = DEFAULT_POINTER_ACTIONS) {
    const actionState = createActionInputState(actions);

    function count(action) {
      return actionState.count(action);
    }

    function isActive(action) {
      return actionState.isActive(action);
    }

    function release(pointerId, expectedAction) {
      const result = actionState.release(pointerId, expectedAction);
      return {
        released: result.released,
        action: result.action,
        count: result.count,
        becameInactive: result.becameInactive,
      };
    }

    function press(pointerId, action) {
      const result = actionState.press(pointerId, action);
      return {
        accepted: result.accepted,
        action: result.action,
        count: result.count,
        becameActive: result.becameActive,
      };
    }

    function releaseAll() {
      return actionState.releaseAll();
    }

    function actionForPointer(pointerId) {
      return actionState.actionForSource(pointerId);
    }

    return Object.freeze({ press, release, releaseAll, count, isActive, actionForPointer });
  }

  function createActionInputState(actions = DEFAULT_POINTER_ACTIONS) {
    const allowedActions = new Set(Array.isArray(actions) ? actions : actions ? [...actions] : []);
    const sourceActions = new Map();
    const actionSources = new Map();
    const sourceOrder = new Map();
    let order = 0;

    function count(action, sourcePrefix) {
      if (!allowedActions.has(action)) return 0;
      const sources = actionSources.get(action);
      if (!sources || sourcePrefix === undefined) return sources?.size || 0;
      let matches = 0;
      for (const sourceId of sources) if (String(sourceId).startsWith(String(sourcePrefix))) matches += 1;
      return matches;
    }

    function isActive(action) {
      return count(action) > 0;
    }

    function release(sourceId, expectedAction) {
      if (!sourceActions.has(sourceId)) {
        return { released: false, action: null, count: 0, becameInactive: false };
      }
      const action = sourceActions.get(sourceId);
      if (expectedAction !== undefined && action !== expectedAction) {
        return { released: false, action, count: count(action), becameInactive: false };
      }
      const sources = actionSources.get(action);
      sourceActions.delete(sourceId);
      sourceOrder.delete(sourceId);
      sources?.delete(sourceId);
      const remaining = sources?.size || 0;
      if (remaining === 0) actionSources.delete(action);
      return { released: true, action, count: remaining, becameInactive: remaining === 0 };
    }

    function press(sourceId, action) {
      if (!allowedActions.has(action) || sourceId === undefined || sourceId === null) {
        return { accepted: false, added: false, action: null, count: 0, becameActive: false, released: null };
      }
      const previousAction = sourceActions.get(sourceId);
      if (previousAction === action) {
        return { accepted: true, added: false, action, count: count(action), becameActive: false, released: null };
      }
      const released = previousAction === undefined ? null : release(sourceId);
      let sources = actionSources.get(action);
      const becameActive = !sources || sources.size === 0;
      if (!sources) {
        sources = new Set();
        actionSources.set(action, sources);
      }
      sources.add(sourceId);
      sourceActions.set(sourceId, action);
      order += 1;
      sourceOrder.set(sourceId, order);
      return { accepted: true, added: true, action, count: sources.size, becameActive, released };
    }

    function releaseAll() {
      const releasedActions = [...actionSources.keys()];
      sourceActions.clear();
      actionSources.clear();
      sourceOrder.clear();
      return releasedActions;
    }

    function actionForSource(sourceId) {
      return sourceActions.get(sourceId) ?? null;
    }

    function latestOrder(action) {
      let latest = 0;
      for (const sourceId of actionSources.get(action) || []) {
        latest = Math.max(latest, sourceOrder.get(sourceId) || 0);
      }
      return latest;
    }

    function direction(negativeAction = "left", positiveAction = "right") {
      const negative = isActive(negativeAction);
      const positive = isActive(positiveAction);
      if (negative && positive) {
        return latestOrder(positiveAction) > latestOrder(negativeAction) ? 1 : -1;
      }
      if (positive) return 1;
      if (negative) return -1;
      return 0;
    }

    return Object.freeze({ press, release, releaseAll, count, isActive, actionForSource, direction });
  }

  const api = {
    GAMEPLAY_KEY_CODES,
    ACTION_BY_KEY_CODE,
    TRANSIENT_FLAGS,
    DEFAULT_POINTER_ACTIONS,
    isGameplayKeyCode,
    actionForGameplayCode,
    isGameplayKeyEvent,
    edgeFromActiveTransition,
    edgesFromActionCounts,
    createTransientState,
    resetTransientState,
    createActionPointerState,
    createActionInputState,
  };

  root.NiniInputState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
