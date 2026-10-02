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
- Keep action menus short enough to navigate. Group property choices by their field; scroll
  candidate lists without clipping nested menus or hiding search and clear actions. Check with
  many existing resources, not only a fresh workspace.

## Choosing improvements

Start from a concrete Kotowari workflow and the friction in its current screen. Before changing
the UI, identify what the person is trying to accomplish, which information they need first,
and how the proposed change reduces navigation, ambiguity, or repeated work. A resemblance
to another product is not sufficient justification.

Prioritize frequent task capture and editing, reading and recording decisions, and finding
related work. Fix inaccessible controls, lost input, unclear save state, and unreadable layouts
before adding secondary interactions. Prefer improving an existing flow over adding a feature
whose use has not been established.

For each change, record the affected workflow and remaining gaps in `docs/ui-ux-audit.md`.
Evaluate consistency by behavior as well as appearance: identical actions should share labels,
pending/error feedback, keyboard behavior, and placement across screens. Screen-specific
information can have its own layout when the workflow needs it.

## Adoption rules

- Audit each workflow before choosing its layout: capture, plan, decide, or retrieve context.
- Use the shared heading, empty state, editable title, and save feedback where their contracts fit.
- Keep equivalent actions consistent across task, project, and decision screens: label,
  prominence, placement, disabled state, and recovery must agree.
- A migration is incomplete while a screen still has conflicting local versions of the same
  interaction. Record those exceptions in the audit with the reason and next action.
- Review the rendered screen with long content, a narrow viewport, both color schemes,
  keyboard operation, and the user's text-size preference before closing its audit item.

## Foundations and ownership

`web/src/design-system/tokens.ts` owns shared color roles, spacing values, radii, layout dimensions,
and typography scales. Semantic colors use Mantine's active scheme so light/dark appearance stays
consistent. `theme.ts` adapts these foundations to Mantine and preserves the user's font-size choice.
Do not introduce another independently styled button/input library.

`mantine-ui.tsx` exposes shared screen patterns. Introduce a new shared component when multiple
screens share behavior or visual hierarchy; avoid wrappers that merely rename a Mantine primitive.
Presenters own interaction and persistence. Shared UI components render state and forward actions.

Before adding local styles or a new component, check the existing shared pattern. Extend that
pattern when the same interaction is needed elsewhere; migrate its existing consumers together
when changing its contract. Keep domain-specific behavior in the screen or presenter rather
than putting task, project, or decision persistence into generic UI components.

The shared pattern inventory currently includes:

| Pattern | Owner | Intended use |
| --- | --- | --- |
| Theme foundations | `design-system/tokens.ts`, `theme.ts` | Semantic colors, typography, spacing and control defaults |
| Screen heading and empty state | `mantine-ui.tsx` | Orientation, primary actions and a useful next step |
| Editable heading | `design-system/DocumentTitle.tsx` | Task, document and decision titles with consistent focus and composition behavior |
| Document list row | `design-system/DocumentListRow.module.css` | Readable titles and secondary metadata across widths |
| Management row | `design-system/ManagementRow.tsx` | Named resources and their associated management actions |
| Reading surface | `mantine-ui.tsx`, `design-system/MarkdownContent.module.css` | Shared typography and contained tables, code and media |
| View creation header | `components/ViewBuilderHeader.tsx` | Shared labeled name/description, icon picker and create/cancel controls for task and project views |
| Save feedback | `design-system/SaveFeedback.tsx` | Progress, confirmed success, failure details and a retry action; used by task and project editing |

This inventory is a starting point, not a declaration that the design system is finished.
Property controls, dialogs, toolbars, selection and save feedback still need consistent patterns.

## Current migration

The shared PageHeader now wraps long titles and moves actions onto their own row on narrow
screens. Heading weight and size are consistent, and document detail uses the document title
instead of its slug. Existing imports continue to use the same component.

Tasks, pages and decisions share `DocumentTitle`: a heading that expands to show the full title,
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
