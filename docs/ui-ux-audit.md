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
| Initiatives / initiative detail | Partial: responsive labeled form, property/update draft protection, scoped favorite and reminder writes, shared clipboard recovery, pending guards, exact retries and success feedback; verified in both themes/languages, including responses arriving after navigation or newer property saves | Inspect long project names/associations, remaining dialog states and complete keyboard paths |
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

## Inbox state writes and touch controls

Inbox state writes now run outside React state updater callbacks, persist before
changing visible state, and report local storage exceptions with shared SaveFeedback.
Failed operations retain their update and completion callback for retry. Archive,
single deletion and snooze keep the selected notification until persistence succeeds.
Repeated failure retains retry focus; success restores the notification actions focus.
Display preferences and read/bulk-read operations share the same write path. Expired
snoozes become visible without an unnecessary storage write. Mobile detail buttons
and links have a minimum 44px touch area.

Verification: 26 inbox browser cases pass, including eight new cases covering repeated
storage failure for unread/archive/delete/snooze in both schemes at 360px/large text.
They check unchanged storage, retained detail context, focus, final persisted IDs,
44px detail controls and actual alert contrast. Final light/dark failure screenshots
were inspected. Formatting/lint/types, 2350 locale keys and production build pass.
Preference and automatic read failures share implementation but lack dedicated
failure browser cases. Previous remote CI 37593839803 remains in progress.

## Inbox preference failure dismissal

Display options now close when storage fails, including repeated failures with the
same message. Recovery focus waits for the menu dismissal. A failure sequence count
coordinates focus without treating error text as an event. Users can select another
setting after a failure; its retry replaces the previous unconfirmed preference.

Verification: 28 inbox browser cases pass. New light/dark cases at 360px/large text
fail priority-inbox and compact-density writes with identical errors, verify closed
menus and retry focus, assert unchanged storage, retry only the current preference,
and check rendered alert contrast. Light/dark screenshots were inspected. Mandatory
formatting/lint/types and production build pass. Remote CI 37593839803 remains live;
its Check job succeeded and Unit test is still running. Overall completion remains
unproven, including dedicated automatic-read failure cases and other screens.

## Shared issue and document removal

Issue deletion now uses ConfirmActionDialog rather than a native browser confirm.
Issue and document removal share useRetriableRemoval: scoped pending guards, local
failure/retry, confirmed removal retained during list navigation, late result guards,
and draft cleanup only after successful deletion. Confirmed removal retries navigation
without repeating DELETE. Document removal's duplicated lifecycle has been removed.
The dialog accepts an explicit focus return target for menu-launched operations;
issue cancellation now returns to the options trigger instead of an unmounted item.

Verification: 24 distinct related browser cases pass: four issue deletion language /
scheme cases, five document deletion cases, issue property recovery, list filter /
delete, eleven document property cases and two inbox deletion cases. They cover safe
Cancel focus, 44px dialog actions, cancellation without DELETE, pending Escape,
retained failed drafts, exact retry, persisted deletion, and actual modal contrast.
Final Japanese light/dark issue failure screenshots were inspected. Mandatory checks,
2360 locale keys and production build pass. Direct rejected-navigation UI evidence,
issue archive recovery and broader screen auditing remain outstanding.

CI 37593839803 for 817c6bc completed successfully, including Check and Unit test.
The accumulated inbox and removal changes are ready for a new full CI run.

## Recoverable issue archive and restoration

Issue archive/restoration now uses scoped useRetriableSave with local SaveFeedback
outside the archived/inert content. Failure retains the intended boolean for exact
retry and preserves the original archived state. Pending operations disable content
editing and detail shortcuts, guard repeat writes and close the issue menu. Confirmed
writes update the local issue without a full route reload; activity refresh failure
does not misreport a confirmed write. Unsaved title drafts survive the confirmed update.

Shared focus restoration accepts a narrowly specified menu return target while
preserving its existing default behavior. Menu-launched failure focuses retry; keyboard
restoration failure does likewise. Success restores the issue options trigger.

Verification: 20 browser cases pass, covering archive/restoration in both schemes at
360px/large text (including keyboard restoration), delayed failed writes, original
server state, exact retry payload, persisted result, focus, and rendered feedback
contrast, plus issue deletion/property recovery and eleven workflow regressions.
The workflow case preserving user-moved focus still passes. Final light/dark archive
failure screenshots were inspected. Mandatory checks, 2365 locale keys and production
build pass. Current pushed CI 37596042116 remains live. Late scope responses, unsaved
body interaction and other task actions still require direct evidence.

## Issue navigation context and unsaved archive drafts

A delayed next-issue read reproduced a stale editable title: the URL had changed but
the reused detail presenter still exposed the preceding issue. useIssueDetailData
now projects only an issue matching the current identifier, using that identifier's
cached issue while loading when available. The old issue is never exposed as the
new route's editable data.

Verification: 15 browser cases pass, including the new held-read regression, late
archive success/failure after next-issue navigation, failed title plus unsaved body
retention through archive/restoration in both schemes, existing archive/deletion/
property recovery, and originating list-order navigation. The held-read case failed
before the change and passes after it. Mandatory checks and production build pass.
The previous archive focus/contrast changes remain locally committed pending live
CI 37596042116. Further late-response interleavings and remaining screens still need
completion evidence.

## Recoverable issue loading

Issue read failure now uses shared LoadFailure with a clear heading, wrapped error,
44px retry/back actions and announced pending state. Retry preserves the failure view
while reading, prevents duplicate requests, restores retry focus on another failure,
and focuses the editable title after recovery. Returning to the issue list remains
available while retry is pending. Initial loading is announced as a status.

Errors are scoped to the issue identifier. Stale rejected detail reads are ignored
before invoking the current error handler, so a previous issue cannot replace a new
issue's editor with its failure screen.

Verification: 13 browser cases pass, including both-scheme 360px/large-text initial
failure, held retry failure, recovery focus, 44px actions and rendered contrast; late
read failure after next-issue navigation followed by a confirmed edit; and returning
to the list before retry settles. Archive context/draft and deletion cases pass too.
Final light/dark load failure screenshots were inspected. Mandatory checks, 2369
locale keys and production build pass. Remote CI 37596042116 remains live (Check
passed). Ancillary resource failures, repeated route visits, all language/text-size
combinations and broader screen completion remain unproven.

