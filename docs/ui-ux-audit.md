# UI/UX completion audit

The objective covers every existing screen and interaction. Shared styles or a passing
focused test do not prove that this objective is complete. This inventory follows the
current files in `web/src/pages`, rather than Linear's screen inventory.

## Required evidence for each screen

- A clear primary action and consistent heading/action hierarchy.
- Readable content, meaningful labels, and reachable controls at narrow and wide widths.
- Light and dark appearance; small and large text preferences.
- Pointer, touch, and keyboard operation, visible focus, and focus restoration after overlays.
- Empty, loading, failure, retry, and success states as applicable.
- Pending operations prevent duplicates; failures preserve input and do not claim success.
- Actual rendered inspection and tests of the relevant behavior.

## Current coverage and remaining work

“Partial” means scoped changes and evidence exist, not that the screen is finished.

| Screens | Current coverage | Next evidence or improvement needed |
| --- | --- | --- |
| Task list / detail | Partial: themed selections, touch controls, composer recovery, shared Markdown and multiline titles; narrow properties use labeled two-column groups; title/property saving and failure retry | Inspect label/reminder mutations, bulk actions and all overlay states across themes/text sizes; verify navigation during pending writes |
| Documents / decisions | Partial: headers, title editing, list layout, empty recovery, editor feedback | Property save feedback, decision publishing/linking, destructive flows and full keyboard paths |
| Projects / project detail | Partial: creation/empty-state tests; detail action hierarchy, labeled properties, wrapped heading and bounded/autosizing description in both themes | Inspect save/recovery feedback, document sections, activity, keyboard shortcuts and full long-content layout |
| Initiatives / initiative detail | Not audited comprehensively | Inspect planning, project associations, update feed, dialogs and all recovery states |
| Cycles / cycle detail | Partial: shared list header, creation, mobile summaries | Inspect detail layout, date editing, menus, archived empty state, themes and text sizes |
| Inbox | Not audited comprehensively | Inspect notification selection, filtering, empty recovery and narrow detail layout |
| Search | Not audited comprehensively | Inspect result hierarchy, navigation, pending/error/no-results states |
| Saved views / view builders | Not audited comprehensively | Inspect creation, preview, filtering, save feedback and mobile layout |
| Home | Partial: common edit button for links | Inspect resource management, workspace editing and long content |
| Reviews | Partial: mobile context and shared empty action | Inspect long URL fallback, themes, language and keyboard paths |
| Reminders | Partial: management row, load recovery and dismissal | Pending dismissal, all entity types, themes and text sizes |
| Templates / recurring tasks | Partial: management row and mobile actions | Empty guidance, pending mutations, deletion recovery, themes and text sizes |
| Drafts | Existing dedicated empty state | Inspect restoration, deletion and keyboard behavior across layouts |
| Settings | Partial: section navigation, bounded width and workspace save feedback | Cycle/automation/workflow save feedback, long fields and full theme/text-size inspection |
| Agent / AI panels | Shared Markdown containment | Inspect conversation loading, permissions, failures, composer and responsive layout |
| Shared navigation and overlays | Partial: scheme surfaces and composer busy guards | Inspect every menu/dialog/popover, route errors and focus return |

## Prioritization

Continue with task detail and everyday editing, then project/initiative planning, inbox/search,
and saved views. Close each row with direct evidence for all required states. Keep this audit
current; do not mark completion by counting migrated components or passing tests alone.
