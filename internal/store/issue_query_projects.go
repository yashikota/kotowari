package store

import "strings"

func matchesIssueProjectFilters(m *mem, issue Issue, filter IssueFilter) bool {
	if filter.ProjectSlug != "" && (issue.ProjectSlug == nil || *issue.ProjectSlug != filter.ProjectSlug) {
		if issue.ProjectID != nil {
			if project, ok := projectByID(m, *issue.ProjectID); !ok || project.Slug != filter.ProjectSlug {
				return false
			}
		} else {
			return false
		}
	}
	if filter.ProjectStatus != "" || filter.ProjectPriority != nil {
		project, found := Project{}, false
		if issue.ProjectID != nil {
			project, found = projectByID(m, *issue.ProjectID)
		}
		if !found && issue.ProjectSlug != nil {
			for _, candidate := range m.Projects {
				if candidate.Slug == *issue.ProjectSlug {
					project, found = candidate, true
					break
				}
			}
		}
		if !found || (filter.ProjectStatus != "" && normalizeProjectWorkflowStatus(project, m.Workspace).WorkflowStatus != filter.ProjectStatus && project.Status != filter.ProjectStatus) ||
			(filter.ProjectPriority != nil && project.Priority != *filter.ProjectPriority) {
			return false
		}
	}
	if len(filter.ProjectLabels) > 0 {
		project, found := Project{}, false
		if issue.ProjectID != nil {
			project, found = projectByID(m, *issue.ProjectID)
		}
		if !found && issue.ProjectSlug != nil {
			project, found = projectBySlug(m, *issue.ProjectSlug)
		}
		if !found {
			return false
		}
		have := make(map[string]struct{}, len(project.Labels))
		for _, name := range project.Labels {
			have[strings.ToLower(name)] = struct{}{}
		}
		matches := true
		for _, name := range filter.ProjectLabels {
			if name == "__none__" {
				if len(have) != 0 {
					matches = false
				}
				continue
			}
			if _, ok := have[strings.ToLower(name)]; !ok {
				matches = false
				break
			}
		}
		if !matches {
			return false
		}
	}
	return true
}