## Revisited issue loading and CI confirmation follow-up

Revisiting a failed issue through browser history reproduced a persistent previous
error even after its new read succeeded. Visit changes now clear the previous error
and retry state; retry completion/focus is guarded by a visit generation as well as
the identifier, covering returns to the same identifier.

CI 37596042116 completed with 480 passes, one failure and one flaky case. The failed
issue-shortcuts test still awaited a native confirm; it now operates the shared
confirmation dialog and checks safe Cancel focus. The flaky Japanese/light document
case lost initial Cancel focus. Its downloaded failure artifact confirms the focus
failure but does not establish its cause. Background useFocusWhen requests now avoid
active modal dialogs, and confirmation entry restores safe focus if it remains outside
the dialog, preserving focus already inside. A held editor read/recovered draft case
passes; it also passed before these guards, so it is regression coverage rather than
proof of the original CI cause.

Verification: 27 related browser cases pass, including the previously failing history
revisit, keyboard deletion/restoration, loading recovery, both-language/scheme deletion,
held draft recovery and eleven workflow/focus cases. The flaky Japanese/light case
passes five independent repetitions with retries disabled. Mandatory checks and build
pass. The next full CI run remains required; full screen and WCAG completion is still
unproven.

## Recoverable issue clipboard actions

Issue copy actions share useClipboardCopy, retaining failed text for exact retry,
guarding concurrent copies, ignoring scoped late results and clearing scoped success
timers. Local SaveFeedback announces copying, failure and success for four seconds.
Copy controls are disabled while pending. Failure focuses recovery when focus returns
from a pending control/menu; retry success restores the original connected trigger.
The identifier button keeps its own label when another value was copied.

Verification: seven related browser cases pass, including two 360px/large-text cases
with both schemes, delayed clipboard rejection, disabled controls, retry focus,
identical URL payload, success/trigger focus and rendered alert contrast; archive /
restore and keyboard deletion regressions pass too. Final light/dark screenshots were
inspected. Mandatory checks, 2373 locale keys and production build pass. Pushed CI
37598826758 remains live; Demo succeeded. Menu/keyboard copy paths, scope interleavings,
and copy operations on other screens still require dedicated evidence.

## Project icon and custom foreground contrast

Project icons and color choices now use shared semantic foreground colors instead
of fixed palette shades. Custom hexadecimal colors retain their stored value while
displayed luminance is adjusted for the supported light/dark surfaces. The shared
foreground helper uses the same 4.8:1 margin as theme palettes. Cycle date markers
use the semantic muted color, and shared error tokens use the theme error color.
Selected icon colors also show a check mark instead of relying on background color.

The rendered contrast scanner now measures explicitly marked project/selection
icons at 3:1. The route sweep covers 27 routes in light/dark at 360px/1280px,
including all eight named project colors, white, black and pale custom colors, and
the icon picker with its selection check. All five focused browser cases pass;
light/dark project and picker screenshots were inspected. Mandatory web checks and
production build pass. This remains scoped contrast evidence; remaining interaction
states and scrolled content belong to the ongoing screen audit.

## Clipboard focus recovery across entry paths and navigation

Reproduced immediate clipboard rejection from the issue Copy submenu leaving focus
on Issue options instead of recovery. Menu exit callbacks had captured the state
before rejection. Copy-owned menu exits now inspect the rendered recovery target;
ordinary menu dismissal retains its existing behavior. Keyboard errors share recovery
focus, and retry falls back to Issue options when a removed menu item cannot receive
focus. Pending focus requests survive a cancelled animation frame and reschedule.

Also reproduced late copy success/failure moving focus to the next issue's Copy URL
button when no input was focused. useActionFocusReturn now accepts a navigation
scope and checks its generation both after completion and before the animation frame;
issue copy/archive handlers use their identifier. Clipboard initiators reset on scope
changes. User-moved focus remains untouched.

Verification: 28 related browser cases pass, including eight clipboard cases covering
both schemes, delayed failure, exact retry, immediate menu/keyboard failure, reduced
motion, editing focus and late success/failure after navigation with body focus.
Archive/restore, navigation/draft retention and eleven workflow recovery regressions
pass. Light/dark failure screenshots were inspected; rendered alert contrast, mandatory
web checks, 2373 locale keys and production build pass. Previous full CI 37598826758
completed successfully. Other screens' clipboard feedback remains in the ongoing audit.

## Shared clipboard feedback and project recovery

ClipboardFeedback and useClipboardFocus now own translated progress/error/retry/success
presentation and scoped focus recovery for issue and project details. Project ID,
canonical URL and title copies use useClipboardCopy instead of silently swallowing
permission failures and leaving unscoped timers. Copy items are disabled during a
pending attempt; exact failed values are retained for retry. Connected menu items
that are closing are excluded as return targets, so recovery returns to the opener.

Reproduced rapid reopening/Escape leaving the project actions menu open before its
focus trap had initialized, then stealing recovery focus. Project actions are now
controlled, reset on navigation and handle Escape on the opener as well as inside
the menu. Tests assert both collapsed state and removal of the menu before failure.

Verification: six project recovery cases passed three repetitions (18 executions),
covering Japanese/English, light/dark, 360px/large text, pending disabled copies,
Escape, actual alert contrast, 44px retry, exact URL/title/ID retry and menu/keyboard
entry paths. Three additional cases cover retained summary drafts/user focus and
late success/failure after dependency-link navigation with body focus. All 37 related
clipboard/archive/workflow cases and eight existing project layout/shortcut/save/
dependency/template cases pass. Japanese light/dark failure screenshots were inspected;
mandatory web checks, 2373 locale keys and production build pass. Full CI 37601794232
for the previously pushed changes remains live. Other detail screens' clipboard
feedback and remaining project mutation recovery still belong to the ongoing audit.

## Project deletion confirmation and recovery

