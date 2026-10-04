# Paint backdrops once and blit them at whole device pixels

Chapter backdrops are painted once per chapter and viewport, not per frame. The sky, its stars, and the celestial body sit at optical infinity and are baked into one opaque screen canvas. Each mountain range is painted at its authored softness, cropped to its painted band, resampled once to device resolution, and drawn every frame at whole device pixels, so the per-frame cost is a handful of unfiltered blits regardless of art detail. A first integration that drew six to eight upscaled, high-quality-filtered full-screen layers per frame cost about 58 ms per frame in software raster; the baked pipeline brought the whole frame to 5.2 ms (desktop) and 6.2 ms (DPR 2 phone) in headless Chromium, below the v2.3.0 baseline. `backdrop-filter` stays forbidden for low-power devices, glows come from cached sprites instead of `shadowBlur`, and the canvas caps device pixels near 1440p.

Terrain, props, and effects are separate render modules that are stateless with respect to gameplay: they read simulation state and never write it. Terrain recipes (paths and gradients) are prepared once per attempt. The drawn walkable top of every platform sits exactly on its collision edge and flanks never bulge past the collision box; rocky undersides hang only into open air below a slab. `tests/render/scenery.test.js` and `tests/render/playfield.test.js` enforce the device-pixel blits, crop alignment, absence of per-frame gradients, and collision honesty.

## Considered Options

- Keep the per-frame layered draw and lower resolution: rejected, because filtering cost scales with screen area, not layer resolution.
- Drop the painted backdrop for flat gradients: rejected, because the landscape scroll is the release's art direction.
