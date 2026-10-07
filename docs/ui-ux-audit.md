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
| Task list / detail | Partial: themed selections, touch controls, composer recovery, shared Markdown and multiline titles; narrow properties use labeled two-column groups; title/property saving and failure retry. Property selects use shared focus scheduling and 240px menus with wrapping labels and viewport bounds; mobile/desktop both themes with large text inspected | CI 37047034509's status focus failure reproduced with a delayed assignment write: shortcuts opened disabled fields. Pending writes now close choices and guard menu shortcuts, and the sequence test waits until controls are enabled after optimistic updates. Five property-menu tests cover long choices, keyboard switching, pending-state consistency and recovery. Reminder editing now shares one dialog and transaction presenter with projects/initiatives: pending guard, retained custom input, inline future-time validation, failed preset retries, and distinct removal recovery. Nine new reminder tests plus 18 related layout/save/shortcut checks pass; mobile large-text failure dialogs inspected in light/dark. Label creation/assignment now has a serial pending guard, retained search input, shared save feedback inside the open picker and outside when closed, and retry of an already-created label without duplicate creation. Long choices and selected pills wrap, choices have 44px targets, and the picker can reposition as error feedback changes its size (the default position lock clipped it below the mobile viewport). Two new light/dark large-text tests cover failed creation then failed assignment, exact retry reuse, confirmed selection/removal and viewport bounds; all 18 related menu/shortcut checks pass. Both rendered failure pickers inspected. Due date and reminder dialogs now share DateEditorDialog and the scoped useRetriableSave transaction primitive. Due date failures retain edits; preset/removal failures reopen with an exact retry and explicit removal context. Native form submission supports Enter and guards pending dismissal/duplicate writes. Past dates remain valid overdue dates. Three new due-date tests and 23 related reminder/shortcut cases pass; both mobile themes rendered and inspected. Inspect bulk actions and all overlay states; verify navigation during pending writes |
| Documents / decisions | Partial: headers, title editing, list layout, empty recovery, editor feedback | Property save feedback, decision publishing/linking, destructive flows and full keyboard paths |
| Projects / project detail | Partial: board cells scroll independently with bounded height so many cards do not displace drop targets; 30 extra fixtures reproduce the prior CI drag failure and now pass, all 25 project-list tests pass; preview assertions scoped to the visual preview; creation/empty-state tests; detail action hierarchy, labeled properties, wrapped heading and bounded/autosizing description in both themes; common save feedback, failure retry and newer draft preservation | Inspect multiple queued failures, navigation during saves, document sections, activity, keyboard shortcuts and full long-content layout |
| Initiatives / initiative detail | Partial: responsive labeled form in both themes/large text, destructive menu, pending form protection and failure retry; existing linking, update history and shortcut tests | Inspect success feedback, navigation with unsaved edits, long project names/associations, dialogs and all recovery states |
| Cycles / cycle detail | Partial: shared list header, creation, mobile summaries | Inspect detail layout, date editing, menus, archived empty state, themes and text sizes |
| Inbox | Partial: visible heading and wrapping mobile toolbar, contained long notification titles and visible keyboard focus in both themes/large text; 12 tests cover layout and existing filter/read/archive/delete/snooze behavior | Mobile detail wraps long titles, scrolls independently and transfers/restores keyboard focus; both themes inspected and covered by the layout tests. Inbox load failure has in-place retry, and filtered/unread empty state can reset visibility (503 recovery and empty reset test; 13 related tests pass). Comment preview now announces loading, shows failure with retry, and retains notification context; delayed failure/retry and long mobile comment covered (14 related tests pass, rendered inspection). Open-task action uses the common button in the persistent detail toolbar, remains visible through long comment scrolling, and supports keyboard navigation. Priority/other empty messages identify their scope and link to the alternate bucket when it contains matching notifications; both directions covered (16 related tests pass). Inspect initial loading, repeated recovery and mutation failures |
| Search | Partial: two-line titles with separate metadata, wrapping toolbar, visible link focus, common empty state with query/filter/category recovery in both themes/large text; search failure preserves query/filters with an in-place retry, covered by a 503-to-success test; navigation pending state hides old results, preserves the new query and announces loading (delayed-response test and rendered inspection); existing search/filter/navigation test | Inspect initial pending states, repeated errors, long snippets/IDs, text sizes and keyboard paths across all filters |
| Saved views / view builders | Partial: task/project builders share labeled name/description, icon picker and wrapping create/cancel controls; both themes/large text mobile inspected, 16 related tests pass | Project creation now guards duplicates, exposes pending state and preserves name/description/filters on storage failure; retry verified with one stored view (17 related tests pass). Shared preview summary exposes result count and titles to assistive technology while visual list/board controls are inert; focus exclusion and existing preview filtering verified (18 related tests pass). Matching titles can now be expanded as a visible static list with a bounded scroll region; expansion and focus verified. Forty long titles verified in a 360×600 viewport: bounded scrolling reaches the last result, create remains visible, focus is explicit, and disclosure/navigation keys do not trigger preview task navigation (7 focused tests pass). Preview list/board presenter scopes are disabled so background Enter/selection/mutation shortcuts cannot target them; 19 view tests and 16 normal list/board shortcut tests pass. Inspect visual preview scrolling, navigation after confirmed creation, filter keyboard paths, Saved-view edits now share save feedback, serialize writes, retain failed name drafts through other property writes and support retry (21 related tests pass). Inspect queued failures, navigation during writes and delete recovery; detail name field is labeled and separated from header actions, long heading/description wrap (both themes/large text mobile inspected, 14 tests pass); collection rows now share two-line names/descriptions, wrapping date metadata and explicit link/button focus, with both themes/large text mobile inspected (12 existing tests + 2 layout tests pass) |
| Home | Partial: shared multiline editable heading and save feedback; mobile link properties stack labels above content, long resource titles wrap to two lines, deletion remains reachable and links have visible focus; both themes/large text inspected | Resource creation and per-row deletion show local errors, preserve input and guard duplicate requests; deletion announces success and restores keyboard focus. Workspace drafts survive resource refresh and save failure; stale workspace save responses preserve newer resources. Six focused tests pass, including failure/retry, persistence and concurrent writes. Inspect navigation with unsaved input, several simultaneous removals, full long description and refresh failure |
| Reviews | Partial: mobile context and shared empty action | Inspect long URL fallback, themes, language and keyboard paths |
| Reminders | Partial: management row, load recovery and dismissal | Scheduling/removal in issue, project and initiative detail uses ReminderDialog/useReminderEditor; failed removal explicitly says the reminder remains active and retries the exact operation. Nine tests cover all three kinds, mobile light/dark, pending controls, input retention/validation, edited resubmission, preset retry and removal retry. List dismissal now guards each pending row independently, retains failed rows with shared SaveFeedback, retries locally, removes confirmed rows before refreshing, and ignores older list reads after writes. Six new mobile large-text tests across all entity kinds and both themes cover retained errors, another row remaining usable, confirmed retry removal, and keyboard focus on retry / empty-state heading; related load-retry/project shortcut checks also pass (10 tests). Both rendered row failures inspected. Two further tests verify a delayed pre-dismissal list read cannot restore a row and a refresh failure after confirmed dismissal offers list reload without repeating the write (eight dismissal tests pass). Inspect calendar edge cases, route changes during writes, all languages and desktop/text-size combinations |
| Templates / recurring tasks | Partial: management row and mobile actions | Empty guidance, pending mutations, deletion recovery, themes and text sizes |
| Drafts | Partial: shared PageHeader, wrapping two-line titles, wrapped button labels and 44px open/discard targets. Single/all discard failures retain stored contents and confirmation with shared SaveFeedback and retry. Eleven draft/composer regression tests pass; four new storage-failure cases cover both schemes at mobile large text; rendered failures inspected | Confirmed publication now clears/reset the composer even if deleting its saved draft fails; a shared responsive transient notice offers cleanup-only retry and access to the created issue. An in-memory outcome plus best-effort session storage links retained drafts to the created issue; opening them navigates to that issue. Four light/dark tests cover cleanup retry without another POST, persisted outcome after reload, and retained-draft navigation; 13 draft/composer regressions and two parser unit tests pass. Mobile notices inspected in both themes. Inspect complete browser-storage failure across reload (server idempotency still needed for a durable guarantee), multiple simultaneous cleanup notices, initial storage read failures, focus after removing the last card, desktop/text-size combinations and all languages |
| Settings | Partial: workspace, cycle and automation settings share SettingsForm, disabled fields, duplicate guards, progress/error/retry, draft retention and focus return. Cycle preparation retries independently of confirmed configuration. Issue/project statuses now share WorkflowSettingsEditor and one transaction presenter: local name errors, preserved drafts, stale retry invalidation, wrapped labels, autosizing description fields and 44px mobile removal targets. Shared provider persistence ignores reads begun before a newer confirmed save and returns normalized saved values. Coding tools use SettingsForm, per-field validation, validation focus and capped prompt height. Storage failures preserve drafts and cannot announce success; retry persists the retained contents | Eleven workflow tests cover delayed failure, edits before retry, add/save/delete recovery, another settings save during dirty edits, keyboard focus, cancellation, preserving user-moved focus, mobile large text in both themes, desktop small/default text, and old-read-after-save regression (reproduced on both providers before fixing). All 52 settings/preferences/workflow/Home/property-menu regression tests pass; nine prompt/preferences unit tests also pass. Four coding-tool tests cover storage rejection, input retention through preference refresh, retry focus, persistence, disabled custom-link fields and repeated validation. Both themes/large text rendered and inspected; shared validation text contrast was below 4.5:1 before changing the theme and now passes the rendered measurement. Mobile failures/long fields and desktop groups rendered and inspected. Seven workflow-load tests now cover initial wait/failure/retry in both themes, retained edits after background failures, and recovery from incomplete responses. Initial failures expose no editable default status list. Workflow reads bypass the request cache while the provider deduplicates pending reads; global issue creation shares the same providers as pages. All 24 focused workflow/loading/composer tests pass; mobile failure screens rendered and inspected in light and dark. Inspect simultaneous edits in other windows, initial preference read failures, simultaneous coding-tool edits in other windows, navigation with unsaved input, all languages and remaining text-size combinations |
| Agent / AI panels | Shared Markdown containment | Inspect conversation loading, permissions, failures, composer and responsive layout |
| Shared navigation and overlays | Partial: scheme surfaces and composer busy guards | Inspect every menu/dialog/popover, route errors and focus return |