Project detail uses ConfirmActionDialog and useRetriableRemoval for deletion. Cancel
receives initial focus, pending writes prevent dismissal/duplicates, failures retain
the current summary/description drafts and focus exact retry, and cancelled dialogs
return to the actions opener. Property/reminder saves block deletion; project property
writes and shortcuts cannot run during confirmed removal. Confirmed removal opens the
list before dispatching refresh, avoiding invalidation of the deleted detail route.
The shared removal hook separates confirmed deletion from navigation retry.

Verification: five project deletion cases pass, with Japanese/English, light/dark,
360px/large text, default cancellation focus, 44px actions, no delete on cancellation,
held failure, Escape while pending, exact retry, retained failed summary/description,
unchanged server values before removal, actual dialog contrast, final list route and
server 404. A held property save keeps Delete disabled until it settles. All 26 related
project copy/layout/shortcut/save/dependency/template and issue deletion cases pass.
Japanese light/dark failure screenshots were inspected. Mandatory checks, 2383 locale
keys and production build pass. Rejected navigation after confirmed deletion still
requires dedicated runtime evidence. Full CI 37601794232 completed with 504 passed
and one flaky issue-save-feedback case; investigate that save/Enter ordering before
the next push rather than accepting the retry as proof of stability.

## Title save requested during another pending property write

CI 37601794232 exposed a flaky issue-save-feedback result: the local revised title
remained visible while the server retained the previous title. Holding the final
priority write reproduced the same failure deterministically before the fix. Enter
blurred the readonly title while pending, and the property presenter dropped its
save request. This was addressed in the presenter rather than by increasing timeout
or waiting away the pending interaction in the test.

A requested dirty title now waits for the current successful property write. If
that write fails, its exact retry remains first; the queued title follows successful
recovery. Repeated Enter does not duplicate an in-flight title write. Editing replaces
the queued value, and navigation generation prevents it from writing into the next
issue. Handling unsaved title drafts when leaving still remains open in the audit.

Verification: the gated CI regression passes five repetitions without retries; two
additional cases check exact priority/title ordering after failure and cancellation
on next-issue navigation. All 20 related save/queue/copy/archive/deletion cases and
eight title layout/history/property-menu regressions pass. Mandatory web checks,
2383 locale keys and production build pass. The full pipeline must be rerun against
the new pushed commit before claiming CI stability.

## Filled control boundaries

Filled buttons and action icons, including controls using the default variant, use
the shared control boundary token. The page contrast sweep also asserts the actual
rendered Save workspace button border in both schemes at 360px and 1280px. This
prevents an omitted variant attribute from bypassing the shared boundary style.

## Unsaved issue title navigation

Issue titles use the shared UnsavedChangesDialog and navigation blocker. Users can
stay, save the title and leave, or explicitly leave without saving. Pending writes
complete before navigation; cancelling the navigation does not cancel a write or
navigate later when it completes. Browser back and before-unload are guarded.
Returning to the persisted title removes the guard without an unnecessary write.
The dialog has translated labels, wrapped actions and 44px targets. The localized
failure/retry dialog was rendered and inspected in both schemes with large text.
Eight new cases cover locale/theme retry, discard, undo, browser back and reload;
three queue cases cover retry, deferred navigation and staying during a write.
Project summary/description and other forms still need equivalent unsaved-navigation
audits; this does not establish complete cross-screen conformance.

## Delayed draft recovery and menu focus

CI run 37605061148 failed because the Japanese/light issue-deletion case timed out.
Its initial failure image shows recovered body focus while the issue menu trigger
remains expanded, but only the successful retry had a trace. A deterministic test
holding the initial body read reproduced disappearance of the already-open menu
before the focus fix. Shared useFocusWhen now leaves focus inside an open menu,
as it already does for an open modal. The reproduction passes five repetitions.
Playwright retains traces of initial failures, and issue-deletion fixture cleanup
has a bounded timeout and attaches its error without replacing the original failure.

After both changes, all 38 related document, title-navigation, clipboard, archive
and deletion cases pass without retries. The earlier focused title-save/history/layout
and navigation/deletion run passed 19 cases. Full CI remains the broader gate.

## Project summary and description navigation

Project text editing now reuses UnsavedChangesDialog and the navigation blocker used
by issue titles. The guard covers both summary and description, browser back and
before-unload. Users can stay, save the current changes and leave, or deliberately
discard them. Pending queued saves complete before navigation; choosing to stay
prevents a later completed write from navigating. Returning to persisted values
removes the guard and avoids redundant blur writes.

Persisted text snapshots follow confirmed writes. Refreshes after milestone or
relationship changes preserve dirty summary/description values. Successful writes
to other properties preserve a failed description, and remaining dirty text prevents
an inaccurate saved announcement. Save-and-leave retries include the current text
and any other failed property patch.

Twelve new tests cover locale/theme recovery, retaining failed text across a milestone
refresh and another property save, pending navigation with newer input, staying during
pending writes, explicit discard, undo, browser back and reload. Two related runs
(26 and 22 tests, 38 distinct cases) pass without retries. Mobile large-text dialog
contrast passes; Japanese light/dark retry screenshots were inspected. Mandatory
web:check and the build pass, with 2395 matching locale keys. CI for the previous
pushed change e7a2552 completed successfully (37608272149).

Other editing surfaces, milestone drafts, project update drafts, and archive/restore
failure recovery remain subject to the full-screen audit. This is not full UI/UX or
WCAG completion evidence.

## Project archive and restore recovery

Project archive/restore now uses the shared scoped retriable write presenter. The
result stays on the detail page, matching issue archive behavior and keeping the
current editing context available. Confirmed archive state appears as a textual
badge, and restore is available from the same action menu. The action changes only
archivedAt in local project state; failed summary/description edits and their separate
retry remain intact. An older queued property response preserves newer archive state.

Pending archive blocks duplicate archive and deletion actions. Retrying a failed
write retains the intended archived boolean. Late results after a project change do
not update the new detail, announce a stale result or restore old focus. Shared
useMenuActionFocus is used by issue and project archive actions to keep an immediate
failure's retry button focused after the closing menu restores its trigger.

