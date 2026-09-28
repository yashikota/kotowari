package store

import (
	"testing"
	"time"
)

func TestCycleForIssueAutomationUsesStateAndDueDate(t *testing.T) {
	location, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		t.Fatal(err)
	}
	m := &mem{
		Workspace: workspaceFile{
			Timezone: "Asia/Tokyo",
			CycleSettings: &CycleSettings{
				DurationDays:        14,
				StartDay:            "monday",
				AutoAddActiveIssues: true,
			},
		},
		Cycles: []Cycle{
			{ID: 1, Number: 1, StartsAt: "2026-09-21T00:00:00+09:00", EndsAt: "2026-10-05T00:00:00+09:00", Status: "active"},
			{ID: 2, Number: 2, StartsAt: "2026-10-05T00:00:00+09:00", EndsAt: "2026-10-19T00:00:00+09:00", Status: "upcoming"},
		},
	}
	now := time.Date(2026, time.September, 29, 10, 0, 0, 0, location)

	if got := cycleForIssueAutomation(m, Issue{Status: "backlog"}, now); got == nil || got.Number != 1 {
		t.Fatalf("unstarted issue cycle = %#v, want current cycle 1", got)
	}
	dueDate := "2026-10-07"
	if got := cycleForIssueAutomation(m, Issue{Status: "todo", DueDate: &dueDate}, now); got == nil || got.Number != 2 {
		t.Fatalf("due date issue cycle = %#v, want matching upcoming cycle 2", got)
	}
	if got := cycleForIssueAutomation(m, Issue{Status: "done"}, now); got != nil {
		t.Fatalf("completed issue was added with completed automation disabled: %#v", got)
	}
	if got := cycleForIssueAutomation(m, Issue{Status: "canceled"}, now); got != nil {
		t.Fatalf("canceled issue was added automatically: %#v", got)
	}

	m.Workspace.CycleSettings.AutoAddActiveIssues = false
	if got := cycleForIssueAutomation(m, Issue{Status: "backlog"}, now); got != nil {
		t.Fatalf("active issue was added with automation disabled: %#v", got)
	}
	m.Workspace.CycleSettings.AutoAddCompletedIssues = true
	if got := cycleForIssueAutomation(m, Issue{Status: "done"}, now); got == nil || got.Number != 1 {
		t.Fatalf("completed issue cycle = %#v, want current cycle 1", got)
	}
}

func TestCycleForIssueAutomationUsesNextCycleDuringCooldown(t *testing.T) {
	now := time.Date(2026, time.October, 2, 10, 0, 0, 0, time.UTC)
	m := &mem{
		Workspace: workspaceFile{
			Timezone: "UTC",
			CycleSettings: &CycleSettings{
				DurationDays:           7,
				CooldownDays:           2,
				StartDay:               "monday",
				AutoAddActiveIssues:    true,
				AutoAddCompletedIssues: true,
			},
		},
		Cycles: []Cycle{
			{ID: 1, Number: 1, StartsAt: "2026-09-21T00:00:00Z", EndsAt: "2026-10-01T00:00:00Z", Status: "completed"},
			{ID: 2, Number: 2, StartsAt: "2026-10-03T00:00:00Z", EndsAt: "2026-10-10T00:00:00Z", Status: "upcoming"},
		},
	}
	if got := cycleForIssueAutomation(m, Issue{Status: "in_progress"}, now); got == nil || got.Number != 2 {
		t.Fatalf("cooldown issue cycle = %#v, want next cycle 2", got)
	}
	m.Workspace.CycleSettings.CooldownDays = 0
	if got := cycleForIssueAutomation(m, Issue{Status: "in_progress"}, now); got != nil {
		t.Fatalf("issue was added between cycles without cooldown: %#v", got)
	}
}