## Prioritization

Continue with task detail and everyday editing, then project/initiative planning, inbox/search,
and saved views. Close each row with direct evidence for all required states. Keep this audit
current; do not mark completion by counting migrated components or passing tests alone.

## Draft storage recovery follow-up

Draft reads now report failure through shared feedback instead of crashing the page or
showing a false empty state. Failed refreshes preserve the last visible cards and disable
open/discard actions until recovery. Sidebar badge reads preserve known counts when
storage is unavailable. Two 360px light/dark browser cases verify initial read failure,
failed background refresh, recovery, and unchanged saved content. Full focus restoration,
all text preferences, and desktop rendered inspection remain outstanding.

The label smoke test now waits for the save to finish and focuses the picker before
sending Escape. Disabled controls can leave focus on the document body, where the
popover's keyboard dismissal does not receive the event. The three smoke cases pass
locally; CI still needs to confirm this change.

## WCAG color foundations

Target WCAG 2.2 AA color contrast: normal text and placeholders 4.5:1, large text
3:1, necessary control boundaries and state/focus indicators 3:1. References:
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html and
https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html.

The shared theme now has scheme-specific readable muted text, placeholder text,
errors, links, boundaries, and keyboard focus. All named palettes have accessible
semantic text/outline colors and filled/hover colors with white text; hue is retained
while luminance is adjusted. Status/priority icons, stars, chart series, selected
checks and drag/drop indicators use semantic colors rather than fixed palette shades.
The CSV warning text now follows the active scheme as well.