Seven project archive tests cover locale/theme failure and retry for both archive
and restore, preserving failed text drafts, duplicate/pending guards, immediate
keyboard retry, and late success/failure after navigation. An additional issue test
checks immediate failure focus with the shared helper. All 46 related archive,
clipboard, deletion and unsaved-navigation cases pass without retries. The 13 archive
cases also pass three repetitions (39 runs) after adding restore-failure checks.
Mobile large-text retry contrast passes; Japanese light/dark failures were rendered
and inspected. Mandatory web:check and build pass, with 2400 matching locale keys.

CI 37642920644 for the prior pushed project draft change is still running Playwright
at this audit point. This archive work has not yet passed the full CI gate. Audit
other text sizes, languages, simultaneous archive/property writes, and remaining
project mutations before considering the screen complete.

## Milestone creation recovery

Project milestone creation reuses useRetriableCreation, now with optional entity
scope and generation guards. A pending operation owns its payload and blocks duplicate
POSTs. Editing a failed draft invalidates the retained payload, so a subsequent attempt
uses current input. A confirmed milestone is inserted locally before refresh; a refresh
failure retains the confirmed record and offers refresh-only retry, without another
POST. Confirmed creation clears the form, and scope changes clear old form state.

The form has persistent translated name/description/date labels, a required name
indicator, trimmed-name validation with focus, disabled pending/confirmed-refresh
fields, translated progress/failure/retry/success feedback, and scoped focus recovery.
The existing dialog/load-retry action CSS was renamed ActionControl and reused for
the 44px, wrapping add button rather than introducing another screen-specific action
style. Dialog and load-retry styles otherwise remain identical.

A deterministic post-create project read failure originally replaced the entire page
with the route error and prevented local recovery. Project refresh now reads project
and activity data locally, applies only the latest scoped refresh, and preserves dirty
summary/description values. Activity entries are merged by immutable id with loader
updates and sorted by timestamp/id. Both project status-update history and dependency
refresh regressions pass.

Seven new cases cover en/ja and both themes at mobile large text, empty-name focus,
duplicate submission, retained failed input, editing before retry, confirmed creation
with failed refresh and one POST, and late success/failure after moving to another
project. The final 36-case regression run also covers page/ADR creation, project
updates, dependencies, deletion and unsaved navigation. It passes without retries.
Rendered form contrast passes; final Japanese light/dark labeled forms were inspected.
Mandatory web:check and build pass, with 2409 matching locale keys.

CI 37642920644 for b545d9f succeeded before this work was pushed. Milestone row editing,
removal, unsubmitted creation draft navigation, and pending project refresh combinations
remain part of the broader completion audit; the full objective is still unproven.

## Milestone row editing and confirmed-write preservation

Existing milestone rows now share a dedicated scoped edit presenter. Names,
descriptions and dates are controlled drafts with row-level pending, failure,
retry and confirmed-success feedback. Pending fields remain focusable but read-only;
other rows remain editable. Empty names show a translated validation message, and
explicit save returns focus to the invalid name. Shared 44px wrapping actions and
SaveFeedback keep the row consistent with other editing surfaces. Moving focus to
the explicit save action defers blur saving to that action, allowing deterministic
retry focus after a rejected write.

The project navigation guard includes milestone drafts and pending saves. Saving
before navigation saves dirty rows sequentially and waits for every confirmed write;
a failure leaves the dialog and current drafts available. Project property writes
and local refreshes preserve milestone changes confirmed after their request began.
Drafts survive unrelated property changes and milestone creation/refresh. Archive,
project deletion and milestone removal are blocked while milestone writes are pending.

Nine new browser cases cover en/ja and both themes at 360px with large text, held
503 responses, read-only pending controls, independent rows, retained payload retry,
trimmed names, clearing dates to null, required-name focus, refresh and navigation
recovery, multiple dirty rows, revised failed payloads, older property/refresh
responses, and explicit-save retry focus. Japanese light/dark failure screenshots
were inspected and rendered row contrast passes. A 102-case related regression run
passed before the final explicit-save focus adjustment; the final focused regression
result is recorded after that adjustment below.

Milestone removal still uses browser confirmation and lacks shared failure recovery.
Unsubmitted creation drafts and other editing surfaces remain part of the full audit.
The full UI/UX objective remains Partial.

## Readability margin in shared colors

Secondary text and placeholders now use #343a40 in light mode and #dee2e6 in dark
mode. Named semantic foreground palettes target 7:1 against the supported worst-case
shared backgrounds, with a matching unit assertion. Existing filled-control text,
control-boundary and focus tokens remain subject to their AA checks. The prior color
run passed nine browser cases, including the 27-route sweep in both themes and at
360/1280px, plus three color-foundation unit cases. Rendered light/dark settings were
inspected. This establishes the covered color surfaces, not full WCAG compliance.

The final 42-case focused regression run passes without retries after the explicit
save focus adjustment. Mandatory web:check and build pass with 2415 matching locale
keys. An earlier run had one browser startup failure: trace showed
net::ERR_NO_BUFFER_SPACE loading useMatch before the first form interaction. Its
trace was preserved in the local temporary directory; the subsequent complete run
passed. Prior CI 37646628920 for 806a2f9 completed successfully before this work was
pushed. New CI is still required for the current changes.

## Inline milestone deletion and modal priority

Milestone removal now uses ConfirmActionDialog and shared useItemRemoval rather
than browser confirmation. useItemRemoval composes useRetriableRemoval to own the
selected key, retained failure, confirmed DELETE, refresh retry, scope reset, success
announcement and focus target. The project presenter supplies the API operation,
local confirmed removal and scoped refresh rather than owning this lifecycle.

Cancel preserves row drafts and returns focus to the selected row's remove action.
Pending deletion blocks repeat requests, Escape dismissal and background controls.
A failed DELETE retains the selected item and offers retry. A confirmed DELETE
removes the row locally; failed refresh offers refresh-only retry without repeating
DELETE. ConfirmActionDialog supports optional close after confirmation for inline
items. Close or Escape after a failed refresh retains confirmed removal and allows
continued work. Entity deletion dialogs keep their existing behavior by default.
Focus returns to the next row or the create action after confirmed removal.

