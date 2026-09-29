package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func isRestoreOnlyIssuePatch(in PatchIssueInput) bool {
	if in.Archived == nil || *in.Archived {
		return false
	}
	return in.Title == nil && in.Body == nil && in.Status == nil && in.WorkflowStatus == nil && in.Type == nil &&
		in.Priority == nil && in.Estimate == nil && in.ProjectID == nil && in.MilestoneID == nil &&
		in.Assignee == nil && in.CycleID == nil && in.ParentID == nil && in.DueDate == nil && in.ReminderAt == nil &&
		in.LabelIDs == nil && in.SortOrder == nil && in.IsFavorite == nil
}

func (s *Store) UpdateIssue(identifier string, in PatchIssueInput) (Issue, error) {
	var out Issue
	err := s.mutate(func(m *mem) error {
		i := indexIssue(m, identifier)
		if i < 0 {
			return ErrNotFound
		}
		iss := m.Issues[i]
		if iss.ArchivedAt != nil && !isRestoreOnlyIssuePatch(in) {
			return errf(ErrConflict, "issue is archived")
		}
		oldStatus := iss.Status
		oldWorkflowStatus := iss.WorkflowStatus
		oldAssignee := iss.Assignee
		oldType := iss.Type
		oldEstimate := iss.Estimate
		oldFavorite := iss.IsFavorite
		oldArchived := iss.ArchivedAt != nil
		oldReminderAt := iss.ReminderAt
		oldDueDate := iss.DueDate
		oldMilestoneID := iss.MilestoneID
		oldMilestoneName := iss.MilestoneName
		oldCycleID := iss.CycleID
		if in.Title != nil {
			if strings.TrimSpace(*in.Title) == "" {
				return validationf("title required")
			}
			iss.Title = strings.TrimSpace(*in.Title)
		}
		if in.Body != nil {
			iss.Body = *in.Body
		}
		if in.Status != nil {
			if !domain.ValidIssueStatus(*in.Status) {
				return validationf("invalid status")
			}
			workflowState, ok := resolveIssueWorkflowStatus(m.Workspace, *in.Status, "")
			if !ok {
				return validationf("invalid workflow status")
			}
			iss.Status = workflowState.Category
			iss.WorkflowStatus = workflowState.ID
		}
		if in.WorkflowStatus != nil {
			workflowState, ok := workflowStatusByID(m.Workspace, *in.WorkflowStatus)
			if !ok {
				return validationf("invalid workflow status")
			}
			iss.Status = workflowState.Category
			iss.WorkflowStatus = workflowState.ID
		}
		if in.Type != nil {
			if !domain.ValidIssueType(*in.Type) {
				return validationf("invalid issue type")
			}
			iss.Type = *in.Type
		}
		if in.Assignee != nil {
			if !domain.ValidIssueAssignee(*in.Assignee) {
				return validationf("invalid issue assignee")
			}
			iss.Assignee = *in.Assignee
		}
		if in.Priority != nil {
			if !domain.ValidPriority(*in.Priority) {
				return validationf("invalid priority")
			}
			iss.Priority = *in.Priority
		}
		if in.Estimate != nil {
			if !domain.ValidEstimate(*in.Estimate) {
				return validationf("invalid estimate")
			}
			iss.Estimate = *in.Estimate
		}
		if in.ProjectID != nil {
			oldProjectID := iss.ProjectID
			iss.ProjectID = *in.ProjectID
			iss.ProjectSlug = nil
			if iss.ProjectID != nil {
				if p, ok := projectByID(m, *iss.ProjectID); ok {
					slug := p.Slug
					iss.ProjectSlug = &slug
				}
			}
			if !sameInt64(oldProjectID, iss.ProjectID) {
				iss.MilestoneID = nil
				iss.MilestoneName = nil
			}
		}
		if in.MilestoneID != nil {
			iss.MilestoneID = *in.MilestoneID
			iss.MilestoneName = nil
			if iss.MilestoneID != nil {
				p, milestone, ok := milestoneByID(m, *iss.MilestoneID)
				if !ok || (iss.ProjectID != nil && *iss.ProjectID != p.ID) {
					return validationf("milestone must belong to the issue project")
				}
				projectID := p.ID
				projectSlug := p.Slug
				milestoneName := milestone.Name
				iss.ProjectID = &projectID
				iss.ProjectSlug = &projectSlug
				iss.MilestoneName = &milestoneName
			}
		}
		if in.CycleID != nil {
			iss.CycleID = *in.CycleID
			iss.CycleNumber = nil
			if iss.CycleID != nil {
				c, ok := cycleByID(m, *iss.CycleID)
				if !ok {
					return validationf("cycle not found")
				}
				n := c.Number
				iss.CycleNumber = &n
			}
		}
		if in.ParentID != nil {
			if err := checkIssueParent(m, iss.ID, *in.ParentID); err != nil {
				return err
			}
			iss.ParentID = *in.ParentID
			iss.ParentIdentifier = nil
			if iss.ParentID != nil {
				if p, ok := issueByID(m, *iss.ParentID); ok {
					ident := p.Identifier
					iss.ParentIdentifier = &ident
				}
			}
		}
		if in.DueDate != nil {
			iss.DueDate = *in.DueDate
		}
		if in.ReminderAt != nil {
			iss.ReminderAt = *in.ReminderAt
			if iss.ReminderAt != nil {
				parsed, err := time.Parse(time.RFC3339, *iss.ReminderAt)
				if err != nil {
					return validationf("invalid reminder date")
				}
				value := parsed.UTC().Format(time.RFC3339)
				iss.ReminderAt = &value
			}
		}
		if in.SortOrder != nil {
			iss.SortOrder = *in.SortOrder
		}
		if in.IsFavorite != nil {
			iss.IsFavorite = *in.IsFavorite
		}
		now := domain.Now()
		automationNow, _ := time.Parse(time.RFC3339, now)
		if in.Archived != nil && *in.Archived != oldArchived {
			if *in.Archived {
				iss.ArchivedAt = &now
			} else {
				iss.ArchivedAt = nil
			}
		}
		if in.CycleID == nil && oldCycleID == nil && iss.CycleID == nil && iss.ArchivedAt == nil &&
			(iss.Status != oldStatus || iss.WorkflowStatus != oldWorkflowStatus ||
				(iss.DueDate != nil && !sameString(oldDueDate, iss.DueDate))) {
			autoAssignIssueCycle(m, &iss, automationNow)
		}
		if !sameInt64(oldCycleID, iss.CycleID) {
			if iss.CycleID == nil {
				iss.CycleAddedAt = nil
			} else {
				iss.CycleAddedAt = &now
			}
		}
		if iss.Status != oldStatus || iss.WorkflowStatus != oldWorkflowStatus {
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
		if in.SortOrder == nil && iss.WorkflowStatus != oldWorkflowStatus {
			applyStatusProgressionOrder(m, &iss, oldWorkflowStatus)
		}
		m.Issues[i] = iss
		if iss.WorkflowStatus != oldWorkflowStatus {
			addActivity(m, "issue", iss.ID, "status_changed", map[string]any{"from": oldWorkflowStatus, "to": iss.WorkflowStatus}, now)
		}
		if !sameInt64(oldCycleID, iss.CycleID) {
			addCycleNotification(m, iss.CycleID, iss, "cycle_issue_added", now)
		}
		if iss.Status != oldStatus && (iss.Status == "done" || iss.Status == "canceled") {
			addCycleNotification(m, iss.CycleID, iss, "cycle_issue_completed", now)
		}
		if in.Type != nil && *in.Type != oldType {
			addActivity(m, "issue", iss.ID, "type_changed", map[string]any{"from": oldType, "to": iss.Type}, now)
		}
		if in.Estimate != nil && !sameEstimate(oldEstimate, iss.Estimate) {
			addActivity(m, "issue", iss.ID, "estimate_changed", map[string]any{"from": oldEstimate, "to": iss.Estimate}, now)
		}
		if oldAssignee != iss.Assignee {
			addActivity(m, "issue", iss.ID, "assignee_changed", map[string]any{"from": oldAssignee, "to": iss.Assignee}, now)
		}
		if in.IsFavorite != nil && oldFavorite != iss.IsFavorite {
			addActivity(m, "issue", iss.ID, "favorite_changed", map[string]any{"favorite": iss.IsFavorite}, now)
		}
		if in.Archived != nil && oldArchived != *in.Archived {
			action := "archived"
			if !*in.Archived {
				action = "unarchived"
			}
			addActivity(m, "issue", iss.ID, action, map[string]any{}, now)
		}
		if !sameString(oldReminderAt, iss.ReminderAt) {
			from, to := "", ""
			if oldReminderAt != nil {
				from = *oldReminderAt
			}
			if iss.ReminderAt != nil {
				to = *iss.ReminderAt
			}
			addActivity(m, "issue", iss.ID, "reminder_changed", map[string]any{"from": from, "to": to}, now)
		}
		if !sameInt64(oldMilestoneID, iss.MilestoneID) {
			from, to := "", ""
			if oldMilestoneName != nil {
				from = *oldMilestoneName
			}
			if iss.MilestoneName != nil {
				to = *iss.MilestoneName
			}
			addActivity(m, "issue", iss.ID, "milestone_changed", map[string]any{"from": from, "to": to}, now)
		}
		if iss.Status != oldStatus || iss.WorkflowStatus != oldWorkflowStatus {
			applyIssueCloseAutomation(m, iss.ID, now)
		}
		m.bump(now)
		out = iss
		return nil
	})
	return out, err
}
