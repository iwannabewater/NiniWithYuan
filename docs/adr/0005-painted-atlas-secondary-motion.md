# Keep the painted atlases and add secondary motion around them

The protagonists stay the painted pose atlases defined by ADR 0002. A procedural vector rig was considered for smoother animation and rejected: the authored paintings carry far more costume, face, and instrument detail than a Canvas rig could reach, and replacing them would lower the art quality the project is built on. Instead, the runtime improves how the paintings read in play. `src/render/atlas-cache.js` reduces each atlas once to its on-screen size by successive halving, grades it for the chapter's night light, builds a moonlight rim from the opaque core only, and measures each cell's lowest painted row so every pose stands on its feet line. `src/render/character-cloth.js` draws each frame as one rigid band and nine robe bands on damped springs, which gives hems and sleeves life without a skeletal-animation runtime.

Because frames now draw from caches and in bands, browser tests observe protagonist draws through `window.NiniYuanDiagnostics.onCharacterDraw` rather than by matching `drawImage` sources. Production never installs the hook, so it costs one property check per frame. The abstract gilding strokes previously drawn around the sprite were removed, since the rim light replaces their role and they read as noise over the painting.

## Consequences

- New poses still require new painted cells; cloth motion only animates what is already painted.
- Cell baselines are measured at build time (`scripts/measure-atlas-baselines.js`) and shipped in `atlas.json`, because the Android WebView loads `file://` assets that taint canvases and block pixel reads. A test decodes each atlas and fails if the shipped baselines drift from the art.