The project unsaved-navigation guard includes milestone removal pending state and
shows the actual pending operation's label. A deterministic browser-back case found
the unsaved and deletion dialogs overlapping, with the deletion panel intercepting
clicks on Save and leave. The milestone confirmation is now hidden while navigation
confirmation owns the screen, with its state retained. Explicit focus restoration
is suppressed during that handoff; ConfirmActionDialog lets caller-owned focus
restoration replace Mantine's automatic restoration.

Eleven new cases cover en/ja and both themes at mobile large text, cancellation with
unsaved row input, held failure/retry, selected-key switching, preserving another
row draft, assigned issue unlinking, refresh-only retry, closing or escaping failed
refresh and continuing creation, late refresh success/failure after browser back,
and blocking save/navigation while DELETE is pending. All eleven pass without
retries. Japanese light/dark deletion failures were rendered and inspected; dialog
contrast passes. Mandatory web:check and build pass, with 2425 matching locale keys.

Unsubmitted creation drafts, combinations of other entity deletion and navigation
dialogs, and the remaining full-screen audit are still incomplete. This is scoped
progress; the overall UI/UX objective remains Partial.

The final 64-case related browser run passes without retries, covering milestone
creation/editing/removal, project drafts/archive/deletion, and issue/page/inbox
removal regressions after the shared confirmation focus change. Prior pushed CI
37650441991 is still in progress at this audit point; no full CI completion is
claimed for the current local changes.


## Contrast and entity confirmation follow-up

Secondary text and placeholders use the stronger shared colors introduced in
d5eb116. Foundation checks now require 7:1 on the darkest supported light surface
and lightest supported dark surface, with control boundaries and focus at 3:1.
Rendered settings exposed faint select arrows that text-only checks missed.
ComboboxChevron now uses the shared secondary-text/error tokens, and its rendered
SVG is explicitly included in the 3:1 indicator measurement. Settings checks
assert that the actual arrow is measured.

Issue and project deletion confirmations yield to unsaved-navigation confirmation
without losing deletion state. Pending DELETE prevents concurrent saving or
discarding. Staying restores the deletion dialog; failed DELETE permits saving
and leaving. Confirmed entity removal releases the navigation guard: treating the
subsequent list navigation as a pending write caused a circular wait after deleting
a project with failed text drafts. That regression is fixed and all four existing
locale/theme deletion recovery cases pass.

The related 72-case browser run passes without retries. Mandatory web:check, build
and the three color foundation tests pass. Prior main CI 37650441991 and Demo
37650441960 are completed successfully. Overall UI/UX audit remains Partial; these
measurements are scoped coverage, not a claim of full WCAG conformance.

Final color coverage passes all nine browser cases, including 27 routes across
light/dark and mobile/desktop widths, selected icons, select indicators and
group visibility. Settings screenshots in both schemes were inspected after
the arrow fix. The eight entity deletion/navigation cases were rerun with
explicitly asserted light/dark scheme selection and pass without retries.


## New milestone drafts and navigation

Project navigation now includes unsubmitted milestone name, description and date
input, plus confirmed creation awaiting refresh. Browser reload prompts before
losing that input. Save and leave runs project text, edited milestone rows and new
milestone creation sequentially, stopping on the first failure. Empty-name
validation is reported in the navigation dialog; returning retains all input.
Creation errors and pending/refresh stages use the same shared feedback as the
form. Retry of confirmed creation refresh does not repeat POST. Concurrent entity
delete/archive actions are disabled and guarded while creation is pending.

The two previous late-creation navigation cases now verify waiting for the active
write before moving, or explicitly discarding after failure. They still verify
that the next project's draft and feedback are independent. Six new cases cover
en/ja and light/dark at 360px with large text, validation without POST, retained
input, failure/retry, exact single confirmed record, refresh-only navigation retry,
date-only draft protection on reload and explicit discard. All six pass without
retries. Japanese light/dark validation dialogs were rendered and inspected and
contrast measurements pass.

The 48 related creation/edit/removal/project-navigation cases pass. A separate
run confirmed the 8 entity-dialog and 7 archive cases; the added reload test first
exposed a test wait that incorrectly waited for a canceled navigation, corrected
to explicitly dismiss beforeunload. The final six-case run passes. Mandatory
web:check and build pass; locales retain 2425 matching keys. Prior main a603331
is pushed; Demo 37656089018 is successful and CI 37656089187 is still running.
Overall screen audit remains Partial, including other creation forms and overlays.


## Project dependency recovery and controls

Dependency add/remove now has one scoped transaction presenter composed from the
shared confirmed-write/refresh recovery primitive. Pending state prevents repeat
writes. Failed add retains the project and relationship choice; editing invalidates
the old retry. New removal intent replaces a failed target rather than deleting the
previous target. Confirmed changes update the local list immediately; retry after
failed project refresh repeats only the read. Local dependency changes are also
preserved against older property and refresh responses. Entity delete/archive and
milestone removal handlers guard concurrent dependency writes.

The shared section now has visible select labels, 44px controls and actions,
wrapping relationship rows, and SaveFeedback for pending, failure/retry and success.
Action focus returns to retry on failure, or an enabled select after completion.
Late completion after changing projects cannot overwrite selection, feedback or
focus in the next project. Existing project navigation wait uses the actual
relationship operation label while a dependency write is active.

Nine new browser cases cover both languages/themes at mobile large text, held
failure/duplicate submission, retaining and changing relationship choice,
add/remove failure recovery, local confirmed-list updates, refresh-only retry with
one write, switching failed deletion targets, and late success/failure after
navigation. All nine plus two existing reciprocal/create dependency cases pass
without retries. The related 41-case navigation/archive/creation run also passes.
Japanese light/dark failure sections were rendered and inspected; contrast passes.
Mandatory web:check and build pass, with 2435 matching locale keys. Initial Japanese
fixture failures came from a trailing-space mismatch after server name trimming;
the normalized fixture passes in both schemes.

Unsubmitted relationship selection is not yet integrated into navigation draft
protection. Full screen/overlay coverage remains Partial. Prior main a603331 CI
37656089187 is still running; Demo 37656089018 has completed successfully.


## Dependency drafts and sequential navigation saving

