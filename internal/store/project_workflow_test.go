package store

import (
	"bytes"
	"errors"
	"testing"
)

func TestProjectWorkflowStatusesPersistAndProtectUsedStates(t *testing.T) {
	s := openTest(t)
	defaults, err := s.ProjectWorkflowStatuses()
	if err != nil || len(defaults) != 5 {
		t.Fatalf("default project workflow = %#v, error %v", defaults, err)
	}
	configured := append(defaults, ProjectWorkflowStatus{
		ID: "in-review", Name: "In Review", Category: "started", Description: "Reviewing the release",
	})
	if _, err := s.UpdateProjectWorkflowStatuses(configured); err != nil {
		t.Fatal(err)
	}
	project, err := s.CreateProjectWithWorkflow("Project review", "project-review", "", "", "", "", "started", "in-review", 2, nil, nil, nil)
	if err != nil || project.Status != "started" || project.WorkflowStatus != "in-review" {
		t.Fatalf("custom project workflow state = %#v, error %v", project, err)
	}
	if _, err := s.UpdateProjectWorkflowStatuses(defaults); !errors.Is(err, ErrConflict) {
		t.Fatalf("removing a used state should conflict, got %v", err)
	}
	updated, err := s.UpdateProjectWithWorkflow(project.Slug, nil, nil, nil, nil, nil, nil, stringPtr("completed"), nil, nil, nil, nil, nil)
	if err != nil || updated.Status != "completed" || updated.WorkflowStatus != "completed" || updated.CompletedAt == nil {
		t.Fatalf("project completion transition = %#v, error %v", updated, err)
	}
	reopened, err := Open(s.Path())
	if err != nil {
		t.Fatal(err)
	}
	persisted, err := reopened.GetProject(project.Slug)
	if err != nil || persisted.WorkflowStatus != "completed" {
		t.Fatalf("persisted workflow status = %#v, error %v", persisted, err)
	}
}

func TestProjectWorkflowCustomFilterAndLegacyDefault(t *testing.T) {
	s := openTest(t)
	project, err := s.CreateProjectWithAppearance("Started", "started", "", "", "", "", "started", 0, nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if project.WorkflowStatus != "started" {
		t.Fatalf("default workflow status = %q", project.WorkflowStatus)
	}
	custom := ProjectWorkflowStatus{ID: "ready-for-review", Name: "Ready for review", Category: "started"}
	statuses, _ := s.ProjectWorkflowStatuses()
	statuses = append(statuses, custom)
	if _, err := s.UpdateProjectWorkflowStatuses(statuses); err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateProjectWithWorkflow(project.Slug, nil, nil, nil, nil, nil, nil, stringPtr(custom.ID), nil, nil, nil, nil, nil); err != nil {
		t.Fatal(err)
	}
	projectID := project.ID
	issue, err := s.CreateIssue(CreateIssueInput{Title: "Custom project status filter", ProjectID: &projectID})
	if err != nil {
		t.Fatal(err)
	}
	filtered, err := s.ListIssues(IssueFilter{ProjectStatus: custom.ID})
	if err != nil || len(filtered) != 1 || filtered[0].Identifier != issue.Identifier {
		t.Fatalf("custom project workflow filter = %#v, error %v", filtered, err)
	}
	legacy := project
	legacy.WorkflowStatus = ""
	if normalized := normalizeProjectWorkflowStatus(legacy, workspaceFile{}); normalized.WorkflowStatus != "started" {
		t.Fatalf("legacy project workflow status = %q", normalized.WorkflowStatus)
	}
}

func TestProjectWorkflowDefaultCategoryCannotMoveAndProjectActivityUsesStateIDs(t *testing.T) {
	s := openTest(t)
	statuses, _ := s.ProjectWorkflowStatuses()
	statuses[2].Category = "planned"
	if _, err := s.UpdateProjectWorkflowStatuses(statuses); !errors.Is(err, ErrValidation) {
		t.Fatalf("moving a default category should fail, got %v", err)
	}
	statuses, _ = s.ProjectWorkflowStatuses()
	statuses = append(statuses, ProjectWorkflowStatus{ID: "doing", Name: "Doing", Category: "started"})
	if _, err := s.UpdateProjectWorkflowStatuses(statuses); err != nil {
		t.Fatal(err)
	}
	project, err := s.CreateProjectWithWorkflow("Doing project", "doing-project", "", "", "", "", "started", "doing", 0, nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateProjectWithWorkflow(project.Slug, nil, nil, nil, nil, nil, nil, stringPtr("planned"), nil, nil, nil, nil, nil); err != nil {
		t.Fatal(err)
	}
	items, err := s.ListProjectActivities(project.Slug)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, activity := range items {
		if activity.Action == "status_changed" {
			found = true
			if !bytes.Contains(activity.Payload, []byte(`"from":"doing"`)) || !bytes.Contains(activity.Payload, []byte(`"to":"planned"`)) {
				t.Fatalf("project status activity = %s", activity.Payload)
			}
		}
	}
	if !found {
		t.Fatal("project workflow transition was not recorded")
	}
}
