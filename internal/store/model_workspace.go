package store

import "github.com/yashikota/kotowari/internal/model"

type Workspace = model.Workspace
type CycleSettings = model.CycleSettings
type IssueAutomationSettings = model.IssueAutomationSettings
type IssueWorkflowStatus = model.IssueWorkflowStatus
type ProjectWorkflowStatus = model.ProjectWorkflowStatus

func normalizedCycleSettings(settings *CycleSettings) CycleSettings {
	return model.NormalizeCycleSettings(settings)
}

func normalizedIssueAutomationSettings(settings *IssueAutomationSettings) IssueAutomationSettings {
	return model.NormalizeIssueAutomationSettings(settings)
}

func validStatusProgressionOrder(order string) bool {
	return model.ValidStatusProgressionOrder(order)
}

func validCycleSettings(settings CycleSettings) bool {
	return model.ValidCycleSettings(settings)
}

// DefaultIssueWorkflowStatuses keeps the store package API compatible with the shared model package.
func DefaultIssueWorkflowStatuses() []IssueWorkflowStatus {
	return model.DefaultIssueWorkflowStatuses()
}