func TestIssueCycleAutomationOnCreateAndUpdate(t *testing.T) {
	s := openTest(t)
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	current, err := s.CreateCycle(today.AddDate(0, 0, -7).Format(time.RFC3339), today.AddDate(0, 0, 7).Format(time.RFC3339), "active")
	if err != nil {
		t.Fatal(err)
	}
	future, err := s.CreateCycle(today.AddDate(0, 0, 7).Format(time.RFC3339), today.AddDate(0, 0, 14).Format(time.RFC3339), "upcoming")
	if err != nil {
		t.Fatal(err)
	}

	issue, err := s.CreateIssue(CreateIssueInput{Title: "existing issue"})
	if err != nil {
		t.Fatal(err)
	}
	statusIssue, err := s.CreateIssue(CreateIssueInput{Title: "issue to start"})
	if err != nil {
		t.Fatal(err)
	}
	settings := CycleSettings{DurationDays: 7, StartDay: "monday"}
	if _, err := s.UpdateWorkspace(nil, nil, nil, nil, nil, nil, &settings, nil); err != nil {
		t.Fatal(err)
	}
	dueDate := today.AddDate(0, 0, 9).Format("2006-01-02")
	dueDatePatch := &dueDate
	updated, err := s.UpdateIssue(issue.Identifier, PatchIssueInput{DueDate: &dueDatePatch})
	if err != nil {
		t.Fatal(err)
	}
	if updated.CycleID != nil {
		t.Fatalf("due date issue was added while automation is disabled: %#v", updated.CycleID)
	}

	settings.AutoAddActiveIssues = true
	if _, err := s.UpdateWorkspace(nil, nil, nil, nil, nil, nil, &settings, nil); err != nil {
		t.Fatal(err)
	}
	var clearDueDate *string
	clearDueDatePatch := &clearDueDate
	updated, err = s.UpdateIssue(issue.Identifier, PatchIssueInput{DueDate: clearDueDatePatch})
	if err != nil {
		t.Fatal(err)
	}
	if updated.CycleID != nil {
		t.Fatalf("clearing a due date added the issue to a cycle: %#v", updated.CycleID)
	}
	updated, err = s.UpdateIssue(issue.Identifier, PatchIssueInput{DueDate: &dueDatePatch})
	if err != nil {
		t.Fatal(err)
	}
	if updated.CycleID == nil || *updated.CycleID != future.ID || updated.CycleNumber == nil || *updated.CycleNumber != future.Number || updated.CycleAddedAt == nil {
		t.Fatalf("due date issue was not added to its matching cycle: %#v", updated)
	}
	startedStatus := "in_progress"
	started, err := s.UpdateIssue(statusIssue.Identifier, PatchIssueInput{Status: &startedStatus})
	if err != nil {
		t.Fatal(err)
	}
	if started.CycleID == nil || *started.CycleID != current.ID {
		t.Fatalf("started issue cycle = %#v, want current cycle %d", started.CycleID, current.ID)
	}

	active, err := s.CreateIssue(CreateIssueInput{Title: "unstarted issue"})
	if err != nil {
		t.Fatal(err)
	}
	if active.CycleID == nil || *active.CycleID != current.ID {
		t.Fatalf("new active issue cycle = %#v, want current cycle %d", active.CycleID, current.ID)
	}
	manual, err := s.CreateIssue(CreateIssueInput{Title: "manual cycle issue", CycleID: &future.ID})
	if err != nil {
		t.Fatal(err)
	}
	if manual.CycleID == nil || *manual.CycleID != future.ID {
		t.Fatalf("manual cycle assignment was changed: %#v", manual.CycleID)
	}

	doneSettings := settings
	doneSettings.AutoAddActiveIssues = false
	doneSettings.AutoAddCompletedIssues = true
	if _, err := s.UpdateWorkspace(nil, nil, nil, nil, nil, nil, &doneSettings, nil); err != nil {
		t.Fatal(err)
	}
	done, err := s.CreateIssue(CreateIssueInput{Title: "completed issue", Status: "done"})
	if err != nil {
		t.Fatal(err)
	}
	if done.CycleID == nil || *done.CycleID != current.ID {
		t.Fatalf("new completed issue cycle = %#v, want current cycle %d", done.CycleID, current.ID)
	}
}
