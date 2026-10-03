# Agent Instructions

## Web (SPA)

After any change to files under `web/`, run:

```
task web:check
```

This runs `vp check --fix` — format (oxfmt), lint (oxlint, type-aware), and typecheck in one pass. Commit the resulting file changes together with your own changes.

## UI/UX direction

Design for Kotowari's workflows and users. Evaluate reference products against those
needs before adopting their behavior or appearance. Prioritize frequently used flows.

Extend the shared design system and components before adding screen-specific patterns.
Keep typography, spacing, action hierarchy, keyboard behavior, and feedback consistent
across screens. Cover loading, empty, pending, failure, retry, and success states.
