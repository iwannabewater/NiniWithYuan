# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** — read ADRs that affect the area being changed.

If these files don't exist, proceed silently. Domain-modeling skills create them lazily when terms or decisions are resolved.

## Layout

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

Use terms defined in `CONTEXT.md` in issues, proposals, hypotheses, and tests. Avoid synonyms the glossary explicitly rejects.

If a needed concept is absent, reconsider whether it belongs to the domain or note the gap for domain modeling.

## Flag ADR conflicts

Explicitly identify output that contradicts an existing ADR rather than silently overriding it.
