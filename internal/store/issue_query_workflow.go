package store

func matchesIssueWorkflowFilters(issue Issue, filter IssueFilter) bool {
	if len(filter.Statuses) > 0 {
		matches := false
		for _, status := range filter.Statuses {
			if issue.Status == status || issue.WorkflowStatus == status {
				matches = true
				break
			}
		}
		if !matches {
			return false
		}
	}
	if filter.Assignee == "none" && issue.Assignee != "" ||
		filter.Assignee != "" && filter.Assignee != "none" && issue.Assignee != filter.Assignee {
		return false
	}
	if filter.Archived == nil && issue.ArchivedAt != nil {
		return false
	}
	if filter.Archived != nil && (*filter.Archived != (issue.ArchivedAt != nil)) {
		return false
	}
	if filter.Status != "" && issue.Status != filter.Status && issue.WorkflowStatus != filter.Status {
		return false
	}
	return true
}
