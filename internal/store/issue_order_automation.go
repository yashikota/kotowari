package store

var issueStatusCategoryOrder = map[string]int{
	"backlog":     0,
	"todo":        1,
	"in_progress": 2,
	"done":        3,
	"canceled":    4,
}

func issueStatusProgressionDirection(m *mem, fromID, toID string) int {
	if fromID == toID {
		return 0
	}
	from, fromOK := workflowStatusByID(m.Workspace, fromID)
	to, toOK := workflowStatusByID(m.Workspace, toID)
	if !fromOK || !toOK {
		return 0
	}
	fromCategoryOrder, fromCategoryOK := issueStatusCategoryOrder[from.Category]
	toCategoryOrder, toCategoryOK := issueStatusCategoryOrder[to.Category]
	if !fromCategoryOK || !toCategoryOK {
		return 0
	}
	if fromCategoryOrder < toCategoryOrder {
		return 1
	}
	if fromCategoryOrder > toCategoryOrder {
		return -1
	}

	fromOrder, toOrder := -1, -1
	for index, status := range issueWorkflowStatuses(m.Workspace) {
		if status.ID == fromID {
			fromOrder = index
		}
		if status.ID == toID {
			toOrder = index
		}
	}
	if fromOrder < toOrder {
		return 1
	}
	if fromOrder > toOrder {
		return -1
	}
	return 0
}

func applyStatusProgressionOrder(m *mem, issue *Issue, fromWorkflowStatus string) {
	settings := normalizedIssueAutomationSettings(m.Workspace.IssueAutomationSettings)
	direction := issueStatusProgressionDirection(m, fromWorkflowStatus, issue.WorkflowStatus)
	if direction == 0 {
		return
	}
	placement := settings.StatusProgressionOrder
	if direction < 0 {
		if placement == "no_action" {
			return
		}
		placement = "first"
	}
	if placement == "no_action" {
		return
	}

	found := false
	first, last := 0.0, 0.0
	for _, candidate := range m.Issues {
		if candidate.ID == issue.ID || candidate.ArchivedAt != nil || candidate.WorkflowStatus != issue.WorkflowStatus {
			continue
		}
		if !found || candidate.SortOrder < first {
			first = candidate.SortOrder
		}
		if !found || candidate.SortOrder > last {
			last = candidate.SortOrder
		}
		found = true
	}
	if !found {
		return
	}
	if placement == "last" {
		issue.SortOrder = last + 1
		return
	}
	issue.SortOrder = first - 1
}