Unsubmitted dependency selection, failed relationship intent and confirmed writes
awaiting refresh now participate in project navigation and beforeunload protection.
Save and leave runs project text, milestone row edits, milestone creation and the
relationship change in order, stopping at failure. Failed removal retries its
exact target; confirmed add/refresh recovery repeats no write. Explicit discard
of an unsubmitted choice performs no POST. Staying preserves the selection.

The shared navigation hook gives sequential saves a cancellation signal. Stay,
Escape dismissal, scope change and unmount stop subsequent operations, while an
already-started write still completes and reports its confirmed result. Project
saving and milestone row batching check this signal between writes. A held
milestone-create case proves that Stay stops the later dependency write, retains
an edited relationship choice, and the next Save and leave sends the newer choice
without repeating milestone creation.

Navigation feedback is now derived by a pure presenter function with structural
inputs. Its error and failure label use the same ordered source; pending labels
identify the actual write or refresh. Three unit cases cover stage labels, failure
priority and validation. Eight new browser cases cover en/ja and light/dark at
mobile large text, reload prompt/Stay, mixed milestone/dependency save ordering,
retained failure/retry without duplicate milestone creation, explicit discard,
confirmed refresh-only retry, failed removal retry, and canceling later writes.
Japanese failure dialogs in both schemes were rendered and inspected; contrast
passes. Mandatory web:check and build pass with 2435 matching locale keys.

## Confirmation focus regression from CI 37656089187

Prior main a603331 CI completed with one failed focus assertion in confirmed
milestone deletion refresh recovery, while 585 browser cases passed. Check and
Demo passed. The CI screenshot, trace and error context were downloaded and
inspected. A deterministic browser case moves focus to the dialog itself during
held refresh: the previous restoration accepted only document.body and reproduced
the same missing retry focus. ConfirmActionDialog now also restores from its own
dialog/confirmation controls, scopes action completion to open state, and explicitly
focuses retry when an error appears in an open dialog. This covers a dialog that
was temporarily hidden for navigation confirmation as well. Transition completion
uses the same guarded error focus. Closing/hiding cancels scheduled restoration,
and focus already moved to unrelated controls is respected.

The deterministic case fails before the fix and passes after it. The first open
state scope fix exposed four existing navigation-handoff focus failures; those
led to explicit error-state restoration rather than relying on a still-live click.
Final related regression evidence is recorded below. Overall UI/UX remains Partial;
other forms, screen states and remaining inventory requirements still need direct
verification.


Final 105-case related browser run passes without retries on the completed focus
and navigation changes, including task/project/page/inbox confirmations, handoff
focus, milestone create/edit/remove, dependency recovery/draft navigation,
project archive/text navigation and task unsaved titles. The three navigation
feedback unit cases, mandatory web:check and build pass. No full-CI success or
all-screen completion is claimed for this revision; the next pushed CI must
confirm the complete browser suite.

## Creation overlays and global error contrast

Global error dismissal now uses the shared default button surface and text
to keep its secondary action consistent with other feedback controls.
New browser coverage measures issue/project creation, focused inputs and status
options at 360px and 1280px in both color schemes, plus a real failed favorite
write's global error notification and its dismissal. All 15 contrast browser
cases pass without retries, including the existing 27-route rendered inventory,
hidden groups and opacity/clipping measurement checks. Light/dark screenshots
were inspected. Mandatory web:check and build pass; 2435 locale keys match.
This is contrast evidence for the covered states, not a complete WCAG audit.

Cycle progress breakdown no longer uses fixed pale palette shades or raw custom
label colors. Assignee, priority and project indicators use semantic foreground
tokens; custom hex label colors are corrected for both supported surface ranges.
The remaining ring track uses the shared control boundary token. Two additional
browser cases verify actual ring stroke/background contrast >=3:1 in both schemes,
including white, black and yellow labels, and keep the percentage text visible.
Both rendered schemes were inspected. Mandatory web:check and build pass.

## Shared health update submission and recovery

Project and initiative health updates now share a scoped submission controller
and composer. Pending posts block closing and duplicate writes; read-only fields
retain readable semantic foregrounds. Cancel/reopen retains health and body.
Failure offers the shared retry feedback and restores retry focus, including
reopening an error dialog. Confirmed posts remain in the local feed if refresh
fails, with read-only recovery that retries only reads. Initiative feed refresh
does not reload the whole route or overwrite independent property drafts.
Successful completion announces posting in the shared feed.

Project navigation now includes update-body drafts and confirmed refresh recovery.
Sequential saving includes the health post after property, milestone and dependency
work, respecting cancellation before later operations. A pending post hands off
to one navigation dialog, and staying restores the composer and its retry focus.
Generation guards protect late completion; initiative navigation protection for
its full property form and update drafts still needs implementation/verification.
Health-only navigation drafts and further late-refresh transitions also remain
direct-verification gaps. Overall UI/UX stays Partial.

The final related 63-case browser run passes without retries. It initially exposed
new initiative fixtures leaking into an existing empty-state case; scoped cleanup
fixed the isolation and the complete related run passed. The final 12-case health
suite also passes, including two additional pending navigation handoff cases.
Four navigation feedback unit cases, mandatory web:check and build pass with
2443 matching locale keys. Both rendered schemes and mobile large-text failure
dialogs were inspected; covered composer states pass rendered contrast checks.

## Complete browser CI within bounded jobs

CI 37664584821 completed Check successfully but its combined Unit test job was
canceled at the 25-minute limit during Playwright. Its annotations include
milestone/dependency navigation failures; those cases pass locally, but remote
failure diagnosis is not considered complete. No full-CI success is claimed.

Browser regression now runs in four independent jobs with fail-fast disabled,
separate report artifacts and an always-run upload step. Browser execution has
a 20-minute step limit inside a 30-minute job, leaving time to retain evidence.
Go/SPA tests remain a separate Unit test job. Task web:e2e accepts CLI arguments
without removing its build dependency or flaky-test failure gate. Actionlint
v1.7.12 passes and a dry run confirms the shard flag reaches Playwright. Listing
the suite and comparing all shard identifiers verifies every browser case occurs
exactly once. The next remote run must verify runtime coverage and remaining
navigation failures; dividing execution does not establish that they are fixed.


