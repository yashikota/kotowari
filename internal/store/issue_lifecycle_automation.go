package store

import (
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

const issueAutomationCheckInterval = time.Hour

// ProcessIssueAutomations applies the workspace's time-based issue rules. The
// caller can run this during the app's revision poll; the store throttles checks
// so a live UI does not scan the workspace on every poll.
func (s *Store) ProcessIssueAutomations() error {
	s.issueAutomationMu.Lock()
	defer s.issueAutomationMu.Unlock()

	now := time.Now().UTC()
	if !s.lastIssueAutomation.IsZero() && now.Sub(s.lastIssueAutomation) < issueAutomationCheckInterval {
		return nil
	}
	s.lastIssueAutomation = now

	return s.mutate(func(m *mem) error {
		settings := normalizedIssueAutomationSettings(m.Workspace.IssueAutomationSettings)
		if settings.AutoCloseStaleIssuesAfterMonths == 0 && settings.AutoArchiveClosedIssuesAfterMonths == 0 {
			return nil
		}

		nowStamp := now.Format(time.RFC3339)
		staleCutoff := now.AddDate(0, -settings.AutoCloseStaleIssuesAfterMonths, 0)
		archiveCutoff := now.AddDate(0, -settings.AutoArchiveClosedIssuesAfterMonths, 0)
		changed := false
		for index := range m.Issues {
			issue := m.Issues[index]
			if issue.ArchivedAt != nil {
				continue
			}

			if settings.AutoCloseStaleIssuesAfterMonths > 0 && !issueIsClosed(issue) {
				lastActivity := latestIssueActivityTime(m, issue)
				if !lastActivity.IsZero() && !lastActivity.After(staleCutoff) {
					if status, ok := resolveIssueWorkflowStatus(m.Workspace, "canceled", ""); ok {
						oldStatus, oldWorkflowStatus := issue.Status, issue.WorkflowStatus
						issue.Status = status.Category
						issue.WorkflowStatus = status.ID
						issue.StatusChangedAt = nowStamp
						issue.CompletedAt = completedAt(issue.Status, nowStamp, issue.CompletedAt)
						issue.UpdatedAt = nowStamp
						applyStatusProgressionOrder(m, &issue, oldWorkflowStatus)
						m.Issues[index] = issue
						if issue.Status != oldStatus || issue.WorkflowStatus != oldWorkflowStatus {
							addActivity(m, "issue", issue.ID, "status_changed", map[string]any{"from": oldWorkflowStatus, "to": issue.WorkflowStatus}, nowStamp)
							if issue.Status != oldStatus && (issue.Status == "done" || issue.Status == "canceled") {
								addCycleNotification(m, issue.CycleID, issue, "cycle_issue_completed", nowStamp)
							}
							applyIssueCloseAutomation(m, issue.ID, nowStamp)
							changed = true
						}
					}
				}
			}

			issue = m.Issues[index]
			if settings.AutoArchiveClosedIssuesAfterMonths == 0 || !issueIsClosed(issue) {
				continue
			}
			completedAt := issueCompletedAt(issue)
			if completedAt.IsZero() || completedAt.After(archiveCutoff) {
				continue
			}
			issue.ArchivedAt = &nowStamp
			issue.UpdatedAt = nowStamp
			m.Issues[index] = issue
			addActivity(m, "issue", issue.ID, "archived", map[string]any{}, nowStamp)
			changed = true
		}

		if changed {
			m.bump(domain.Now())
		}
		return nil
	})
}

func latestIssueActivityTime(m *mem, issue Issue) time.Time {
	latest := parseIssueAutomationTime(issue.UpdatedAt)
	if created := parseIssueAutomationTime(issue.CreatedAt); created.After(latest) {
		latest = created
	}
	for _, activity := range m.Activities {
		if activity.EntityType != "issue" || activity.EntityID != issue.ID {
			continue
		}
		if created := parseIssueAutomationTime(activity.CreatedAt); created.After(latest) {
			latest = created
		}
	}
	for _, comment := range m.Comments[issue.Identifier] {
		if created := parseIssueAutomationTime(comment.CreatedAt); created.After(latest) {
			latest = created
		}
		if updated := parseIssueAutomationTime(comment.UpdatedAt); updated.After(latest) {
			latest = updated
		}
	}
	return latest
}

func issueCompletedAt(issue Issue) time.Time {
	for _, candidate := range []string{valueOrEmpty(issue.CompletedAt), issue.StatusChangedAt, issue.UpdatedAt} {
		if parsed := parseIssueAutomationTime(candidate); !parsed.IsZero() {
			return parsed
		}
	}
	return time.Time{}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func parseIssueAutomationTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}
	}
	return parsed
}
