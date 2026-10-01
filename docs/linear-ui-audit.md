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

Kotowari's `/pages` list currently renders a fixed hierarchy of titles, statuses, and slugs.
Prioritize direct creation, project grouping, name/created/updated ordering and direction, and
useful filtering before team ownership controls. Preserve parent-page navigation and existing
page editing. Keep projection/sorting rules outside the rendering component and cover the
resulting list with focused browser tests.

My issues number shortcuts (1 Assigned, 2 Created, 3 Subscribed, 4 Activity) were also verified in
Linear. Kotowari implements these only on personal tabs, with input and composition guards.
