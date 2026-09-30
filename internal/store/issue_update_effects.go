package store

import (
	"fmt"
	"time"
)

type issueUpdateSnapshot struct {
	status, workflowStatus, assignee, typeName string
	estimate                                   *int
	favorite, archived                         bool
	reminderAt, dueDate                        *string
	milestoneID, cycleID                       *int64
	milestoneName                              *string
}

func snapshotIssueUpdate(issue Issue) issueUpdateSnapshot {
	return issueUpdateSnapshot{
		status: issue.Status, workflowStatus: issue.WorkflowStatus, assignee: issue.Assignee, typeName: issue.Type,
		estimate: issue.Estimate, favorite: issue.IsFavorite, archived: issue.ArchivedAt != nil,
		reminderAt: issue.ReminderAt, dueDate: issue.DueDate, milestoneID: issue.MilestoneID,
		milestoneName: issue.MilestoneName, cycleID: issue.CycleID,
	}
}

func applyIssueUpdateTransitions(m *mem, iss *Issue, in PatchIssueInput, before issueUpdateSnapshot, now string) {
	automationNow, _ := time.Parse(time.RFC3339, now)
	if in.Archived != nil && *in.Archived != before.archived {
		if *in.Archived {
			iss.ArchivedAt = &now
		} else {
			iss.ArchivedAt = nil
		}
	}
	if in.CycleID == nil && before.cycleID == nil && iss.CycleID == nil && iss.ArchivedAt == nil &&
		(iss.Status != before.status || iss.WorkflowStatus != before.workflowStatus ||
			(iss.DueDate != nil && !sameString(before.dueDate, iss.DueDate))) {
		autoAssignIssueCycle(m, iss, automationNow)
	}
	if !sameInt64(before.cycleID, iss.CycleID) {
		if iss.CycleID == nil {
			iss.CycleAddedAt = nil
		} else {
			iss.CycleAddedAt = &now
		}
	}
	if iss.Status != before.status || iss.WorkflowStatus != before.workflowStatus {
		iss.StatusChangedAt = now
		if iss.Status == "in_progress" && iss.StartedAt == nil {
			iss.StartedAt = &now
		}
	}
	iss.CompletedAt = completedAt(iss.Status, now, iss.CompletedAt)
	iss.UpdatedAt = now
	if in.LabelIDs != nil {
		iss.Labels = []Label{}
		for _, id := range *in.LabelIDs {
			if l, ok := labelByID(m, id); ok {
				iss.Labels = append(iss.Labels, l)
			}
		}
	}
	if in.SortOrder == nil && iss.WorkflowStatus != before.workflowStatus {
		applyStatusProgressionOrder(m, iss, before.workflowStatus)
	}
}

func recordIssueUpdateActivities(m *mem, iss Issue, in PatchIssueInput, before issueUpdateSnapshot, now string) {
	if iss.WorkflowStatus != before.workflowStatus {
		addActivity(m, "issue", iss.ID, "status_changed", map[string]any{"from": before.workflowStatus, "to": iss.WorkflowStatus}, now)
	}
	if !sameInt64(before.cycleID, iss.CycleID) {
		addActivity(m, "issue", iss.ID, "cycle_changed", map[string]any{
			"from": cycleActivityLabel(m, before.cycleID),
			"to":   cycleActivityLabel(m, iss.CycleID),
		}, now)
		addCycleNotification(m, iss.CycleID, iss, "cycle_issue_added", now)
	}
	if iss.Status != before.status && (iss.Status == "done" || iss.Status == "canceled") {
		addCycleNotification(m, iss.CycleID, iss, "cycle_issue_completed", now)
	}
	if in.Type != nil && *in.Type != before.typeName {
		addActivity(m, "issue", iss.ID, "type_changed", map[string]any{"from": before.typeName, "to": iss.Type}, now)
	}
	if in.Estimate != nil && !sameEstimate(before.estimate, iss.Estimate) {
		addActivity(m, "issue", iss.ID, "estimate_changed", map[string]any{"from": before.estimate, "to": iss.Estimate}, now)
	}
	if before.assignee != iss.Assignee {
		addActivity(m, "issue", iss.ID, "assignee_changed", map[string]any{"from": before.assignee, "to": iss.Assignee}, now)
	}
	if in.IsFavorite != nil && before.favorite != iss.IsFavorite {
		addActivity(m, "issue", iss.ID, "favorite_changed", map[string]any{"favorite": iss.IsFavorite}, now)
	}
	if in.Archived != nil && before.archived != *in.Archived {
		action := "archived"
		if !*in.Archived {
			action = "unarchived"
		}
		addActivity(m, "issue", iss.ID, action, map[string]any{}, now)
	}
	if !sameString(before.reminderAt, iss.ReminderAt) {
		from, to := "", ""
		if before.reminderAt != nil {
			from = *before.reminderAt
		}
		if iss.ReminderAt != nil {
			to = *iss.ReminderAt
		}
		addActivity(m, "issue", iss.ID, "reminder_changed", map[string]any{"from": from, "to": to}, now)
	}
	if !sameInt64(before.milestoneID, iss.MilestoneID) {
		from, to := "", ""
		if before.milestoneName != nil {
			from = *before.milestoneName
		}
		if iss.MilestoneName != nil {
			to = *iss.MilestoneName
		}
		addActivity(m, "issue", iss.ID, "milestone_changed", map[string]any{"from": from, "to": to}, now)
	}
	if iss.Status != before.status || iss.WorkflowStatus != before.workflowStatus {
		applyIssueCloseAutomation(m, iss.ID, now)
	}
}

func cycleActivityLabel(m *mem, id *int64) string {
	if id == nil {
		return ""
	}
	cycle, ok := cycleByID(m, *id)
	if !ok {
		return ""
	}
	if cycle.Name != "" {
		return cycle.Name
	}
	return fmt.Sprintf("Cycle %d", cycle.Number)
}
