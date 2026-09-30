package httpapi

import "github.com/yashikota/kotowari/internal/model"

type projectPatchRequest struct {
	Name            *string   `json:"name"`
	Summary         *string   `json:"summary"`
	Icon            *string   `json:"icon"`
	IconColor       *string   `json:"iconColor"`
	Description     *string   `json:"description"`
	Status          *string   `json:"status"`
	WorkflowStatus  *string   `json:"workflowStatus"`
	IsFavorite      *bool     `json:"isFavorite"`
	Lead            *string   `json:"lead"`
	Health          *string   `json:"health"`
	Priority        *int      `json:"priority"`
	StartDate       *string   `json:"startDate"`
	TargetDate      *string   `json:"targetDate"`
	Labels          *[]string `json:"labels"`
	InitiativeSlugs *[]string `json:"initiativeSlugs"`
	Archived        *bool     `json:"archived"`
	ClearStart      bool      `json:"clearStartDate"`
	ClearTarget     bool      `json:"clearTargetDate"`
	ReminderAt      *string   `json:"reminderAt"`
	ClearReminder   bool      `json:"clearReminder"`
}

func (p projectPatchRequest) archiveOnly() bool {
	return p.Archived != nil && p.Name == nil && p.Summary == nil && p.Icon == nil &&
		p.IconColor == nil && p.Description == nil && p.Status == nil && p.WorkflowStatus == nil &&
		p.IsFavorite == nil && p.Lead == nil && p.Health == nil && p.Priority == nil &&
		p.StartDate == nil && p.TargetDate == nil && p.Labels == nil && p.InitiativeSlugs == nil &&
		p.ReminderAt == nil && !p.ClearStart && !p.ClearTarget && !p.ClearReminder
}

func (p projectPatchRequest) hasContentPatch() bool {
	return p.Name != nil || p.Summary != nil || p.Icon != nil || p.IconColor != nil ||
		p.Description != nil || p.Status != nil || p.WorkflowStatus != nil || p.Lead != nil ||
		p.Health != nil || p.Priority != nil || p.StartDate != nil || p.TargetDate != nil ||
		p.Labels != nil || p.InitiativeSlugs != nil || p.Archived != nil || p.ClearStart || p.ClearTarget ||
		p.ReminderAt != nil || p.ClearReminder
}

func (p projectPatchRequest) updateInput(slug string) model.ProjectUpdateInput {
	return model.ProjectUpdateInput{
		Slug: slug, Name: p.Name, Summary: p.Summary, Icon: p.Icon, IconColor: p.IconColor,
		Description: p.Description, Status: p.Status, WorkflowStatus: p.WorkflowStatus,
		Health: p.Health, Lead: p.Lead, Priority: p.Priority,
		StartDate:  patchOptionalString(p.ClearStart, p.StartDate),
		TargetDate: patchOptionalString(p.ClearTarget, p.TargetDate),
		ReminderAt: patchOptionalString(p.ClearReminder, p.ReminderAt),
		Labels:     p.Labels, InitiativeSlugs: p.InitiativeSlugs,
	}
}