## Initiative editing and update draft navigation

Initiative property editing now separates editable drafts from server baselines,
reconciles untouched fields after refresh, patches only changed properties and
retains confirmed saves for read-only refresh recovery. Shared save feedback,
navigation protection and deletion confirmation replace page-specific handling.
Health-only drafts now participate in navigation protection; missing update text
produces a validation message rather than leaving navigation waiting.

The final combined 27-case browser run passes without retries, including ten
initiative editing/update navigation cases and seventeen existing contrast cases.
The preceding related run passed twenty-nine cases; its three failures were test
locator ambiguity and a desktop-only navigation trigger mismatch, repaired before
the final run. Mandatory web:check and build pass (2469 matching locale keys).
Additional same-slug late operations and validation focus transitions still need
direct verification. Overall UI/UX remains Partial.

Remote CI 37684233236 completed with browser failures in milestone/dependency
navigation. Demo 37684233092 succeeded. Sharding completed but did not establish
that those navigation failures are fixed; their remote reports need diagnosis.


## Initiative colors and keyboard focus contrast

Initiative list icons used saved values as raw CSS colors, bypassing the semantic
palette: purple on #242424 measured 1.65:1, yellow on #f8f9fa 1.02:1 and pink on
#f8f9fa 1.46:1. They now use the existing shared icon component, semantic named
colors and background-adjusted custom hex foregrounds. Text labels remain present;
color is not the sole identifier.

The route contrast inventory now creates all eight initiative colors plus white,
black and pale custom colors and scrolls every fixture row into view. Rendered
light/dark screenshots were inspected. The final four inventory cases pass at
360/1280px across the existing 27-route inventory. The six-case run including
measurement regressions passes; the final two measurement cases also pass after
covering wrapped button labels. Focus measurement now includes focused buttons
and links as well as inputs. Existing form/error, cycle and hidden-group contrast
cases passed in the preceding combined run. Mandatory web:check and build pass.
These results cover the exercised states; whole-product WCAG conformance and
overall UI/UX completion are not claimed.


## Route transition protection and loading recovery

The complete reports for CI 37684233236 prove that destination milestone and
dependency inputs were cleared after users/tests entered them before the route
loader settled. A milestone trace filled the new draft at 191424.925 ms while
the destination activity read finished around 191431.702 ms. The failures recur
on all three remote attempts. They are a production interaction race, not a test
readiness delay to hide with a longer wait.

A shared RouteContent boundary now makes the previous page inert immediately
while a different pathname is loading. Readable loading feedback remains sticky,
without lowering text contrast. Presenter scopes inherit disabled state so local
actions and keyboard shortcuts cannot mutate the old entity during this window.
The existing viewport height is retained and focus returns to loaded content only
if focus was lost to the document body, without stealing focus from controls or
overlays. A held destination activity read reproduced missing protection before
the fix and passes afterwards in both rendered schemes.

Default child-route errors now preserve the shell and offer a 44px retry action,
pending feedback and keyboard focus. Retry state belongs to the stable route
boundary, surviving replacement of failed matches. Direct verification exposed
that storing it inside the error component re-enabled the button while a retry
read was still pending; the shared provider fixes that and prevents duplicate
reads. Japanese/mobile/large-text failure, repeated failure and successful retry
cases pass in both schemes, including focus after recovery and rendered contrast.

The final combined 60-case browser run passes without retries, covering the new
four route cases, the sixteen dependency/milestone feedback cases and existing
layout, input preservation and keyboard regression. Nine mediator unit cases,
mandatory web:check and build pass with 2474 matching locale keys. Both loading
and error screenshots were inspected. CI 37686953775 still has Browser (4/4)
running; Browser (1/4) and (2/4) fail on the previous commit. A fresh remote run is
still required to establish that this change resolves those failures. Root-shell
render exceptions, rapid repeated navigation and wider per-route recovery remain
verification gaps. Overall UI/UX remains Partial.


## Scope view collection regression to its intended list

The complete older Browser (4/4) report contains one unexpected case: workspace
view collection navigation matches both the sidebar and main-content link, on
all three attempts (155 expected / 1 unexpected). This is a locator ambiguity,
separate from the confirmed destination input reset race. Collection navigation
and collection layout assertions now explicitly select the main landmark.
All fourteen related view cases pass without retries, and mandatory web:check
passes. Demo 37686953707 succeeds; CI 37686953775 Browser (4/4) is still running.


## Late route recovery and final contrast regression

Two additional route cases hold the failed-page retry, navigate to another
favorite project, enter its milestone draft and only then deliver the old failure.
After response completion and two settled render frames, the current URL, draft,
focus and cleared busy state remain intact with no old error alert. Both schemes
pass. The final combined 24-case route/contrast run passes without retries,
including the full rendered route inventory at mobile/desktop widths. This adds
evidence for late failure after leaving; rapid A-to-B-to-A transitions and
root-shell rendering failures still require direct verification. Mandatory
web:check passes; source matches the previously successful build.


## Bound browser environment preparation

CI 37686953775 is now terminal failure. Browser (4/4) timed out during
`playwright install --with-deps chromium`: after apt mirror requests around
21:06:53 UTC, no progress appeared before the 20-minute step cancellation at
21:26:45. Browser tests never started in that shard, so no Playwright report
exists; this is separate from the proven UI navigation and locator failures.