Three unit cases verify the WCAG formula, every named semantic palette and filled
hover pair, placeholders, boundaries and focus. Browser coverage scans rendered text,
input values, placeholders, input boundaries and a focused settings field across 17
routes in light/dark at 360px/1280px. Fixtures include an issue with a custom label,
a project and a document; translucent backgrounds are composited before measuring.
Settings and document screenshots are recorded. Related document-header and coding
settings validation/recovery cases also pass.

This is scoped color evidence, not a claim of full WCAG conformance. The automated
scan covers visible content after initial navigation; it does not exhaust scrolled
content, hover/selected/error overlays, arbitrary user colors, ancestor opacity,
gradients or every chart distinction. Continue the per-screen interaction audit and
verify those states against the same shared contrast thresholds.

## Overlay contrast and group configuration follow-up

The browser contrast scanner is shared across page and overlay cases. It accounts
for nested group opacity, translucent surfaces, sRGB computed colors and clipping.
Finite opening/loading transitions settle before measuring; permanent low opacity
still counts. A fixture proves that faint text fails while clipped text is excluded.
Unsupported computed color spaces raise an error instead of silently passing.

Contrast assertions now cover label creation/assignment failure and selected choices;
due date save/removal failure; issue creation and failed creation; and reminder
validation/save failure on issues/projects/initiatives, in both color schemes.
Normal page coverage remains scoped to visible content on the 17 routes. Background
images, arbitrary overlapping elements and every hover/error state remain unproven.

