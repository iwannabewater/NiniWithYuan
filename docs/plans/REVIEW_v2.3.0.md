# Release review notes: v2.3.0 局境生息 / Living Field

Date: 2026-08-09

Status: released. The verified asset release is `v2.3.0-r2`, with the APK,
checksum, and build provenance from the exact Android CI commit.

## Scope Review

The milestone adds deterministic field material to creatures and playfield
surfaces. It does not add gameplay, collision, save, or movement changes.

## Gates

- `npm test`: pass.
- `browser-smoke`: pass.
- `assets/fonts/NOTICE.md`: updated after the LXGW WenKai rebuild.
- Local Android build was not attempted because the workstation has no usable
  Java runtime.
