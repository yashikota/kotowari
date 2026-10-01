# Linear UI audit session

Use the persistent Chrome profile below for the Linear reference UI:

```powershell
playwright-cli -s=linear-audit open https://linear.app --browser=chrome --headed --profile="$PWD/.playwright-cli/linear-profile"
```

If the session is already open, inspect it instead of creating another browser:

```powershell
playwright-cli -s=linear-audit snapshot
```

The profile lives under `.playwright-cli/linear-profile`, which is ignored by Git. Keep this
folder when closing the browser. It preserves browser session data; Linear can still require
human reauthentication. Do not commit, upload, print, or inspect authentication tokens.

## Audit procedure

1. Confirm the current page belongs to the intended Linear workspace. A login page is not evidence
   of workspace behavior; ask the user to log in and resume the same profile.
2. Inspect important single-user workflows in the real UI before selecting the next migration.
   Record the screen, observed behavior, and corresponding Kotowari surface.
3. Prioritize daily issue editing, navigation, filtering, project/cycle planning, and personal
   workflow tools. Account administration and paid team features have lower priority.
4. Keep reference-workspace changes read-only unless the user authorizes creating or modifying
   reference data. Do not submit import or migration wizards during observation.
5. Implement the corresponding Kotowari behavior, add focused coverage, and run `task web:check`
   for every change under `web/`.
6. Commit coherent changes. Inspect the current CI result before pushing another change when
   that would cancel the run being used to verify the preceding commit.

## Recent observed surfaces

- Issue import/export settings expose a CSV migration path. Kotowari now provides CSV preview,
  validation, mapping to existing workspace metadata, and explicit import confirmation.
- Completed-cycle details expose scope, started, and completed statistics; Kotowari has matching
  cycle summary functionality. Recheck the rendered screens during the next audit.
- Releases settings required a Business plan in the observed workspace. This has lower priority
  for the single-user migration.

These observations are a starting point for the next audit, not proof that the broader migration
is complete. Track current UI evidence and test results as the implementation evolves.

## Documents audit (2026-10-01)

Observed in the logged-in team Documents screen:

- The toolbar has New document, Add filter, and Display options.
- The empty state has a Create document action.
- Display options default to grouping by Project and ordering by Name.
- Ordering choices are Owner, Last edited, Created, Name, and Project, with a direction toggle.
- Optional display properties are Owner, Last edited, and Created.
- Project visibility controls include inactive projects and only the user's projects.

Kotowari now provides direct creation, project grouping, name/created/updated ordering,
direction, search, project/date filters, inactive project visibility, and only-my-projects.
Display settings persist across reloads; clearing filters preserves ordering and properties.
Parent-page navigation is preserved. Projection rules live in `page-list.ts`, with focused
unit and browser coverage. Team ownership controls remain lower priority.

My issues number shortcuts (1 Assigned, 2 Created, 3 Subscribed, 4 Activity) were also verified in
Linear. Kotowari implements these only on personal tabs, with input and composition guards.

## Issue detail audit (2026-10-01)

Confirmed the logged-in issue detail and Issue options menu in Chrome:

- Header actions include URL, identifier, branch name, prompt copying, and coding-tool selection.
- Issue options include due date, links, pull requests, documents, related issue creation,
  relationship assignment, copying, conversion, duplication, favorites, reminders, and history.
- Create related contains issue, sub-issue, parent issue, blocked issue, and blocking issue.
- Kotowari already exposes these related-creation choices in `IssueDetailHeader.tsx` and
  implements the principal copy, reminder, conversion, and history actions. Avoid treating
  these menu items as missing features without checking the existing behavior.
- Run loop is visible in Linear; assess its single-user value and semantics before considering
  migration. No reference issue data was modified during this audit.
### Editable issue copies

Opening Make a copy on a completed issue opens a Create issue composer in Linear. The title
has a `(copy)` suffix; description, priority, assignee, estimate, and labels are prefilled.
The observed copy starts in Backlog and has no cycle. It is only created after Save copy.
The reference composer was closed without submitting.

Kotowari now routes Make a copy through its existing issue composer instead of immediately
creating a persisted issue. It carries the source title, description, type, priority,
assignee, estimate, project, and labels. Status starts in Backlog; cycle, due date, milestone,
and parent are not inherited. The user can edit before saving or close without creating an
issue. Existing draft autosave applies; empty copied descriptions bypass default templates,
and that choice persists when the draft is reopened.
### Issue composer additional actions and submission

The logged-in Linear Create issue composer exposes Create more, plus Set due date,
Make recurring, Add link, and Add sub-issue under More actions. Kotowari already has the
corresponding controls. The blank reference composer was closed without submission.

Kotowari's composer uses one synchronous submission lock for both button and keyboard entry
points. While creation is pending, inputs and dismissal are disabled and the save button
shows progress. Failed creation retains inputs and releases the lock for retry. Create more
restores title focus after the inputs become enabled. Browser coverage delays the create
request to check the lock, injects a failed request to check recovery, and exercises existing
draft, template, recurring, copy, and consecutive-create workflows.
### Composer metadata readiness (2026-10-02)

Rechecked Make a copy in the logged-in Linear UI: the Feature label remains selected in the
copy composer along with priority, assignee, and estimate. Discarded the composer without
creating reference data.

Kotowari now loads composer projects, templates, and labels through `useIssueComposerMetadata`.
Opening or retrying refreshes those catalogs; saving by button or keyboard waits for readiness.
Failures expose a reload action while preserving the current draft. Generation checks and effect
cleanup prevent an earlier opening's response from replacing a newer opening's data. Focused
browser coverage confirms copied labels survive delayed and stale responses, and that failures
can be retried without losing the title.
## Project document creation (2026-10-02)

The reference workspace's Projects screen is empty. Its description explicitly includes optional
documents as part of a project. No reference project was created, so this audit does not establish
the exact project-detail document menu. Team Documents creation and project grouping were already
observed in the preceding audit.

Kotowari's existing project detail listed associated documents but had no creation action. It now
opens the shared page composer with the project selected. The same composer allows changing or
clearing that selection. Opening it from the global document list clears earlier project context.
Creation sends `projectId` in the existing API operation, preserving the association without a
second patch. Page-composer state and submission moved out of Shell into `useShellPageComposer`.
The composer guards concurrent submission and retains the title/project selection after failure.
Focused browser coverage verifies persisted associations, visibility back in project documents,
context reset, and keyboard submission/retry.