((root) => {
  "use strict";

  const GAMEPLAY_KEY_CODES = Object.freeze([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "KeyA",
    "KeyD",
    "KeyJ",
    "KeyK",
    "KeyW",
    "ShiftLeft",
    "ShiftRight",
    "Space",
    "Enter",
  ]);
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
    target.pointerActions?.releaseAll?.();
    return target;
  }

  function createActionPointerState(actions = DEFAULT_POINTER_ACTIONS) {
    const allowedActions = new Set(Array.isArray(actions) ? actions : actions ? [...actions] : []);
    const pointerActions = new Map();
    const actionPointers = new Map();

    function count(action) {
      return allowedActions.has(action) ? actionPointers.get(action)?.size || 0 : 0;
    }

    function isActive(action) {
      return count(action) > 0;
    }

    function release(pointerId, expectedAction) {
      if (!pointerActions.has(pointerId)) {
        return { released: false, action: null, count: 0, becameInactive: false };
      }
      const action = pointerActions.get(pointerId);
      if (expectedAction !== undefined && expectedAction !== action) {
        return { released: false, action, count: count(action), becameInactive: false };
      }
      const pointers = actionPointers.get(action);
      pointerActions.delete(pointerId);
      pointers?.delete(pointerId);
      const remaining = pointers?.size || 0;
      if (remaining === 0) actionPointers.delete(action);
      return { released: true, action, count: remaining, becameInactive: remaining === 0 };
    }

    function press(pointerId, action) {
      if (!allowedActions.has(action) || pointerId === undefined || pointerId === null) {
        return { accepted: false, action: null, count: 0, becameActive: false };
      }
      const previousAction = pointerActions.get(pointerId);
      if (previousAction === action) {
        return { accepted: true, action, count: count(action), becameActive: false };
      }
      if (previousAction !== undefined) release(pointerId);
      let pointers = actionPointers.get(action);
      const becameActive = !pointers || pointers.size === 0;
      if (!pointers) {
        pointers = new Set();
        actionPointers.set(action, pointers);
      }
      pointers.add(pointerId);
      pointerActions.set(pointerId, action);
      return { accepted: true, action, count: pointers.size, becameActive };
    }

    function releaseAll() {
      const releasedActions = [...actionPointers.keys()];
      pointerActions.clear();
      actionPointers.clear();
      return releasedActions;
    }

    function actionForPointer(pointerId) {
      return pointerActions.get(pointerId) ?? null;
    }

    return Object.freeze({ press, release, releaseAll, count, isActive, actionForPointer });
  }

  const api = {
    GAMEPLAY_KEY_CODES,
    TRANSIENT_FLAGS,
    DEFAULT_POINTER_ACTIONS,
    isGameplayKeyCode,
    isGameplayKeyEvent,
    createTransientState,
    resetTransientState,
    createActionPointerState,
  };

  root.NiniInputState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
