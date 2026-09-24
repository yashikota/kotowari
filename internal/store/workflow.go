package store

import (
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

var issueStatusCategories = map[string]struct{}{
	"backlog": {}, "todo": {}, "in_progress": {}, "done": {}, "canceled": {},
}

func issueWorkflowStatuses(ws workspaceFile) []IssueWorkflowStatus {
	if len(ws.IssueStatuses) == 0 {
		return DefaultIssueWorkflowStatuses()
	}
	statuses := append([]IssueWorkflowStatus{}, ws.IssueStatuses...)
	for _, status := range DefaultIssueWorkflowStatuses() {
		if !containsWorkflowStatus(statuses, status.ID) {
			statuses = append(statuses, status)
		}
	}
	return statuses
}

func containsWorkflowStatus(statuses []IssueWorkflowStatus, id string) bool {
	for _, status := range statuses {
		if status.ID == id {
			return true
		}
	}
	return false
}

func (s *Store) IssueWorkflowStatuses() ([]IssueWorkflowStatus, error) {
	var statuses []IssueWorkflowStatus
	err := s.snapshot(func(m *mem) error {
		statuses = issueWorkflowStatuses(m.Workspace)
		return nil
	})
	return statuses, err
}

func (s *Store) UpdateIssueWorkflowStatuses(statuses []IssueWorkflowStatus) ([]IssueWorkflowStatus, error) {
	var out []IssueWorkflowStatus
	err := s.mutate(func(m *mem) error {
		for i := range statuses {
			statuses[i].ID = strings.TrimSpace(statuses[i].ID)
			statuses[i].Name = strings.TrimSpace(statuses[i].Name)
			statuses[i].Category = strings.TrimSpace(statuses[i].Category)
			statuses[i].Description = strings.TrimSpace(statuses[i].Description)
		}
		if err := validateIssueWorkflowStatuses(statuses); err != nil {
			return err
		}
		next := make(map[string]struct{}, len(statuses))
		for _, status := range statuses {
			next[status.ID] = struct{}{}
		}
		for _, existing := range issueWorkflowStatuses(m.Workspace) {
			if _, ok := next[existing.ID]; ok {
				continue
			}
			if isDefaultIssueWorkflowStatus(existing.ID) {
				return validationf("default issue statuses cannot be removed")
			}
			for _, issue := range m.Issues {
				if issue.WorkflowStatus == existing.ID {
					return errf(ErrConflict, "status %q is used by issue %s", existing.Name, issue.Identifier)
				}
			}
		}
		m.Workspace.IssueStatuses = append([]IssueWorkflowStatus{}, statuses...)
		m.bump(domain.Now())
		out = issueWorkflowStatuses(m.Workspace)
		return nil
	})
	return out, err
}

func validateIssueWorkflowStatuses(statuses []IssueWorkflowStatus) error {
	if len(statuses) < len(DefaultIssueWorkflowStatuses()) || len(statuses) > 50 {
		return validationf("workflow must contain all default statuses and at most 50 total statuses")
	}
	byID := make(map[string]IssueWorkflowStatus, len(statuses))
	for _, status := range statuses {
		status.ID = strings.TrimSpace(status.ID)
		if !validWorkflowStatusID(status.ID) {
			return validationf("invalid workflow status id %q", status.ID)
		}
		if _, exists := byID[status.ID]; exists {
			return validationf("duplicate workflow status id %q", status.ID)
		}
		if strings.TrimSpace(status.Name) == "" || utf8.RuneCountInString(strings.TrimSpace(status.Name)) > 48 {
			return validationf("workflow status name must contain 1 to 48 characters")
		}
		if utf8.RuneCountInString(status.Description) > 200 {
			return validationf("workflow status description must contain at most 200 characters")
		}
		if _, ok := issueStatusCategories[status.Category]; !ok {
			return validationf("invalid workflow status category %q", status.Category)
		}
		byID[status.ID] = status
	}
	for _, defaultStatus := range DefaultIssueWorkflowStatuses() {
		configured, ok := byID[defaultStatus.ID]
		if !ok || configured.Category != defaultStatus.Category {
			return validationf("default workflow status %q is required in its original category", defaultStatus.ID)
		}
	}
	return nil
}

func validWorkflowStatusID(id string) bool {
	return isDefaultIssueWorkflowStatus(id) || domain.ValidSlug(id)
}

func isDefaultIssueWorkflowStatus(id string) bool {
	for _, status := range DefaultIssueWorkflowStatuses() {
		if status.ID == id {
			return true
		}
	}
	return false
}

func workflowStatusByID(ws workspaceFile, id string) (IssueWorkflowStatus, bool) {
	for _, status := range issueWorkflowStatuses(ws) {
		if status.ID == id {
			return status, true
		}
	}
	return IssueWorkflowStatus{}, false
}

func resolveIssueWorkflowStatus(ws workspaceFile, status, workflowStatus string) (IssueWorkflowStatus, bool) {
	requested := strings.TrimSpace(workflowStatus)
	if requested == "" {
		requested = strings.TrimSpace(status)
	}
	if state, ok := workflowStatusByID(ws, requested); ok {
		return state, true
	}
	for _, state := range issueWorkflowStatuses(ws) {
		if state.Category == requested {
			return state, true
		}
	}
	return IssueWorkflowStatus{}, false
}
