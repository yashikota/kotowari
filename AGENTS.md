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

Use shared semantic color tokens for text, icons, controls, and status feedback.
Target WCAG 2.2 AA: normal text (including placeholders) >= 4.5:1; large text >= 3:1;
necessary control boundaries, state indicators, and focus indicators >= 3:1.
Check both color schemes on actual rendered backgrounds before accepting color changes.
Do not indicate status or errors through color alone.
