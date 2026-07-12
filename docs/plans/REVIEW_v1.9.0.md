# Release review notes: v1.9.0

Date: 2026-07-12

Tag: `v1.9.0`

## Scope

Interface clarity for gameplay characters, character-select portraits, HUD instruments, and menu ornament. Presentation pose blending and pure input edge helpers remain in scope as support for control readability.

Out of scope: chapter content, physics constants, save schema changes.

## Findings addressed

| Issue | Cause | Fix |
| --- | --- | --- |
| Character looks soft and blurry in play | Canvas `shadowBlur` applied while drawing the atlas bitmap; destination size used full-sheet aspect | Draw crisp bitmap with transparent shadow; separate ground ellipse; frame aspect and device-pixel destination alignment |
| Character feels small and hard to read on desktop | Presentation scale capped at 0.78 of authored height | Raise desktop default scale to 0.9 while keeping the 34% mobile viewport share |
| Character select portraits look soft | CSS background crops scaled beyond source density | Use `img.portrait-art` with `object-fit: cover` and explicit object-position |
| HUD and overlays compete with playfield | Low contrast instrument fills and heavy ambient weight | Higher-contrast corner instruments, calmer overlays, retained Song-atlas materials |

## Checklist

| Area | Result |
| --- | --- |
| Character bitmap clarity | Pass |
| Character select portrait sharpness | Pass |
| HUD readability | Pass |
| Input contracts unchanged | Pass |
| Packaging metadata aligned | Pass |

## Open findings

None.

## Packaging

| Item | Value |
| --- | --- |
| Web package | `1.9.0` |
| Android | `versionCode=20`, `versionName=1.9.0` |
| Service-worker cache | `nini-yuan-v1.9.0-ui-clarity-r2` |
