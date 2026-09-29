package store

import (
	"strings"
	"time"

	"github.com/yashikota/kotowari/internal/domain"
)

func applyIssueUpdateFields(m *mem, iss *Issue, in PatchIssueInput) error {
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
	return nil
}

func applyIssueUpdateRelations(m *mem, iss *Issue, in PatchIssueInput) error {
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
	return nil
}