Issue and project group configuration now share GroupOrdering. Move/show/hide/back
controls have 44px targets, bounded short visual labels and explicit full accessible
names. Hidden groups retain readable semantic text and show their state through
background and Show/Hide text. Fixed group opacity has been removed. Group names
remain available in titles and action names when visually truncated.

The normal issue page now supplies group options, ordering and visibility to the
shared display controls and issue list. It previously parsed the settings but did
not connect them to the UI. Localized issue group labels are extracted from cycle
helpers into a shared module. New light/dark cases cover issue/project group hiding,
contrast, re-showing and move targets; issue settings persist across reload. Existing
cycle group and saved project board preview cases remain regression checks.

Drafts now has a directly reachable New issue action at narrow and wide widths,
with a 44px target and the same intent as the workspace composer. Read errors disable
it until storage recovery. Mobile creation/retry cases exercise this entry point.
Draft empty-state text uses the shared muted color. Archived issue content also
uses the shared muted color instead of reducing the opacity of its whole subtree.
These changes do not establish completion of the overall per-screen UI/UX audit.

Verification: 33 combined browser cases pass after the final shared component changes;
the existing cycle group case and saved project board preview case also pass (35
cases in total). Formatting/lint/type checks and the production build pass. Mobile
light/dark group configuration screenshots were inspected after the 44px controls
and short action labels were applied. Full UI/UX completion remains unproven.

## Document property feedback and contrast

Document property edits now retain failed changes, prevent overlapping writes and
retry the exact failed payload. Saving another property includes earlier unsaved
changes. Confirmed PATCH responses update the local document without coupling a
successful write to a route reload. Parent/project option failures are presented
locally with retry; incomplete choices remain disabled until recovery.

Shared save feedback wraps long messages and button labels; retry controls have
44px minimum height at mobile widths. The document properties feedback uses the
same accessible theme and saving/error/success states as other editors.

