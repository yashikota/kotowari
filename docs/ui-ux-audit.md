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
| Projects / project detail | Partial: creation/empty-state tests; detail action hierarchy, labeled properties, wrapped heading and bounded/autosizing description in both themes; common save feedback, failure retry and newer draft preservation | Inspect multiple queued failures, navigation during saves, document sections, activity, keyboard shortcuts and full long-content layout |
| Initiatives / initiative detail | Partial: responsive labeled form in both themes/large text, destructive menu, pending form protection and failure retry; existing linking, update history and shortcut tests | Inspect success feedback, navigation with unsaved edits, long project names/associations, dialogs and all recovery states |
| Cycles / cycle detail | Partial: shared list header, creation, mobile summaries | Inspect detail layout, date editing, menus, archived empty state, themes and text sizes |
| Inbox | Partial: visible heading and wrapping mobile toolbar, contained long notification titles and visible keyboard focus in both themes/large text; 12 tests cover layout and existing filter/read/archive/delete/snooze behavior | Mobile detail wraps long titles, scrolls independently and transfers/restores keyboard focus; both themes inspected and covered by the layout tests. Inbox load failure has in-place retry, and filtered/unread empty state can reset visibility (503 recovery and empty reset test; 13 related tests pass). Comment preview now announces loading, shows failure with retry, and retains notification context; delayed failure/retry and long mobile comment covered (14 related tests pass, rendered inspection). Open-task action uses the common button in the persistent detail toolbar, remains visible through long comment scrolling, and supports keyboard navigation. Priority/other empty messages identify their scope and link to the alternate bucket when it contains matching notifications; both directions covered (16 related tests pass). Inspect initial loading, repeated recovery and mutation failures |
| Search | Partial: two-line titles with separate metadata, wrapping toolbar, visible link focus, common empty state with query/filter/category recovery in both themes/large text; search failure preserves query/filters with an in-place retry, covered by a 503-to-success test; navigation pending state hides old results, preserves the new query and announces loading (delayed-response test and rendered inspection); existing search/filter/navigation test | Inspect initial pending states, repeated errors, long snippets/IDs, text sizes and keyboard paths across all filters |
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
