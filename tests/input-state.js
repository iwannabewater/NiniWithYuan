const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const InputState = require("../src/core/input-state.js");

const browserContext = { window: {} };
vm.runInNewContext(fs.readFileSync("src/core/input-state.js", "utf8"), browserContext);
assert.equal(
  typeof browserContext.window.NiniInputState?.isGameplayKeyEvent,
  "function",
  "browser build should expose window.NiniInputState"
);

const canvas = { tagName: "CANVAS" };
const button = { tagName: "BUTTON" };
const range = { tagName: "INPUT", type: "range" };

assert.equal(InputState.isGameplayKeyCode("Space"), true);
assert.equal(InputState.isGameplayKeyCode("ArrowRight"), true);
assert.equal(InputState.isGameplayKeyCode("Enter"), true);

assert.equal(
  InputState.isGameplayKeyEvent({ code: "Space", target: canvas }, "menu"),
  false,
  "menu Space must not enter gameplay input state"
);
assert.equal(
  InputState.isGameplayKeyEvent({ code: "Enter", target: button }, "play"),
  false,
  "button Enter must keep its native activation behavior"
);
assert.equal(
  InputState.isGameplayKeyEvent({ code: "Enter", target: canvas }, "play"),
  true,
  "A clean Enter press on the canvas remains a supported projectile shortcut"
);
assert.equal(
  InputState.isGameplayKeyEvent({ code: "ArrowRight", target: range }, "play"),
  false,
  "range arrows must remain available to the control"
);
assert.equal(
  InputState.isGameplayKeyEvent({ code: "KeyK", target: canvas }, "play"),
  true,
  "gameplay keys on the canvas must be captured while playing"
);
assert.equal(
  InputState.isGameplayKeyEvent({ code: "KeyQ", target: canvas }, "play"),
  false,
  "unmapped keys must not pollute gameplay state"
);

const nestedButtonLabel = { tagName: "SPAN", parentElement: button };
const editable = {
  tagName: "SPAN",
  getAttribute(name) {
    return name === "contenteditable" ? "" : null;
  },
};
assert.equal(InputState.isGameplayKeyEvent({ code: "Enter", target: nestedButtonLabel }, "play"), false);
assert.equal(InputState.isGameplayKeyEvent({ code: "Space", target: editable }, "play"), false);

const transient = InputState.createTransientState();
transient.keys.Space = true;
transient.keys.jump = true;
transient.jumpPressed = true;
transient.jumpReleased = true;
transient.skillPressed = true;
transient.shootPressed = true;
transient.dashPressed = true;
transient.superPressed = true;
const originalKeys = transient.keys;
assert.equal(InputState.resetTransientState(transient), transient, "reset should preserve the state container");
assert.equal(transient.keys, originalKeys, "reset should clear the existing key record in place");
assert.deepEqual(Object.keys(transient.keys), []);
for (const flag of InputState.TRANSIENT_FLAGS) assert.equal(transient[flag], false, `${flag} should reset`);

const nested = { keys: { Enter: true }, inputs: { jumpPressed: true, superPressed: true } };
InputState.resetTransientState(nested);
assert.deepEqual(Object.keys(nested.keys), []);
assert.equal(nested.inputs.jumpPressed, false);
assert.equal(nested.inputs.superPressed, false);

const pointers = InputState.createActionPointerState();
assert.deepEqual(pointers.press(11, "jump"), {
  accepted: true,
  action: "jump",
  count: 1,
  becameActive: true,
});
assert.deepEqual(pointers.press(12, "jump"), {
  accepted: true,
  action: "jump",
  count: 2,
  becameActive: false,
});
assert.equal(pointers.isActive("jump"), true);
assert.deepEqual(pointers.release(11, "jump"), {
  released: true,
  action: "jump",
  count: 1,
  becameInactive: false,
});
assert.equal(pointers.isActive("jump"), true, "one pointer release must not release a second held pointer");
assert.deepEqual(pointers.release(12, "jump"), {
  released: true,
  action: "jump",
  count: 0,
  becameInactive: true,
});
assert.equal(pointers.isActive("jump"), false);

assert.equal(pointers.press(99, "unknown").accepted, false, "unknown actions must be rejected");
assert.equal(pointers.actionForPointer(99), null, "unknown actions must not claim a pointer");
assert.equal(pointers.count("unknown"), 0, "unknown actions must not allocate state");

pointers.press(21, "left");
pointers.press(22, "shoot");
assert.deepEqual(new Set(pointers.releaseAll()), new Set(["left", "shoot"]));
assert.equal(pointers.isActive("left"), false);
assert.equal(pointers.isActive("shoot"), false);
assert.equal(pointers.actionForPointer(21), null);

console.log("input-state: keyboard gating, transient reset, and multi-pointer refs passed");