Verification: 11 document property browser cases pass, including title/status/date/
tags failure retention and retry in light/dark at 360px, cumulative edits, option
recovery and fresh list titles after navigation. The 17-route contrast sweep also
passes in light/dark at 360px and 1280px (15 browser cases total in this run).
Mobile light/dark document error screenshots were inspected. Formatting, lint,
types and locale parity pass. Parent/project write recovery and all deletion flows
still need separate interaction evidence; overall UI/UX completion remains unproven.

## Decision property editing consistency

Decision metadata now uses the shared scoped retry writer and SaveFeedback, matching
document properties. Failed title/status/project/evaluation/predecessor changes stay
in the form. Retry submits the same payload; saving a different property includes
all earlier unsaved property edits. Controls are disabled while writing. Publishing,
revisiting and issue linking wait until metadata is saved, with a visible save action.
Confirmed metadata uses the PATCH response without coupling success to route reload.

Option loading has local error/retry and generation guards; project and issue choices
remain disabled when unavailable. Evaluation/predecessor fields have persistent labels.
A successfully saved predecessor remains locked under the existing append-only rules.

Verification: 28 browser cases pass after the final edits: 12 decision property cases,
5 existing decision interaction cases and 11 document property cases. Decision failure
coverage includes five properties in both schemes at 360px with large font preference,
rendered contrast assertions, exact retry and focus restoration. Mobile light/dark
screenshots were inspected. Formatting/lint/types, locale parity and production build
pass. Publication, revisit and link/unlink operation failure/pending recovery remain
unproven; this does not establish completion of the full screen audit.

## Decision publication and issue-link feedback

Publication and issue link/unlink now use the shared scoped retry writer and
SaveFeedback. Operation labels distinguish pending, failure and confirmed success;
retry reuses the original operation and payload. Metadata and conflicting actions
are disabled while a write is pending, with synchronous guards in the presenter.
Changing metadata or the issue selection clears an obsolete operation retry.

Confirmed publish/link responses update the document locally. Unlink updates the
known relation after its successful DELETE, without making another read part of
the write's success condition. Navigation still reloads the document through the
normal query cache. Retry focus moves to the error action; successful operations
restore focus to publication or issue selection, including after a removed row.

Verification: 23 browser cases pass: six new operation cases (three operations,
both schemes, 360px/large preference), 12 property cases and five existing decision
cases. New cases cover pending guards, preserved failed link choice, exact retry,
focus, persisted writes and no edited-route refetch after success. Rendered contrast
assertions pass on each failure state; mobile light/dark screenshots were inspected.
Formatting/lint/types, locale parity and production build pass. Revisit still uses
a native prompt, and publication with unsaved document-body edits needs a separate
flow audit. Full UI/UX completion remains unproven.
The 17-route contrast sweep also passes in both schemes at 360px/1280px after the
operation changes (four additional browser cases, 27 cases across the final runs).

## Shared decision creation and revisit flow

Revisit and project decision creation now open the existing shared decision modal.
Revisit retains the predecessor, project and linked issues; project creation retains
its project. The Shell orchestration is extracted to useShellADRComposer. Creation
has a synchronous pending guard, local failure feedback, preserved title/context
and retry. Successful creation is retained separately from opening the destination
so a rejected navigation does not cause another POST on retry. That rejected-
navigation branch still needs direct verification.

The modal has a persistent title label and disables editing, dismissal and repeated
submission while pending. It uses SaveFeedback and keyboard focus restoration.
Root previously dismissed any modal on Escape before its own pending guard could
run. Root now leaves modal dismissal to the dialog, preserving its closeOnEscape
and onClose behavior.

Verification: 44 browser cases pass across decision creation/property/operation,
existing decision flows, cycle navigation, due dates and reminders. Five additional
issue composer cases pass, including pending dismissal and retained failed input
(49 cases total). New creation cases cover regular creation, revisit and project
creation in both schemes at 360px; they check keyboard submission, pending Escape,
exact retry, inherited properties, one created record and rendered error contrast.
Light/dark mobile failure screenshots were inspected. Formatting/lint/types,
locale parity and production build pass.

