package store

import "testing"

func TestIssueAutomationClosesParentWhenLastSubIssueCloses(t *testing.T) {
	s := openTest(t)
	settings := IssueAutomationSettings{AutoCloseParentIssues: true}
	if _, err := s.UpdateWorkspace(UpdateWorkspaceInput{IssueAutomationSettings: &settings}); err != nil {
		t.Fatal(err)
	}
	grandparent, err := s.CreateIssue(CreateIssueInput{Title: "grandparent"})
	if err != nil {
		t.Fatal(err)
	}
	grandparentID := grandparent.ID
	parent, err := s.CreateIssue(CreateIssueInput{Title: "parent", ParentID: &grandparentID})
	if err != nil {
		t.Fatal(err)
	}
	parentID := parent.ID
	firstChild, err := s.CreateIssue(CreateIssueInput{Title: "first child", ParentID: &parentID})
	if err != nil {
		t.Fatal(err)
	}
	secondChild, err := s.CreateIssue(CreateIssueInput{Title: "second child", ParentID: &parentID})
	if err != nil {
		t.Fatal(err)
	}

	completed := "done"
	if _, err := s.UpdateIssue(firstChild.Identifier, PatchIssueInput{Status: &completed}); err != nil {
		t.Fatal(err)
	}
	stillOpen, err := s.GetIssue(parent.Identifier)
	if err != nil || stillOpen.Status == "done" {
		t.Fatalf("parent closed before its last sub-issue: %#v, %v", stillOpen, err)
	}

	canceled := "canceled"
	if _, err := s.UpdateIssue(secondChild.Identifier, PatchIssueInput{Status: &canceled}); err != nil {
		t.Fatal(err)
	}
	parent, err = s.GetIssue(parent.Identifier)
	if err != nil || parent.Status != "done" || parent.CompletedAt == nil {
		t.Fatalf("parent was not closed after all sub-issues closed: %#v, %v", parent, err)
	}
	grandparent, err = s.GetIssue(grandparent.Identifier)
	if err != nil || grandparent.Status != "done" {
		t.Fatalf("parent close did not propagate to the grandparent: %#v, %v", grandparent, err)
	}
	activities, err := s.ListActivities(parent.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	statusChanges := 0
	for _, activity := range activities {
		if activity.Action == "status_changed" {
			statusChanges++
		}
	}
	if statusChanges != 1 {
		t.Fatalf("parent status change activities = %d, want 1: %#v", statusChanges, activities)
	}
}

func TestIssueAutomationClosesOpenSubIssuesWithTheirParent(t *testing.T) {
	s := openTest(t)
	settings := IssueAutomationSettings{AutoCloseSubIssues: true}
	if _, err := s.UpdateWorkspace(UpdateWorkspaceInput{IssueAutomationSettings: &settings}); err != nil {
		t.Fatal(err)
	}
	parent, err := s.CreateIssue(CreateIssueInput{Title: "parent"})
	if err != nil {
		t.Fatal(err)
	}
	parentID := parent.ID
	child, err := s.CreateIssue(CreateIssueInput{Title: "child", ParentID: &parentID})
	if err != nil {
		t.Fatal(err)
	}
	childID := child.ID
	grandchild, err := s.CreateIssue(CreateIssueInput{Title: "grandchild", ParentID: &childID})
	if err != nil {
		t.Fatal(err)
	}
	archivedChild, err := s.CreateIssue(CreateIssueInput{Title: "archived child", ParentID: &parentID})
	if err != nil {
		t.Fatal(err)
	}
	archived := true
	if _, err := s.UpdateIssue(archivedChild.Identifier, PatchIssueInput{Archived: &archived}); err != nil {
		t.Fatal(err)
	}

	completed := "done"
	if _, err := s.UpdateIssue(parent.Identifier, PatchIssueInput{Status: &completed}); err != nil {
		t.Fatal(err)
	}
	for _, identifier := range []string{child.Identifier, grandchild.Identifier} {
		got, err := s.GetIssue(identifier)
		if err != nil || got.Status != "done" {
			t.Fatalf("sub-issue %s was not closed with its parent: %#v, %v", identifier, got, err)
		}
	}
	archivedResult, err := s.GetIssue(archivedChild.Identifier)
	if err != nil || archivedResult.Status == "done" || archivedResult.ArchivedAt == nil {
		t.Fatalf("archived sub-issue was unexpectedly changed: %#v, %v", archivedResult, err)
	}
}

func TestIssueCloseAutomationDefaultsOff(t *testing.T) {
	s := openTest(t)
	parent, err := s.CreateIssue(CreateIssueInput{Title: "parent"})
	if err != nil {
		t.Fatal(err)
	}
	parentID := parent.ID
	child, err := s.CreateIssue(CreateIssueInput{Title: "child", ParentID: &parentID})
	if err != nil {
		t.Fatal(err)
	}
	completed := "done"
	if _, err := s.UpdateIssue(child.Identifier, PatchIssueInput{Status: &completed}); err != nil {
		t.Fatal(err)
	}
	parent, err = s.GetIssue(parent.Identifier)
	if err != nil || parent.Status == "done" {
		t.Fatalf("default settings automatically closed the parent: %#v, %v", parent, err)
	}
}

func TestIssueAutomationSettingsPersist(t *testing.T) {
	s := openTest(t)
	want := IssueAutomationSettings{
		AutoCloseParentIssues:  true,
		AutoCloseSubIssues:     true,
		StatusProgressionOrder: "first",
	}
	if _, err := s.UpdateWorkspace(UpdateWorkspaceInput{IssueAutomationSettings: &want}); err != nil {
		t.Fatal(err)
	}
	reopened, err := Open(s.root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = reopened.Close() })
	workspace, err := reopened.Workspace()
	if err != nil {
		t.Fatal(err)
	}
	if workspace.IssueAutomationSettings != want {
		t.Fatalf("persisted issue automation settings = %#v, want %#v", workspace.IssueAutomationSettings, want)
	}
}
