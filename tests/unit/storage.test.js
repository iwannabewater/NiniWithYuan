const assert = require("node:assert/strict");
const storage = require("../../src/core/storage");

const levelOptions = { levelCount: 5, levelIds: ["sakura", "moonruin"] };

{
  const save = storage.sanitizeSave(
    {
      selected: "<script>",
      unlocked: 99,
      totalCoins: "12.9",
      bestTimes: { sakura: 42.5, evil: 10, moonruin: -1 },
      levelStars: { sakura: 4, moonruin: 3 },
      settings: { volume: 0, touch: 999, fx: "yes", bgmVolume: -20 },
    },
    levelOptions
  );

  assert.equal(save.schemaVersion, 2);
  assert.equal(save.selected, "nini");
  assert.equal(save.unlocked, 5);
  assert.equal(save.totalCoins, 12);
  assert.deepEqual(save.bestTimes, { sakura: 42.5 });
  assert.deepEqual(save.levelStars, { moonruin: 3 });
  assert.deepEqual(save.settings, { volume: 0, touch: 140, fx: true, bgmVolume: 0 });
}

{
  const stub = {
    value: JSON.stringify({ selected: "yuan", unlocked: 2, settings: { fx: false } }),
    written: "",
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.written = value;
    },
  };

  const loaded = storage.loadSave({ ...levelOptions, storage: stub });
  assert.equal(loaded.selected, "yuan");
  assert.equal(loaded.unlocked, 2);
  assert.equal(loaded.settings.fx, false);
  assert.equal(loaded.settings.bgmVolume, 60);

  assert.equal(storage.persist({ ...loaded, unlocked: 900 }, { ...levelOptions, storage: stub }), true);
  const written = JSON.parse(stub.written);
  assert.equal(written.unlocked, 5);
  assert.equal(written.schemaVersion, 2);
}

{
  let errorCalled = false;
  const unavailable = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };

  const fallback = storage.loadSave({ ...levelOptions, storage: unavailable });
  assert.equal(fallback.selected, "nini");
  assert.equal(fallback.unlocked, 1);
  assert.equal(
    storage.persist(fallback, {
      ...levelOptions,
      storage: unavailable,
      onError: () => {
        errorCalled = true;
      },
    }),
    false
  );
  assert.equal(errorCalled, true);
}

console.log("storage-unit: schema, migration, and unavailable storage passed");
