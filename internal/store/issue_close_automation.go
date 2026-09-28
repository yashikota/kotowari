package store

func applyIssueCloseAutomation(m *mem, issueID int64, now string) {
	settings := normalizedIssueAutomationSettings(m.Workspace.IssueAutomationSettings)
	if !settings.AutoCloseParentIssues && !settings.AutoCloseSubIssues {
		return
	}

	queue := []int64{issueID}
	queued := map[int64]struct{}{issueID: {}}
	for len(queue) > 0 {
		currentID := queue[0]
		queue = queue[1:]
		currentIndex := indexIssueByID(m, currentID)
		if currentIndex < 0 {
			continue
		}
		current := m.Issues[currentIndex]
		if current.ArchivedAt != nil || !issueIsClosed(current) {
			continue
		}

		if settings.AutoCloseSubIssues {
			var childIDs []int64
			for _, child := range m.Issues {
				if child.ParentID == nil || *child.ParentID != current.ID || child.ArchivedAt != nil || issueIsClosed(child) {
					continue
				}
				childIDs = append(childIDs, child.ID)
			}
			for _, childID := range childIDs {
				if closeIssueForAutomation(m, childID, now) {
					queue = queueIssueAutomation(queue, queued, childID)
				}
			}
		}

		if !settings.AutoCloseParentIssues || current.ParentID == nil {
			continue
		}
		parentIndex := indexIssueByID(m, *current.ParentID)
		if parentIndex < 0 {
			continue
		}
		parent := m.Issues[parentIndex]
		if parent.ArchivedAt != nil || issueIsClosed(parent) {
			continue
		}
		hasChildren := false
		allChildrenClosed := true
		for _, child := range m.Issues {
			if child.ParentID == nil || *child.ParentID != parent.ID {
				continue
			}
			hasChildren = true
			if child.ArchivedAt == nil && !issueIsClosed(child) {
				allChildrenClosed = false
				break
			}
		}
		if hasChildren && allChildrenClosed && closeIssueForAutomation(m, parent.ID, now) {
			queue = queueIssueAutomation(queue, queued, parent.ID)
		}
	}
}

func queueIssueAutomation(queue []int64, queued map[int64]struct{}, issueID int64) []int64 {
	if _, exists := queued[issueID]; exists {
		return queue
	}
	queued[issueID] = struct{}{}
	return append(queue, issueID)
}

func closeIssueForAutomation(m *mem, issueID int64, now string) bool {
	index := indexIssueByID(m, issueID)
	if index < 0 || m.Issues[index].ArchivedAt != nil || issueIsClosed(m.Issues[index]) {
		return false
	}
	status, ok := resolveIssueWorkflowStatus(m.Workspace, "done", "")
	if !ok {
		return false
	}

	issue := m.Issues[index]
	oldStatus, oldWorkflowStatus := issue.Status, issue.WorkflowStatus
	issue.Status = status.Category
	issue.WorkflowStatus = status.ID
	issue.StatusChangedAt = now
	issue.CompletedAt = completedAt(issue.Status, now, issue.CompletedAt)
	issue.UpdatedAt = now
	applyStatusProgressionOrder(m, &issue, oldWorkflowStatus)
	m.Issues[index] = issue
	if issue.WorkflowStatus != oldWorkflowStatus {
		addActivity(m, "issue", issue.ID, "status_changed", map[string]any{"from": oldWorkflowStatus, "to": issue.WorkflowStatus}, now)
	}
	if issue.Status != oldStatus && (issue.Status == "done" || issue.Status == "canceled") {
		addCycleNotification(m, issue.CycleID, issue, "cycle_issue_completed", now)
	}
	return true
}

func issueIsClosed(issue Issue) bool {
	return issue.Status == "done" || issue.Status == "canceled"
}

func indexIssueByID(m *mem, id int64) int {
	for index, issue := range m.Issues {
		if issue.ID == id {
			return index
		}
	}
	return -1
}
