# Agent Instructions

## Web (SPA)

After any change to files under `web/`, run:

```
task web:check
```

This runs `vp check --fix` — format (oxfmt), lint (oxlint, type-aware), and typecheck in one pass. Commit the resulting file changes together with your own changes.
