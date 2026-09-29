package model

type Workspace struct {
	Name                    string                  `json:"name"`
	Timezone                string                  `json:"timezone"`
	Locale                  string                  `json:"locale"`
	URL                     string                  `json:"url"`
	Description             string                  `json:"description"`
	GitHubURL               string                  `json:"githubUrl"`
	CycleSettings           CycleSettings           `json:"cycleSettings"`
	IssueAutomationSettings IssueAutomationSettings `json:"issueAutomationSettings"`
	IssueStatuses           []IssueWorkflowStatus   `json:"issueStatuses"`
	ProjectStatuses         []ProjectWorkflowStatus `json:"projectStatuses"`
	UpdatedAt               string                  `json:"updatedAt"`
}

type UpdateWorkspaceInput struct {
	Name                    *string                  `json:"name"`
	Timezone                *string                  `json:"timezone"`
	Locale                  *string                  `json:"locale"`
	URL                     *string                  `json:"url"`
	Description             *string                  `json:"description"`
	GitHubURL               *string                  `json:"githubUrl"`
	CycleSettings           *CycleSettings           `json:"cycleSettings"`
	IssueAutomationSettings *IssueAutomationSettings `json:"issueAutomationSettings"`
}

type CycleSettings struct {
	DurationDays           int    `json:"durationDays" toml:"durationDays"`
	CooldownDays           int    `json:"cooldownDays" toml:"cooldownDays"`
	StartDay               string `json:"startDay" toml:"startDay"`
	AutoCreateAhead        int    `json:"autoCreateAhead" toml:"autoCreateAhead"`
	AutoAddActiveIssues    bool   `json:"autoAddActiveIssues" toml:"autoAddActiveIssues"`
	AutoAddCompletedIssues bool   `json:"autoAddCompletedIssues" toml:"autoAddCompletedIssues"`
}

type IssueAutomationSettings struct {
	AutoCloseParentIssues                   bool   `json:"autoCloseParentIssues" toml:"autoCloseParentIssues"`
	AutoCloseSubIssues                      bool   `json:"autoCloseSubIssues" toml:"autoCloseSubIssues"`
	StatusProgressionOrder                  string `json:"statusProgressionOrder" toml:"statusProgressionOrder"`
	AutoCloseStaleIssuesAfterMonths         int    `json:"autoCloseStaleIssuesAfterMonths" toml:"autoCloseStaleIssuesAfterMonths"`
	AutoArchiveClosedIssuesAfterMonths      int    `json:"autoArchiveClosedIssuesAfterMonths" toml:"autoArchiveClosedIssuesAfterMonths"`
	AutoArchiveCompletedProjectsAfterMonths int    `json:"autoArchiveCompletedProjectsAfterMonths" toml:"autoArchiveCompletedProjectsAfterMonths"`
	AutoArchiveCompletedCyclesAfterMonths   int    `json:"autoArchiveCompletedCyclesAfterMonths" toml:"autoArchiveCompletedCyclesAfterMonths"`
}

// DefaultCycleSettings returns the initial cycle scheduling settings.
func DefaultCycleSettings() CycleSettings {
	return CycleSettings{DurationDays: 7, StartDay: "monday"}
}

// NormalizeCycleSettings applies defaults to optional cycle settings.
func NormalizeCycleSettings(settings *CycleSettings) CycleSettings {
	if settings == nil {
		return DefaultCycleSettings()
	}
	return *settings
}

// NormalizeIssueAutomationSettings fills default values for optional automation settings.
func NormalizeIssueAutomationSettings(settings *IssueAutomationSettings) IssueAutomationSettings {
	if settings == nil {
		return IssueAutomationSettings{StatusProgressionOrder: "first"}
	}
	normalized := *settings
	if normalized.StatusProgressionOrder == "" {
		normalized.StatusProgressionOrder = "first"
	}
	if normalized.AutoArchiveCompletedProjectsAfterMonths == 0 {
		normalized.AutoArchiveCompletedProjectsAfterMonths = normalized.AutoArchiveClosedIssuesAfterMonths
	}
	if normalized.AutoArchiveCompletedCyclesAfterMonths == 0 {
		normalized.AutoArchiveCompletedCyclesAfterMonths = normalized.AutoArchiveClosedIssuesAfterMonths
	}
	return normalized
}

// ValidStatusProgressionOrder reports whether an issue status ordering strategy is supported.
func ValidStatusProgressionOrder(order string) bool {
	switch order {
	case "first", "last", "no_action":
		return true
	default:
		return false
	}
}

// ValidCycleSettings reports whether cycle scheduling settings are within supported bounds.
func ValidCycleSettings(settings CycleSettings) bool {
	if settings.DurationDays < 1 || settings.DurationDays > 56 ||
		settings.CooldownDays < 0 || settings.CooldownDays > 14 ||
		settings.AutoCreateAhead < 0 || settings.AutoCreateAhead > 6 {
		return false
	}
	switch settings.StartDay {
	case "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday":
		return true
	default:
		return false
	}
}

// IssueWorkflowStatus is a user-configurable workflow state grouped under one
// of the five status categories used for issue lifecycle calculations.
type IssueWorkflowStatus struct {
	ID          string `json:"id" toml:"id"`
	Name        string `json:"name" toml:"name"`
	Category    string `json:"category" toml:"category"`
	Description string `json:"description,omitempty" toml:"description,omitempty"`
}

type ProjectWorkflowStatus struct {
	ID          string `json:"id" toml:"id"`
	Name        string `json:"name" toml:"name"`
	Category    string `json:"category" toml:"category"`
	Description string `json:"description,omitempty" toml:"description,omitempty"`
}

// DefaultIssueWorkflowStatuses returns the built-in issue workflow states.
func DefaultIssueWorkflowStatuses() []IssueWorkflowStatus {
	return []IssueWorkflowStatus{
		{ID: "backlog", Name: "Backlog", Category: "backlog"},
		{ID: "todo", Name: "Todo", Category: "todo"},
		{ID: "in_progress", Name: "In Progress", Category: "in_progress"},
		{ID: "done", Name: "Done", Category: "done"},
		{ID: "canceled", Name: "Canceled", Category: "canceled"},
		{ID: "duplicate", Name: "Duplicate", Category: "canceled"},
	}
}
