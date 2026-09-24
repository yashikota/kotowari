package store

import (
	"bytes"
	"errors"
	"testing"
)

func TestIssueWorkflowStatusesRoundTripAndProtectUsedStates(t *testing.T) {
	s := openTest(t)
	defaults, err := s.IssueWorkflowStatuses()
	if err != nil || len(defaults) != 6 {
		t.Fatalf("default workflow statuses = %#v, error %v", defaults, err)
	}
	duplicate, err := s.CreateIssue(CreateIssueInput{
		Title: "Already reported", Status: "canceled", WorkflowStatus: "duplicate",
	})
	if err != nil || duplicate.Status != "canceled" || duplicate.WorkflowStatus != "duplicate" {
		t.Fatalf("duplicate status should remain a distinct workflow state in the canceled category: %#v, error %v", duplicate, err)
	}

	configured := append(defaults, IssueWorkflowStatus{
		ID: "in-review", Name: "In Review", Category: "in_progress", Description: "Pull request is being reviewed",
	})
	if _, err := s.UpdateIssueWorkflowStatuses(configured); err != nil {
		t.Fatal(err)
	}
	issue, err := s.CreateIssue(CreateIssueInput{
		Title: "Review this change", Status: "in_progress", WorkflowStatus: "in-review",
	})
	if err != nil {
		t.Fatal(err)
	}
	if issue.Status != "in_progress" || issue.WorkflowStatus != "in-review" {
		t.Fatalf("workflow state was not resolved into a category: %#v", issue)
	}

	filtered, err := s.ListIssues(IssueFilter{Status: "in-review"})
	if err != nil || len(filtered) != 1 || filtered[0].Identifier != issue.Identifier {
		t.Fatalf("custom status filter = %#v, error %v", filtered, err)
	}
	if _, err := s.UpdateIssueWorkflowStatuses(defaults); !errors.Is(err, ErrConflict) {
		t.Fatalf("removing a used state should conflict, got %v", err)
	}

	reopened, err := Open(s.Path())
	if err != nil {
		t.Fatal(err)
	}
	persisted, err := reopened.GetIssue(issue.Identifier)
	if err != nil || persisted.WorkflowStatus != "in-review" {
		t.Fatalf("workflow state persistence = %#v, error %v", persisted, err)
	}

	if _, err := s.UpdateIssueWorkflowStatuses(defaults[1:]); !errors.Is(err, ErrValidation) {
		t.Fatalf("removing a default state should be rejected, got %v", err)
	}
}

func TestIssueWorkflowStatusesAddsDuplicateToOlderWorkspaceSettings(t *testing.T) {
	legacy := DefaultIssueWorkflowStatuses()[:5]
	statuses := issueWorkflowStatuses(workspaceFile{IssueStatuses: legacy})
	if len(statuses) != 6 || statuses[5].ID != "duplicate" {
		t.Fatalf("legacy workflow statuses were not upgraded: %#v", statuses)
	}
}

func TestChangingWorkflowStateWithinCategoryRecordsTransition(t *testing.T) {
	s := openTest(t)
	statuses, err := s.IssueWorkflowStatuses()
	if err != nil {
		t.Fatal(err)
	}
	statuses = append(statuses, IssueWorkflowStatus{ID: "in-review", Name: "In Review", Category: "in_progress"})
	if _, err := s.UpdateIssueWorkflowStatuses(statuses); err != nil {
		t.Fatal(err)
	}
	issue, err := s.CreateIssue(CreateIssueInput{Title: "Review me", Status: "in_progress"})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := s.UpdateIssue(issue.Identifier, PatchIssueInput{WorkflowStatus: stringPtr("in-review")})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Status != "in_progress" || updated.WorkflowStatus != "in-review" {
		t.Fatalf("same-category transition was lost: before %#v after %#v", issue, updated)
	}
	activities, err := s.ListActivities(issue.Identifier)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, activity := range activities {
		if activity.Action == "status_changed" {
			found = true
			if !bytes.Contains(activity.Payload, []byte(`"to":"in-review"`)) {
				t.Fatalf("status activity target = %s", activity.Payload)
			}
		}
	}
	if !found {
		t.Fatal("workflow status transition activity was not recorded")
	}
}

func stringPtr(value string) *string { return &value }
