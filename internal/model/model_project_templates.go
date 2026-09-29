package model

// ProjectTemplate is a workspace-local project recipe stored under TEMPLATE/.
// Milestone dates and project relations are intentionally omitted: they are
// project-specific, while milestone names and descriptions are reusable.
type ProjectTemplate struct {
	Slug           string                     `json:"slug"`
	Name           string                     `json:"name"`
	Summary        string                     `json:"summary,omitempty"`
	Icon           string                     `json:"icon,omitempty"`
	IconColor      string                     `json:"iconColor,omitempty"`
	Description    string                     `json:"description"`
	Status         string                     `json:"status"`
	WorkflowStatus string                     `json:"workflowStatus,omitempty"`
	Lead           string                     `json:"lead,omitempty"`
	Priority       int                        `json:"priority"`
	Labels         []string                   `json:"labels"`
	Milestones     []ProjectTemplateMilestone `json:"milestones"`
}

type ProjectTemplateMilestone struct {
	Name        string `json:"name" toml:"name"`
	Description string `json:"description,omitempty" toml:"description,omitempty"`
}
