# Kotowari UI design system

## Product basis

Kotowari supports one person's work and decisions: capture a task, plan it, record why a
choice was made, and find that context later. UI changes should reduce effort in those flows.
Linear is a reference for comparison, not the specification for a new feature or its layout.
This direction follows the user's instruction on 2026-10-02 and takes precedence over earlier
migration assumptions. Existing data and supported features remain usable during migration.

## Interaction rules

- Give each screen one clear primary action. Keep destructive actions visually separate.
- Use human-readable titles for orientation; slugs and IDs are supporting metadata.
- Keep everyday task actions close to the task. Put infrequent settings behind disclosure.
- Show progress, success, and recoverable failure where the action happened. Preserve input.
- Support keyboard and pointer operation equally. Focus must be visible and restored after overlays.
- Adapt to the available space. Titles may wrap; controls must remain reachable without horizontal scrolling.
- Use density for lists and breathing room for reading and writing. Do not shrink text everywhere to fit more controls.

## Foundations and ownership

`web/src/design-system/tokens.ts` owns shared color roles, spacing values, radii, layout dimensions,
and typography scales. Semantic colors use Mantine's active scheme so light/dark appearance stays
consistent. `theme.ts` adapts these foundations to Mantine and preserves the user's font-size choice.
Do not introduce another independently styled button/input library.

`mantine-ui.tsx` exposes shared screen patterns. Introduce a new shared component when multiple
screens share behavior or visual hierarchy; avoid wrappers that merely rename a Mantine primitive.
Presenters own interaction and persistence. Shared UI components render state and forward actions.

## Current migration

The shared PageHeader now wraps long titles and moves actions onto their own row on narrow
screens. Heading weight and size are consistent, and document detail uses the document title
instead of its slug. Existing imports continue to use the same component.

Pages and decisions share `DocumentTitle`: a heading that expands to show the full title,
retains focus styling, saves on blur, and commits with Enter without inserting a newline.
Composition with an IME is preserved. Their editing content shares a bounded reading width;
the document body precedes the optional AI conversation. Page tags have a visible label.

Document and decision lists share `DocumentListRow.module.css`: a two-line title,
semantic hover/focus colors, and metadata that moves below the title on narrow screens.
Identifiers and optional dates must not crowd out the title or cause horizontal overflow.
Filtered empty lists provide a clear-filters action; the decision list also exposes creation.

The rest of the UI has not yet been unified. These are the next priorities:

| Priority | Area | Required outcome |
| --- | --- | --- |
| 1 | Task and decision editing | Consistent action placement, save feedback, fields, and disclosure |
| 2 | Lists and toolbars | Shared search/filter/action hierarchy; clear selection and bulk actions |
| 3 | Empty/loading/error states | Shared layouts with a useful next action, recovery, and stable dimensions |
| 4 | Dialogs and property controls | Consistent labels, sizes, keyboard behavior, dismissal, and validation |
| 5 | Settings and secondary screens | The same patterns, with product-specific grouping and fewer competing controls |

For each migration, inspect the actual screen, cover its interaction and narrow layout, and
check both color schemes. Validate the user's font-size setting where typography changes.
Do not treat a token file or passing tests as proof that the design system is complete.