Previous CI 37301425278 completed with 444 passes and one failing cycle navigation
case. Its shared server already contained an earlier upcoming cycle, so navigation
correctly selected that cycle rather than the newly created fixture. The sidebar
navigation case now isolates its candidate list from other tests and automatic
schedule creation. All three cycle navigation cases pass locally. The next full
CI run is required to verify the whole suite; overall UI/UX completion is unproven.

## Consistent document creation recovery

Document and decision creation now share useRetriableCreation. It keeps the failed
payload until the user edits it, preserves a confirmed record while opening its
route and guards simultaneous submissions. Confirmed records are not recreated
when opening is rejected. Direct rejected-navigation UI evidence remains outstanding.
The shared hook ignores asynchronous UI results after its owner unmounts.

Document creation has local saving/failure/retry feedback, a persistent title label,
and focus restoration. Title/project inputs and dismissal are blocked while pending.
Closing and reopening the same context retains the draft and project selection;
opening a different project context clears them. Retry reuses the original payload,
including the generated slug for Japanese titles. Successful creation navigates
without coupling its success to a reload of the old route.

Verification: 22 browser cases pass across the new document creation matrix, decision
creation, project documents and document list behavior. The new cases cover both
schemes at 360px/large preference, Japanese titles, keyboard submission, pending
Escape, failed input preservation, reopening, exact retry and persisted project.
Rendered modal contrast checks pass; mobile light/dark screenshots were inspected.
Formatting/lint/types, locale parity and production build pass. The previous pushed
CI remains in progress at this audit; full UI/UX completion remains unproven.

## Consistent document deletion and CI isolation

Document deletion uses the shared ConfirmActionDialog with readable semantic colors,
44px actions, wrapped labels, safe initial Cancel focus and local pending/failure/retry
feedback. Escape and outside dismissal are blocked while pending. Failed deletion
preserves the document and local draft; confirmed deletion clears its draft. A failed
navigation retains confirmation so retry opens the list without another deletion.
Direct rejected-navigation evidence remains outstanding.

Background revision refresh pauses while a modal owns an operation. A browser case
holds a successful deletion response beyond the refresh interval and confirms the
pending dialog survives without reloading the deleted route.

Verification: 23 related browser cases pass, including five deletion cases, document
creation/properties and editor flows. Deletion checks both schemes and languages at
360px with large text, rendered modal contrast, focus, exact retry and retained drafts.
Final Japanese light/dark screenshots were inspected. Formatting/lint/types, 2342
locale keys and production build pass.

CI 37591072362 finished with 456 passes and one filter case failure. Its expected issue
was outside the virtualized list window after unrelated fixtures accumulated. The
case now scopes search to its own issues and explicitly seeds/cleans 30 unrelated
issues; the focused case passes. The next full CI result remains required. Overall
UI/UX and WCAG conformance remain partially verified.

## Shared inbox deletion recovery

Inbox bulk deletion uses ConfirmActionDialog, sharing document deletion typography,
semantic colors, 44px wrapped actions, safe Cancel focus and local retry feedback.
Storage is written before committing visible deletion. A storage exception leaves
notifications intact; retry retains the original notification IDs. Inbox shortcuts
are suppressed while confirmation is open. Issues/comments are never deleted.

Verification: 18 inbox browser cases pass, including storage failure/retry in both
schemes at 360px/large text, rendered dialog contrast, retained notification state,
focus and underlying issue preservation. Final light/dark screenshots were inspected.
Formatting/lint/types, 2346 locale keys and production build pass. CI 37593839803
for the preceding push remains in progress; this change is committed locally while
that run finishes. Single-notification and other inbox storage mutations still need
failure recovery auditing; overall completion remains unproven.
