package store

import (
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/yashikota/kotowari/internal/domain"
)

var projectStatusCategories = map[string]struct{}{
	"backlog": {}, "planned": {}, "started": {}, "completed": {}, "canceled": {},
}

func DefaultProjectWorkflowStatuses() []ProjectWorkflowStatus {
	return []ProjectWorkflowStatus{
		{ID: "backlog", Name: "Backlog", Category: "backlog"},
		{ID: "planned", Name: "Planned", Category: "planned"},
		{ID: "started", Name: "In Progress", Category: "started"},
		{ID: "completed", Name: "Completed", Category: "completed"},
		{ID: "canceled", Name: "Canceled", Category: "canceled"},
	}
}

func projectWorkflowStatuses(ws workspaceFile) []ProjectWorkflowStatus {
	if len(ws.ProjectStatuses) == 0 {
		return DefaultProjectWorkflowStatuses()
	}
	statuses := append([]ProjectWorkflowStatus{}, ws.ProjectStatuses...)
	for _, status := range DefaultProjectWorkflowStatuses() {
		if !containsProjectWorkflowStatus(statuses, status.ID) {
			statuses = append(statuses, status)
		}
	}
	categoryOrder := map[string]int{"backlog": 0, "planned": 1, "started": 2, "completed": 3, "canceled": 4}
	sort.SliceStable(statuses, func(i, j int) bool {
		return categoryOrder[statuses[i].Category] < categoryOrder[statuses[j].Category]
	})
	return statuses
}

func containsProjectWorkflowStatus(statuses []ProjectWorkflowStatus, id string) bool {
	for _, status := range statuses {
		if status.ID == id {
			return true
		}
	}
	return false
}

func (s *Store) ProjectWorkflowStatuses() ([]ProjectWorkflowStatus, error) {
	var statuses []ProjectWorkflowStatus
	err := s.snapshot(func(m *mem) error {
		statuses = projectWorkflowStatuses(m.Workspace)
		return nil
	})
	return statuses, err
}

func (s *Store) UpdateProjectWorkflowStatuses(statuses []ProjectWorkflowStatus) ([]ProjectWorkflowStatus, error) {
	var out []ProjectWorkflowStatus
	err := s.mutate(func(m *mem) error {
		for i := range statuses {
			statuses[i].ID = strings.TrimSpace(statuses[i].ID)
			statuses[i].Name = strings.TrimSpace(statuses[i].Name)
			statuses[i].Category = strings.TrimSpace(statuses[i].Category)
			statuses[i].Description = strings.TrimSpace(statuses[i].Description)
		}
		if err := validateProjectWorkflowStatuses(statuses); err != nil {
			return err
		}
		next := make(map[string]struct{}, len(statuses))
		for _, status := range statuses {
			next[status.ID] = struct{}{}
		}
		for _, existing := range projectWorkflowStatuses(m.Workspace) {
			if _, ok := next[existing.ID]; ok {
				continue
			}
			if isDefaultProjectWorkflowStatus(existing.ID) {
				return validationf("default project statuses cannot be removed")
			}
			for _, project := range m.Projects {
				if project.WorkflowStatus == existing.ID {
					return errf(ErrConflict, "status %q is used by project %s", existing.Name, project.Slug)
				}
			}
			for _, view := range m.Views {
				if view.ProjectStatus != nil && *view.ProjectStatus == existing.ID {
					return errf(ErrConflict, "status %q is used by view %s", existing.Name, view.Name)
				}
			}
		}
		m.Workspace.ProjectStatuses = append([]ProjectWorkflowStatus{}, statuses...)
		m.bump(domain.Now())
		out = projectWorkflowStatuses(m.Workspace)
		return nil
	})
	return out, err
}

func validateProjectWorkflowStatuses(statuses []ProjectWorkflowStatus) error {
	defaults := DefaultProjectWorkflowStatuses()
	if len(statuses) < len(defaults) || len(statuses) > 50 {
		return validationf("project workflow must contain all default statuses and at most 50 total statuses")
	}
	byID := make(map[string]ProjectWorkflowStatus, len(statuses))
	for _, status := range statuses {
		if !isDefaultProjectWorkflowStatus(status.ID) && !domain.ValidSlug(status.ID) {
			return validationf("invalid project workflow status id %q", status.ID)
		}
		if _, exists := byID[status.ID]; exists {
			return validationf("duplicate project workflow status id %q", status.ID)
		}
		if strings.TrimSpace(status.Name) == "" || utf8.RuneCountInString(strings.TrimSpace(status.Name)) > 48 {
			return validationf("project workflow status name must contain 1 to 48 characters")
		}
		if utf8.RuneCountInString(status.Description) > 200 {
			return validationf("project workflow status description must contain at most 200 characters")
		}
		if _, ok := projectStatusCategories[status.Category]; !ok {
			return validationf("invalid project workflow status category %q", status.Category)
		}
		byID[status.ID] = status
	}
	for _, status := range defaults {
		configured, ok := byID[status.ID]
		if !ok || configured.Category != status.Category {
			return validationf("default project status %q is required in its original category", status.ID)
		}
	}
	return nil
}

func isDefaultProjectWorkflowStatus(id string) bool {
	for _, status := range DefaultProjectWorkflowStatuses() {
		if status.ID == id {
			return true
		}
	}
	return false
}

func projectWorkflowStatusByID(ws workspaceFile, id string) (ProjectWorkflowStatus, bool) {
	for _, status := range projectWorkflowStatuses(ws) {
		if status.ID == id {
			return status, true
		}
	}
	return ProjectWorkflowStatus{}, false
}

func resolveProjectWorkflowStatus(ws workspaceFile, category, workflowStatus string) (ProjectWorkflowStatus, bool) {
	requested := strings.TrimSpace(workflowStatus)
	if requested != "" {
		if status, ok := projectWorkflowStatusByID(ws, requested); ok {
			return status, true
		}
		return ProjectWorkflowStatus{}, false
	}
	if category == "" {
		category = "planned"
	}
	if status, ok := projectWorkflowStatusByID(ws, category); ok {
		return status, true
	}
	for _, status := range projectWorkflowStatuses(ws) {
		if status.Category == category {
			return status, true
		}
	}
	return ProjectWorkflowStatus{}, false
}

func normalizeProjectWorkflowStatus(project Project, ws workspaceFile) Project {
	if project.WorkflowStatus == "" {
		if status, ok := resolveProjectWorkflowStatus(ws, project.Status, ""); ok {
			project.WorkflowStatus = status.ID
		}
	}
	return project
}