Browser dependency installation now has its own six-minute step and runner-local
APT configuration with three retries, 30-second HTTP/HTTPS inactivity timeouts and
a 60-second dpkg lock limit. The regression step retains twenty minutes and report
upload still runs unconditionally. APT parses all four values under local Ubuntu
24.04; actionlint v1.7.12 and the shard-4 task dry run pass. Options follow the
Ubuntu apt.conf manual (https://manpages.ubuntu.com/manpages/noble/man5/apt.conf.5.html).
This bounds stalled setup and makes the failed phase visible; reliable remote
execution and full CI success still require a fresh run.

## Contrast gaps in shared controls and exceptional states

Replaced twelve screen-specific focus outlines with the shared scheme-aware
focus token. Loading spinners and linear progress bars now use the readable
anchor color; progress tracks have an explicit semantic background. Disabled
text and boundaries have their own readable foreground/background pairs in
both schemes, even though inactive controls have a WCAG contrast exemption.
Light body text is explicit rather than inherited from the component library.

Overdue issue titles and dates no longer use the raw light red palette shade.
An accessible calendar warning icon also identifies overdue rows without color
alone. Remaining direct red text in CSV import, project creation, cycle resource,
project template and initiative list failures now uses the semantic error token.

Rendered measurement now covers control icons, loading indicators, linear
progress, disabled text and focused controls. Focus contrast is measured against
the surface where the outline is painted: an outside outline uses the parent
surface, while an inset outline uses the control surface. A dedicated negative
fixture verifies this distinction. The route inventory includes Home, Board and
an overdue issue, at 360/1280 px in light/dark schemes. Settings screenshots in
both schemes were visually inspected.

All 22 contrast/composer/cycle/route cases pass without retries, plus four color
foundation unit cases. A separate final eight-case measurement/favorite run
passes after correcting existing uncommitted favorite test assertions to use the
actual translated save label and the API's omitted-false representation.
Mandatory web:check and production build pass. Overall UI/UX remains Partial;
these results cover the measured routes and states rather than certifying every
possible state. Criteria: https://www.w3.org/TR/WCAG22/#contrast-minimum and
https://www.w3.org/TR/WCAG22/#non-text-contrast.

## Scoped initiative feedback and canonical updates

Initiative copying now uses the shared clipboard transaction and feedback used
by issues and projects: pending protection, exact-value retry, scoped completion
and focus recovery after menu closure. Favorite writes expose saving, failure,
retry and success separately from property saves. Favorite/reminder responses
update the editor's canonical entity without invalidating the entire route.
Canonical reconciliation preserves independently edited fields and ignores
responses older than the current entity. Deletion is guarded while favorite or
reminder writes are pending; navigation save chains also check their generation.

Direct cases verify overlapping favorite/property writes, another draft entered
after a confirmed property save, and late favorite success/failure after moving
to a different initiative. Existing editing, linking, update, shortcut, reminder
and clipboard cases cover the related behavior in both languages and themes.

## Route freshness and shared recovery focus

The cached-route regression first visits the destination, returns to another
project, mutates its favorite to invalidate the API cache, then holds the cached
destination's activity read during navigation. Before the change, both themes
accept navigation without showing the loading boundary while that read is still
pending. The router now uses blocking stale reloads so the destination settles
its loader before accepting edits. QueryCache continues to own data freshness.
The shared loading boundary mirrors inert with aria-disabled for its subtree.

Recovery focus now treats the route landing container and document body as
passive targets. Menu actions, clipboard retries and issue archive recovery can
move from those targets to the relevant retry/control. Deliberately chosen input
or navigation controls retain focus. Cases cover restore shortcuts starting at
the route landing target, a sidebar link focused during an archive failure,
clipboard shortcuts from the landing target, and newer destination drafts during
late archive completion. Queued title navigation accepts the route landing
target as the destination's neutral focus state.

## CI evidence and regression fidelity

The complete Browser (2/4) report from CI 37689705958 confirms two obsolete
disabled-input assertions against intentionally readonly initiative fields.
Their failure leaked fixtures into the later empty-list case. The layout cases
now require readonly/readable fields, explicit retry recovery and unconditional
fixture cleanup. The report also confirms archive retry focus, queued title focus
and destination input failures. CI 37692641319's Browser (1/4) annotations show
the same destination readiness problem in dependency selection; that CI is
terminal failure while Demo 37692641368 succeeds.

A later local milestone trace shows programmatic fill starting before the
destination activity read finishes. Fill/selectOption omit the pointer-event
actionability check performed by click (https://playwright.dev/docs/actionability).
Navigation regressions now require native pointer focus before entering a
destination draft/selection. This complements direct checks that the pending
page cannot receive focus or keyboard mutations; it does not merely extend a
timeout. A local ERR_NO_BUFFER_SPACE occurred before page load in one isolated
clipboard run; the same case passes on a direct subsequent run. System connection
counts did not show port exhaustion, and no machine/browser settings were changed.

Final local verification passes: 136 browser cases with zero retries, 425 unit
tests across 47 files, mandatory web:check and the production build. The browser
set includes rendered contrast sweeps, composer and cycle feedback, navigation,
draft preservation, clipboard recovery and initiative metadata in both themes.

Overall UI/UX remains Partial. Full remote CI success and the broader screen/state
inventory still need authoritative verification.

## Project reminder updates without route reload

Project reminder writes now apply only the confirmed reminder field to local
state instead of invalidating the whole route. Successful mutations already
invalidate QueryCache through the shared request layer. A captured save generation
and unmount cleanup prevent an old reminder response from updating a retired
presenter. Two light/dark browser cases verify setting and clearing a reminder
preserve an independent milestone draft and do not reread project activities.
All 25 related reminder, milestone creation and archive cases pass with zero
retries; mandatory web:check and production build pass. Remote CI 37695665905
for d3e7090 is still running, with Unit test successful at the latest observation.
The broader screen/state inventory remains Partial.

## Readable document list status and title hierarchy

Page list status labels now use the same translated labels as page detail and
ADR list/detail, with a fallback for unknown legacy values. Status text uses the
shared list-row class and the normal small text size. Page rows put status beside
the slug in metadata; on narrow screens this sits below the title, giving the
title the full available width. ADR rows retain their identifier column and use
the same status typography. Render inspection rejected the intermediate fixed
72px status column because Superseded split into a single trailing character.

Four new browser cases cover English/Japanese and light/dark at 360px with large
text: all four supported page statuses, both document lists, text contrast,
metadata bounds, title/status separation and horizontal overflow. Final screenshots
of both English lists in both themes were inspected. All 26 document list/editor/
property cases pass without retries; mandatory web:check and production build pass.
The initial new contrast test used a multi-element scope and failed strict locator
matching; it now measures the complete main surface. A further 17 ADR list/detail/
property cases pass, including mobile titles, keyboard focus and cached unlink
freshness. Overall UI/UX remains Partial.
